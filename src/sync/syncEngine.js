import { createConflictStore, detectConflict, newestRecord } from './conflictResolver.js';
import { markRecordSynced } from './recordMetadata.js';

export function createSyncEngine({ repository, provider, storage = globalThis.localStorage, isOnline = () => globalThis.navigator?.onLine !== false, now = () => new Date().toISOString() }) {
  const conflicts = createConflictStore(storage);
  const status = repository.status;
  const sync = async () => {
    const attemptedAt = now();
    if (!isOnline()) return status.set({ state: 'offline', lastAttemptAt: attemptedAt, pendingChanges: repository.queue.pending().length });
    status.set({ state: 'syncing', lastAttemptAt: attemptedAt, error: null });
    try {
      for (const change of repository.queue.pending()) {
        try {
          const remote = await provider.getRecord(change.entityType, change.entityId);
          const conflict = remote && detectConflict(change.payload, remote, now());
          if (conflict) { conflicts.add(conflict); continue; }
          await provider.applyChange(change);
          repository.upsertFromRemote(markRecordSynced(change.payload, now()));
          repository.queue.remove(change.id);
        } catch (error) { repository.queue.fail(change.id, error, now()); }
      }
      const previousSuccess = status.get().lastSuccessfulSyncAt;
      const remoteChanges = await provider.getChangesSince(previousSuccess);
      for (const remote of remoteChanges) {
        const local = repository.getById(remote.id, { includeDeleted: true });
        const conflict = local && detectConflict(local, remote, now());
        if (conflict) conflicts.add(conflict);
        else repository.upsertFromRemote(local ? newestRecord(local, remote) : remote);
      }
      const pendingChanges = repository.queue.pending().length;
      const conflictCount = conflicts.getAll().length;
      return status.set({
        state: conflictCount ? 'conflict' : pendingChanges ? 'error' : 'synced',
        lastSuccessfulSyncAt: pendingChanges || conflictCount ? previousSuccess : now(),
        pendingChanges,
        conflicts: conflictCount,
        error: pendingChanges ? 'Some changes could not be synchronized.' : null,
      });
    } catch (error) {
      return status.set({ state: 'error', pendingChanges: repository.queue.pending().length, error: String(error?.message || error) });
    }
  };
  return { sync };
}
