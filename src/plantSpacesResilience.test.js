import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlantSpaces } from './plantSpacesData.js';
import { writeEntitiesToCompatibilityStorage } from './sync/entityRegistry.js';

const memory = () => { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) }; };

test('valid spaces survive malformed records and orphan placements are safe', () => {
  const spaces = normalizePlantSpaces([
    null,
    'broken',
    { id: 'space-a', name: 'Shelf', placements: [{ id: 'placement-a', plantId: 'missing-plant' }, null] },
    { placements: [] },
  ], { ensureDefault: false });
  assert.equal(spaces.length, 1);
  assert.equal(spaces[0].id, 'space-a');
  assert.deepEqual(spaces[0].placements.map((item) => item.plantId), ['missing-plant']);
});

test('compatibility hydration unwraps sync envelopes, normalizes spaces, and excludes tombstones', () => {
  const storage = memory();
  writeEntitiesToCompatibilityStorage([
    { entityType: 'plant_space', entityId: 'space-a', record: { __syncPayload: { name: 'Shelf', placements: {} } } },
    { entityType: 'plant_space', entityId: 'space-deleted', record: { name: 'Gone' }, deletedAt: 'now' },
  ], storage);
  const spaces = JSON.parse(storage.getItem('plant-inventory-plant-spaces'));
  assert.ok(spaces.some((space) => space.id === 'space-a'));
  assert.deepEqual(spaces.find((space) => space.id === 'space-a').placements, []);
  assert.equal(spaces.some((space) => space.id === 'space-deleted'), false);
});
