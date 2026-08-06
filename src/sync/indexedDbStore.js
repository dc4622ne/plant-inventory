export const syncDatabaseName = 'plant-tracker-live-sync';
export const syncDatabaseVersion = 1;
export const syncStoreNames = Object.freeze(['records', 'mutations', 'conflicts', 'migrationRuns', 'syncMetadata', 'imageBlobs', 'imageUploadQueue']);

const request = (value) => new Promise((resolve, reject) => { value.onsuccess = () => resolve(value.result); value.onerror = () => reject(value.error); });
const transactionDone = (tx) => new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });

function openBrowserDatabase(indexedDB = globalThis.indexedDB) {
  if (!indexedDB) return Promise.reject(new Error('IndexedDB is unavailable.'));
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open(syncDatabaseName, syncDatabaseVersion);
    opening.onupgradeneeded = () => {
      const db = opening.result;
      const create = (name, keyPath) => db.objectStoreNames.contains(name) ? null : db.createObjectStore(name, { keyPath });
      const records = create('records', ['userId', 'entityType', 'entityId']);
      records?.createIndex('byUser', 'userId');
      records?.createIndex('byUserType', ['userId', 'entityType']);
      const mutations = create('mutations', ['userId', 'id']);
      mutations?.createIndex('byUserState', ['userId', 'state']);
      mutations?.createIndex('byUserEntity', ['userId', 'entityType', 'entityId']);
      const conflicts = create('conflicts', ['userId', 'id']);
      conflicts?.createIndex('byUserStatus', ['userId', 'status']);
      create('migrationRuns', ['userId', 'version']);
      create('syncMetadata', ['userId', 'key']);
      create('imageBlobs', ['userId', 'id']);
      const uploads = create('imageUploadQueue', ['userId', 'id']);
      uploads?.createIndex('byUserState', ['userId', 'state']);
    };
    opening.onsuccess = () => resolve(opening.result);
    opening.onerror = () => reject(opening.error);
  });
}

export function createIndexedDbStore({ indexedDB = globalThis.indexedDB } = {}) {
  let database;
  const db = async () => database || (database = await openBrowserDatabase(indexedDB));
  const withStore = async (name, mode, action) => {
    const connection = await db(); const tx = connection.transaction(name, mode); const store = tx.objectStore(name);
    const done = transactionDone(tx); const result = await action(store); await done; return result;
  };
  const get = (store, key) => withStore(store, 'readonly', (target) => request(target.get(key)));
  const put = (store, value) => withStore(store, 'readwrite', (target) => request(target.put(value)));
  const remove = (store, key) => withStore(store, 'readwrite', (target) => request(target.delete(key)));
  const getAll = (store) => withStore(store, 'readonly', (target) => request(target.getAll()));
  const forUser = async (store, userId) => (await getAll(store)).filter((item) => item.userId === userId);
  const removeUser = async (userId) => {
    for (const store of syncStoreNames) for (const item of await forUser(store, userId)) {
      const key = store === 'records' ? [userId, item.entityType, item.entityId]
        : ['migrationRuns'].includes(store) ? [userId, item.version]
          : store === 'syncMetadata' ? [userId, item.key] : [userId, item.id];
      await remove(store, key);
    }
  };
  return { open: db, get, put, remove, getAll, forUser, removeUser, close: () => { database?.close(); database = null; } };
}
