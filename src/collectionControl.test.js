import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addCustomOption, countOptionUsage, countQuickViewOptionUsage, getSpendingSummary,
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

test('purchase-price input accepts blank or nonnegative values with at most two decimals', () => {
  for (const [input, normalized] of [['', ''], ['0', '0.00'], ['12', '12.00'], ['12.3', '12.30'], ['12.34', '12.34']]) {
    assert.deepEqual(validatePurchasePrice(input), { valid: true, value: normalized, error: '' });
  }
  for (const input of ['abc', '$12', '-1', '1.2.3', '1.234', 'NaN', 'Infinity']) {
    assert.equal(validatePurchasePrice(input).valid, false, input);
  }
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
