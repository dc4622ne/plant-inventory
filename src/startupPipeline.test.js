import assert from 'node:assert/strict';
import test from 'node:test';
import { createStartupRun, openLocalCollection, StartupTimeoutError, withStartupTimeout } from './startupPipeline.js';

function localHarness(overrides = {}) {
  const calls = []; let readyCount = 0; let current = true;
  const store = { async open(){ calls.push('open'); }, async forUser(){ calls.push('records'); return [{ id:'cached' }]; }, ...overrides.store };
  const coordinator = { userId:'u', async recoverProcessingLeases(){ calls.push('repair'); }, async hydrate(){ calls.push('hydrate'); }, ...overrides.coordinator };
  const run = createStartupRun(() => current, () => { readyCount += 1; calls.push('ready'); });
  return { store, coordinator, run, calls, readyCount: () => readyCount, cancel: () => { current = false; } };
}

test('local cache mounts without waiting for a Realtime subscription that never settles', async () => {
  const local = localHarness(); const realtime = new Promise(() => {});
  await openLocalCollection(local); void realtime;
  assert.equal(local.run.ready, true); assert.deepEqual(local.calls, ['open','repair','records','hydrate','ready']);
});

test('local cache mounts when server reconciliation times out', async () => {
  const local = localHarness(); await openLocalCollection(local);
  await assert.rejects(withStartupTimeout(new Promise(() => {}), 5, 'initial-direct-reconciliation'), StartupTimeoutError);
  assert.equal(local.run.ready, true);
});

test('migration repair failure does not cause infinite loading', async () => {
  const local = localHarness(); await openLocalCollection(local);
  await assert.rejects(Promise.reject(new Error('migration failed')), /migration failed/);
  assert.equal(local.run.ready, true);
});

test('IndexedDB failure produces a retryable stage error', async () => {
  const local = localHarness({ store: { async open(){ throw new Error('IDB blocked'); } } });
  await assert.rejects(openLocalCollection(local), /IDB blocked/); assert.equal(local.run.ready, false);
});

test('startup cleanup cannot mark an obsolete run ready', async () => {
  const local = localHarness(); local.cancel(); await openLocalCollection(local);
  assert.equal(local.readyCount(), 0); assert.equal(local.run.ready, false);
});

test('StrictMode-style double invocation only allows the current run to resolve', () => {
  let generation = 1; let readyCount = 0;
  const first = createStartupRun(() => generation === 1, () => { readyCount += 1; }); generation = 2;
  const second = createStartupRun(() => generation === 2, () => { readyCount += 1; });
  assert.equal(first.markReady(), false); assert.equal(second.markReady(), true); assert.equal(readyCount, 1);
});

test('successful startup transitions exactly once to the application', () => {
  let readyCount = 0; const run = createStartupRun(() => true, () => { readyCount += 1; });
  assert.equal(run.markReady(), true); assert.equal(run.markReady(), false); assert.equal(readyCount, 1);
});

test('no external startup stage can remain pending indefinitely', async () => {
  for (const stage of ['indexeddb-open','user-namespace-hydration','migration-v5-repair','compatibility-serialization','realtime-startup','initial-direct-reconciliation','image-queue-initialization']) {
    await assert.rejects(withStartupTimeout(new Promise(() => {}), 1, stage), (error) => error instanceof StartupTimeoutError && error.stage === stage);
  }
});
