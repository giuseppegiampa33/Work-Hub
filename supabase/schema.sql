-- =============================================================================
-- Work-Hub · consolidated schema
-- Generated from supabase/migrations by scripts/print-schema.mjs — do not edit.
-- Apply once in the Supabase SQL editor, then re-run after pulling migrations.
-- =============================================================================


-- >>> 0001_schema.sql =======================================================

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


-- >>> 0002_rls.sql ==========================================================

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


-- >>> 0003_functions.sql ====================================================

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


-- >>> 0004_storage.sql ======================================================

-- =============================================================================
-- Work-Hub · 0004 · Storage
--
-- Three buckets, each with a path convention that the policies rely on:
--
--   avatars/<user_id>/<file>                         public read, owner write
--   org-logos/<organization_id>/<file>               public read, org:manage write
--   ticket-attachments/<organization_id>/<ticket_id>/<file>
--                                                    private, tenant-scoped
--
-- Binary data never lives in a table; only the metadata row does.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152,
   array['image/png', 'image/jpeg', 'image/webp']),
  ('org-logos', 'org-logos', true, 2097152,
   array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('ticket-attachments', 'ticket-attachments', false, 10485760, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- avatars
-- -----------------------------------------------------------------------------
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists avatars_write_own on storage.objects;
create policy avatars_write_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- -----------------------------------------------------------------------------
-- org-logos
-- -----------------------------------------------------------------------------
drop policy if exists org_logos_read on storage.objects;
create policy org_logos_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'org-logos');

drop policy if exists org_logos_write on storage.objects;
create policy org_logos_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'org-logos'
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'org:manage')
  );

drop policy if exists org_logos_update on storage.objects;
create policy org_logos_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'org-logos'
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'org:manage')
  )
  with check (
    bucket_id = 'org-logos'
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'org:manage')
  );

drop policy if exists org_logos_delete on storage.objects;
create policy org_logos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'org-logos'
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'org:manage')
  );

-- -----------------------------------------------------------------------------
-- ticket-attachments — private, tenant-scoped by the first path segment
-- -----------------------------------------------------------------------------
drop policy if exists ticket_attachments_read on storage.objects;
create policy ticket_attachments_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and public.can_see_ticket(
      ((storage.foldername(name))[1])::uuid,
      ((storage.foldername(name))[2])::uuid
    )
  );

drop policy if exists ticket_attachments_write on storage.objects;
create policy ticket_attachments_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'ticket-attachments'
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'tickets:update')
    and public.can_see_ticket(
      ((storage.foldername(name))[1])::uuid,
      ((storage.foldername(name))[2])::uuid
    )
  );

drop policy if exists ticket_attachments_remove on storage.objects;
create policy ticket_attachments_remove on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'ticket-attachments'
    and (
      owner_id = auth.uid()::text
      or public.has_org_permission(((storage.foldername(name))[1])::uuid, 'tickets:delete')
    )
  );


-- >>> 0005_cascade_guards.sql ===============================================

-- =============================================================================
-- Work-Hub · 0005 · Guardie compatibili con la cascata
--
-- Problema corretto qui: eliminare un'organizzazione era impossibile.
--
-- `DELETE FROM organizations` propaga per cascata su `organization_members`,
-- e il trigger BEFORE DELETE `protect_last_owner` vedeva sparire l'ultimo
-- proprietario e sollevava "an organization must keep at least one owner".
-- Lo stesso valeva per i tre trigger di audit, che inserivano in `audit_logs`
-- una riga con la foreign key verso un'organizzazione già cancellata.
--
-- La correzione è una sola condizione, ripetuta: se l'organizzazione non esiste
-- più, la cascata è già in corso e la guardia non ha nulla da proteggere.
--
-- Il vincolo vero resta intatto: finché l'organizzazione esiste, non si può
-- rimuovere né declassare il suo unico proprietario.
-- =============================================================================

create or replace function public.protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_count integer;
begin
  -- L'organizzazione è in corso di eliminazione: la cascata può procedere.
  if not exists (select 1 from public.organizations where id = old.organization_id) then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

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

create or replace function public.log_membership_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    -- Nessun audit per una cascata: la riga punterebbe a un'organizzazione
    -- che non esiste più e violerebbe la foreign key.
    if exists (select 1 from public.organizations where id = old.organization_id) then
      insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
      values (old.organization_id, auth.uid(), 'member.removed', 'organization_member', old.user_id,
              jsonb_build_object('role', old.role));
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (new.organization_id, auth.uid(), 'member.added', 'organization_member', new.user_id,
            jsonb_build_object('role', new.role));
    return new;
  end if;

  if old.role is distinct from new.role then
    insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
    values (new.organization_id, auth.uid(), 'member.role_changed', 'organization_member', new.user_id,
            jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  return new;
end;
$$;

create or replace function public.log_destructive_action()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.organizations where id = old.organization_id) then
    return old;
  end if;

  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    old.organization_id, auth.uid(), tg_argv[0] || '.deleted', tg_argv[0], old.id,
    jsonb_build_object('label', coalesce(to_jsonb(old) ->> 'name', to_jsonb(old) ->> 'title'))
  );
  return old;
end;
$$;


-- >>> 0006_complete_event_timezone.sql ======================================

-- =============================================================================
-- Work-Hub · 0006 · Fuso orario nella consuntivazione
--
-- Problema corretto qui: un'attività pianificata alle 09:00 produceva una riga
-- ore delle 07:00.
--
-- `complete_calendar_event` ricavava data e orari con `ev.starts_at::date` e
-- `ev.starts_at::time`. Il cast di un `timestamptz` usa il fuso della sessione,
-- e la sessione di PostgREST è UTC: l'orario finiva registrato in UTC invece
-- che nell'ora di lavoro reale. La durata era corretta (è una differenza), ma
-- l'orario mostrato nel registro ore no — e un'attività a cavallo della
-- mezzanotte sarebbe finita nel giorno sbagliato.
--
-- La correzione aggiunge un parametro `p_timezone`: il client passa il proprio
-- fuso (`Intl.DateTimeFormat().resolvedOptions().timeZone`), il default resta
-- 'UTC' per compatibilità.
-- =============================================================================

create or replace function public.complete_calendar_event(
  p_event uuid,
  p_duration_minutes integer default null,
  p_description text default null,
  p_is_billable boolean default true,
  p_timezone text default 'UTC'
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  ev public.calendar_events;
  local_start timestamp;
  local_end timestamp;
  minutes integer;
  entry_id uuid;
begin
  -- RLS decide se questa riga è visibile e modificabile da chi chiama.
  select * into ev from public.calendar_events where id = p_event;
  if ev.id is null then
    raise exception 'calendar event not found' using errcode = 'no_data_found';
  end if;

  -- Le ore si registrano sempre a nome di chi ha svolto il lavoro.
  if ev.owner_id <> auth.uid() then
    raise exception 'only the owner of the event can log its hours' using errcode = '42501';
  end if;

  -- L'istante assoluto riportato all'ora locale di chi consuntiva.
  local_start := ev.starts_at at time zone coalesce(nullif(btrim(p_timezone), ''), 'UTC');
  local_end := ev.ends_at at time zone coalesce(nullif(btrim(p_timezone), ''), 'UTC');

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
    ev.activity_type_id, ev.id, local_start::date, local_start::time, local_end::time,
    minutes, coalesce(nullif(btrim(p_description), ''), ev.title), p_is_billable
  )
  returning id into entry_id;

  update public.calendar_events
     set is_completed = true, is_planned = false
   where id = ev.id;

  return entry_id;
end;
$$;

revoke all on function public.complete_calendar_event(uuid, integer, text, boolean, text)
  from public, anon;
grant execute on function public.complete_calendar_event(uuid, integer, text, boolean, text)
  to authenticated;

-- La vecchia firma a 4 parametri non deve restare raggiungibile.
drop function if exists public.complete_calendar_event(uuid, integer, text, boolean);
