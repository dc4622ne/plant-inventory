import { getDeviceIdentity } from './deviceIdentity.js';
import { readLocalEntities, writeEntitiesToCompatibilityStorage } from './entityRegistry.js';
import { threeWayMerge } from './mergeEngine.js';
import { applicationPayload, isInternalConflictPath } from './syncPayload.js';

const uuid = () => globalThis.crypto?.randomUUID?.() || `mutation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const now = () => new Date().toISOString();
const comparable = (value) => JSON.stringify(value, (key, item) => key.startsWith('__sync') || key === 'sync' ? undefined : item);
const retryDelay = (attempts) => Math.min(300_000, 1_000 * (2 ** Math.min(attempts, 8)));
const errorClass = (error) => {
  const code = String(error?.code || error?.cause?.code || '');
  if (['401', '403', '42501', '22P02', '23514'].includes(code)) return 'permanent';
  return 'retryable';
};

export function createLiveSyncCoordinator({ userId, store, provider, storage = globalThis.localStorage, device = getDeviceIdentity(storage) }) {
  const listeners = new Set();
  let running = false;
  const notify = async () => {
    const status = await getStatus();
    listeners.forEach((listener) => listener(status));
    globalThis.dispatchEvent?.(new Event('plant-sync-status-change'));
    return status;
  };
  const getRecords = () => store.forUser('records', userId);
  const pendingMutations = async () => (await store.forUser('mutations', userId)).filter((item) => ['pending', 'retryable', 'processing', 'blocked_conflict'].includes(item.state));
  const unresolvedConflicts = async () => (await store.forUser('conflicts', userId)).filter((item) => item.status !== 'resolved');
  const getStatus = async () => {
    const allMutations = await store.forUser('mutations', userId); const mutations = await pendingMutations(); const conflicts = await unresolvedConflicts();
    const metadata = await store.get('syncMetadata', [userId, 'status']);
    const uploads = (await store.forUser('imageUploadQueue', userId)).filter((item) => !['complete'].includes(item.state));
    return { state: metadata?.state || (mutations.length ? 'pending' : 'synced'), pendingChanges: mutations.length, conflicts: conflicts.length,
      pendingImages: uploads.length, permanentFailures: allMutations.filter((item) => item.state === 'failed_permanent').length,
      lastSuccessfulSyncAt: metadata?.lastSuccessfulSyncAt || null, lastReconciliationAt: metadata?.lastReconciliationAt || null,
      realtimeState: metadata?.realtimeState || 'disconnected', error: metadata?.error || null, userId, deviceId: device.id };
  };
  const setStatus = async (changes) => {
    const current = await store.get('syncMetadata', [userId, 'status']);
    await store.put('syncMetadata', { userId, key: 'status', ...(current || {}), ...changes });
    return notify();
  };

  async function queueRecord(entity, cached, operation = 'update') {
    const mutations = await pendingMutations();
    const existing = mutations.find((item) => item.entityType === entity.entityType && item.entityId === entity.entityId && item.state !== 'blocked_conflict');
    const mutation = {
      userId, id: existing?.id || uuid(), deviceId: device.id, entityType: entity.entityType, entityId: entity.entityId,
      operation: existing?.operation === 'create' ? 'create' : operation,
      baseRevision: existing?.baseRevision ?? cached?.revision ?? 0,
      baseRecord: existing?.baseRecord ?? cached?.serverRecord ?? cached?.record ?? {},
      payload: applicationPayload(entity.record), createdAt: existing?.createdAt || now(), updatedAt: now(), attempts: existing?.attempts || 0,
      lastAttemptAt: existing?.lastAttemptAt || null, nextAttemptAt: null, failureClass: null, errorCode: null, state: 'pending', leaseUntil: null,
    };
    await store.put('mutations', mutation);
    await store.put('records', { userId, entityType: entity.entityType, entityId: entity.entityId, record: entity.record,
      serverRecord: cached?.serverRecord || cached?.record || {}, revision: cached?.revision || 0, localUpdatedAt: now(), serverUpdatedAt: cached?.serverUpdatedAt || null, deletedAt: null });
  }

  async function captureLocalChanges() {
    const local = readLocalEntities(storage); const cached = await getRecords();
    const localMap = new Map(local.map((item) => [`${item.entityType}:${item.entityId}`, item]));
    for (const entity of local) {
      const previous = cached.find((item) => item.entityType === entity.entityType && item.entityId === entity.entityId);
      if (!previous || comparable(previous.record) !== comparable(entity.record)) await queueRecord(entity, previous, previous ? 'update' : 'create');
    }
    for (const previous of cached) if (!previous.deletedAt && !localMap.has(`${previous.entityType}:${previous.entityId}`)) {
      await queueRecord({ entityType: previous.entityType, entityId: previous.entityId, record: previous.record }, previous, 'delete');
      await store.put('records', { ...previous, deletedAt: now(), localUpdatedAt: now() });
    }
    await notify();
  }

  async function addConflicts(mutation, remote, fields) {
    const records = await getRecords();
    const parentId = mutation.payload?.plantId || mutation.payload?.parentPlantId || (mutation.entityType === 'plant' ? mutation.entityId : '');
    const parent = records.find((item) => item.entityType === 'plant' && item.entityId === parentId)?.record;
    const typeLabel = ({ plant: 'Plant Details', check_in: 'Check-in', journal_entry: 'Journal entry' })[mutation.entityType] || mutation.entityType.replaceAll('_', ' ');
    for (const field of fields.filter((item) => !isInternalConflictPath(item.fieldPath))) {
      const id = `${mutation.entityType}:${mutation.entityId}:${field.fieldPath}`;
      await store.put('conflicts', { userId, id, entityType: mutation.entityType, entityId: mutation.entityId,
        displayLabel: parent?.name ? `${parent.name} — ${typeLabel}` : mutation.payload?.name || mutation.payload?.title || mutation.payload?.text?.slice?.(0, 60) || `${typeLabel} for unavailable plant`,
        recordTypeLabel: typeLabel, parentPlantId: parentId || null, parentPlantName: parent?.name || '',
        fieldPath: field.fieldPath || 'record', pathSegments: field.pathSegments || [], baseValue: field.baseValue, localValue: field.localValue, remoteValue: field.remoteValue,
        localTimestamp: mutation.updatedAt, remoteTimestamp: remote?.updatedAt || remote?.sync?.lastModifiedAt || now(),
        localDeviceId: device.id, remoteDeviceId: remote?.sync?.deviceId || '', status: 'unresolved', resolutionChoice: null,
        resolvedAt: null, mutationId: mutation.id, createdAt: now() });
    }
    await store.put('mutations', { ...mutation, state: 'blocked_conflict', leaseUntil: null });
  }

  async function processMutation(mutation) {
    const lease = { ...mutation, state: 'processing', leaseUntil: new Date(Date.now() + 30_000).toISOString(), lastAttemptAt: now() };
    await store.put('mutations', lease);
    try {
      const remote = await provider.getRecord(mutation.entityType, mutation.entityId);
      let payload = mutation.payload; let baseRevision = mutation.baseRevision;
      if (remote && Number(remote.sync?.version || 0) !== Number(baseRevision)) {
        const merge = threeWayMerge(mutation.baseRecord || {}, mutation.payload || {}, remote || {});
        if (!merge.clean) { await addConflicts(lease, remote, merge.conflicts); return; }
        payload = merge.merged; baseRevision = Number(remote.sync?.version || 0);
      } else if (!remote && baseRevision > 0 && mutation.operation !== 'delete') {
        await addConflicts(lease, remote, [{ fieldPath: 'record', baseValue: mutation.baseRecord, localValue: mutation.payload, remoteValue: null }]); return;
      }
      if (mutation.operation === 'delete') payload = { ...payload, sync: { ...(payload.sync || {}), deletedAt: now() } };
      const acknowledged = await provider.applyChange({ ...mutation, payload, baseRevision });
      await store.put('records', { userId, entityType: mutation.entityType, entityId: mutation.entityId, record: acknowledged,
        serverRecord: acknowledged, revision: acknowledged.sync?.version || baseRevision + 1, localUpdatedAt: now(), serverUpdatedAt: acknowledged.updatedAt,
        deletedAt: acknowledged.sync?.deletedAt || null });
      await store.remove('mutations', [userId, mutation.id]);
    } catch (error) {
      const attempts = (mutation.attempts || 0) + 1; const failureClass = errorClass(error);
      await store.put('mutations', { ...mutation, attempts, lastAttemptAt: now(), leaseUntil: null, failureClass,
        errorCode: String(error?.code || error?.cause?.code || 'SYNC_FAILED'), state: failureClass === 'permanent' ? 'failed_permanent' : 'retryable',
        nextAttemptAt: failureClass === 'retryable' ? new Date(Date.now() + retryDelay(attempts)).toISOString() : null });
    }
  }

  async function ingestRemote(remote) {
    if (!remote) return;
    const entityType = remote.__syncEntityType; const entityId = remote.__syncEntityId || remote.id;
    const mutation = (await pendingMutations()).find((item) => item.entityType === entityType && item.entityId === entityId);
    if (mutation) {
      const merge = threeWayMerge(mutation.baseRecord || {}, mutation.payload || {}, remote);
      if (!merge.clean) { await addConflicts(mutation, remote, merge.conflicts); return; }
      await store.put('mutations', { ...mutation, payload: merge.merged, baseRecord: remote, baseRevision: remote.sync?.version || 0, state: 'pending' });
      return;
    }
    await store.put('records', { userId, entityType, entityId, record: remote, serverRecord: remote,
      revision: remote.sync?.version || 0, localUpdatedAt: now(), serverUpdatedAt: remote.updatedAt, deletedAt: remote.sync?.deletedAt || null });
  }

  async function hydrate() { writeEntitiesToCompatibilityStorage(await getRecords(), storage); }
  async function sync() {
    if (running) return getStatus(); running = true;
    await setStatus({ state: globalThis.navigator?.onLine === false ? 'offline' : 'syncing', error: null });
    try {
      if (globalThis.navigator?.onLine === false) return await getStatus();
      await captureLocalChanges();
      const mutations = await pendingMutations();
      for (const mutation of mutations) {
        if (mutation.state === 'blocked_conflict' || mutation.state === 'failed_permanent') continue;
        if (mutation.state === 'processing' && Date.parse(mutation.leaseUntil || 0) > Date.now()) continue;
        if (mutation.nextAttemptAt && Date.parse(mutation.nextAttemptAt) > Date.now()) continue;
        await processMutation(mutation);
      }
      const metadata = await store.get('syncMetadata', [userId, 'status']);
      for (const remote of await provider.getChangesSince(metadata?.lastReconciliationAt || null)) await ingestRemote(remote);
      await hydrate();
      const status = await getStatus();
      await setStatus({ state: status.conflicts ? 'conflict' : status.pendingChanges ? 'pending' : 'synced', lastReconciliationAt: now(),
        ...(status.pendingChanges || status.conflicts ? {} : { lastSuccessfulSyncAt: now() }) });
    } catch (error) { await setStatus({ state: 'error', error: String(error?.message || error) }); }
    finally { running = false; }
    return getStatus();
  }

  async function resolveConflict(id, choice, manualValue) {
    const conflict = await store.get('conflicts', [userId, id]); if (!conflict) return;
    const mutation = await store.get('mutations', [userId, conflict.mutationId]); if (!mutation) return;
    const selected = choice === 'remote' ? conflict.remoteValue : choice === 'manual' ? manualValue : conflict.localValue;
    const path = conflict.pathSegments || conflict.fieldPath.split('.').filter(Boolean); const payload = structuredClone(mutation.payload);
    let target = payload;
    path.slice(0, -1).forEach((key) => {
      const childMatch = /^\[(.+)\]$/.exec(key);
      if (childMatch && Array.isArray(target)) target = target.find((item) => String(item.id || item.entryId || item.photoId || item.createdAt || item.date) === childMatch[1]);
      else { if (!target[key] || typeof target[key] !== 'object') target[key] = {}; target = target[key]; }
    });
    const last = path.at(-1); const lastChild = /^\[(.+)\]$/.exec(last || '');
    if (lastChild && Array.isArray(target)) { const index = target.findIndex((item) => String(item.id || item.entryId || item.photoId || item.createdAt || item.date) === lastChild[1]); if (index >= 0) target[index] = selected; }
    else if (path.length) target[last] = selected;
    else Object.assign(payload, selected);
    await store.put('conflicts', { ...conflict, status: 'resolution_pending', resolutionChoice: choice, proposedValue: selected });
    await store.put('mutations', { ...mutation, payload, state: 'pending', updatedAt: now() });
    await sync();
    const remaining = await store.get('mutations', [userId, mutation.id]);
    if (!remaining) await store.put('conflicts', { ...conflict, status: 'resolved', resolutionChoice: choice, resolvedAt: now() });
    return notify();
  }
  return { captureLocalChanges, sync, ingestRemote, hydrate, getStatus, getConflicts: unresolvedConflicts, resolveConflict,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }, setRealtimeState: (state) => setStatus({ realtimeState: state }) };
}
