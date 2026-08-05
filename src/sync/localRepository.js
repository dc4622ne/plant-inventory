import { getDeviceId } from './deviceIdentity.js';
import { createChangeQueue } from './changeQueue.js';
import { createRecordId, createTombstone, migrateRecord, touchRecord } from './recordMetadata.js';
import { createSyncStatusStore } from './syncStatus.js';

export const plantsStorageKey = 'plant-inventory-plants';

const meaningful = (value) => JSON.stringify(value);

export function createLocalPlantRepository({ storage = globalThis.localStorage, now = () => new Date().toISOString() } = {}) {
  const queue = createChangeQueue(storage);
  const status = createSyncStatusStore(storage);
  const deviceId = () => getDeviceId(storage);
  const read = () => {
    try { const value = JSON.parse(storage.getItem(plantsStorageKey) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  };
  const write = (records) => {
    storage.setItem(plantsStorageKey, JSON.stringify(records));
    globalThis.dispatchEvent?.(new Event('plant-collection-change'));
  };
  const refreshStatus = () => globalThis.__plantIndexedSyncActive
    ? null
    : status.set({ state: queue.pending().length ? 'pending' : 'local-only', pendingChanges: queue.pending().length });
  const getAll = ({ includeDeleted = false } = {}) => {
    const records = read();
    const migrated = records.map((record) => migrateRecord(record, deviceId(), now()));
    if (meaningful(records) !== meaningful(migrated)) write(migrated);
    return includeDeleted ? migrated : migrated.filter((record) => !record.sync.deletedAt);
  };
  const getById = (id, options = {}) => getAll(options).find((record) => record.id === id) || null;
  const create = (input, { queueChange = true } = {}) => {
    const timestamp = now();
    const record = migrateRecord({ ...input, id: String(input?.id || '').trim() || createRecordId(), createdAt: input?.createdAt || timestamp, updatedAt: timestamp }, deviceId(), timestamp);
    const records = getAll({ includeDeleted: true });
    const existingIndex = records.findIndex((item) => item.id === record.id);
    if (existingIndex >= 0) records[existingIndex] = record; else records.push(record);
    write(records);
    if (queueChange && !globalThis.__plantIndexedSyncActive) queue.enqueue({ entityId: record.id, operation: 'create', version: record.sync.version, payload: record, deviceId: deviceId(), changedAt: timestamp });
    refreshStatus(); return record;
  };
  const update = (id, updates, { queueChange = true } = {}) => {
    const records = getAll({ includeDeleted: true });
    const index = records.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const record = touchRecord(records[index], updates, deviceId(), now());
    records[index] = record; write(records);
    if (queueChange && !globalThis.__plantIndexedSyncActive) queue.enqueue({ entityId: id, operation: 'update', version: record.sync.version, payload: record, deviceId: deviceId(), changedAt: record.updatedAt });
    refreshStatus(); return record;
  };
  const remove = (id, { queueChange = true } = {}) => {
    const records = getAll({ includeDeleted: true });
    const index = records.findIndex((item) => item.id === id);
    if (index < 0) return null;
    const record = createTombstone(records[index], deviceId(), now());
    records[index] = record; write(records);
    if (queueChange && !globalThis.__plantIndexedSyncActive) queue.enqueue({ entityId: id, operation: 'delete', version: record.sync.version, payload: record, deviceId: deviceId(), changedAt: record.updatedAt });
    refreshStatus(); return record;
  };
  const upsertFromRemote = (record) => {
    const records = getAll({ includeDeleted: true });
    const normalized = migrateRecord(record, record.sync?.deviceId || deviceId(), now());
    const index = records.findIndex((item) => item.id === normalized.id);
    if (index >= 0) records[index] = normalized; else records.push(normalized);
    write(records); return normalized;
  };
  const saveAll = (records, { queueChanges = false } = {}) => {
    const normalized = records.map((record) => migrateRecord(record, deviceId(), now()));
    write(normalized);
    if (queueChanges) normalized.forEach((record) => queue.enqueue({ entityId: record.id, operation: 'update', version: record.sync.version, payload: record, deviceId: deviceId(), changedAt: record.updatedAt }));
    refreshStatus(); return normalized;
  };
  const applyCollectionChanges = (visibleRecords) => {
    const stored = getAll({ includeDeleted: true });
    const storedById = new Map(stored.map((record) => [record.id, record]));
    const result = [];
    visibleRecords.forEach((candidate) => {
      const previous = storedById.get(candidate.id);
      if (!previous) result.push(create(candidate));
      else {
        storedById.delete(candidate.id);
        const comparablePrevious = { ...previous }; delete comparablePrevious.updatedAt; delete comparablePrevious.sync;
        const comparableCandidate = { ...candidate }; delete comparableCandidate.updatedAt; delete comparableCandidate.sync;
        result.push(meaningful(comparablePrevious) === meaningful(comparableCandidate) ? previous : update(candidate.id, candidate));
      }
    });
    storedById.forEach((record) => { if (!record.sync.deletedAt) remove(record.id); });
    return getAll();
  };
  return { getAll, getById, create, update, remove, upsertFromRemote, saveAll, applyCollectionChanges, queue, status };
}

export const localPlantRepository = createLocalPlantRepository();
