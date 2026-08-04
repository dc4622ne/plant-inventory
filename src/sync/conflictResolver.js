export const conflictsStorageKey = 'plant-inventory-sync-conflicts';

export function detectConflict(local, remote, now = new Date().toISOString()) {
  if (!local || !remote || JSON.stringify(local) === JSON.stringify(remote)) return null;
  const localDeleted = Boolean(local.sync?.deletedAt);
  const remoteDeleted = Boolean(remote.sync?.deletedAt);
  const base = Math.max(Number(local.sync?.baseVersion || 0), Number(remote.sync?.baseVersion || 0));
  const localChanged = Number(local.sync?.version || 0) > base;
  const remoteChanged = Number(remote.sync?.version || 0) > base;
  let reason = '';
  if (localDeleted && !remoteDeleted && remoteChanged) reason = 'local-delete-remote-update';
  else if (remoteDeleted && !localDeleted && localChanged) reason = 'remote-delete-local-update';
  else if (localChanged && remoteChanged) reason = 'simultaneous-update';
  return reason ? { id: `conflict-${local.id}-${now}`, reason, local, remote, detectedAt: now } : null;
}

export function newestRecord(local, remote) {
  const localTime = Date.parse(local?.sync?.lastModifiedAt || local?.updatedAt || 0) || 0;
  const remoteTime = Date.parse(remote?.sync?.lastModifiedAt || remote?.updatedAt || 0) || 0;
  if (localTime !== remoteTime) return localTime > remoteTime ? local : remote;
  return Number(local?.sync?.version || 0) >= Number(remote?.sync?.version || 0) ? local : remote;
}

export function createConflictStore(storage = globalThis.localStorage) {
  const getAll = () => { try { const value = JSON.parse(storage.getItem(conflictsStorageKey) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
  const add = (conflict) => {
    const items = getAll().filter((item) => item.id !== conflict.id); items.push(conflict);
    storage.setItem(conflictsStorageKey, JSON.stringify(items)); return conflict;
  };
  return { getAll, add, clear: () => storage.setItem(conflictsStorageKey, '[]') };
}
