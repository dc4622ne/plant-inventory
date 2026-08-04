-- Plant Tracker v0.26.0 / application schema version 1.
-- Release E creates an inactive foundation only; it does not migrate browser data.
create extension if not exists pgcrypto;

create table public.schema_metadata (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.schema_metadata (key, value) values
  ('application_schema_version', '1'::jsonb),
  ('backup_schema_version', '4'::jsonb);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, record_version bigint not null default 1
);

create table public.plants (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text, lifecycle_status text, origin text, lifecycle_stage text,
  name text not null default '', genus text, scientific_name text, common_name text, type text,
  source text, location text, status text, attention text,
  image_url text, watch_list boolean not null default false, favorite boolean not null default false,
  acquired_date date, purchase_price numeric(12,2), wishlist_status text,
  last_watered date, last_fertilized date, repot_date date, last_checked date, next_check date,
  do_not_touch_until date, watering text, care_note text, light_needs text, medium text,
  watering_rhythm text, moisture_preference text, care_difficulty text, pot_size text,
  thirst_level text, soil_mix text, propagation_status text,
  pest_quarantine_start_date date, pest_quarantine_end_date date, pest_notes text, growth_notes text,
  tc_stage text, tc_deflask_date date, tc_acclimation_start_date date, tc_acclimation_end_date date,
  tc_setup text, tc_humidity_level text, tc_notes text,
  track_leca_conversion boolean not null default false, leca_status text, leca_conversion_start_date date,
  leca_root_status text, leca_reservoir_setup text, leca_nutrient_status text, leca_flush_rhythm text,
  leca_stress_level text, leca_notes text,
  corm_received_date date, corm_started_date date, corm_parent_plant_id uuid,
  corm_initial_condition text, corm_growth_method text, corm_custom_growth_method text,
  corm_sprouting_method text, corm_medium text, corm_root_emergence_date date, corm_growth_point_date date,
  corm_first_leaf_emerging_date date, corm_first_leaf_opened_date date, corm_first_leaf_date date,
  corm_transfer_date date, corm_established_date date, corm_phase text, corm_stage text,
  corm_progress_notes text, corm_outcome text,
  legacy_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, record_version bigint not null default 1,
  unique (user_id, legacy_id)
);

create table public.plant_photos (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid, legacy_id text, storage_path text not null,
  caption text, photo_type text, event_date date, is_primary boolean not null default false,
  sort_order integer not null default 0, content_type text, byte_size bigint, width integer, height integer,
  legacy_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1, unique (user_id, storage_path)
);

create table public.plant_journal_entries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid, legacy_id text, body text not null default '',
  observed_at timestamptz not null, photo_id uuid,
  status text, filed_at timestamptz, filed_as text, destination_id text, edited_at timestamptz,
  legacy_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1
);

create table public.plant_check_ins (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid, legacy_id text, title text, reminder_type text,
  due_date date, event_at timestamptz, status text, note text, snoozed_until date, completion_history jsonb not null default '[]'::jsonb,
  legacy_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1
);

create table public.plant_health_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid not null, legacy_id text, event_at timestamptz not null,
  event_type text, title text, notes text, photo_id uuid,
  source text, source_id text, legacy_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1
);

create table public.plant_activity_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid not null, legacy_id text, event_at timestamptz not null,
  activity_type text, notes text, photo_id uuid,
  legacy_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1
);

create table public.plant_corm_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid not null, legacy_id text, event_at timestamptz not null,
  phase text, growth_method text, notes text, photo_id uuid,
  legacy_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1
);

create table public.plant_tc_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid not null, legacy_id text, event_at timestamptz not null,
  stage text, setup text, humidity_level text, notes text, legacy_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1
);

create table public.plant_leca_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plant_id uuid not null, legacy_id text, event_at timestamptz not null,
  status text, root_status text, reservoir_setup text, nutrient_status text, flush_rhythm text, stress_level text,
  notes text, legacy_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1
);

create table public.plant_relationships (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  parent_plant_id uuid not null,
  child_plant_id uuid not null, relationship_type text not null,
  event_date date, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  deleted_at timestamptz, record_version bigint not null default 1,
  constraint plant_relationship_not_self check (parent_plant_id <> child_plant_id)
);

create table public.plant_spaces (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text, name text not null, description text, background_photo_id uuid,
  background_dim numeric(5,2), location_value text, width numeric(8,2), height numeric(8,2), default_display_mode text,
  placements jsonb not null default '[]'::jsonb, legacy_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text, name text not null default '', genus text, type text, desired_status text, source text, price numeric(12,2),
  order_date date, ship_date date, expected_arrival_date date, actual_arrival_date date, tracking text, notes text,
  photo_id uuid, converted boolean not null default false,
  converted_plant_id uuid, legacy_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1
);

create table public.garden_beds (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text, name text not null, location text, size text, sun_exposure text, notes text,
  photo_id uuid,
  crops jsonb not null default '[]'::jsonb, activities jsonb not null default '[]'::jsonb, harvests jsonb not null default '[]'::jsonb,
  legacy_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1
);

create table public.dashboard_preferences (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
  preference_version integer not null, cards jsonb not null default '[]'::jsonb, device_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1
);
create table public.quick_views (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text, name text not null, state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1, unique(user_id, legacy_id)
);
create table public.dropdown_options (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  field_name text not null, value text not null, is_builtin boolean not null default false, sort_order integer,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1, unique(user_id, field_name, value)
);

create table public.device_registrations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  device_key text not null, label text, platform text, last_seen_at timestamptz, capabilities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1, unique(user_id, device_key)
);
create table public.migration_runs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  application_schema_version integer not null, backup_schema_version integer not null, status text not null default 'not_started',
  source_device text, started_at timestamptz, completed_at timestamptz, record_counts jsonb not null default '{}'::jsonb,
  photo_count bigint not null default 0, conflict_count bigint not null default 0, failure_details jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1,
  constraint migration_status_valid check (status in ('not_started','preflight','backup_created','importing','merging','awaiting_conflict_review','completed','failed','rolled_back'))
);
create table public.migration_conflicts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  migration_run_id uuid not null,
  entity_type text not null, local_record_id text, database_record_id uuid, conflict_type text not null,
  local_value jsonb, database_value jsonb, resolution text, resolved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  record_version bigint not null default 1
);

-- Composite ownership foreign keys prevent cross-user links even when UUIDs are guessed.
alter table public.plants add constraint plants_owner_id_unique unique (user_id, id);
alter table public.plant_photos add constraint plant_photos_owner_id_unique unique (user_id, id);
alter table public.migration_runs add constraint migration_runs_owner_id_unique unique (user_id, id);
alter table public.plants add constraint plants_corm_parent_owned foreign key (user_id, corm_parent_plant_id) references public.plants(user_id, id) on delete set null (corm_parent_plant_id);
alter table public.plant_photos add constraint plant_photos_plant_owned foreign key (user_id, plant_id) references public.plants(user_id, id) on delete cascade;
alter table public.plant_journal_entries add constraint plant_journal_plant_owned foreign key (user_id, plant_id) references public.plants(user_id, id) on delete set null (plant_id);
alter table public.plant_journal_entries add constraint plant_journal_photo_owned foreign key (user_id, photo_id) references public.plant_photos(user_id, id) on delete set null (photo_id);
alter table public.plant_check_ins add constraint plant_check_ins_plant_owned foreign key (user_id, plant_id) references public.plants(user_id, id) on delete cascade;
alter table public.plant_health_events add constraint plant_health_plant_owned foreign key (user_id, plant_id) references public.plants(user_id, id) on delete cascade;
alter table public.plant_health_events add constraint plant_health_photo_owned foreign key (user_id, photo_id) references public.plant_photos(user_id, id) on delete set null (photo_id);
alter table public.plant_activity_events add constraint plant_activity_plant_owned foreign key (user_id, plant_id) references public.plants(user_id, id) on delete cascade;
alter table public.plant_activity_events add constraint plant_activity_photo_owned foreign key (user_id, photo_id) references public.plant_photos(user_id, id) on delete set null (photo_id);
alter table public.plant_corm_events add constraint plant_corm_plant_owned foreign key (user_id, plant_id) references public.plants(user_id, id) on delete cascade;
alter table public.plant_corm_events add constraint plant_corm_photo_owned foreign key (user_id, photo_id) references public.plant_photos(user_id, id) on delete set null (photo_id);
alter table public.plant_tc_events add constraint plant_tc_plant_owned foreign key (user_id, plant_id) references public.plants(user_id, id) on delete cascade;
alter table public.plant_leca_events add constraint plant_leca_plant_owned foreign key (user_id, plant_id) references public.plants(user_id, id) on delete cascade;
alter table public.plant_relationships add constraint plant_relationship_parent_owned foreign key (user_id, parent_plant_id) references public.plants(user_id, id) on delete cascade;
alter table public.plant_relationships add constraint plant_relationship_child_owned foreign key (user_id, child_plant_id) references public.plants(user_id, id) on delete cascade;
alter table public.plant_spaces add constraint plant_spaces_photo_owned foreign key (user_id, background_photo_id) references public.plant_photos(user_id, id) on delete set null (background_photo_id);
alter table public.wishlist_items add constraint wishlist_photo_owned foreign key (user_id, photo_id) references public.plant_photos(user_id, id) on delete set null (photo_id);
alter table public.wishlist_items add constraint wishlist_converted_plant_owned foreign key (user_id, converted_plant_id) references public.plants(user_id, id) on delete set null (converted_plant_id);
alter table public.garden_beds add constraint garden_beds_photo_owned foreign key (user_id, photo_id) references public.plant_photos(user_id, id) on delete set null (photo_id);
alter table public.migration_conflicts add constraint migration_conflicts_run_owned foreign key (user_id, migration_run_id) references public.migration_runs(user_id, id) on delete cascade;

-- Ownership columns and relationship columns are indexed for sync and timeline queries.
do $$
declare table_name text;
begin
  foreach table_name in array array['plants','plant_photos','plant_journal_entries','plant_check_ins','plant_health_events','plant_activity_events','plant_corm_events','plant_tc_events','plant_leca_events','plant_relationships','plant_spaces','wishlist_items','garden_beds','dashboard_preferences','quick_views','dropdown_options','migration_runs','migration_conflicts','device_registrations']
  loop execute format('create index %I on public.%I (user_id, updated_at)', table_name || '_owner_updated_idx', table_name); end loop;
end $$;
create index plant_photos_plant_idx on public.plant_photos(plant_id, event_date);
create index plant_journal_plant_idx on public.plant_journal_entries(plant_id, observed_at);
create index plant_check_ins_plant_idx on public.plant_check_ins(plant_id, due_date);
create index plant_health_plant_idx on public.plant_health_events(plant_id, event_at);
create index plant_activity_plant_idx on public.plant_activity_events(plant_id, event_at);
create index plant_corm_plant_idx on public.plant_corm_events(plant_id, event_at);
create index plant_tc_plant_idx on public.plant_tc_events(plant_id, event_at);
create index plant_leca_plant_idx on public.plant_leca_events(plant_id, event_at);
create index plant_relationship_parent_idx on public.plant_relationships(parent_plant_id);
create index plant_relationship_child_idx on public.plant_relationships(child_plant_id);
create index migration_conflicts_run_idx on public.migration_conflicts(migration_run_id);
-- Cover composite ownership foreign keys in their declared column order.
create index plants_corm_parent_owned_idx on public.plants(user_id, corm_parent_plant_id);
create index plant_photos_plant_owned_idx on public.plant_photos(user_id, plant_id);
create index plant_journal_plant_owned_idx on public.plant_journal_entries(user_id, plant_id);
create index plant_journal_photo_owned_idx on public.plant_journal_entries(user_id, photo_id);
create index plant_check_ins_plant_owned_idx on public.plant_check_ins(user_id, plant_id);
create index plant_health_plant_owned_idx on public.plant_health_events(user_id, plant_id);
create index plant_health_photo_owned_idx on public.plant_health_events(user_id, photo_id);
create index plant_activity_plant_owned_idx on public.plant_activity_events(user_id, plant_id);
create index plant_activity_photo_owned_idx on public.plant_activity_events(user_id, photo_id);
create index plant_corm_plant_owned_idx on public.plant_corm_events(user_id, plant_id);
create index plant_corm_photo_owned_idx on public.plant_corm_events(user_id, photo_id);
create index plant_tc_plant_owned_idx on public.plant_tc_events(user_id, plant_id);
create index plant_leca_plant_owned_idx on public.plant_leca_events(user_id, plant_id);
create index plant_relationship_parent_owned_idx on public.plant_relationships(user_id, parent_plant_id);
create index plant_relationship_child_owned_idx on public.plant_relationships(user_id, child_plant_id);
create index plant_spaces_photo_owned_idx on public.plant_spaces(user_id, background_photo_id);
create index wishlist_photo_owned_idx on public.wishlist_items(user_id, photo_id);
create index wishlist_converted_plant_owned_idx on public.wishlist_items(user_id, converted_plant_id);
create index garden_beds_photo_owned_idx on public.garden_beds(user_id, photo_id);
create index migration_conflicts_run_owned_idx on public.migration_conflicts(user_id, migration_run_id);

-- Every exposed, user-owned table requires authenticated ownership for every operation.
do $$
declare table_name text;
begin
  foreach table_name in array array['plants','plant_photos','plant_journal_entries','plant_check_ins','plant_health_events','plant_activity_events','plant_corm_events','plant_tc_events','plant_leca_events','plant_relationships','plant_spaces','wishlist_items','garden_beds','dashboard_preferences','quick_views','dropdown_options','migration_runs','migration_conflicts','device_registrations']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)', table_name || '_delete_own', table_name);
  end loop;
end $$;
alter table public.profiles enable row level security;
create policy profiles_select_self on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_self on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_delete_self on public.profiles for delete to authenticated using (id = (select auth.uid()));
alter table public.schema_metadata enable row level security;
create policy schema_metadata_read_authenticated on public.schema_metadata for select to authenticated
using ((select auth.uid()) is not null);

-- Security-invoker RPC: RLS remains active. Protected ownership/version fields cannot be patched.
create or replace function public.update_versioned_record(target_table text, target_id uuid, expected_version bigint, changes jsonb)
returns setof jsonb language plpgsql security invoker set search_path = '' as $$
declare allowed_tables constant text[] := array['plants','plant_photos','plant_journal_entries','plant_check_ins','plant_health_events','plant_activity_events','plant_corm_events','plant_tc_events','plant_leca_events','plant_relationships','plant_spaces','wishlist_items','garden_beds','dashboard_preferences','quick_views','dropdown_options'];
declare key text; set_clause text := ''; result jsonb;
begin
  if not (target_table = any(allowed_tables)) then raise exception using errcode = 'PT400', message = 'Table is not version-update enabled.'; end if;
  changes := changes - array['id','user_id','created_at','updated_at','record_version'];
  for key in select jsonb_object_keys(changes) loop
    if set_clause <> '' then set_clause := set_clause || ', '; end if;
    set_clause := set_clause || format('%1$I = patch.%1$I', key);
  end loop;
  if set_clause <> '' then set_clause := set_clause || ', '; end if;
  execute format('update public.%1$I as target set %2$s updated_at = now(), record_version = target.record_version + 1 from jsonb_populate_record(null::public.%1$I, $4) patch where target.id = $1 and target.user_id = (select auth.uid()) and target.record_version = $2 returning to_jsonb(target)', target_table, set_clause)
    into result using target_id, expected_version, target_table, changes;
  if result is null then raise exception using errcode = 'PT409', message = 'Version conflict or record unavailable.'; end if;
  return next result;
end $$;
revoke all on function public.update_versioned_record(text,uuid,bigint,jsonb) from public, anon;
grant execute on function public.update_versioned_record(text,uuid,bigint,jsonb) to authenticated;

create or replace function public.get_application_schema_version() returns integer language sql stable security invoker set search_path = '' as $$
  select (value #>> '{}')::integer from public.schema_metadata where key = 'application_schema_version';
$$;
revoke all on function public.get_application_schema_version() from public, anon;
grant execute on function public.get_application_schema_version() to authenticated;

-- Private bucket and user-folder policies. Object names must start with the caller UUID.
insert into storage.buckets (id, name, public) values ('plant-photos', 'plant-photos', false)
on conflict (id) do update set public = false;
create policy plant_photos_storage_select_own on storage.objects for select to authenticated
using (bucket_id = 'plant-photos' and owner_id = (select auth.uid())::text and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy plant_photos_storage_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'plant-photos' and owner_id = (select auth.uid())::text and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy plant_photos_storage_update_own on storage.objects for update to authenticated
using (bucket_id = 'plant-photos' and owner_id = (select auth.uid())::text and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'plant-photos' and owner_id = (select auth.uid())::text and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy plant_photos_storage_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'plant-photos' and owner_id = (select auth.uid())::text and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Data API access is explicit; RLS still controls every row.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;
