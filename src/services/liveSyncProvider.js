import { normalizeDataError } from '../data/errors.js';
import { applicationPayload } from '../sync/syncPayload.js';

const rowToRecord = (row) => row ? ({
  ...row.payload,
  ...(row.entity_id === 'singleton' ? {} : { id: row.entity_id, createdAt: row.created_at, updatedAt: row.updated_at }),
  sync: {
    ...(row.payload?.sync || {}),
    version: Number(row.revision),
    baseVersion: Number(row.revision),
    deletedAt: row.deleted_at,
    lastModifiedAt: row.updated_at,
    lastSyncedAt: row.updated_at,
    deviceId: row.device_id || row.payload?.sync?.deviceId || '',
    syncState: 'synced',
  },
  __syncEntityType: row.entity_type,
  __syncEntityId: row.entity_id,
  __syncMutationId: row.last_mutation_id || null,
  __syncPayload: row.payload,
}) : null;

export function createLiveSyncProvider({ client, userId }) {
  const run = async (operation, promise) => {
    const { data, error } = await promise;
    if (error) throw normalizeDataError(error, operation);
    return data;
  };

  return Object.freeze({
    async getRecord(entityType, entityId) {
      const row = await run('sync.download', client.from('sync_records').select('*')
        .eq('user_id', userId).eq('entity_type', entityType).eq('entity_id', entityId).maybeSingle());
      return rowToRecord(row);
    },
    async applyChange(change) {
      const rows = await run('sync.upload', client.rpc('apply_sync_mutation', {
        p_mutation_id: change.id,
        p_entity_type: change.entityType,
        p_entity_id: change.entityId,
        p_expected_revision: Math.max(0, Number(change.baseRevision ?? change.payload?.sync?.baseVersion ?? 0)),
        p_payload: applicationPayload(change.payload),
        p_deleted_at: change.payload?.sync?.deletedAt || null,
        p_device_id: change.deviceId || null,
      }));
      return rowToRecord(rows?.[0]);
    },
    async getChangesSince(timestamp) {
      let query = client.from('sync_records').select('*').eq('user_id', userId).order('updated_at');
      if (timestamp) query = query.gt('updated_at', timestamp);
      return (await run('sync.reconcile', query.limit(1000))).map(rowToRecord);
    },
    async subscribe(onChange, onStatus = () => {}, accessToken = '') {
      const attemptedAt = new Date().toISOString();
      onStatus('CONNECTING', null, { attemptedAt, jwtConfigured: Boolean(accessToken) });
      if (!accessToken) throw new Error('REALTIME_SESSION_TOKEN_MISSING');
      await client.realtime.setAuth(accessToken);
      const channel = client.channel(`collection:${userId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'sync_records', filter: `user_id=eq.${userId}`,
        }, (event) => {
          onStatus('EVENT', null, { eventAt: new Date().toISOString(), eventType: event.eventType || event.type || 'change' });
          onChange(rowToRecord(event.new || event.old), event);
        })
        .subscribe((status, error) => onStatus(status, error, {
          attemptedAt, activeChannelCount: client.getChannels?.().length ?? 1,
          socketState: client.realtime?.isConnected?.() ? 'connected' : 'disconnected',
        }));
      return async () => { await client.removeChannel(channel); };
    },
  });
}
