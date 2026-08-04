import test from 'node:test';
import assert from 'node:assert/strict';
import { createChangeQueue } from './changeQueue.js';
import { detectConflict, newestRecord } from './conflictResolver.js';
import { getDeviceId, getDeviceIdentity, setDeviceName } from './deviceIdentity.js';
import { createLocalMirrorProvider } from './localMirrorProvider.js';
import { createLocalPlantRepository, plantsStorageKey } from './localRepository.js';
import { createTombstone, markRecordSynced, migrateRecord, touchRecord } from './recordMetadata.js';
import { createSyncEngine } from './syncEngine.js';

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (key) => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key), clear: () => data.clear() };
}

test('device identity is stable, named, and rejects blanks', () => {
  const storage = memoryStorage();
  assert.equal(getDeviceId(storage), getDeviceId(storage));
  assert.equal(getDeviceIdentity(storage, 'Windows').name, 'Windows PC');
  assert.equal(setDeviceName('Greenhouse laptop', storage), 'Greenhouse laptop');
  assert.equal(getDeviceIdentity(storage).name, 'Greenhouse laptop');
  assert.throws(() => setDeviceName('  ', storage), /blank/);
});

test('record metadata migrates, preserves fields and IDs, updates, syncs, and tombstones', () => {
  const now = '2026-08-04T12:00:00.000Z';
  const migrated = migrateRecord({ id: 'existing', name: 'Monstera', journal: [{ note: 'new leaf' }] }, 'device-a', now);
  assert.equal(migrated.id, 'existing');
  assert.equal(migrated.name, 'Monstera');
  assert.deepEqual(migrated.journal, [{ note: 'new leaf' }]);
  assert.equal(migrated.createdAt, now);
  assert.equal(migrated.sync.version, 1);
  const updated = touchRecord(migrated, { health: 'Good' }, 'device-b', '2026-08-04T13:00:00.000Z');
  assert.equal(updated.sync.version, 2);
  assert.equal(updated.sync.deviceId, 'device-b');
  assert.equal(markRecordSynced(updated, now).sync.syncState, 'synced');
  assert.equal(createTombstone(updated, 'device-b', now).sync.deletedAt, now);
  assert.deepEqual(migrateRecord(updated, 'other', now).sync, updated.sync);
});

test('change queue collapses operations, retains failures, and handles malformed storage', () => {
  const storage = memoryStorage({ 'plant-inventory-sync-change-queue': '{bad' });
  const queue = createChangeQueue(storage);
  assert.deepEqual(queue.getAll(), []);
  queue.enqueue({ entityId: 'p1', operation: 'create', version: 1, payload: { id: 'p1' }, deviceId: 'd' });
  queue.enqueue({ entityId: 'p1', operation: 'update', version: 2, payload: { id: 'p1', name: 'A' }, deviceId: 'd' });
  assert.equal(queue.getAll().length, 1);
  assert.equal(queue.getAll()[0].operation, 'create');
  queue.fail(queue.getAll()[0].id, new Error('network'));
  assert.equal(queue.getAll()[0].attempts, 1);
  assert.equal(queue.getAll()[0].error, 'network');
  queue.enqueue({ entityId: 'p1', operation: 'delete', version: 3, payload: {}, deviceId: 'd' });
  assert.equal(queue.getAll().length, 0);
});

test('repository migrates without queuing and preserves tracker data through CRUD', () => {
  const storage = memoryStorage({ [plantsStorageKey]: JSON.stringify([{ id: 'legacy', name: 'Alocasia', activityLog: [{ notes: 'watered' }], cormPhase: 'Rooted' }]) });
  const repository = createLocalPlantRepository({ storage, now: () => '2026-08-04T12:00:00.000Z' });
  const legacy = repository.getAll()[0];
  assert.equal(legacy.sync.version, 1);
  assert.equal(repository.queue.getAll().length, 0);
  assert.ok(JSON.parse(storage.getItem(plantsStorageKey))[0].sync);
  const created = repository.create({ name: 'Philodendron', journal: [{ text: 'hello' }] });
  const updated = repository.update(created.id, { tcStage: 'Acclimating' });
  assert.equal(updated.sync.version, 2);
  assert.deepEqual(updated.journal, [{ text: 'hello' }]);
  repository.remove(created.id);
  assert.equal(repository.getById(created.id), null);
  assert.ok(repository.getById(created.id, { includeDeleted: true }).sync.deletedAt);
  const before = repository.queue.getAll().length;
  repository.upsertFromRemote({ ...legacy, name: 'Remote name' });
  assert.equal(repository.queue.getAll().length, before);
});

test('conflict resolver protects simultaneous and delete/update changes deterministically', () => {
  const base = { id: 'p', updatedAt: '2026-08-04T10:00:00Z', sync: { version: 2, baseVersion: 1, lastModifiedAt: '2026-08-04T10:00:00Z', deletedAt: null } };
  assert.equal(detectConflict(base, structuredClone(base)), null);
  const remote = { ...base, updatedAt: '2026-08-04T11:00:00Z', sync: { ...base.sync, lastModifiedAt: '2026-08-04T11:00:00Z' } };
  assert.equal(detectConflict(base, remote).reason, 'simultaneous-update');
  assert.equal(detectConflict({ ...base, sync: { ...base.sync, deletedAt: base.updatedAt } }, remote).reason, 'local-delete-remote-update');
  assert.equal(detectConflict(base, { ...remote, sync: { ...remote.sync, deletedAt: remote.updatedAt } }).reason, 'remote-delete-local-update');
  assert.equal(newestRecord(base, remote), remote);
});

test('sync engine reports offline, pushes, pulls, and retains failed work', async () => {
  const storage = memoryStorage();
  const repository = createLocalPlantRepository({ storage });
  repository.create({ id: 'local', name: 'Local' });
  const mirror = createLocalMirrorProvider(storage);
  const offline = createSyncEngine({ repository, provider: mirror, storage, isOnline: () => false });
  assert.equal((await offline.sync()).state, 'offline');
  const engine = createSyncEngine({ repository, provider: mirror, storage, isOnline: () => true });
  assert.equal((await engine.sync()).state, 'synced');
  assert.equal(repository.queue.pending().length, 0);
  assert.ok(await mirror.getRecord('plant', 'local'));
  await mirror.applyChange({ entityType: 'plant', entityId: 'remote', payload: migrateRecord({ id: 'remote', name: 'Remote' }, 'remote-device'), changedAt: new Date(Date.now() + 1000).toISOString() });
  await engine.sync();
  assert.equal(repository.getById('remote').name, 'Remote');
  repository.create({ id: 'failed', name: 'Failed' });
  const failing = createSyncEngine({ repository, storage, provider: { getRecord: async () => null, applyChange: async () => { throw new Error('nope'); }, getChangesSince: async () => [] } });
  assert.equal((await failing.sync()).state, 'error');
  assert.equal(repository.queue.pending().length, 1);
});
