import { getAppStorageData } from '../backupUtils.js';
import { readLocalEntities } from '../sync/entityRegistry.js';
import { changeQueueStorageKey } from '../sync/changeQueue.js';
import { conflictsStorageKey } from '../sync/conflictResolver.js';
import { syncStatusStorageKey } from '../sync/syncStatus.js';
import { applicationPayload, isMetadataOnlyConflict } from '../sync/syncPayload.js';
import { threeWayMerge } from '../sync/mergeEngine.js';

export const liveMigrationVersion = 5;
const migrationFlights = new Map();
const legacyClaimKey = 'plant-inventory-legacy-data-claimed-by';
const now = () => new Date().toISOString();
const parse = (value, fallback) => { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } };

export async function repairFalseConflicts({ userId, store, provider }) {
  const conflicts = (await store.forUser('conflicts', userId)).filter((item) => item.status !== 'resolved');
  const mutationIds = [...new Set(conflicts.map((item) => item.mutationId).filter(Boolean))];
  let removed = 0; let released = 0; let retained = 0;
  for (const mutationId of mutationIds) {
    const mutation = await store.get('mutations', [userId, mutationId]);
    const associated = conflicts.filter((item) => item.mutationId === mutationId);
    if (!mutation) { retained += associated.length; continue; }
    const remote = await provider.getRecord(mutation.entityType, mutation.entityId); if (!remote) { retained += associated.length; continue; }
    const remotePayload = applicationPayload(remote); const localPayload = applicationPayload(mutation.payload);
    const converged = JSON.stringify(localPayload) === JSON.stringify(remotePayload);
    const merge = converged ? { clean: true, merged: remotePayload } : threeWayMerge(mutation.baseRecord || remotePayload, localPayload, remotePayload);
    if (!merge.clean && !associated.every(isMetadataOnlyConflict)) { retained += associated.length; continue; }
    for (const conflict of associated) { await store.remove('conflicts', [userId, conflict.id]); removed += 1; }
    const revision = Number(remote.sync?.version || 0);
    await store.put('records', { userId, entityType: mutation.entityType, entityId: mutation.entityId, record: remotePayload, serverRecord: remotePayload,
      revision, localUpdatedAt: now(), serverUpdatedAt: remote.updatedAt || remote.sync?.lastModifiedAt || null, deletedAt: remote.sync?.deletedAt || null });
    if (converged) await store.remove('mutations', [userId, mutation.id]);
    else { await store.put('mutations', { ...mutation, payload: applicationPayload(merge.merged), baseRecord: remotePayload, baseRevision: revision, state: 'pending', leaseUntil: null, queueSource: 'conflict-repair', queueReason: 'clean-rebase' }); released += 1; }
  }
  return { removed, released, retained };
}

async function runInitialMigration({ userId, store, provider, storage = localStorage }) {
  const existing = await store.get('migrationRuns', [userId, liveMigrationVersion]);
  if (['prepared', 'in_progress', 'complete'].includes(existing?.status)) return existing;
  const claimedBy = storage.getItem(legacyClaimKey);
  const cached = await store.forUser('records', userId);
  const canClaimLegacy = !claimedBy || claimedBy === userId;
  const local = canClaimLegacy ? readLocalEntities(storage) : [];
  const remote = await provider.getChangesSince(null);
  const remoteMap = new Map(remote.map((record) => [`${record.__syncEntityType}:${record.__syncEntityId}`, record]));
  const snapshot = existing?.snapshot || { createdAt: now(), storage: getAppStorageData() };
  const counts = {}; const cloudCounts = {}; const uploaded = {}; const downloaded = {};
  local.forEach((item) => { counts[item.entityType] = (counts[item.entityType] || 0) + 1; });
  remote.forEach((item) => { cloudCounts[item.__syncEntityType] = (cloudCounts[item.__syncEntityType] || 0) + 1; });
  const snapshotText = JSON.stringify(snapshot.storage); const legacyImages = snapshotText.match(/data:image\//g) || [];
  const estimatedImageBytes = [...snapshotText.matchAll(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/g)].reduce((total, match) => total + Math.floor(match[1].length * .75), 0);
  const potentialMatches = local.filter((item) => remoteMap.has(`${item.entityType}:${item.entityId}`)).length;
  const plantIds = new Set(local.filter((item) => item.entityType === 'plant').map((item) => item.entityId));
  const preflightOrphans = local.filter((item) => item.record?.plantId && !plantIds.has(item.record.plantId)).length;
  for (const entity of local) {
    const key = `${entity.entityType}:${entity.entityId}`; const remoteRecord = remoteMap.get(key);
    if (remoteRecord) {
      const remotePayload = applicationPayload(remoteRecord.__syncPayload || remoteRecord);
      const localPayload = applicationPayload(entity.record);
      const same = JSON.stringify(localPayload) === JSON.stringify(remotePayload);
      await store.put('records', { userId, entityType: entity.entityType, entityId: entity.entityId,
        record: same ? remotePayload : localPayload, serverRecord: remotePayload, revision: remoteRecord.sync?.version || 0,
        localUpdatedAt: now(), serverUpdatedAt: remoteRecord.updatedAt, deletedAt: remoteRecord.sync?.deletedAt || null });
      if (!same) {
        const mutationId = crypto.randomUUID(); const conflictId = `migration:${entity.entityType}:${entity.entityId}:record`;
        await store.put('mutations', { userId, id: mutationId, deviceId: '', entityType: entity.entityType, entityId: entity.entityId,
          operation: 'update', baseRevision: remoteRecord.sync?.version || 0, baseRecord: remotePayload, payload: localPayload,
          createdAt: now(), updatedAt: now(), attempts: 0, state: 'blocked_conflict', leaseUntil: null });
        await store.put('conflicts', { userId, id: conflictId, entityType: entity.entityType, entityId: entity.entityId,
          displayLabel: localPayload.name || localPayload.title || localPayload.text?.slice?.(0, 60) || entity.entityId,
          conflictOrigin: 'migration-no-common-base', localRevision: 0, remoteRevision: remoteRecord.sync?.version || 0,
          fieldPath: 'record', pathSegments: [], baseValue: null, localValue: localPayload, remoteValue: remotePayload,
          localTimestamp: entity.record.updatedAt || now(), remoteTimestamp: remoteRecord.updatedAt || now(), localDeviceId: '', remoteDeviceId: remoteRecord.sync?.deviceId || '',
          status: 'unresolved', resolutionChoice: null, resolvedAt: null, mutationId, createdAt: now() });
      }
      continue;
    }
    if (!cached.some((item) => item.entityType === entity.entityType && item.entityId === entity.entityId)) {
      await store.put('records', { userId, ...entity, record: applicationPayload(entity.record), revision: 0, serverRecord: {}, localUpdatedAt: now(), serverUpdatedAt: null, deletedAt: null });
      await store.put('mutations', { userId, id: crypto.randomUUID(), deviceId: '', entityType: entity.entityType, entityId: entity.entityId,
        operation: 'create', baseRevision: 0, baseRecord: {}, payload: applicationPayload(entity.record), createdAt: now(), updatedAt: now(), attempts: 0,
        lastAttemptAt: null, nextAttemptAt: null, failureClass: null, errorCode: null, state: 'pending', leaseUntil: null });
      uploaded[entity.entityType] = (uploaded[entity.entityType] || 0) + 1;
    }
  }
  for (const record of remote) {
    const exists = local.some((item) => item.entityType === record.__syncEntityType && item.entityId === record.__syncEntityId);
    if (!exists) {
      const payload = applicationPayload(record);
      await store.put('records', { userId, entityType: record.__syncEntityType, entityId: record.__syncEntityId, record: payload, serverRecord: payload,
        revision: record.sync?.version || 0, localUpdatedAt: now(), serverUpdatedAt: record.updatedAt, deletedAt: record.sync?.deletedAt || null });
      downloaded[record.__syncEntityType] = (downloaded[record.__syncEntityType] || 0) + 1;
    }
  }
  if (canClaimLegacy && local.length) storage.setItem(legacyClaimKey, userId);
  const run = { userId, version: liveMigrationVersion, status: 'prepared', startedAt: existing?.startedAt || now(), snapshot,
    localCounts: counts, cloudCounts, cloudCount: remote.length, potentialMatches, localImageCount: legacyImages.length, estimatedImageBytes,
    uploaded, downloaded, conflicted: 0, failed: 0, orphaned: preflightOrphans, invalid: 0, photosPending: 0, photosFailed: 0 };
  await store.put('migrationRuns', run);
  // Import legacy sync diagnostics once; user data itself remains untouched until verification.
  const legacyQueue = parse(storage.getItem(changeQueueStorageKey), []);
  for (const mutation of Array.isArray(legacyQueue) ? legacyQueue : []) {
    if (await store.get('mutations', [userId, mutation.id])) continue;
    await store.put('mutations', { userId, ...mutation, baseRevision: mutation.payload?.sync?.baseVersion || 0,
      baseRecord: mutation.baseRecord || {}, state: mutation.status === 'failed' ? 'retryable' : 'pending', createdAt: mutation.changedAt || now() });
  }
  const legacyConflicts = parse(storage.getItem(conflictsStorageKey), []);
  for (const conflict of Array.isArray(legacyConflicts) ? legacyConflicts : []) await store.put('conflicts', {
    userId, ...conflict, id: conflict.id || crypto.randomUUID(), entityType: conflict.entityType || 'plant', entityId: conflict.local?.id || conflict.remote?.id,
    fieldPath: conflict.fieldPath || 'record', status: 'unresolved', createdAt: conflict.detectedAt || now(),
  });
  for (const conflict of await store.forUser('conflicts', userId)) {
    if (!isMetadataOnlyConflict(conflict)) continue;
    await store.remove('conflicts', [userId, conflict.id]);
    const mutation = conflict.mutationId && await store.get('mutations', [userId, conflict.mutationId]);
    if (mutation?.state === 'blocked_conflict') await store.remove('mutations', [userId, mutation.id]);
  }
  const conflictRepair = await repairFalseConflicts({ userId, store, provider });
  const legacyStatus = parse(storage.getItem(syncStatusStorageKey), {});
  await store.put('syncMetadata', { userId, key: 'status', ...legacyStatus, migrationVersion: liveMigrationVersion, conflictRepair });
  storage.removeItem(changeQueueStorageKey); storage.removeItem(conflictsStorageKey); storage.removeItem(syncStatusStorageKey);
  return run;
}

export function prepareInitialMigration(options) {
  const key = `${options.userId}:${liveMigrationVersion}`;
  if (migrationFlights.has(key)) return migrationFlights.get(key);
  const flight = runInitialMigration(options).finally(() => migrationFlights.delete(key));
  migrationFlights.set(key, flight);
  return flight;
}

export async function verifyAndCompleteMigration({ userId, store }) {
  const run = await store.get('migrationRuns', [userId, liveMigrationVersion]); if (!run) return null;
  const records = await store.forUser('records', userId); const mutations = await store.forUser('mutations', userId);
  const conflicts = (await store.forUser('conflicts', userId)).filter((item) => item.status !== 'resolved');
  const uploads = await store.forUser('imageUploadQueue', userId);
  const duplicateKeys = records.length - new Set(records.map((item) => `${item.entityType}:${item.entityId}`)).size;
  const orphaned = records.filter((item) => {
    const parentId = item.record?.plantId || item.record?.parentPlantId;
    return parentId && !records.some((candidate) => candidate.entityType === 'plant' && candidate.entityId === parentId);
  }).length;
  const pending = mutations.filter((item) => item.state !== 'complete').length;
  const permanentFailures = mutations.filter((item) => item.state === 'failed_permanent').length;
  const result = { ...run, status: duplicateKeys || orphaned || pending || conflicts.length ? 'in_progress' : 'complete',
    verifiedAt: now(), duplicateKeys, orphaned, pendingMutations: pending, conflicted: conflicts.length,
    photosPending: uploads.filter((item) => !['complete'].includes(item.state)).length,
    permanentFailures, photosFailed: uploads.filter((item) => item.state === 'failed_permanent').length };
  if (result.status === 'complete') result.completedAt = now();
  await store.put('migrationRuns', result); return result;
}
