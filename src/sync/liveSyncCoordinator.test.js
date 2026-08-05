import assert from 'node:assert/strict';
import test from 'node:test';
import { createLiveSyncCoordinator } from './liveSyncCoordinator.js';
import { synchronizedCollections } from './entityRegistry.js';

function memoryStore() {
  const stores = new Map(); const values = (name) => stores.get(name) || [];
  const key = (name, item) => name === 'records' ? [item.userId,item.entityType,item.entityId] : name === 'migrationRuns' ? [item.userId,item.version] : name === 'syncMetadata' ? [item.userId,item.key] : [item.userId,item.id];
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return { async put(name, item) { const items = values(name); const index = items.findIndex((value) => same(key(name, value), key(name, item))); if (index < 0) items.push(structuredClone(item)); else items[index] = structuredClone(item); stores.set(name, items); },
    async get(name, requested) { return structuredClone(values(name).find((item) => same(key(name, item), requested))); },
    async remove(name, requested) { stores.set(name, values(name).filter((item) => !same(key(name, item), requested))); },
    async forUser(name, userId) { return structuredClone(values(name).filter((item) => item.userId === userId)); } };
}
function memoryStorage() { const map = new Map(); return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: (key) => map.delete(key) }; }

test('all registered entity types queue, upload, and remain user scoped', async () => {
  const store = memoryStore(); const storage = memoryStorage(); const remote = new Map();
  synchronizedCollections.forEach((domain) => storage.setItem(domain.storageKey, JSON.stringify(domain.kind === 'array' ? [{ id: `${domain.entityType}-1`, name: domain.entityType }] : { enabled: true })));
  const provider = { async getRecord(type,id) { return remote.get(`${type}:${id}`) || null; }, async applyChange(change) { const value = { ...change.payload, __syncEntityType: change.entityType, __syncEntityId: change.entityId, updatedAt: new Date().toISOString(), sync: { version: 1 } }; remote.set(`${change.entityType}:${change.entityId}`, value); return value; }, async getChangesSince() { return [...remote.values()]; } };
  const coordinator = createLiveSyncCoordinator({ userId: 'user-a', store, storage, provider, device: { id: 'device-a' } });
  await coordinator.captureLocalChanges(); assert.equal((await store.forUser('mutations','user-a')).length, synchronizedCollections.length);
  assert.equal((await store.forUser('mutations','user-b')).length, 0);
  await coordinator.sync(); assert.deepEqual([...remote.keys()].map((key) => key.split(':')[0]).sort(), synchronizedCollections.map((item) => item.entityType).sort());
  assert.equal((await store.forUser('mutations','user-a')).length, 0);
});

test('expired processing leases recover while active leases remain protected', async () => {
  const store = memoryStore(); const storage = memoryStorage(); let uploads = 0;
  for (const entityType of ['dropdown_options','dashboard_preferences']) await store.put('records', { userId:'user-a', entityType, entityId:'singleton', record:{}, serverRecord:{}, revision:0 });
  const base = { userId:'user-a', deviceId:'d', entityType:'plant', operation:'update', baseRevision:0, baseRecord:{}, payload:{id:'p'}, attempts:0, createdAt:'now' };
  await store.put('mutations',{...base,id:'expired',entityId:'p',state:'processing',leaseUntil:'2000-01-01T00:00:00.000Z'});
  await store.put('mutations',{...base,id:'active',entityId:'q',payload:{id:'q'},state:'processing',leaseUntil:'2999-01-01T00:00:00.000Z'});
  const provider = { async getRecord(){return null;}, async applyChange(change){uploads += 1; return {...change.payload,__syncEntityType:'plant',__syncEntityId:change.entityId,sync:{version:1}};}, async getChangesSince(){return [];} };
  const coordinator = createLiveSyncCoordinator({userId:'user-a',store,storage,provider,device:{id:'d'}}); await coordinator.sync();
  assert.equal(uploads,1); assert.ok(await store.get('mutations',['user-a','active']));
});

test('migrated plant edit uses hosted revision, strips legacy sync metadata, and rebases', async () => {
  const store = memoryStore(); const storage = memoryStorage(); const plantDomain = synchronizedCollections.find((item) => item.entityType === 'plant');
  storage.setItem(plantDomain.storageKey, JSON.stringify([{ id: 'legacy', name: 'Old', type: 'Houseplant', sync: { version: 10144, baseVersion: 55 } }]));
  await store.put('records', { userId: 'user-a', entityType: 'plant', entityId: 'legacy', record: { id: 'legacy', name: 'Before', type: 'Houseplant' }, serverRecord: { id: 'legacy', name: 'Before', type: 'Houseplant' }, revision: 7 });
  for (const entityType of ['dropdown_options','dashboard_preferences']) await store.put('records', { userId:'user-a', entityType, entityId:'singleton', record:{}, serverRecord:{}, revision:0 });
  let uploaded;
  const provider = { async getRecord(){ return { id:'legacy', name:'Before', type:'Houseplant', __syncEntityType:'plant', __syncEntityId:'legacy', sync:{version:7} }; }, async applyChange(change){ uploaded = change; return {...change.payload,__syncEntityType:'plant',__syncEntityId:'legacy',sync:{version:8}}; }, async getChangesSince(){return [];} };
  const coordinator = createLiveSyncCoordinator({userId:'user-a',store,storage,provider,device:{id:'mobile'}});
  await coordinator.sync();
  assert.equal(uploaded.baseRevision, 7); assert.equal(uploaded.payload.type, 'Houseplant'); assert.equal(uploaded.payload.sync, undefined);
  assert.equal((await store.get('records',['user-a','plant','legacy'])).revision, 8);
});
