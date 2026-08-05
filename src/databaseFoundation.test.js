import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSupabaseClient, readSupabaseConfiguration, supabase as canonicalSupabase } from './lib/supabaseClient.js';
import { supabase as legacySupabase } from './supabaseClient.js';
import { normalizeDataError } from './data/errors.js';
import { selectRepository } from './data/index.js';
import { createAuthService } from './services/authService.js';
import { createDatabaseService } from './services/databaseService.js';
import { checkSchemaCompatibility } from './data/schemaCompatibility.js';

const disabledFlags = { databaseEnabled: false, authEnabled: false, realtimeEnabled: false };

test('missing or partial Supabase configuration is safe', () => {
  assert.equal(readSupabaseConfiguration().configured, false);
  assert.equal(readSupabaseConfiguration({ VITE_SUPABASE_URL: 'https://example.supabase.co' }).configured, false);
  assert.equal(createSupabaseClient(readSupabaseConfiguration()), null);
});

test('configured Supabase client is created once through the supplied factory', () => {
  let calls = 0;
  const config = readSupabaseConfiguration({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-key' });
  const client = createSupabaseClient(config, (url, key) => { calls += 1; return { url, key }; });
  assert.equal(calls, 1);
  assert.equal(client.key, 'public-key');
});

test('legacy Supabase module re-exports the canonical singleton', () => {
  assert.equal(legacySupabase, canonicalSupabase);
});

test('repository selection keeps local storage as the default', async () => {
  const values = new Map([['plant-inventory-plants', JSON.stringify([{ id: 'local' }])]]);
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const repository = selectRepository('plants', { flags: disabledFlags, storage });
  assert.deepEqual(await repository.getAll(), [{ id: 'local' }]);
});

test('malformed and missing flags remain local, but deliberately enabled database mode never falls back', async () => {
  const storage = { getItem: () => '[]', setItem: () => {} };
  for (const databaseEnabled of [false, undefined, 'true', 'TRUE']) {
    const repository = selectRepository('plants', { flags: { databaseEnabled }, storage });
    assert.deepEqual(await repository.getAll(), []);
  }
  assert.throws(
    () => selectRepository('plants', { flags: { databaseEnabled: true }, storage }),
    { code: 'DATABASE_CONFIGURATION_ERROR' },
  );
});

test('local repository soft-deletes, restores, and only includes deleted records intentionally', async () => {
  const values = new Map([['plant-inventory-plants', JSON.stringify([{ id: 'plant-a' }])]]);
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const repository = selectRepository('plants', { flags: disabledFlags, storage });
  await repository.softDelete('plant-a');
  assert.deepEqual(await repository.getAll(), []);
  assert.equal((await repository.getAll({ includeDeleted: true }))[0].id, 'plant-a');
  assert.equal(await repository.getById('plant-a'), null);
  await repository.restore('plant-a');
  assert.equal((await repository.getById('plant-a')).id, 'plant-a');
  assert.equal('purge' in repository, false);
  assert.equal('delete' in repository, false);
});

test('raw provider errors are normalized without leaking provider messages', () => {
  const error = normalizeDataError({ code: '500', message: 'secret internal detail' }, 'getAll');
  assert.equal(error.code, 'DATA_ACCESS_ERROR');
  assert.equal(error.message.includes('secret'), false);
});

test('auth and database services reject safely while disabled without calling clients', async () => {
  const auth = createAuthService({ client: null, flags: disabledFlags });
  const database = createDatabaseService({ client: null, flags: disabledFlags });
  await assert.rejects(auth.getCurrentUser(), { code: 'FEATURE_DISABLED' });
  await assert.rejects(database.testConnection(), { code: 'FEATURE_DISABLED' });
});

test('schema compatibility distinguishes matching, older, newer, and invalid versions', () => {
  assert.equal(checkSchemaCompatibility(1).compatible, true);
  assert.equal(checkSchemaCompatibility(0).reason, 'missing_or_invalid');
  assert.equal(checkSchemaCompatibility(2).reason, 'database_newer');
});

test('versioned Supabase updates send the expected record version', async () => {
  let rpcArgs;
  const client = { rpc: async (name, args) => { rpcArgs = { name, args }; return { data: [{ id: args.target_id, record_version: 2 }], error: null }; } };
  const repository = selectRepository('plants', { flags: { ...disabledFlags, databaseEnabled: true }, client, userId: 'user' });
  const updated = await repository.update('plant-a', { name: 'Updated' }, 1);
  assert.equal(rpcArgs.args.expected_version, 1);
  assert.equal(updated.record_version, 2);
});

test('migration statically enforces profile, storage, ownership, and atomic version safeguards', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260804000000_database_foundation.sql', import.meta.url), 'utf8');
  const profilesSql = sql.slice(sql.indexOf('create table public.profiles'), sql.indexOf('create table public.plants'));
  assert.match(sql, /create table public\.profiles \(\s*id uuid primary key references auth\.users\(id\)/s);
  assert.doesNotMatch(profilesSql, /user_id/);
  assert.match(sql, /profiles_insert_self[\s\S]*?with check \(id = \(select auth\.uid\(\)\)\)/);
  for (const operation of ['select', 'insert', 'update', 'delete']) {
    assert.match(sql, new RegExp(`plant_photos_storage_${operation}_own[\\s\\S]*?storage\\.foldername\\(name\\)\\)\\[1\\] = \\(select auth\\.uid\\(\\)\\)::text`));
  }
  assert.match(sql, /plant_photos_storage_update_own[\s\S]*?using[\s\S]*?with check/);
  assert.match(sql, /owner_id = \(select auth\.uid\(\)\)::text/);
  assert.match(sql, /update public\.%1\$I[\s\S]*?target\.id = \$1[\s\S]*?target\.user_id = \(select auth\.uid\(\)\)[\s\S]*?target\.record_version = \$2/);
  assert.match(sql, /record_version = target\.record_version \+ 1/);
  assert.match(sql, /changes := changes - array\['id','user_id','created_at','updated_at','record_version'\]/);
  assert.match(sql, /security invoker set search_path = ''/);
  assert.match(sql, /foreign key \(user_id, plant_id\) references public\.plants\(user_id, id\)/);
});
