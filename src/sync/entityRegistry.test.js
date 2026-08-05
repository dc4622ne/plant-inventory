import assert from 'node:assert/strict';
import test from 'node:test';
import { readLocalEntities, synchronizedCollections, writeEntitiesToCompatibilityStorage } from './entityRegistry.js';

const memory = () => { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }; };

test('registry covers every independent backup collection and assigns stable IDs', () => {
  assert.deepEqual(synchronizedCollections.map((item) => item.entityType), ['plant','journal_entry','check_in','plant_space','garden_bed','wishlist_item','quick_view','dropdown_options','dashboard_preferences']);
  const storage = memory(); storage.setItem('plant-inventory-plants', JSON.stringify([{ name: 'No ID' }]));
  const plant = readLocalEntities(storage).find((item) => item.entityType === 'plant'); assert.ok(plant.entityId); assert.equal(plant.record.id, plant.entityId);
});

test('compatibility hydration excludes tombstones and preserves collection boundaries', () => {
  const storage = memory(); writeEntitiesToCompatibilityStorage([
    { entityType: 'plant', entityId: 'a', record: { id: 'a' } },
    { entityType: 'plant', entityId: 'b', record: { id: 'b' }, deletedAt: 'now' },
    { entityType: 'wishlist_item', entityId: 'w', record: { id: 'w' } },
  ], storage);
  assert.deepEqual(JSON.parse(storage.getItem('plant-inventory-plants')), [{ id: 'a' }]);
  assert.deepEqual(JSON.parse(storage.getItem('plant-inventory-wishlist')), [{ id: 'w' }]);
});
