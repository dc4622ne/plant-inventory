export const internalSyncFields = new Set([
  'sync', 'revision', 'mutationId', 'deviceId', 'userId', 'user_id',
  'created_at', 'updated_at', 'deleted_at', 'retryState', 'queueState',
  'signedUrl', 'signedUrlExpiresAt', 'imageMigration', 'cacheMetadata',
]);

export function applicationPayload(value) {
  if (Array.isArray(value)) return value.map(applicationPayload);
  if (!value || typeof value !== 'object') return value;
  if (value.__syncPayload && typeof value.__syncPayload === 'object') return applicationPayload(value.__syncPayload);
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !key.startsWith('__sync') && !internalSyncFields.has(key))
    .map(([key, item]) => [key, applicationPayload(item)]));
}

export function isInternalConflictPath(path = '') {
  const root = String(path).split('.')[0];
  return root.startsWith('__sync') || internalSyncFields.has(root);
}

export function isMetadataOnlyConflict(conflict) {
  if (isInternalConflictPath(conflict?.fieldPath)) return true;
  if (conflict?.fieldPath !== 'record') return false;
  return JSON.stringify(applicationPayload(conflict.localValue)) === JSON.stringify(applicationPayload(conflict.remoteValue));
}
