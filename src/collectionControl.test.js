import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCustomOption, countOptionUsage, countQuickViewOptionUsage, discoverPlantFieldOptions,
  getMissingPurchasePricePlantListTarget, getPlantsMissingPurchasePrice,
  getSpendingSummary, hasRecordedPurchasePrice, matchesPlantSearchText,
  parseRecordedPrice, removeCustomOption, validatePurchasePrice,
} from './collectionControl.js';
import {
  createPlantDuplicateDraft, getEligibleParentPlants, getParentPlantValidation,
  getDuplicateCormPhaseEntries, hasCormPhaseConflict, removeCormPhaseHistoryEntry,
  updateCormPhaseHistoryEntry,
} from './plantData.js';

test('updates one corm history entry and sorts without mutating the source', () => {
  const history = [{ id: 'a', phase: 'Starting', date: '2026-02-02' }, { id: 'b', phase: 'Rooting', date: '2026-03-03' }];
  const result = updateCormPhaseHistoryEntry(history, 'b', { phase: 'First leaf emerging', date: '2026-01-01' });
  assert.deepEqual(result.map(({ id, phase, date }) => ({ id, phase, date })), [
    { id: 'b', phase: 'First leaf emerging', date: '2026-01-01' },
    { id: 'a', phase: 'Starting', date: '2026-02-02' },
  ]);
  assert.equal(history[1].date, '2026-03-03');
  assert.throws(() => updateCormPhaseHistoryEntry(history, 'a', { date: '' }));
});

test('discovers and persists reusable growing medium, pot size, and soil mix values', () => {
  const existing = {
    medium: ['LECA'],
    potSize: ['6 inch'],
    soilMix: ['chunky-aroid-mix'],
  };
  const discovered = discoverPlantFieldOptions(existing, [{
    medium: 'Pon with reservoir',
    potSize: '10 inch self-watering pot',
    soilMix: 'Orchid bark and tree fern blend',
    watering: 'Rainwater plus diluted nutrients',
  }, {
    medium: 'LECA',
    potSize: '6 inch',
    soilMix: 'chunky-aroid-mix',
    watering: 'Existing legacy watering note',
  }], ['medium', 'potSize', 'soilMix', 'watering']);

  assert.deepEqual(discovered.medium, ['LECA', 'Pon with reservoir']);
  assert.deepEqual(discovered.potSize, ['10 inch self-watering pot', '6 inch']);
  assert.deepEqual(discovered.soilMix, ['chunky-aroid-mix', 'Orchid bark and tree fern blend']);
  assert.deepEqual(discovered.watering, ['Existing legacy watering note', 'Rainwater plus diluted nutrients']);
  assert.equal(discovered.medium.includes('Pon with reservoir'), true);
  assert.equal(discovered.potSize.includes('10 inch self-watering pot'), true);
  assert.equal(discovered.soilMix.includes('Orchid bark and tree fern blend'), true);
  assert.equal(discovered.watering.includes('Existing legacy watering note'), true);
});

test('duplicate draft keeps reusable fields but strips identity, photos, and history', () => {
  const source = {
    id: 'one', name: 'Alocasia', location: 'Shelf', purchasePrice: '$20', imageUrl: 'data:image/png;base64,big',
    createdAt: 'old', updatedAt: 'old', activityLog: [{ id: 1 }], photoLog: [{ id: 2 }],
    cormPhaseHistory: [{ id: 3 }], lifecycleHistory: [{ id: 4 }], wateringRhythm: 'Mostly dry',
  };
  const result = createPlantDuplicateDraft(source);
  assert.equal(result.name, 'Alocasia Copy');
  assert.equal(result.location, 'Shelf');
  assert.equal(result.purchasePrice, '$20');
  assert.equal(result.wateringRhythm, 'Mostly dry');
  assert.equal(result.id, undefined);
  assert.equal(result.imageUrl, undefined);
  assert.deepEqual(result.activityLog, []);
  assert.deepEqual(result.cormPhaseHistory, []);
});

test('spending includes zero, decimals, legacy currency, archived plants, and unique IDs', () => {
  const plants = [
    { id: 'a', purchasePrice: 10 }, { id: 'b', purchasePrice: '$1,234.50' },
    { id: 'c', purchasePrice: '0', lifecycleStatus: 'archived' }, { id: 'd', purchasePrice: '' },
    { id: 'e', purchasePrice: '-2' }, { id: 'f', purchasePrice: 'nope' },
    { id: 'a', purchasePrice: 99 },
  ];
  assert.equal(parseRecordedPrice('$1,234.50'), 1234.5);
  assert.deepEqual(getSpendingSummary(plants), { total: 1244.5, withPrice: 3, withoutPrice: 3 });
  assert.deepEqual(getSpendingSummary([...plants, { id: 'g', purchasePrice: 5 }]).total, 1249.5);
});

test('missing-price identification uses the spending compatibility parser', () => {
  const plants = [
    { id: 'blank', purchasePrice: '' },
    { id: 'zero-number', purchasePrice: 0 },
    { id: 'zero-text', purchasePrice: '0' },
    { id: 'numeric', purchasePrice: '25.00' },
    { id: 'legacy', purchasePrice: '$25' },
    { id: 'invalid', purchasePrice: 'unknown' },
    { id: 'archived', purchasePrice: '', lifecycleStatus: 'archived' },
  ];
  assert.equal(hasRecordedPurchasePrice(plants[0]), false);
  assert.equal(hasRecordedPurchasePrice(plants[1]), true);
  assert.deepEqual(getPlantsMissingPurchasePrice(plants).map(({ id }) => id), [
    'blank', 'invalid', 'archived',
  ]);
  assert.deepEqual(getMissingPurchasePricePlantListTarget(), {
    lifecycle: 'all', missingPurchasePrice: true,
  });
});

test('purchase-price input accepts blank or nonnegative values with at most two decimals', () => {
  for (const [input, normalized] of [['', ''], ['0', '0.00'], ['12', '12.00'], ['12.3', '12.30'], ['12.34', '12.34']]) {
    assert.deepEqual(validatePurchasePrice(input), { valid: true, value: normalized, error: '' });
  }
  for (const input of ['abc', '$12', '-1', '1.2.3', '1.234', 'NaN', 'Infinity']) {
    assert.equal(validatePurchasePrice(input).valid, false, input);
  }
});

test('plant search includes a dedicated Species value without deriving it from the name', () => {
  const plant = { name: 'Favorite Plant', genus: 'Monstera', species: 'deliciosa' };
  assert.equal(matchesPlantSearchText([plant.name, plant.genus, plant.species], 'DELICIOSA'), true);
  assert.equal(matchesPlantSearchText([plant.name, plant.genus, ''], 'albo'), false);
});

test('custom option helpers prevent duplicates and replace or clear usages and Quick Views', () => {
  const builtIns = { location: ['Kitchen'] };
  const options = addCustomOption({ location: ['Shelf'] }, 'location', ' shelf ', builtIns);
  assert.deepEqual(options.location, ['Shelf']);
  assert.equal(countOptionUsage([{ location: 'SHELF' }, { location: 'Kitchen' }], 'location', 'shelf'), 1);
  const result = removeCustomOption({
    options, builtInOptions: builtIns, plants: [{ id: 'p', location: 'Shelf', name: 'A' }],
    quickViews: [{ id: 'q', state: { filters: { location: ['Shelf', 'Kitchen'] } } }],
    field: 'location', value: 'shelf', replacement: 'Kitchen',
  });
  assert.equal(result.plants[0].location, 'Kitchen');
  assert.deepEqual(result.quickViews[0].state.filters.location, ['Kitchen']);
  assert.equal(countQuickViewOptionUsage(
    [{ state: { filters: { location: ['Shelf'] } } }, { criteria: [{ field: 'location', value: 'shelf' }] }],
    'location', 'Shelf',
  ), 2);
  assert.throws(() => removeCustomOption({ options, builtInOptions: builtIns, plants: [], quickViews: [], field: 'location', value: 'Kitchen' }));
});

test('activity type options count and replace nested log entries without changing record shape', () => {
  const plants = [{
    id: 'p', name: 'Fern', activityLog: [
      { id: 'a', activityType: 'Misted', date: '2026-09-01', notes: 'Leaves' },
      { id: 'b', activityType: 'Watered', date: '2026-09-02', notes: '' },
    ],
  }];
  const options = addCustomOption({ activityType: ['Watered'] }, 'activityType', 'Misted', {
    activityType: ['Watered'],
  });

  assert.deepEqual(options.activityType, ['Misted', 'Watered']);
  assert.equal(countOptionUsage(plants, 'activityType', 'misted'), 1);

  const result = removeCustomOption({
    options,
    builtInOptions: { activityType: ['Watered'] },
    plants,
    quickViews: [],
    field: 'activityType',
    value: 'Misted',
    replacement: 'Watered',
  });
  assert.deepEqual(result.plants[0].activityLog, [
    { id: 'a', activityType: 'Watered', date: '2026-09-01', notes: 'Leaves' },
    { id: 'b', activityType: 'Watered', date: '2026-09-02', notes: '' },
  ]);
  assert.throws(() => removeCustomOption({
    options, builtInOptions: { activityType: ['Watered'] }, plants, quickViews: [],
    field: 'activityType', value: 'Watered',
  }));
});

test('corm history blocks normalized duplicate phases and supports resolving legacy duplicates', () => {
  const history = [
    { id: 'a', phase: 'Rooting', date: '2026-01-01' },
    { id: 'b', phase: ' rooting ', date: '2026-01-02' },
    { id: 'c', phase: 'Starting', date: '2025-12-01' },
  ];
  assert.equal(hasCormPhaseConflict(history, 'ROOTING'), true);
  assert.deepEqual(getDuplicateCormPhaseEntries(history).map((entry) => entry.id), ['a', 'b']);
  assert.throws(
    () => updateCormPhaseHistoryEntry(history, 'c', { phase: 'rooting', date: '2026-01-03' }),
    /only once/,
  );
  assert.deepEqual(removeCormPhaseHistoryEntry(history, 'b').map((entry) => entry.id), ['c', 'a']);
});

test('parent eligibility excludes corm, tissue culture, self, and normalizes legacy formatting', () => {
  const child = { id: 'child', lifecycleStage: ' propagation ', cormParentPlantId: 'tc' };
  const plants = [
    child,
    { id: 'corm', lifecycleStage: ' CORM ' },
    { id: 'tc', lifecycleStage: 'tissue_culture' },
    { id: 'house', lifecycleStage: 'Established Houseplant' },
  ];
  assert.deepEqual(getEligibleParentPlants(plants, child).map((plant) => plant.id), ['house']);
  assert.equal(getParentPlantValidation(plants, child).valid, false);
  assert.equal(createPlantDuplicateDraft(child, plants).cormParentPlantId, '');
});
