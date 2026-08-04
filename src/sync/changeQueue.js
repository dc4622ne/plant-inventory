export const changeQueueStorageKey = 'plant-inventory-sync-change-queue';
const maximumQueueSize = 5000;

const parse = (storage) => {
  try {
    const value = JSON.parse(storage.getItem(changeQueueStorageKey) || '[]');
    return Array.isArray(value) ? value.filter((item) => item && item.id && item.entityId && item.operation) : [];
  } catch { return []; }
};

export function createChangeQueue(storage = globalThis.localStorage) {
  const save = (items) => {
    if (items.length > maximumQueueSize) throw new Error('The local synchronization queue is full; no pending changes were discarded.');
    storage.setItem(changeQueueStorageKey, JSON.stringify(items));
  };
  const getAll = () => parse(storage);
  const pending = () => getAll().filter((item) => item.status === 'pending' || item.status === 'failed');
  const enqueue = ({ entityType = 'plant', entityId, operation, version, payload, deviceId, changedAt = new Date().toISOString() }) => {
    const items = getAll();
    const index = items.findIndex((item) => item.entityType === entityType && item.entityId === entityId && ['pending', 'failed'].includes(item.status));
    const previous = items[index];
    if (previous?.operation === 'create' && operation === 'delete') {
      items.splice(index, 1); save(items); return null;
    }
    const effectiveOperation = previous?.operation === 'create' ? 'create' : operation;
    const change = {
      id: previous?.id || globalThis.crypto?.randomUUID?.() || `change-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      entityType, entityId, operation: effectiveOperation, version, payload, deviceId, changedAt,
      status: 'pending', attempts: previous?.attempts || 0, lastAttemptAt: previous?.lastAttemptAt || null, error: null,
    };
    if (index >= 0) items[index] = change; else items.push(change);
    save(items); return change;
  };
  const remove = (id) => save(getAll().filter((item) => item.id !== id));
  const fail = (id, error, now = new Date().toISOString()) => {
    const items = getAll().map((item) => item.id === id ? {
      ...item, status: 'failed', attempts: (item.attempts || 0) + 1, lastAttemptAt: now, error: String(error?.message || error),
    } : item);
    save(items);
  };
  return { getAll, pending, enqueue, remove, fail, clear: () => save([]) };
}
