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
