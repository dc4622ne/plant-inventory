export const syncStatusStorageKey = 'plant-inventory-sync-status';
export const defaultSyncStatus = { state: 'local-only', lastAttemptAt: null, lastSuccessfulSyncAt: null, pendingChanges: 0, conflicts: 0, error: null };
export const syncStatusLabels = { 'local-only': 'Saved on this device', pending: 'Changes pending', syncing: 'Syncing', synced: 'Synced', offline: 'Offline', conflict: 'Conflict', error: 'Sync error' };

export function createSyncStatusStore(storage = globalThis.localStorage) {
  const get = () => { try { return { ...defaultSyncStatus, ...JSON.parse(storage.getItem(syncStatusStorageKey) || '{}') }; } catch { return { ...defaultSyncStatus }; } };
  const set = (updates) => { const value = { ...get(), ...updates }; storage.setItem(syncStatusStorageKey, JSON.stringify(value)); globalThis.dispatchEvent?.(new Event('plant-sync-status-change')); return value; };
  return { get, set };
}
