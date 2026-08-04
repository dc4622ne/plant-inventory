import { assertRepository } from '../repositoryContract.js';

function read(storage, key, { includeDeleted = false } = {}) {
  try {
    const value = JSON.parse(storage?.getItem(key) || '[]');
    if (!Array.isArray(value)) return [];
    return includeDeleted ? value : value.filter((record) => !record.deletedAt && !record.deleted_at);
  } catch {
    return [];
  }
}

/** Adapter for future incremental UI adoption. Construction and reads never rewrite local data. */
export function createLocalStorageRepository({ storage = globalThis.localStorage, storageKey }) {
  const write = (records) => storage?.setItem(storageKey, JSON.stringify(records));
  return assertRepository({
    async getAll(options) { return read(storage, storageKey, options); },
    async getById(id, options) { return read(storage, storageKey, options).find((record) => record.id === id) || null; },
    async create(record) { const records = read(storage, storageKey, { includeDeleted: true }); write([...records, record]); return record; },
    async update(id, changes) {
      let updated = null;
      const records = read(storage, storageKey, { includeDeleted: true }).map((record) => {
        if (record.id !== id) return record;
        updated = { ...record, ...changes };
        return updated;
      });
      write(records);
      return updated;
    },
    async softDelete(id) { return this.update(id, { deletedAt: new Date().toISOString() }); },
    async restore(id) { return this.update(id, { deletedAt: null }); },
  });
}
