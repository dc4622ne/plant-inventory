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
function seedStorage(storage, records = {}) { synchronizedCollections.forEach((domain) => storage.setItem(domain.storageKey, JSON.stringify(domain.kind === 'array' ? (records[domain.entityType] || []) : (records[domain.entityType] || {})))); }
async function seedSingletonRecords(store, userId) { for (const entityType of ['dropdown_options','dashboard_preferences']) await store.put('records', { userId, entityType, entityId:'singleton', record:{}, serverRecord:{}, revision:0 }); }

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

test('startup repairs every processing lease abandoned by a prior app session', async () => {
  const store = memoryStore(); const storage = memoryStorage();
  await store.put('mutations',{userId:'u',id:'stale',deviceId:'old',entityType:'plant_space',entityId:'space',operation:'update',payload:{id:'space'},state:'processing',leaseUntil:'2999-01-01T00:00:00.000Z'});
  const provider = { async getRecord(){return null;}, async applyChange(){throw new Error('unused');}, async getChangesSince(){return [];} };
  const coordinator = createLiveSyncCoordinator({userId:'u',store,storage,provider,device:{id:'new'}});
  assert.equal(await coordinator.recoverProcessingLeases(),1);
  const repaired = await store.get('mutations',['u','stale']); assert.deepEqual({state:repaired.state,leaseUntil:repaired.leaseUntil},{state:'pending',leaseUntil:null});
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

test('acknowledgement hydration does not regenerate a replacement mutation', async () => {
  const store = memoryStore(); const storage = memoryStorage(); seedStorage(storage, { plant: [{ id:'p', name:'Monstera', createdAt:'app-created' }] }); await seedSingletonRecords(store,'u'); let revision = 0;
  const provider = { async getRecord(){return null;}, async applyChange(change){ revision += 1; return { ...change.payload, createdAt:'row-created', updatedAt:'row-updated', __syncEntityType:change.entityType, __syncEntityId:change.entityId, __syncMutationId:change.id, __syncPayload:change.payload, sync:{version:revision} }; }, async getChangesSince(){return [];} };
  const coordinator = createLiveSyncCoordinator({userId:'u',store,storage,provider,device:{id:'d'}});
  await coordinator.sync(); assert.equal((await store.forUser('mutations','u')).length,0);
  await coordinator.hydrate(); await coordinator.captureLocalChanges({source:'scan'});
  { const queued = await store.forUser('mutations','u'); assert.equal(queued.length,0,JSON.stringify(queued)); }
});

test('remote pull and realtime application remain read-only after hydration', async () => {
  const store = memoryStore(); const storage = memoryStorage(); seedStorage(storage); await seedSingletonRecords(store,'u');
  const provider = { async getRecord(){return null;}, async applyChange(){throw new Error('unexpected upload');}, async getChangesSince(){return [];} };
  const coordinator = createLiveSyncCoordinator({userId:'u',store,storage,provider,device:{id:'d'}});
  const remote = { id:'p', name:'Remote', createdAt:'row-time', __syncEntityType:'plant', __syncEntityId:'p', __syncPayload:{id:'p',name:'Remote',createdAt:'app-time'}, sync:{version:4} };
  await coordinator.ingestRemote(remote); await coordinator.hydrate(); await coordinator.captureLocalChanges({source:'scan'});
  { const queued = await store.forUser('mutations','u'); assert.equal(queued.length,0,JSON.stringify(queued)); } assert.equal((await store.get('records',['u','plant','p'])).record.createdAt,'app-time');
});

test('same mutation realtime echo removes the mutation and never conflicts or requeues', async () => {
  const store = memoryStore(); const storage = memoryStorage(); seedStorage(storage, { plant:[{id:'p',name:'Local'}] }); await seedSingletonRecords(store,'u');
  const provider = { async getRecord(){return null;}, async applyChange(){throw new Error('not reached');}, async getChangesSince(){return [];} };
  const coordinator = createLiveSyncCoordinator({userId:'u',store,storage,provider,device:{id:'d'}}); await coordinator.captureLocalChanges({source:'user'});
  const mutation = (await store.forUser('mutations','u'))[0];
  await coordinator.ingestRemote({ ...mutation.payload, __syncEntityType:'plant', __syncEntityId:'p', __syncMutationId:mutation.id, __syncPayload:mutation.payload, sync:{version:1} });
  assert.equal((await store.forUser('mutations','u')).length,0); assert.equal((await store.forUser('conflicts','u')).length,0);
  await coordinator.hydrate(); await coordinator.captureLocalChanges({source:'scan'}); { const queued = await store.forUser('mutations','u'); assert.equal(queued.length,0,JSON.stringify(queued)); }
});

test('successful plant_space acknowledgement compacts a regenerated processing entry to zero queued mutations', async () => {
  const store = memoryStore(); const storage = memoryStorage(); seedStorage(storage, { plant_space: [{ id:'space-a', name:'Shelf', placements:{} }] }); await seedSingletonRecords(store,'u');
  let releaseUpload; const uploaded = new Promise((resolve) => { releaseUpload = resolve; });
  const provider = { async getRecord(){return null;}, async applyChange(change){ await uploaded; return {...change.payload,__syncEntityType:'plant_space',__syncEntityId:change.entityId,__syncMutationId:change.id,__syncPayload:change.payload,sync:{version:1}}; }, async getChangesSince(){return [];} };
  const coordinator = createLiveSyncCoordinator({userId:'u',store,storage,provider,device:{id:'d'}});
  await coordinator.captureLocalChanges({source:'user'}); const syncing = coordinator.sync();
  await new Promise((resolve) => setTimeout(resolve, 0));
  const original = (await store.forUser('mutations','u'))[0];
  await store.put('mutations', {...original,id:'regenerated',state:'processing',leaseUntil:'2999-01-01T00:00:00.000Z'});
  releaseUpload(); await syncing;
  assert.deepEqual(await store.forUser('mutations','u'), []);
  assert.equal((await coordinator.getStatus()).pendingChanges, 0);
});

test('non-user requeue loop is paused after the safe threshold', async () => {
  const store = memoryStore(); const storage = memoryStorage(); seedStorage(storage, { plant:[{id:'p',name:'A'}] });
  const provider = { async getRecord(){return null;}, async applyChange(){throw new Error('offline');}, async getChangesSince(){return [];} };
  const coordinator = createLiveSyncCoordinator({userId:'u',store,storage,provider,device:{id:'d'}});
  for (let index=0; index<7; index += 1) { await store.remove('records',['u','plant','p']); await store.remove('mutations',['u',(await store.forUser('mutations','u'))[0]?.id]); await coordinator.captureLocalChanges({source:'hydration'}); }
  const status = await coordinator.getStatus(); assert.equal(status.requeueLoops.length,1); assert.equal(status.requeueLoops[0].requeueCount,7);
});

test('older remote revisions and unrelated realtime events cannot overwrite canonical optimistic state', async () => {
  const store = memoryStore(); const storage = memoryStorage(); seedStorage(storage); await seedSingletonRecords(store,'u');
  await store.put('records',{userId:'u',entityType:'plant',entityId:'p',record:{id:'p',type:'New'},serverRecord:{id:'p',type:'Old'},revision:5});
  await store.put('mutations',{userId:'u',id:'m',deviceId:'d',entityType:'plant',entityId:'p',operation:'update',baseRevision:5,baseRecord:{id:'p',type:'Old'},payload:{id:'p',type:'New'},state:'pending',createdAt:'now'});
  const provider = { async getRecord(){return null;}, async applyChange(){throw new Error('not used');}, async getChangesSince(){return [];} };
  const coordinator = createLiveSyncCoordinator({userId:'u',store,storage,provider,device:{id:'d'}});
  await coordinator.ingestRemote({__syncEntityType:'plant',__syncEntityId:'p',__syncPayload:{id:'p',type:'Old'},sync:{version:4}});
  await coordinator.ingestRemote({__syncEntityType:'journal_entry',__syncEntityId:'j',__syncPayload:{id:'j',text:'Unrelated'},sync:{version:1}});
  assert.equal((await store.get('records',['u','plant','p'])).record.type,'New'); assert.ok(await store.get('mutations',['u','m']));
});

test('same revision divergent remote payload is diagnosed by preserving canonical state', async () => {
  const store = memoryStore(); const storage = memoryStorage(); seedStorage(storage); await seedSingletonRecords(store,'u');
  await store.put('records',{userId:'u',entityType:'plant',entityId:'p',record:{id:'p',type:'Canonical'},serverRecord:{id:'p',type:'Canonical'},revision:8});
  const provider = { async getRecord(){return null;}, async applyChange(){throw new Error('not used');}, async getChangesSince(){return [];} };
  const coordinator = createLiveSyncCoordinator({userId:'u',store,storage,provider,device:{id:'d'}});
  await coordinator.ingestRemote({__syncEntityType:'plant',__syncEntityId:'p',__syncPayload:{id:'p',type:'Stale'},sync:{version:8}});
  assert.equal((await store.get('records',['u','plant','p'])).record.type,'Canonical');
});
