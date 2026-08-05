import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createLiveSyncProvider } from './services/liveSyncProvider.js';

test('live-sync migration has ownership RLS, idempotency, optimistic concurrency, and realtime', () => {
  const sql = readFileSync(new URL('../supabase/migrations/20260804010000_live_sync.sql', import.meta.url), 'utf8');
  assert.match(sql, /enable row level security/);
  assert.match(sql, /auth\.uid\(\)\) = user_id/);
  assert.match(sql, /unique \(user_id, last_mutation_id\)/);
  assert.match(sql, /current_row\.revision <> p_expected_revision/);
  assert.match(sql, /security invoker set search_path = ''/);
  assert.match(sql, /supabase_realtime add table public\.sync_records/);
});

test('live provider sends a stable mutation id and expected base revision', async () => {
  let rpc;
  const client = { rpc(name, values) { rpc = { name, values }; return Promise.resolve({ data: [], error: null }); } };
  const provider = createLiveSyncProvider({ client, userId: 'user-a' });
  await provider.applyChange({ id: '11111111-1111-4111-8111-111111111111', entityType: 'plant', entityId: 'plant-a', deviceId: 'device-a', payload: { sync: { baseVersion: 7 } } });
  assert.equal(rpc.name, 'apply_sync_mutation');
  assert.equal(rpc.values.p_mutation_id, '11111111-1111-4111-8111-111111111111');
  assert.equal(rpc.values.p_expected_revision, 7);
});

test('live provider applies the Realtime JWT before creating exactly one channel', async () => {
  const calls = []; let callback;
  const channel = { on() { calls.push('on'); return this; }, subscribe(next) { calls.push('subscribe'); callback = next; return this; } };
  const client = { realtime: { async setAuth(token) { calls.push(`auth:${token}`); }, isConnected: () => true }, channel(topic) { calls.push(`channel:${topic}`); return channel; }, getChannels: () => [channel], async removeChannel() { calls.push('remove'); } };
  const provider = createLiveSyncProvider({ client, userId: 'user-a' });
  const statuses = []; const unsubscribe = await provider.subscribe(() => {}, (status, error, details) => statuses.push({ status, error, details }), 'jwt-a');
  callback('SUBSCRIBED');
  assert.deepEqual(calls.slice(0, 4), ['auth:jwt-a', 'channel:collection:user-a', 'on', 'subscribe']);
  assert.equal(statuses.at(-1).status, 'SUBSCRIBED'); assert.equal(statuses.at(-1).details.activeChannelCount, 1);
  await unsubscribe(); assert.equal(calls.at(-1), 'remove');
});

test('live provider preserves safe channel failure diagnostics', async () => {
  let callback; const error = Object.assign(new Error('socket rejected'), { code: 'Unauthorized' });
  const channel = { on() { return this; }, subscribe(next) { callback = next; return this; } };
  const client = { realtime: { setAuth: async () => {}, isConnected: () => false }, channel: () => channel, getChannels: () => [channel], removeChannel: async () => {} };
  const provider = createLiveSyncProvider({ client, userId: 'user-a' }); let received;
  await provider.subscribe(() => {}, (status, nextError) => { if (status === 'CHANNEL_ERROR') received = nextError; }, 'jwt-a'); callback('CHANNEL_ERROR', error);
  assert.equal(received, error);
});

test('conflict review exposes all required resolution paths and mobile semantics', () => {
  const source = readFileSync(new URL('./ConnectedApp.jsx', import.meta.url), 'utf8');
  const coordinator = readFileSync(new URL('./sync/liveSyncCoordinator.js', import.meta.url), 'utf8');
  for (const text of ['Conflict Review','Keep this device','Keep other device','Manually combine','Resolve later']) assert.ok(source.includes(text));
  assert.ok(coordinator.includes('resolution_pending'));
  assert.match(source, /aria-modal="true"/);
});

test('browser runtime refreshes Realtime auth and uses a dedicated recoverable sync action', () => {
  const source = readFileSync(new URL('./ConnectedApp.jsx', import.meta.url), 'utf8');
  assert.match(source, /TOKEN_REFRESHED/); assert.match(source, /reconnect\?\.\(nextSession\.access_token/);
  assert.match(source, /plant-sync-now/); assert.match(source, /CHANNEL_ERROR','TIMED_OUT','CLOSED/);
});
