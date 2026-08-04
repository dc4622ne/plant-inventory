export const recordSchemaVersion = 1;

export function createRecordId(prefix = 'plant') {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

export function migrateRecord(record, deviceId, now = new Date().toISOString()) {
  const source = record && typeof record === 'object' ? record : {};
  const id = String(source.id || '').trim() || createRecordId();
  const createdAt = validDate(source.createdAt) ? source.createdAt : validDate(source.updatedAt) ? source.updatedAt : now;
  const updatedAt = validDate(source.updatedAt) ? source.updatedAt : createdAt;
  const existing = source.sync && typeof source.sync === 'object' ? source.sync : {};
  const sync = {
    schemaVersion: Number(existing.schemaVersion) > 0 ? Number(existing.schemaVersion) : recordSchemaVersion,
    version: Number(existing.version) > 0 ? Number(existing.version) : 1,
    baseVersion: Number(existing.baseVersion) >= 0 ? Number(existing.baseVersion) : 0,
    deviceId: String(existing.deviceId || deviceId),
    lastModifiedAt: validDate(existing.lastModifiedAt) ? existing.lastModifiedAt : updatedAt,
    lastSyncedAt: validDate(existing.lastSyncedAt) ? existing.lastSyncedAt : null,
    deletedAt: validDate(existing.deletedAt) ? existing.deletedAt : null,
    syncState: String(existing.syncState || 'pending'),
  };
  return { ...source, id, createdAt, updatedAt, sync };
}

export function touchRecord(record, updates, deviceId, now = new Date().toISOString()) {
  const current = migrateRecord(record, deviceId, now);
  return {
    ...current,
    ...updates,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: now,
    sync: {
      ...current.sync,
      version: current.sync.version + 1,
      deviceId,
      lastModifiedAt: now,
      deletedAt: updates?.sync?.deletedAt ?? current.sync.deletedAt,
      syncState: 'pending',
    },
  };
}

export function markRecordSynced(record, now = new Date().toISOString()) {
  return { ...record, sync: { ...record.sync, baseVersion: record.sync.version, lastSyncedAt: now, syncState: 'synced' } };
}

export function createTombstone(record, deviceId, now = new Date().toISOString()) {
  return touchRecord(record, { sync: { ...record.sync, deletedAt: now } }, deviceId, now);
}
