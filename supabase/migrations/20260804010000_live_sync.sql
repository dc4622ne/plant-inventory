-- Plant Tracker v0.27.0 — Connected Collection: Live Sync
create table public.sync_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 1 check (revision > 0),
  last_mutation_id uuid,
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (user_id, entity_type, entity_id),
  unique (user_id, last_mutation_id)
);
create index sync_records_owner_updated_idx on public.sync_records(user_id, updated_at);
create index sync_records_owner_deleted_idx on public.sync_records(user_id, deleted_at);
alter table public.sync_records enable row level security;
create policy sync_records_select_own on public.sync_records for select to authenticated using ((select auth.uid()) = user_id);
create policy sync_records_insert_own on public.sync_records for insert to authenticated with check ((select auth.uid()) = user_id);
create policy sync_records_update_own on public.sync_records for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy sync_records_delete_own on public.sync_records for delete to authenticated using ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.sync_records to authenticated;

create or replace function public.apply_sync_mutation(
  p_mutation_id uuid, p_entity_type text, p_entity_id text, p_expected_revision bigint,
  p_payload jsonb, p_deleted_at timestamptz, p_device_id text
) returns setof public.sync_records language plpgsql security invoker set search_path = '' as $$
declare current_row public.sync_records;
begin
  select * into current_row from public.sync_records
    where user_id = (select auth.uid()) and entity_type = p_entity_type and entity_id = p_entity_id for update;
  if found and current_row.last_mutation_id = p_mutation_id then return next current_row; return; end if;
  if found and current_row.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'SYNC_REVISION_CONFLICT';
  end if;
  if found then
    update public.sync_records set payload = p_payload, revision = revision + 1,
      last_mutation_id = p_mutation_id, device_id = p_device_id, deleted_at = p_deleted_at, updated_at = now()
      where id = current_row.id returning * into current_row;
  else
    if p_expected_revision <> 0 then raise exception using errcode = '40001', message = 'SYNC_RECORD_MISSING'; end if;
    insert into public.sync_records(user_id, entity_type, entity_id, payload, last_mutation_id, device_id, deleted_at)
      values ((select auth.uid()), p_entity_type, p_entity_id, p_payload, p_mutation_id, p_device_id, p_deleted_at)
      returning * into current_row;
  end if;
  return next current_row;
end $$;
revoke all on function public.apply_sync_mutation(uuid,text,text,bigint,jsonb,timestamptz,text) from public, anon;
grant execute on function public.apply_sync_mutation(uuid,text,text,bigint,jsonb,timestamptz,text) to authenticated;
alter publication supabase_realtime add table public.sync_records;

alter table public.plant_photos
  add column if not exists original_filename text,
  add column if not exists content_hash text,
  add column if not exists thumbnail_path text,
  add column if not exists migration_state text not null default 'complete';
create unique index if not exists plant_photos_owner_hash_idx on public.plant_photos(user_id, content_hash) where content_hash is not null and deleted_at is null;
