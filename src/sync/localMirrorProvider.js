export const localMirrorStorageKey = 'plant-inventory-development-remote-mirror';

export function createLocalMirrorProvider(storage = globalThis.localStorage) {
  const read = () => { try { const value = JSON.parse(storage.getItem(localMirrorStorageKey) || '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; } };
  const write = (value) => storage.setItem(localMirrorStorageKey, JSON.stringify(value));
  return {
    async getRecord(entityType, entityId) { return read()[`${entityType}:${entityId}`]?.record || null; },
    async applyChange(change) {
      const data = read(); data[`${change.entityType}:${change.entityId}`] = { record: change.payload, changedAt: change.changedAt }; write(data); return change.payload;
    },
    async getChangesSince(timestamp) {
      const since = Date.parse(timestamp || 0) || 0;
      return Object.values(read()).filter((item) => (Date.parse(item.changedAt) || 0) > since).map((item) => item.record);
    },
  };
}
