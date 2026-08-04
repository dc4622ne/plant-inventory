/**
 * @typedef {Object} Repository
 * @property {(options?: {includeDeleted?: boolean}) => Promise<Array<Object>>} getAll
 * @property {(id: string, options?: {includeDeleted?: boolean}) => Promise<Object|null>} getById
 * @property {(record: Object) => Promise<Object>} create
 * @property {(id: string, changes: Object, expectedVersion?: number) => Promise<Object>} update
 * @property {(id: string, expectedVersion?: number) => Promise<Object>} softDelete
 * @property {(id: string, expectedVersion?: number) => Promise<Object>} restore
 *
 * Physical deletion is intentionally absent. A future administrative purge service
 * will be separate from normal repositories and will also coordinate photo objects.
 */

export const repositoryMethods = Object.freeze([
  'getAll', 'getById', 'create', 'update', 'softDelete', 'restore',
]);

export function assertRepository(repository) {
  for (const method of repositoryMethods) {
    if (typeof repository?.[method] !== 'function') throw new TypeError(`Repository is missing ${method}().`);
  }
  return repository;
}
