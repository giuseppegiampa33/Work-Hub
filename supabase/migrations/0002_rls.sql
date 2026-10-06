-- =============================================================================
-- Work-Hub · 0002 · Row Level Security
--
-- Three questions are answered for every single row, in this order:
--   1. does the row belong to an organization the caller is a member of?
--   2. does the caller's role in *that* organization allow the operation?
--   3. for the `guest` role, was the caller explicitly given this resource?
--
-- The permission matrix below mirrors `src/config/roles.ts`. The application
-- checks permissions before writing (fast failure, good error messages); these
-- policies are what actually enforces them.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Permission matrix — keep in sync with src/config/roles.ts
-- -----------------------------------------------------------------------------
create or replace function public.role_has_permission(
  p_role public.org_role,
  p_permission text
)
returns boolean
language sql
immutable
as $$
  select case p_role
    when 'owner' then true
    when 'admin' then p_permission <> 'org:delete'
    when 'manager' then p_permission in (
      'members:view', 'members:invite',
      'clients:view', 'clients:manage',
      'tickets:view', 'tickets:view_all', 'tickets:create', 'tickets:update',
      'tickets:assign', 'tickets:delete', 'tickets:comment',
      'calendar:view', 'calendar:plan', 'calendar:plan_others',
      'time:log', 'time:view_own', 'time:view_all',
      'reports:view', 'taxonomy:manage', 'audit:view'
    )
    when 'operator' then p_permission in (
      'members:view',
      'clients:view',
      'tickets:view', 'tickets:view_all', 'tickets:create', 'tickets:update', 'tickets:comment',
      'calendar:view', 'calendar:plan',
      'time:log', 'time:view_own'
    )
    when 'guest' then p_permission in (
      'tickets:view', 'tickets:comment',
      'clients:view',
      'calendar:view',
      'time:view_own'
    )
    else false
  end;
$$;

comment on function public.role_has_permission is
  'Role/permission matrix. Mirror of src/config/roles.ts — change both together.';

-- -----------------------------------------------------------------------------
-- Tenant predicates. SECURITY DEFINER so they can read membership without
-- recursing into the policies defined on organization_members.
-- -----------------------------------------------------------------------------
create or replace function public.is_org_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.organization_members m
     where m.organization_id = p_org
       and m.user_id = auth.uid()
  );
$$;

create or replace function public.current_org_role(p_org uuid)
returns public.org_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select m.role
    from public.organization_members m
   where m.organization_id = p_org
     and m.user_id = auth.uid();
$$;

create or replace function public.has_org_permission(p_org uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.organization_members m
     where m.organization_id = p_org
       and m.user_id = auth.uid()
       and public.role_has_permission(m.role, p_permission)
  );
$$;

/** True when the caller and the given user share at least one organization. */
create or replace function public.shares_organization(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.organization_members mine
      join public.organization_members theirs
        on theirs.organization_id = mine.organization_id
     where mine.user_id = auth.uid()
       and theirs.user_id = p_user
  );
$$;

/** Guests only see tickets they watch, created or are assigned to. */
create or replace function public.can_see_ticket(p_org uuid, p_ticket uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when not public.is_org_member(p_org) then false
    when public.current_org_role(p_org) <> 'guest' then true
    else exists (
      select 1 from public.ticket_watchers w
       where w.ticket_id = p_ticket and w.user_id = auth.uid()
    ) or exists (
      select 1 from public.tickets t
       where t.id = p_ticket
         and (t.creator_id = auth.uid() or t.assignee_id = auth.uid())
    )
  end;
$$;

/** Guests only see clients they were explicitly added to. */
create or replace function public.can_see_client(p_org uuid, p_client uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when not public.is_org_member(p_org) then false
    when public.current_org_role(p_org) <> 'guest' then true
    else exists (
      select 1 from public.client_members cm
       where cm.client_id = p_client and cm.user_id = auth.uid()
    )
  end;
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS everywhere and remove anonymous access. Nothing in Work-Hub is
-- public: unauthenticated callers never read a single application row.
-- -----------------------------------------------------------------------------
do $$
declare
  target text;
begin
  foreach target in array array[
    'profiles', 'organizations', 'organization_members', 'invites',
    'categories', 'activity_types', 'clients', 'client_members',
    'tickets', 'ticket_watchers', 'ticket_comments', 'ticket_attachments',
    'ticket_events', 'calendar_events', 'time_entries', 'notifications', 'audit_logs'
  ]
  loop
    execute format('alter table public.%I enable row level security', target);
    execute format('revoke all on table public.%I from anon', target);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', target);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_organization(id));

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- organizations  (creation goes through public.create_organization)
-- -----------------------------------------------------------------------------
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated
  using (public.is_org_member(id));

drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
  for update to authenticated
  using (public.has_org_permission(id, 'org:manage'))
  with check (public.has_org_permission(id, 'org:manage'));

drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete on public.organizations
  for delete to authenticated
  using (public.has_org_permission(id, 'org:delete'));

-- -----------------------------------------------------------------------------
-- organization_members  (joining goes through public.accept_invite)
-- -----------------------------------------------------------------------------
drop policy if exists organization_members_select on public.organization_members;
create policy organization_members_select on public.organization_members
  for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists organization_members_update on public.organization_members;
create policy organization_members_update on public.organization_members
  for update to authenticated
  using (public.has_org_permission(organization_id, 'members:update_role'))
  with check (public.has_org_permission(organization_id, 'members:update_role'));

drop policy if exists organization_members_delete on public.organization_members;
create policy organization_members_delete on public.organization_members
  for delete to authenticated
  using (
    user_id = auth.uid()
    or public.has_org_permission(organization_id, 'members:remove')
  );

/**
 * An organization must always keep at least one owner, and the last owner
 * cannot demote or remove themselves.
 */
create or replace function public.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_count integer;
begin
  if tg_op = 'UPDATE' and (old.role <> 'owner' or new.role = 'owner') then
    return new;
  end if;

  select count(*) into owner_count
    from public.organization_members
   where organization_id = old.organization_id
     and role = 'owner';

  if owner_count <= 1 and old.role = 'owner' then
    raise exception 'an organization must keep at least one owner'
      using errcode = 'check_violation';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_members_protect_owner on public.organization_members;
create trigger trg_members_protect_owner
  before update or delete on public.organization_members
  for each row execute function public.protect_last_owner();

-- -----------------------------------------------------------------------------
-- invites  (reading by token goes through public.invite_preview)
-- -----------------------------------------------------------------------------
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites
  for select to authenticated
  using (public.has_org_permission(organization_id, 'members:view'));

drop policy if exists invites_insert on public.invites;
create policy invites_insert on public.invites
  for insert to authenticated
  with check (
    public.has_org_permission(organization_id, 'members:invite')
    and invited_by = auth.uid()
    and role <> 'owner'
  );

drop policy if exists invites_update on public.invites;
create policy invites_update on public.invites
  for update to authenticated
  using (public.has_org_permission(organization_id, 'members:invite'))
  with check (public.has_org_permission(organization_id, 'members:invite'));

drop policy if exists invites_delete on public.invites;
create policy invites_delete on public.invites
  for delete to authenticated
  using (public.has_org_permission(organization_id, 'members:invite'));

-- -----------------------------------------------------------------------------
-- categories / activity_types
-- -----------------------------------------------------------------------------
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists categories_write on public.categories;
create policy categories_write on public.categories
  for all to authenticated
  using (public.has_org_permission(organization_id, 'taxonomy:manage'))
  with check (public.has_org_permission(organization_id, 'taxonomy:manage'));

drop policy if exists activity_types_select on public.activity_types;
create policy activity_types_select on public.activity_types
  for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists activity_types_write on public.activity_types;
create policy activity_types_write on public.activity_types
  for all to authenticated
  using (public.has_org_permission(organization_id, 'taxonomy:manage'))
  with check (public.has_org_permission(organization_id, 'taxonomy:manage'));

-- -----------------------------------------------------------------------------
-- clients
-- -----------------------------------------------------------------------------
drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select to authenticated
  using (public.can_see_client(organization_id, id));

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
  for insert to authenticated
  with check (public.has_org_permission(organization_id, 'clients:manage'));

drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
  for update to authenticated
  using (public.has_org_permission(organization_id, 'clients:manage'))
  with check (public.has_org_permission(organization_id, 'clients:manage'));

drop policy if exists clients_delete on public.clients;
create policy clients_delete on public.clients
  for delete to authenticated
  using (public.has_org_permission(organization_id, 'clients:manage'));

drop policy if exists client_members_select on public.client_members;
create policy client_members_select on public.client_members
  for select to authenticated
  using (public.is_org_member(organization_id));

drop policy if exists client_members_write on public.client_members;
create policy client_members_write on public.client_members
  for all to authenticated
  using (public.has_org_permission(organization_id, 'clients:manage'))
  with check (public.has_org_permission(organization_id, 'clients:manage'));

-- -----------------------------------------------------------------------------
-- tickets
-- -----------------------------------------------------------------------------
drop policy if exists tickets_select on public.tickets;
create policy tickets_select on public.tickets
  for select to authenticated
  using (public.can_see_ticket(organization_id, id));

drop policy if exists tickets_insert on public.tickets;
create policy tickets_insert on public.tickets
  for insert to authenticated
  with check (
    public.has_org_permission(organization_id, 'tickets:create')
    and creator_id = auth.uid()
  );

-- Operators may only move work that is theirs; managers and above move anything.
drop policy if exists tickets_update on public.tickets;
create policy tickets_update on public.tickets
  for update to authenticated
  using (
    public.has_org_permission(organization_id, 'tickets:update')
    and (
      public.has_org_permission(organization_id, 'tickets:assign')
      or assignee_id = auth.uid()
      or creator_id = auth.uid()
    )
  )
  with check (
    public.has_org_permission(organization_id, 'tickets:update')
    and (
      public.has_org_permission(organization_id, 'tickets:assign')
      or assignee_id = auth.uid()
      or creator_id = auth.uid()
    )
  );

drop policy if exists tickets_delete on public.tickets;
create policy tickets_delete on public.tickets
  for delete to authenticated
  using (public.has_org_permission(organization_id, 'tickets:delete'));

drop policy if exists ticket_watchers_select on public.ticket_watchers;
create policy ticket_watchers_select on public.ticket_watchers
  for select to authenticated
  using (user_id = auth.uid() or public.can_see_ticket(organization_id, ticket_id));

drop policy if exists ticket_watchers_write on public.ticket_watchers;
create policy ticket_watchers_write on public.ticket_watchers
  for all to authenticated
  using (public.has_org_permission(organization_id, 'tickets:assign'))
  with check (public.has_org_permission(organization_id, 'tickets:assign'));

drop policy if exists ticket_comments_select on public.ticket_comments;
create policy ticket_comments_select on public.ticket_comments
  for select to authenticated
  using (public.can_see_ticket(organization_id, ticket_id));

drop policy if exists ticket_comments_insert on public.ticket_comments;
create policy ticket_comments_insert on public.ticket_comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.has_org_permission(organization_id, 'tickets:comment')
    and public.can_see_ticket(organization_id, ticket_id)
  );

drop policy if exists ticket_comments_update on public.ticket_comments;
create policy ticket_comments_update on public.ticket_comments
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

drop policy if exists ticket_comments_delete on public.ticket_comments;
create policy ticket_comments_delete on public.ticket_comments
  for delete to authenticated
  using (author_id = auth.uid() or public.has_org_permission(organization_id, 'org:manage'));

drop policy if exists ticket_attachments_select on public.ticket_attachments;
create policy ticket_attachments_select on public.ticket_attachments
  for select to authenticated
  using (public.can_see_ticket(organization_id, ticket_id));

drop policy if exists ticket_attachments_insert on public.ticket_attachments;
create policy ticket_attachments_insert on public.ticket_attachments
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.has_org_permission(organization_id, 'tickets:update')
    and public.can_see_ticket(organization_id, ticket_id)
  );

drop policy if exists ticket_attachments_delete on public.ticket_attachments;
create policy ticket_attachments_delete on public.ticket_attachments
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.has_org_permission(organization_id, 'tickets:delete'));

-- The timeline is written exclusively by triggers; clients can only read it.
drop policy if exists ticket_events_select on public.ticket_events;
create policy ticket_events_select on public.ticket_events
  for select to authenticated
  using (public.can_see_ticket(organization_id, ticket_id));

-- -----------------------------------------------------------------------------
-- calendar_events
-- -----------------------------------------------------------------------------
drop policy if exists calendar_events_select on public.calendar_events;
create policy calendar_events_select on public.calendar_events
  for select to authenticated
  using (
    public.is_org_member(organization_id)
    and (
      public.current_org_role(organization_id) <> 'guest'
      or owner_id = auth.uid()
    )
  );

drop policy if exists calendar_events_insert on public.calendar_events;
create policy calendar_events_insert on public.calendar_events
  for insert to authenticated
  with check (
    public.has_org_permission(organization_id, 'calendar:plan')
    and (owner_id = auth.uid() or public.has_org_permission(organization_id, 'calendar:plan_others'))
  );

drop policy if exists calendar_events_update on public.calendar_events;
create policy calendar_events_update on public.calendar_events
  for update to authenticated
  using (
    public.has_org_permission(organization_id, 'calendar:plan')
    and (owner_id = auth.uid() or public.has_org_permission(organization_id, 'calendar:plan_others'))
  )
  with check (
    public.has_org_permission(organization_id, 'calendar:plan')
    and (owner_id = auth.uid() or public.has_org_permission(organization_id, 'calendar:plan_others'))
  );

drop policy if exists calendar_events_delete on public.calendar_events;
create policy calendar_events_delete on public.calendar_events
  for delete to authenticated
  using (
    public.has_org_permission(organization_id, 'calendar:plan')
    and (owner_id = auth.uid() or public.has_org_permission(organization_id, 'calendar:plan_others'))
  );

-- -----------------------------------------------------------------------------
-- time_entries
-- -----------------------------------------------------------------------------
drop policy if exists time_entries_select on public.time_entries;
create policy time_entries_select on public.time_entries
  for select to authenticated
  using (
    public.is_org_member(organization_id)
    and (user_id = auth.uid() or public.has_org_permission(organization_id, 'time:view_all'))
  );

drop policy if exists time_entries_insert on public.time_entries;
create policy time_entries_insert on public.time_entries
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.has_org_permission(organization_id, 'time:log')
  );

drop policy if exists time_entries_update on public.time_entries;
create policy time_entries_update on public.time_entries
  for update to authenticated
  using (user_id = auth.uid() or public.has_org_permission(organization_id, 'org:manage'))
  with check (user_id = auth.uid() or public.has_org_permission(organization_id, 'org:manage'));

drop policy if exists time_entries_delete on public.time_entries;
create policy time_entries_delete on public.time_entries
  for delete to authenticated
  using (user_id = auth.uid() or public.has_org_permission(organization_id, 'org:manage'));

-- -----------------------------------------------------------------------------
-- notifications  (written by triggers, read and dismissed by the recipient)
-- -----------------------------------------------------------------------------
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated
  using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- audit_logs  (append-only, written by triggers)
-- -----------------------------------------------------------------------------
drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using (public.has_org_permission(organization_id, 'audit:view'));
