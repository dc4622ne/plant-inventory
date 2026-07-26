import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasCormTrackerData,
  isTrackerCompleted,
  normalizeCormPhase,
  normalizePlantRecord,
  sortCormPhaseHistory,
  shouldShowCormTracker,
} from './plantData.js';

test('normalizes legacy tissue-culture records without discarding fields', () => {
  const legacy = { id: 'plant-1', name: 'Legacy TC', type: 'Tissue Culture', tcNotes: 'Keep warm' };
  const normalized = normalizePlantRecord(legacy, 'fallback');
  assert.equal(normalized.id, 'plant-1');
  assert.equal(normalized.origin, 'Tissue culture');
  assert.equal(normalized.tcNotes, 'Keep warm');
  assert.deepEqual(normalized.lifecycleHistory, []);
});

test('normalizes legacy corm stages without discarding the original value', () => {
  const plant = normalizePlantRecord({
    id: 'legacy-corm',
    origin: 'Corm',
    cormStage: 'Sprouting',
    cormRootEmergenceDate: '2026-07-01',
    cormFirstLeafDate: '2026-07-10',
  }, 'fallback');
  assert.equal(normalizeCormPhase('Sprouting'), 'Growth point emerging');
  assert.equal(plant.cormPhase, 'Growth point emerging');
  assert.equal(plant.cormStage, 'Sprouting');
  assert.equal(plant.cormRootEmergenceDate, '2026-07-01');
  assert.equal(plant.cormFirstLeafEmergingDate, '2026-07-10');
});

test('preserves growth methods and sorts corm phase history chronologically', () => {
  const history = [
    { id: '2', phase: 'Rooting', date: '2026-07-03' },
    { id: '1', phase: 'Starting', date: '2026-07-01' },
  ];
  const plant = normalizePlantRecord({
    cormGrowthMethod: 'Other',
    cormCustomGrowthMethod: 'Pon in a shallow tray',
    cormPhaseHistory: history,
  }, 'fallback');
  assert.equal(plant.cormGrowthMethod, 'Other');
  assert.equal(plant.cormCustomGrowthMethod, 'Pon in a shallow tray');
  assert.deepEqual(sortCormPhaseHistory(history).map((entry) => entry.id), ['1', '2']);
  assert.deepEqual(plant.cormPhaseHistory.map((entry) => entry.id), ['1', '2']);
});

test('keeps corm tracker available after a lifecycle transition', () => {
  const plant = normalizePlantRecord({
    id: 'corm-1',
    origin: 'Corm',
    lifecycleStage: 'Established Houseplant',
    cormStage: 'Established',
  }, 'fallback');
  assert.equal(shouldShowCormTracker(plant), true);
  assert.equal(hasCormTrackerData(plant), true);
  assert.equal(isTrackerCompleted('corm', plant), true);
});

test('normalization preserves IDs and existing history arrays', () => {
  const history = [{ id: 'transition-1', previousStage: 'Corm', newStage: 'Juvenile Houseplant' }];
  const plant = normalizePlantRecord({ id: 'same-id', lifecycleHistory: history }, 'fallback');
  assert.equal(plant.id, 'same-id');
  assert.deepEqual(plant.lifecycleHistory, history);
});
