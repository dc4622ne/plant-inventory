import { normalizeDataError } from '../errors.js';
import { assertRepository } from '../repositoryContract.js';

export function createSupabaseRepository({ client, table, userId }) {
  const run = async (operation, query) => {
    const { data, error } = await query;
    if (error) throw normalizeDataError(error, operation);
    return data;
  };
  const versionedUpdate = (id, changes, expectedVersion) => run('update', client.rpc('update_versioned_record', {
    target_table: table,
    target_id: id,
    expected_version: expectedVersion,
    changes,
  })).then((rows) => rows?.[0] || null);

  return assertRepository({
    async getAll({ includeDeleted = false } = {}) {
      let query = client.from(table).select('*').eq('user_id', userId);
      if (!includeDeleted) query = query.is('deleted_at', null);
      return run('getAll', query);
    },
    async getById(id, { includeDeleted = false } = {}) {
      let query = client.from(table).select('*').eq('id', id).eq('user_id', userId);
      if (!includeDeleted) query = query.is('deleted_at', null);
      return run('getById', query.maybeSingle());
    },
    async create(record) { return run('create', client.from(table).insert({ ...record, user_id: userId }).select().single()); },
    async update(id, changes, expectedVersion) { return versionedUpdate(id, changes, expectedVersion); },
    async softDelete(id, expectedVersion) { return versionedUpdate(id, { deleted_at: new Date().toISOString() }, expectedVersion); },
    async restore(id, expectedVersion) { return versionedUpdate(id, { deleted_at: null }, expectedVersion); },
  });
}
