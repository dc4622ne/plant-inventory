import assert from 'node:assert/strict';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

const configuration = {
  url: process.env.SUPABASE_TEST_URL,
  key: process.env.SUPABASE_TEST_PUBLISHABLE_KEY,
  tokenA: process.env.SUPABASE_TEST_USER_A_JWT,
  tokenB: process.env.SUPABASE_TEST_USER_B_JWT,
};
const enabled = Object.values(configuration).every(Boolean);
const client = (token) => createClient(configuration.url, configuration.key, {
  global: { headers: { Authorization: `Bearer ${token}` } },
  auth: { persistSession: false },
});

function withTimeout(operation, timeoutMs, message) {
  let timer;
  return Promise.race([
    Promise.resolve(operation).finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

function createExpectedEvent() {
  let resolveEvent;
  let rejectEvent;
  let timer;
  let settled = false;
  const promise = new Promise((resolve, reject) => {
    resolveEvent = (value) => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } };
    rejectEvent = (error) => { if (!settled) { settled = true; clearTimeout(timer); reject(error); } };
  });
  return {
    promise,
    resolve: resolveEvent,
    reject: rejectEvent,
    arm(timeoutMs, message) { timer = setTimeout(() => rejectEvent(new Error(message)), timeoutMs); },
    clear() { settled = true; clearTimeout(timer); },
  };
}

function waitForSubscription(channel, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };
    const timer = setTimeout(() => finish(reject, new Error('Realtime subscription did not reach SUBSCRIBED within 15 seconds.')), timeoutMs);
    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') finish(resolve, status);
      else if (status === 'CHANNEL_ERROR') finish(reject, new Error(`Realtime channel error: ${error?.message || 'no error detail'}`));
      else if (status === 'TIMED_OUT') finish(reject, new Error(`Realtime subscription timed out: ${error?.message || 'no error detail'}`));
      else if (status === 'CLOSED') finish(reject, new Error(`Realtime channel closed before subscribing: ${error?.message || 'no error detail'}`));
    });
  });
}

async function cleanupStep(label, action, errors) {
  try {
    await withTimeout(action(), 10_000, `${label} cleanup timed out.`);
  } catch (error) {
    errors.push(`${label}: ${error?.message || 'unknown cleanup error'}`);
  }
}

test('hosted RLS, revision idempotency, realtime, and private Storage isolation', {
  skip: !enabled && 'Set the SUPABASE_TEST_* environment variables documented in docs/supabase-setup.md.',
}, async () => {
  const a = client(configuration.tokenA);
  const b = client(configuration.tokenB);
  let realtimeChannel;
  let ownPath = '';
  let entityId = '';
  let realtimeRecord = '';
  let expectedEvent;

  try {
    const [
      { data: authA, error: authAError },
      { data: authB, error: authBError },
    ] = await Promise.all([
      a.auth.getUser(configuration.tokenA),
      b.auth.getUser(configuration.tokenB),
    ]);

    assert.equal(authAError, null, `User A authentication failed: ${authAError?.message ?? 'unknown error'}`);
    assert.ok(authA?.user, 'User A JWT returned no user');
    assert.equal(authBError, null, `User B authentication failed: ${authBError?.message ?? 'unknown error'}`);
    assert.ok(authB?.user, 'User B JWT returned no user');

    const userA = authA.user.id;
    const userB = authB.user.id;
    assert.notEqual(userA, userB, 'User A and User B must be different accounts');
    console.log('[integration] users validated');

    entityId = `integration-${crypto.randomUUID()}`;
    const mutationId = crypto.randomUUID();
    const first = await a.rpc('apply_sync_mutation', {
      p_mutation_id: mutationId, p_entity_type: 'plant', p_entity_id: entityId, p_expected_revision: 0,
      p_payload: { id: entityId, name: 'RLS test' }, p_deleted_at: null, p_device_id: 'integration',
    });
    assert.equal(first.error, null);
    assert.equal(first.data[0].revision, 1);
    const retry = await a.rpc('apply_sync_mutation', {
      p_mutation_id: mutationId, p_entity_type: 'plant', p_entity_id: entityId, p_expected_revision: 0,
      p_payload: { id: entityId, name: 'RLS test' }, p_deleted_at: null, p_device_id: 'integration',
    });
    assert.equal(retry.error, null);
    assert.equal(retry.data[0].revision, 1);
    const stale = await a.rpc('apply_sync_mutation', {
      p_mutation_id: crypto.randomUUID(), p_entity_type: 'plant', p_entity_id: entityId, p_expected_revision: 0,
      p_payload: { id: entityId, name: 'stale' }, p_deleted_at: null, p_device_id: 'integration',
    });
    assert.ok(stale.error);
    console.log('[integration] RPC idempotency verified');

    assert.equal((await b.from('sync_records').select('*').eq('entity_id', entityId)).data.length, 0);
    assert.equal((await b.from('sync_records').insert({ user_id: userA, entity_type: 'plant', entity_id: `${entityId}-forged` })).error.code, '42501');
    assert.equal((await b.from('sync_records').update({ payload: {} }).eq('user_id', userA)).data?.length || 0, 0);
    assert.equal((await b.from('sync_records').delete().eq('user_id', userA)).data?.length || 0, 0);
    const signedOut = createClient(configuration.url, configuration.key, { auth: { persistSession: false } });
    assert.equal((await signedOut.from('sync_records').select('*')).data?.length || 0, 0);
    console.log('[integration] RLS isolation verified');

    await Promise.all([
      a.realtime.setAuth(configuration.tokenA),
      b.realtime.setAuth(configuration.tokenB),
    ]);
    console.log('[integration] realtime JWT configured');

    realtimeRecord = `integration-realtime-${crypto.randomUUID()}`;
    expectedEvent = createExpectedEvent();
    realtimeChannel = a
      .channel(`integration-${realtimeRecord}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'sync_records', filter: `user_id=eq.${userA}`,
      }, (payload) => {
        if (payload.new?.entity_id === realtimeRecord) expectedEvent.resolve(payload.new);
      });

    await waitForSubscription(realtimeChannel);
    console.log('[integration] realtime subscribed');

    const realtimeMutation = await a.rpc('apply_sync_mutation', {
      p_mutation_id: crypto.randomUUID(), p_entity_type: 'plant', p_entity_id: realtimeRecord, p_expected_revision: 0,
      p_payload: { id: realtimeRecord }, p_deleted_at: null, p_device_id: 'integration',
    });
    assert.equal(realtimeMutation.error, null, `Realtime trigger mutation failed: ${realtimeMutation.error?.message || 'unknown error'}`);
    console.log('[integration] realtime mutation applied');

    expectedEvent.arm(20_000, 'Realtime subscribed successfully, but no sync_records event arrived. Confirm public.sync_records is included in the supabase_realtime publication.');
    const received = await expectedEvent.promise;
    assert.equal(received.user_id, userA);
    console.log('[integration] realtime event received');

    const path = `${userA}/${entityId}/photo/test.txt`;
    const forbiddenUpload = await withTimeout(
      b.storage.from('plant-photos').upload(path, new Blob(['forbidden'])),
      20_000,
      'Cross-user Storage upload timed out.',
    );
    assert.equal(forbiddenUpload.error.statusCode, '403');
    const forbiddenRead = await withTimeout(
      b.storage.from('plant-photos').createSignedUrl(path, 60),
      20_000,
      'Cross-user Storage read timed out.',
    );
    assert.ok(forbiddenRead.error);
    ownPath = `${userB}/${entityId}/photo/test.txt`;
    const ownUpload = await withTimeout(
      b.storage.from('plant-photos').upload(ownPath, new Blob(['owned']), { upsert: false }),
      20_000,
      'Owner Storage upload timed out.',
    );
    assert.equal(ownUpload.error, null);
    const ownUpdate = await withTimeout(
      b.storage.from('plant-photos').upload(ownPath, new Blob(['updated']), { upsert: true }),
      20_000,
      'Owner Storage update timed out.',
    );
    assert.equal(ownUpdate.error, null);
    console.log('[integration] storage isolation verified');
  } finally {
    expectedEvent?.clear();
    const cleanupErrors = [];
    if (realtimeChannel) await cleanupStep('Realtime channel', () => a.removeChannel(realtimeChannel), cleanupErrors);
    await cleanupStep('User A channels', () => a.removeAllChannels(), cleanupErrors);
    await cleanupStep('User B channels', () => b.removeAllChannels(), cleanupErrors);
    if (ownPath) await cleanupStep('Storage object', () => b.storage.from('plant-photos').remove([ownPath]), cleanupErrors);
    if (entityId || realtimeRecord) {
      await cleanupStep('Sync records', () => a.from('sync_records').delete().in('entity_id', [entityId, realtimeRecord].filter(Boolean)), cleanupErrors);
    }
    if (cleanupErrors.length) console.warn(`[integration] cleanup warnings: ${cleanupErrors.join('; ')}`);
    console.log('[integration] cleanup complete');
  }
});
