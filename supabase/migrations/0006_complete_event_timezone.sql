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
