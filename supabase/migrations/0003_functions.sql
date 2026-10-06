-- =============================================================================
-- Work-Hub · 0003 · Server-side operations
--
-- Two kinds of function live here:
--
--   * SECURITY DEFINER — the few operations that must step outside RLS
--     (creating an organization, accepting an invite). Each one re-implements
--     the three tenant checks by hand and is narrowly scoped.
--   * SECURITY INVOKER (default) — aggregations and search. RLS still applies
--     to every table they touch, so tenant isolation holds even if a permission
--     check here were wrong. They exist to collapse what would otherwise be
--     several round trips (or an N+1) into one indexed query.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Onboarding: create an organization and become its owner
-- -----------------------------------------------------------------------------
create or replace function public.create_organization(
  p_name text,
  p_slug text
)
returns public.organizations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  org public.organizations;
begin
  if actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = actor) then
    raise exception 'profile missing for user %', actor using errcode = 'no_data_found';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (btrim(p_name), lower(btrim(p_slug)), actor)
  returning * into org;

  insert into public.organization_members (organization_id, user_id, role)
  values (org.id, actor, 'owner');

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (org.id, actor, 'organization.created', 'organization', org.id,
          jsonb_build_object('name', org.name, 'slug', org.slug));

  return org;
end;
$$;

/** Is this slug still free? Used by the onboarding form. */
create or replace function public.organization_slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select not exists (
    select 1 from public.organizations where slug = lower(btrim(p_slug))
  );
$$;

-- -----------------------------------------------------------------------------
-- Invites
-- -----------------------------------------------------------------------------

/**
 * Public, token-gated preview so the invite landing page can render before the
 * recipient has an account. Returns no tenant data beyond the organization
 * name, the role offered and the address the invite was issued to.
 */
create or replace function public.invite_preview(p_token text)
returns table (
  organization_id uuid,
  organization_name text,
  organization_logo_url text,
  email citext,
  role public.org_role,
  expires_at timestamptz,
  status text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    i.organization_id,
    o.name,
    o.logo_url,
    i.email,
    i.role,
    i.expires_at,
    case
      when i.accepted_at is not null then 'accepted'
      when i.revoked_at is not null then 'revoked'
      when i.expires_at < now() then 'expired'
      else 'pending'
    end as status
  from public.invites i
  join public.organizations o on o.id = i.organization_id
  where i.token = p_token;
$$;

/** Invites waiting for the signed-in user's email address. */
create or replace function public.my_pending_invites()
returns table (
  token text,
  organization_id uuid,
  organization_name text,
  role public.org_role,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select i.token, i.organization_id, o.name, i.role, i.expires_at
    from public.invites i
    join public.organizations o on o.id = i.organization_id
    join public.profiles p on p.id = auth.uid()
   where i.email = p.email
     and i.accepted_at is null
     and i.revoked_at is null
     and i.expires_at > now()
     and not exists (
       select 1 from public.organization_members m
        where m.organization_id = i.organization_id and m.user_id = auth.uid()
     )
   order by i.created_at desc;
$$;

/**
 * Join an organization through an invite token.
 * The invite is only valid for the exact address it was issued to.
 */
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  actor_email citext;
  inv public.invites;
begin
  if actor is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select email into actor_email from public.profiles where id = actor;
  if actor_email is null then
    raise exception 'profile missing for user %', actor using errcode = 'no_data_found';
  end if;

  select * into inv from public.invites where token = p_token for update;

  if inv.id is null then
    raise exception 'invite not found' using errcode = 'no_data_found';
  end if;
  if inv.revoked_at is not null then
    raise exception 'invite revoked' using errcode = 'check_violation';
  end if;
  if inv.accepted_at is not null then
    raise exception 'invite already used' using errcode = 'check_violation';
  end if;
  if inv.expires_at < now() then
    raise exception 'invite expired' using errcode = 'check_violation';
  end if;
  if inv.email <> actor_email then
    raise exception 'invite issued to a different address' using errcode = '42501';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (inv.organization_id, actor, inv.role)
  on conflict (organization_id, user_id) do nothing;

  update public.invites
     set accepted_at = now(), accepted_by = actor
   where id = inv.id;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (inv.organization_id, actor, 'invite.accepted', 'invite', inv.id,
          jsonb_build_object('role', inv.role, 'email', inv.email));

  return inv.organization_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Dashboard: one indexed round trip instead of a dozen counts
-- -----------------------------------------------------------------------------
create or replace function public.organization_overview(
  p_org uuid,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
  result jsonb;
begin
  if not public.is_org_member(p_org) then
    raise exception 'not a member of organization %', p_org using errcode = '42501';
  end if;

  select jsonb_build_object(
    'tickets', (
      select jsonb_build_object(
        'open', count(*) filter (where status not in ('resolved', 'closed', 'cancelled')),
        'unassigned', count(*) filter (
          where assignee_id is null and status not in ('resolved', 'closed', 'cancelled')
        ),
        'mine', count(*) filter (
          where assignee_id = actor and status not in ('resolved', 'closed', 'cancelled')
        ),
        'overdue', count(*) filter (
          where due_date < current_date and status not in ('resolved', 'closed', 'cancelled')
        ),
        'due_in_range', count(*) filter (
          where due_date between p_from and p_to
            and status not in ('resolved', 'closed', 'cancelled')
        ),
        'resolved_in_range', count(*) filter (
          where resolved_at is not null and resolved_at::date between p_from and p_to
        ),
        'by_status', coalesce(
          (select jsonb_object_agg(status, n) from (
             select status, count(*) as n from public.tickets
              where organization_id = p_org group by status
           ) s), '{}'::jsonb
        ),
        'by_priority', coalesce(
          (select jsonb_object_agg(priority, n) from (
             select priority, count(*) as n from public.tickets
              where organization_id = p_org
                and status not in ('resolved', 'closed', 'cancelled')
              group by priority
           ) s), '{}'::jsonb
        )
      )
      from public.tickets where organization_id = p_org
    ),
    'time', (
      select jsonb_build_object(
        'minutes_in_range', coalesce(sum(duration_minutes) filter (
          where entry_date between p_from and p_to), 0),
        'my_minutes_in_range', coalesce(sum(duration_minutes) filter (
          where entry_date between p_from and p_to and user_id = actor), 0),
        'billable_minutes_in_range', coalesce(sum(duration_minutes) filter (
          where entry_date between p_from and p_to and is_billable), 0),
        'entries_in_range', count(*) filter (where entry_date between p_from and p_to)
      )
      from public.time_entries where organization_id = p_org
    ),
    'calendar', (
      select jsonb_build_object(
        'planned', count(*) filter (where is_planned and not is_completed),
        'completed', count(*) filter (where is_completed),
        'mine', count(*) filter (where owner_id = actor),
        'planned_minutes', coalesce(sum(
          extract(epoch from (ends_at - starts_at)) / 60
        ) filter (where not is_completed), 0)::int
      )
      from public.calendar_events
      where organization_id = p_org
        and starts_at >= p_from::timestamptz
        and starts_at < (p_to + 1)::timestamptz
    ),
    'counts', jsonb_build_object(
      'clients', (select count(*) from public.clients
                   where organization_id = p_org and not is_archived),
      'members', (select count(*) from public.organization_members
                   where organization_id = p_org),
      'categories', (select count(*) from public.categories
                      where organization_id = p_org and not is_archived),
      'pending_invites', (select count(*) from public.invites
                           where organization_id = p_org
                             and accepted_at is null and revoked_at is null
                             and expires_at > now())
    )
  ) into result;

  return result;
end;
$$;

-- -----------------------------------------------------------------------------
-- Reports. Aggregated in the database so the browser never downloads raw rows.
-- -----------------------------------------------------------------------------
create or replace function public.report_hours_by_client(
  p_org uuid,
  p_from date,
  p_to date
)
returns table (
  client_id uuid,
  client_name text,
  minutes bigint,
  billable_minutes bigint,
  entries bigint,
  tickets bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    t.client_id,
    coalesce(c.name, 'Senza cliente') as client_name,
    sum(t.duration_minutes)::bigint as minutes,
    sum(case when t.is_billable then t.duration_minutes else 0 end)::bigint as billable_minutes,
    count(*)::bigint as entries,
    count(distinct t.ticket_id)::bigint as tickets
  from public.time_entries t
  left join public.clients c on c.id = t.client_id
  where t.organization_id = p_org
    and t.entry_date between p_from and p_to
  group by t.client_id, c.name
  order by minutes desc, client_name asc;
$$;

create or replace function public.report_hours_by_category(
  p_org uuid,
  p_from date,
  p_to date
)
returns table (
  category_id uuid,
  category_name text,
  tone public.semantic_tone,
  activity_type_id uuid,
  activity_type_name text,
  minutes bigint,
  entries bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    t.category_id,
    coalesce(cat.name, 'Senza categoria') as category_name,
    coalesce(cat.tone, 'neutral'::public.semantic_tone) as tone,
    t.activity_type_id,
    coalesce(act.name, '—') as activity_type_name,
    sum(t.duration_minutes)::bigint as minutes,
    count(*)::bigint as entries
  from public.time_entries t
  left join public.categories cat on cat.id = t.category_id
  left join public.activity_types act on act.id = t.activity_type_id
  where t.organization_id = p_org
    and t.entry_date between p_from and p_to
  group by t.category_id, cat.name, cat.tone, t.activity_type_id, act.name
  order by minutes desc;
$$;

create or replace function public.report_hours_by_member(
  p_org uuid,
  p_from date,
  p_to date
)
returns table (
  user_id uuid,
  full_name text,
  email citext,
  avatar_url text,
  minutes bigint,
  billable_minutes bigint,
  entries bigint,
  days_logged bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    t.user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    sum(t.duration_minutes)::bigint as minutes,
    sum(case when t.is_billable then t.duration_minutes else 0 end)::bigint as billable_minutes,
    count(*)::bigint as entries,
    count(distinct t.entry_date)::bigint as days_logged
  from public.time_entries t
  join public.profiles p on p.id = t.user_id
  where t.organization_id = p_org
    and t.entry_date between p_from and p_to
  group by t.user_id, p.full_name, p.email, p.avatar_url
  order by minutes desc;
$$;

create or replace function public.report_tickets_breakdown(p_org uuid)
returns table (
  status public.ticket_status,
  priority public.ticket_priority,
  total bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  select status, priority, count(*)::bigint as total
    from public.tickets
   where organization_id = p_org
   group by status, priority;
$$;

create or replace function public.report_daily_hours(
  p_org uuid,
  p_from date,
  p_to date
)
returns table (
  day date,
  minutes bigint,
  billable_minutes bigint
)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    d::date as day,
    coalesce(sum(t.duration_minutes), 0)::bigint as minutes,
    coalesce(sum(case when t.is_billable then t.duration_minutes else 0 end), 0)::bigint
      as billable_minutes
  from generate_series(p_from, p_to, interval '1 day') as d
  left join public.time_entries t
    on t.organization_id = p_org and t.entry_date = d::date
  group by d
  order by d;
$$;

-- -----------------------------------------------------------------------------
-- Global search: clients and tickets in a single round trip, trigram indexed.
-- -----------------------------------------------------------------------------
create or replace function public.search_workspace(
  p_org uuid,
  p_query text,
  p_limit integer default 6
)
returns table (
  kind text,
  id uuid,
  title text,
  subtitle text,
  badge text,
  reference integer
)
language sql
stable
set search_path = public, pg_temp
as $$
  with needle as (select '%' || btrim(p_query) || '%' as pattern)
  (
    select 'ticket'::text as kind, t.id, t.title,
           coalesce(c.name, '—') as subtitle,
           t.status::text as badge,
           t.reference
      from public.tickets t
      left join public.clients c on c.id = t.client_id
      cross join needle
     where t.organization_id = p_org
       and (t.title ilike needle.pattern or t.reference::text = btrim(p_query))
     order by t.updated_at desc
     limit greatest(p_limit, 1)
  )
  union all
  (
    select 'client'::text as kind, c.id, c.name,
           coalesce(c.email::text, c.phone, '—') as subtitle,
           case when c.is_archived then 'archived' else 'active' end as badge,
           null::integer as reference
      from public.clients c
      cross join needle
     where c.organization_id = p_org
       and (c.name ilike needle.pattern or c.email::text ilike needle.pattern)
     order by c.name
     limit greatest(p_limit, 1)
  )
  union all
  (
    select 'member'::text as kind, p.id, coalesce(p.full_name, p.email::text),
           p.email::text as subtitle,
           m.role::text as badge,
           null::integer as reference
      from public.organization_members m
      join public.profiles p on p.id = m.user_id
      cross join needle
     where m.organization_id = p_org
       and (coalesce(p.full_name, '') ilike needle.pattern or p.email::text ilike needle.pattern)
     order by coalesce(p.full_name, p.email::text)
     limit greatest(p_limit, 1)
  );
$$;

-- -----------------------------------------------------------------------------
-- Turn a planned calendar event into logged hours, atomically.
-- -----------------------------------------------------------------------------
create or replace function public.complete_calendar_event(
  p_event uuid,
  p_duration_minutes integer default null,
  p_description text default null,
  p_is_billable boolean default true
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  ev public.calendar_events;
  minutes integer;
  entry_id uuid;
begin
  -- RLS decides whether this row is visible and updatable by the caller.
  select * into ev from public.calendar_events where id = p_event;
  if ev.id is null then
    raise exception 'calendar event not found' using errcode = 'no_data_found';
  end if;

  -- Hours are always logged by the person who did the work.
  if ev.owner_id <> auth.uid() then
    raise exception 'only the owner of the event can log its hours' using errcode = '42501';
  end if;

  minutes := coalesce(
    p_duration_minutes,
    greatest(1, (extract(epoch from (ev.ends_at - ev.starts_at)) / 60)::integer)
  );

  insert into public.time_entries (
    organization_id, user_id, client_id, ticket_id, category_id, activity_type_id,
    calendar_event_id, entry_date, start_time, end_time, duration_minutes,
    description, is_billable
  )
  values (
    ev.organization_id, ev.owner_id, ev.client_id, ev.ticket_id, ev.category_id,
    ev.activity_type_id, ev.id, ev.starts_at::date, ev.starts_at::time, ev.ends_at::time,
    minutes, coalesce(nullif(btrim(p_description), ''), ev.title), p_is_billable
  )
  returning id into entry_id;

  update public.calendar_events
     set is_completed = true, is_planned = false
   where id = ev.id;

  return entry_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Execution grants. Nothing is callable anonymously except the invite preview,
-- which is already gated by an unguessable token.
-- -----------------------------------------------------------------------------
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.create_organization(text, text)',
    'public.organization_slug_available(text)',
    'public.my_pending_invites()',
    'public.accept_invite(text)',
    'public.organization_overview(uuid, date, date)',
    'public.report_hours_by_client(uuid, date, date)',
    'public.report_hours_by_category(uuid, date, date)',
    'public.report_hours_by_member(uuid, date, date)',
    'public.report_tickets_breakdown(uuid)',
    'public.report_daily_hours(uuid, date, date)',
    'public.search_workspace(uuid, text, integer)',
    'public.complete_calendar_event(uuid, integer, text, boolean)'
  ]
  loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;

revoke all on function public.invite_preview(text) from public;
grant execute on function public.invite_preview(text) to anon, authenticated;

-- Tenant predicates are used inside policies; they must stay callable.
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.current_org_role(uuid) to authenticated;
grant execute on function public.has_org_permission(uuid, text) to authenticated;
