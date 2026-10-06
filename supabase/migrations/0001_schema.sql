-- =============================================================================
-- Work-Hub · 0001 · Schema
--
-- Multi-tenant operational workspace: organizations own every row, users hold a
-- personal account and belong to one or more organizations.
--
-- Conventions
--   * every tenant-scoped table carries a NOT NULL `organization_id`;
--   * cross-table references are validated by tenant guards so a row can never
--     point at another tenant's data, even if the UUID is guessed;
--   * indexes always lead with `organization_id`, matching the query shape the
--     application enforces (see PERFORMANCE.md).
--
-- Run this file first, then 0002_rls.sql, then 0003_functions.sql,
-- then 0004_storage.sql.
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;

-- -----------------------------------------------------------------------------
-- Enumerations
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.org_role as enum ('owner', 'admin', 'manager', 'operator', 'guest');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_status as enum (
    'new', 'to_plan', 'planned', 'in_progress',
    'waiting_client', 'waiting_internal',
    'resolved', 'closed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_priority as enum ('critical', 'high', 'normal', 'low');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ticket_event_type as enum (
    'created', 'status_changed', 'priority_changed', 'assignee_changed',
    'due_date_changed', 'client_changed', 'comment_added', 'attachment_added',
    'event_linked', 'time_logged'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.semantic_tone as enum ('brand', 'info', 'success', 'warning', 'danger', 'neutral');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Shared trigger helpers
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.touch_updated_at is 'Keeps updated_at authoritative on the server.';

-- -----------------------------------------------------------------------------
-- Identity
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       citext not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_full_name_len check (full_name is null or char_length(btrim(full_name)) <= 80)
);

create index if not exists profiles_email_idx on public.profiles (email);

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint organizations_name_len check (char_length(btrim(name)) between 2 and 80),
  constraint organizations_slug_shape check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$')
);

create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  role            public.org_role not null default 'operator',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_members_user_idx
  on public.organization_members (user_id);
create index if not exists organization_members_org_role_idx
  on public.organization_members (organization_id, role);

create table if not exists public.invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email           citext not null,
  role            public.org_role not null default 'operator',
  token           text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by      uuid references public.profiles (id) on delete set null,
  expires_at      timestamptz not null default (now() + interval '14 days'),
  accepted_at     timestamptz,
  accepted_by     uuid references public.profiles (id) on delete set null,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint invites_role_not_owner check (role <> 'owner'),
  constraint invites_email_shape check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- One live invite per address per tenant; accepted/revoked ones are kept as history.
create unique index if not exists invites_pending_unique
  on public.invites (organization_id, email)
  where accepted_at is null and revoked_at is null;

create index if not exists invites_email_pending_idx
  on public.invites (email)
  where accepted_at is null and revoked_at is null;

create index if not exists invites_org_created_idx
  on public.invites (organization_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Tenant taxonomy
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  tone            public.semantic_tone not null default 'neutral',
  icon            text,
  position        integer not null default 0,
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, name),
  constraint categories_name_len check (char_length(btrim(name)) between 1 and 60)
);

create index if not exists categories_org_idx
  on public.categories (organization_id, is_archived, position, name);

create table if not exists public.activity_types (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations (id) on delete cascade,
  category_id              uuid not null references public.categories (id) on delete cascade,
  name                     text not null,
  default_duration_minutes integer not null default 60,
  position                 integer not null default 0,
  is_archived              boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (organization_id, category_id, name),
  constraint activity_types_name_len check (char_length(btrim(name)) between 1 and 60),
  constraint activity_types_duration check (default_duration_minutes between 5 and 1440)
);

create index if not exists activity_types_org_idx
  on public.activity_types (organization_id, is_archived, position, name);
create index if not exists activity_types_category_idx
  on public.activity_types (organization_id, category_id);

-- -----------------------------------------------------------------------------
-- Clients
-- -----------------------------------------------------------------------------
create table if not exists public.clients (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  code            text,
  email           citext,
  phone           text,
  address         text,
  notes           text,
  is_archived     boolean not null default false,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint clients_name_len check (char_length(btrim(name)) between 1 and 120),
  constraint clients_code_len check (code is null or char_length(btrim(code)) <= 24)
);

create index if not exists clients_org_name_idx
  on public.clients (organization_id, is_archived, name);
create index if not exists clients_org_created_idx
  on public.clients (organization_id, created_at desc);
create index if not exists clients_name_trgm_idx
  on public.clients using gin (name gin_trgm_ops);

-- Explicit client access, used to scope the `guest` role.
create table if not exists public.client_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_id       uuid not null references public.clients (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (client_id, user_id)
);

create index if not exists client_members_user_idx
  on public.client_members (user_id, organization_id);

-- -----------------------------------------------------------------------------
-- Tickets
-- -----------------------------------------------------------------------------
create table if not exists public.tickets (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  reference        integer not null,
  client_id        uuid references public.clients (id) on delete set null,
  creator_id       uuid references public.profiles (id) on delete set null,
  assignee_id      uuid references public.profiles (id) on delete set null,
  category_id      uuid references public.categories (id) on delete set null,
  activity_type_id uuid references public.activity_types (id) on delete set null,
  title            text not null,
  description      text,
  status           public.ticket_status not null default 'new',
  priority         public.ticket_priority not null default 'normal',
  due_date         date,
  resolved_at      timestamptz,
  closed_at        timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, reference),
  constraint tickets_title_len check (char_length(btrim(title)) between 3 and 160),
  constraint tickets_description_len check (description is null or char_length(description) <= 20000)
);

-- Covers the default list view (org + status/priority filters, newest first).
create index if not exists tickets_org_status_idx
  on public.tickets (organization_id, status, priority, created_at desc);
create index if not exists tickets_org_assignee_idx
  on public.tickets (organization_id, assignee_id, status);
create index if not exists tickets_org_client_idx
  on public.tickets (organization_id, client_id, created_at desc);
create index if not exists tickets_org_updated_idx
  on public.tickets (organization_id, updated_at desc);
-- Overdue / due-soon widgets only ever look at work still open.
create index if not exists tickets_org_due_open_idx
  on public.tickets (organization_id, due_date)
  where status not in ('resolved', 'closed', 'cancelled');
create index if not exists tickets_title_trgm_idx
  on public.tickets using gin (title gin_trgm_ops);

-- Explicit ticket access, used to scope the `guest` role.
create table if not exists public.ticket_watchers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ticket_id       uuid not null references public.tickets (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (ticket_id, user_id)
);

create index if not exists ticket_watchers_user_idx
  on public.ticket_watchers (user_id, organization_id);

create table if not exists public.ticket_comments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ticket_id       uuid not null references public.tickets (id) on delete cascade,
  author_id       uuid references public.profiles (id) on delete set null,
  body            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint ticket_comments_body_len check (char_length(btrim(body)) between 1 and 10000)
);

create index if not exists ticket_comments_ticket_idx
  on public.ticket_comments (organization_id, ticket_id, created_at);

create table if not exists public.ticket_attachments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ticket_id       uuid not null references public.tickets (id) on delete cascade,
  uploaded_by     uuid references public.profiles (id) on delete set null,
  storage_path    text not null unique,
  file_name       text not null,
  mime_type       text,
  size_bytes      integer not null default 0,
  created_at      timestamptz not null default now(),
  constraint ticket_attachments_size check (size_bytes between 0 and 10485760)
);

create index if not exists ticket_attachments_ticket_idx
  on public.ticket_attachments (organization_id, ticket_id, created_at);

create table if not exists public.ticket_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ticket_id       uuid not null references public.tickets (id) on delete cascade,
  actor_id        uuid references public.profiles (id) on delete set null,
  type            public.ticket_event_type not null,
  from_value      text,
  to_value        text,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists ticket_events_ticket_idx
  on public.ticket_events (organization_id, ticket_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Calendar
-- -----------------------------------------------------------------------------
create table if not exists public.calendar_events (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  ticket_id        uuid references public.tickets (id) on delete set null,
  client_id        uuid references public.clients (id) on delete set null,
  category_id      uuid references public.categories (id) on delete set null,
  activity_type_id uuid references public.activity_types (id) on delete set null,
  title            text not null,
  description      text,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  is_planned       boolean not null default true,
  is_completed     boolean not null default false,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint calendar_events_title_len check (char_length(btrim(title)) between 1 and 160),
  constraint calendar_events_range check (ends_at > starts_at),
  constraint calendar_events_max_span check (ends_at <= starts_at + interval '24 hours')
);

-- The calendar always loads one week at a time, for one tenant.
create index if not exists calendar_events_org_range_idx
  on public.calendar_events (organization_id, starts_at, ends_at);
create index if not exists calendar_events_org_owner_range_idx
  on public.calendar_events (organization_id, owner_id, starts_at);
create index if not exists calendar_events_org_ticket_idx
  on public.calendar_events (organization_id, ticket_id);
create index if not exists calendar_events_org_client_idx
  on public.calendar_events (organization_id, client_id, starts_at);

-- -----------------------------------------------------------------------------
-- Time tracking
-- -----------------------------------------------------------------------------
create table if not exists public.time_entries (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations (id) on delete cascade,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  client_id         uuid references public.clients (id) on delete set null,
  ticket_id         uuid references public.tickets (id) on delete set null,
  category_id       uuid references public.categories (id) on delete set null,
  activity_type_id  uuid references public.activity_types (id) on delete set null,
  calendar_event_id uuid references public.calendar_events (id) on delete set null,
  entry_date        date not null,
  start_time        time,
  end_time          time,
  duration_minutes  integer not null,
  description       text,
  is_billable       boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint time_entries_duration check (duration_minutes between 1 and 1440),
  constraint time_entries_times check (
    (start_time is null and end_time is null) or (start_time is not null and end_time is not null)
  ),
  constraint time_entries_description_len check (description is null or char_length(description) <= 2000)
);

create index if not exists time_entries_org_date_idx
  on public.time_entries (organization_id, entry_date desc);
create index if not exists time_entries_org_user_date_idx
  on public.time_entries (organization_id, user_id, entry_date desc);
create index if not exists time_entries_org_client_date_idx
  on public.time_entries (organization_id, client_id, entry_date desc);
create index if not exists time_entries_org_ticket_idx
  on public.time_entries (organization_id, ticket_id);
create index if not exists time_entries_org_category_date_idx
  on public.time_entries (organization_id, category_id, entry_date desc);

-- -----------------------------------------------------------------------------
-- Notifications and audit trail
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  type            text not null,
  title           text not null,
  body            text,
  link            text,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, organization_id, created_at desc)
  where read_at is null;
create index if not exists notifications_user_idx
  on public.notifications (user_id, organization_id, created_at desc);

create table if not exists public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id        uuid references public.profiles (id) on delete set null,
  action          text not null,
  entity_type     text not null,
  entity_id       uuid,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists audit_logs_org_created_idx
  on public.audit_logs (organization_id, created_at desc);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare
  target text;
begin
  foreach target in array array[
    'profiles', 'organizations', 'organization_members', 'invites', 'categories',
    'activity_types', 'clients', 'tickets', 'ticket_comments', 'calendar_events',
    'time_entries'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      'trg_' || target || '_touch', target
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      'trg_' || target || '_touch', target
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Tenant integrity guards
--
-- RLS decides *whether* a row may be written; these guards decide whether the
-- row is internally consistent. Without them a member of tenant A could attach
-- tenant B's client id to a ticket it is otherwise allowed to insert.
-- -----------------------------------------------------------------------------
create or replace function public.assert_same_org(
  p_table regclass,
  p_id uuid,
  p_organization_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  ok boolean;
begin
  if p_id is null then
    return;
  end if;
  execute format(
    'select exists (select 1 from %s where id = $1 and organization_id = $2)',
    p_table
  ) into ok using p_id, p_organization_id;

  if not ok then
    raise exception 'cross-tenant reference rejected: % % does not belong to organization %',
      p_table, p_id, p_organization_id
      using errcode = 'check_violation';
  end if;
end;
$$;

create or replace function public.tickets_tenant_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_same_org('public.clients', new.client_id, new.organization_id);
  perform public.assert_same_org('public.categories', new.category_id, new.organization_id);
  perform public.assert_same_org('public.activity_types', new.activity_type_id, new.organization_id);
  if new.assignee_id is not null and not exists (
    select 1 from public.organization_members
    where organization_id = new.organization_id and user_id = new.assignee_id
  ) then
    raise exception 'assignee is not a member of organization %', new.organization_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tickets_tenant_guard on public.tickets;
create trigger trg_tickets_tenant_guard
  before insert or update of client_id, category_id, activity_type_id, assignee_id
  on public.tickets
  for each row execute function public.tickets_tenant_guard();

create or replace function public.calendar_events_tenant_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_same_org('public.tickets', new.ticket_id, new.organization_id);
  perform public.assert_same_org('public.clients', new.client_id, new.organization_id);
  perform public.assert_same_org('public.categories', new.category_id, new.organization_id);
  perform public.assert_same_org('public.activity_types', new.activity_type_id, new.organization_id);
  if not exists (
    select 1 from public.organization_members
    where organization_id = new.organization_id and user_id = new.owner_id
  ) then
    raise exception 'event owner is not a member of organization %', new.organization_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_calendar_events_tenant_guard on public.calendar_events;
create trigger trg_calendar_events_tenant_guard
  before insert or update of ticket_id, client_id, category_id, activity_type_id, owner_id
  on public.calendar_events
  for each row execute function public.calendar_events_tenant_guard();

create or replace function public.time_entries_tenant_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_same_org('public.tickets', new.ticket_id, new.organization_id);
  perform public.assert_same_org('public.clients', new.client_id, new.organization_id);
  perform public.assert_same_org('public.categories', new.category_id, new.organization_id);
  perform public.assert_same_org('public.activity_types', new.activity_type_id, new.organization_id);
  perform public.assert_same_org('public.calendar_events', new.calendar_event_id, new.organization_id);
  if not exists (
    select 1 from public.organization_members
    where organization_id = new.organization_id and user_id = new.user_id
  ) then
    raise exception 'time entry owner is not a member of organization %', new.organization_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_time_entries_tenant_guard on public.time_entries;
create trigger trg_time_entries_tenant_guard
  before insert or update of ticket_id, client_id, category_id, activity_type_id, calendar_event_id, user_id
  on public.time_entries
  for each row execute function public.time_entries_tenant_guard();

create or replace function public.activity_types_tenant_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_same_org('public.categories', new.category_id, new.organization_id);
  return new;
end;
$$;

drop trigger if exists trg_activity_types_tenant_guard on public.activity_types;
create trigger trg_activity_types_tenant_guard
  before insert or update of category_id on public.activity_types
  for each row execute function public.activity_types_tenant_guard();

create or replace function public.ticket_child_tenant_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_same_org('public.tickets', new.ticket_id, new.organization_id);
  return new;
end;
$$;

do $$
declare
  target text;
begin
  foreach target in array array['ticket_comments', 'ticket_attachments', 'ticket_events', 'ticket_watchers']
  loop
    execute format('drop trigger if exists %I on public.%I', 'trg_' || target || '_tenant_guard', target);
    execute format(
      'create trigger %I before insert or update of ticket_id on public.%I for each row execute function public.ticket_child_tenant_guard()',
      'trg_' || target || '_tenant_guard', target
    );
  end loop;
end $$;

create or replace function public.client_members_tenant_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.assert_same_org('public.clients', new.client_id, new.organization_id);
  return new;
end;
$$;

drop trigger if exists trg_client_members_tenant_guard on public.client_members;
create trigger trg_client_members_tenant_guard
  before insert or update of client_id on public.client_members
  for each row execute function public.client_members_tenant_guard();

-- -----------------------------------------------------------------------------
-- Per-tenant ticket reference (WH-1, WH-2, …)
-- -----------------------------------------------------------------------------
create or replace function public.assign_ticket_reference()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.reference is not null and new.reference > 0 then
    return new;
  end if;
  -- Serialises reference allocation per tenant without locking the table.
  perform pg_advisory_xact_lock(hashtext('ticket_reference:' || new.organization_id::text));
  select coalesce(max(reference), 0) + 1
    into new.reference
    from public.tickets
   where organization_id = new.organization_id;
  return new;
end;
$$;

-- BEFORE INSERT runs ahead of constraint checking, so `reference` can stay
-- NOT NULL while the client never sends it.
drop trigger if exists trg_tickets_reference on public.tickets;
create trigger trg_tickets_reference
  before insert on public.tickets
  for each row execute function public.assign_ticket_reference();

-- -----------------------------------------------------------------------------
-- Ticket timeline + lifecycle timestamps + assignee notification
-- -----------------------------------------------------------------------------
create or replace function public.tickets_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status in ('resolved') and (old.status is distinct from new.status) then
    new.resolved_at = coalesce(new.resolved_at, now());
  end if;
  if new.status in ('closed', 'cancelled') and (old.status is distinct from new.status) then
    new.closed_at = coalesce(new.closed_at, now());
  end if;
  if new.status not in ('resolved', 'closed', 'cancelled') then
    new.resolved_at = null;
    new.closed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tickets_lifecycle on public.tickets;
create trigger trg_tickets_lifecycle
  before update of status on public.tickets
  for each row execute function public.tickets_lifecycle();

create or replace function public.log_ticket_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.ticket_events (organization_id, ticket_id, actor_id, type, to_value)
    values (new.organization_id, new.id, coalesce(actor, new.creator_id), 'created', new.title);

    if new.assignee_id is not null and new.assignee_id is distinct from actor then
      insert into public.notifications (organization_id, user_id, type, title, body, link)
      values (
        new.organization_id, new.assignee_id, 'ticket_assigned',
        'Ticket assegnato', new.title, '/tickets?ticket=' || new.id::text
      );
    end if;
    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.ticket_events (organization_id, ticket_id, actor_id, type, from_value, to_value)
    values (new.organization_id, new.id, actor, 'status_changed', old.status::text, new.status::text);
  end if;

  if old.priority is distinct from new.priority then
    insert into public.ticket_events (organization_id, ticket_id, actor_id, type, from_value, to_value)
    values (new.organization_id, new.id, actor, 'priority_changed', old.priority::text, new.priority::text);
  end if;

  if old.assignee_id is distinct from new.assignee_id then
    insert into public.ticket_events (organization_id, ticket_id, actor_id, type, from_value, to_value)
    values (new.organization_id, new.id, actor, 'assignee_changed',
            old.assignee_id::text, new.assignee_id::text);

    if new.assignee_id is not null and new.assignee_id is distinct from actor then
      insert into public.notifications (organization_id, user_id, type, title, body, link)
      values (
        new.organization_id, new.assignee_id, 'ticket_assigned',
        'Ticket assegnato', new.title, '/tickets?ticket=' || new.id::text
      );
    end if;
  end if;

  if old.due_date is distinct from new.due_date then
    insert into public.ticket_events (organization_id, ticket_id, actor_id, type, from_value, to_value)
    values (new.organization_id, new.id, actor, 'due_date_changed',
            old.due_date::text, new.due_date::text);
  end if;

  if old.client_id is distinct from new.client_id then
    insert into public.ticket_events (organization_id, ticket_id, actor_id, type, from_value, to_value)
    values (new.organization_id, new.id, actor, 'client_changed',
            old.client_id::text, new.client_id::text);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tickets_timeline_insert on public.tickets;
create trigger trg_tickets_timeline_insert
  after insert on public.tickets
  for each row execute function public.log_ticket_changes();

drop trigger if exists trg_tickets_timeline_update on public.tickets;
create trigger trg_tickets_timeline_update
  after update on public.tickets
  for each row execute function public.log_ticket_changes();

create or replace function public.log_ticket_comment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ticket_title text;
  ticket_assignee uuid;
begin
  insert into public.ticket_events (organization_id, ticket_id, actor_id, type)
  values (new.organization_id, new.ticket_id, new.author_id, 'comment_added');

  select title, assignee_id into ticket_title, ticket_assignee
    from public.tickets where id = new.ticket_id;

  if ticket_assignee is not null and ticket_assignee is distinct from new.author_id then
    insert into public.notifications (organization_id, user_id, type, title, body, link)
    values (
      new.organization_id, ticket_assignee, 'ticket_comment',
      'Nuovo commento', ticket_title, '/tickets?ticket=' || new.ticket_id::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ticket_comments_timeline on public.ticket_comments;
create trigger trg_ticket_comments_timeline
  after insert on public.ticket_comments
  for each row execute function public.log_ticket_comment();

create or replace function public.log_time_entry_on_ticket()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.ticket_id is not null then
    insert into public.ticket_events (organization_id, ticket_id, actor_id, type, to_value)
    values (new.organization_id, new.ticket_id, new.user_id, 'time_logged',
            new.duration_minutes::text);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_time_entries_timeline on public.time_entries;
create trigger trg_time_entries_timeline
  after insert on public.time_entries
  for each row execute function public.log_time_entry_on_ticket();

-- -----------------------------------------------------------------------------
-- Audit trail on membership and organization changes
-- -----------------------------------------------------------------------------
create or replace function public.log_membership_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (new.organization_id, auth.uid(), 'member.added', 'organization_member', new.user_id,
            jsonb_build_object('role', new.role));
    return new;
  elsif tg_op = 'UPDATE' then
    if old.role is distinct from new.role then
      insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
      values (new.organization_id, auth.uid(), 'member.role_changed', 'organization_member', new.user_id,
              jsonb_build_object('from', old.role, 'to', new.role));
    end if;
    return new;
  else
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (old.organization_id, auth.uid(), 'member.removed', 'organization_member', old.user_id,
            jsonb_build_object('role', old.role));
    return old;
  end if;
end;
$$;

drop trigger if exists trg_members_audit on public.organization_members;
create trigger trg_members_audit
  after insert or update or delete on public.organization_members
  for each row execute function public.log_membership_change();

create or replace function public.log_destructive_action()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    old.organization_id, auth.uid(), tg_argv[0] || '.deleted', tg_argv[0], old.id,
    jsonb_build_object('label', coalesce(to_jsonb(old) ->> 'name', to_jsonb(old) ->> 'title'))
  );
  return old;
end;
$$;

drop trigger if exists trg_tickets_audit_delete on public.tickets;
create trigger trg_tickets_audit_delete
  after delete on public.tickets
  for each row execute function public.log_destructive_action('ticket');

drop trigger if exists trg_clients_audit_delete on public.clients;
create trigger trg_clients_audit_delete
  after delete on public.clients
  for each row execute function public.log_destructive_action('client');

-- -----------------------------------------------------------------------------
-- Auth bridge: every auth user gets a profile row
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(profiles.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists trg_auth_user_created on auth.users;
create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email, updated_at = now() where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auth_user_email_changed on auth.users;
create trigger trg_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();
