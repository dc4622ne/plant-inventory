import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeFilterValueCount,
  clearAllPlantFilters,
  clearFilterGroup,
  matchesFilterValue,
  matchesOriginLifecycleFilters,
  missingFilterValue,
  normalizePlantFilters,
} from './plantFilters.js';

const plants = [
  { origin: 'Corm', lifecycleStage: 'Corm', type: 'Houseplant' },
  { origin: 'Tissue culture', lifecycleStage: 'Acclimating', type: 'Tissue Culture' },
  { origin: 'Gift', lifecycleStage: 'Established Houseplant', type: 'Houseplant' },
  { origin: '', lifecycleStage: '', type: 'Houseplant' },
];

test('filters by one or several origins', () => {
  assert.equal(plants.filter((plant) => matchesOriginLifecycleFilters(plant, { origin: ['Corm'], lifecycleStage: [] })).length, 1);
  assert.equal(plants.filter((plant) => matchesOriginLifecycleFilters(plant, { origin: ['Corm', 'Gift'], lifecycleStage: [] })).length, 2);
});

test('combines origin and lifecycle filters', () => {
  assert.equal(plants.filter((plant) => matchesOriginLifecycleFilters(plant, {
    origin: ['Tissue culture', 'Gift'],
    lifecycleStage: ['Acclimating'],
  })).length, 1);
});

test('combines with an existing filter and handles missing values', () => {
  const filters = { origin: [missingFilterValue], lifecycleStage: [] };
  assert.equal(plants.filter((plant) => (
    matchesOriginLifecycleFilters(plant, filters) && plant.type === 'Houseplant'
  )).length, 1);
});

test('reset values have no active filters', () => {
  assert.equal(activeFilterValueCount({ origin: [], lifecycleStage: [], location: '' }), 0);
  assert.equal(activeFilterValueCount({ origin: ['Corm'], lifecycleStage: [], location: 'Kitchen' }), 2);
  assert.equal(activeFilterValueCount({ type: ['Monstera', 'Philodendron'], location: ['Office'] }), 3);
});

test('categorical selections use OR within groups and AND across groups', () => {
  const records = [
    { type: 'Monstera', location: 'Office', medium: 'LECA', status: 'Healthy' },
    { type: 'Philodendron', location: 'Office', medium: 'Soil', status: 'Healthy' },
    { type: 'Monstera', location: 'Kitchen', medium: 'Soil', status: 'Rehab' },
  ];
  const filters = {
    type: ['Monstera', 'Philodendron'],
    location: ['Office'],
    medium: ['LECA', 'Soil'],
    status: ['Healthy'],
  };
  const visible = records.filter((plant) => Object.entries(filters)
    .every(([fieldName, selections]) => matchesFilterValue(plant[fieldName], selections)));
  assert.equal(visible.length, 2);
});

test('legacy singular values normalize safely and groups can be cleared', () => {
  const normalized = normalizePlantFilters({ type: 'Monstera', location: ['Office'], status: 42 });
  assert.deepEqual(normalized.type, ['Monstera']);
  assert.deepEqual(normalized.location, ['Office']);
  assert.deepEqual(normalized.status, []);
  assert.deepEqual(clearFilterGroup(normalized, 'type').type, []);
  assert.equal(activeFilterValueCount(clearAllPlantFilters()), 0);
});
