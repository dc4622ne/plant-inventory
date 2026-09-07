import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasCormTrackerData,
  hasMeaningfulValue,
  isValidPastOrTodayDate,
  isTrackerCompleted,
  normalizeCormPhase,
  normalizePlantRecord,
  newPlantCollectionDefaults,
  projectLegacyOrigin,
  sortCormPhaseHistory,
  shouldShowCormTracker,
} from './plantData.js';

test('new manual plants leave Acquisition Method unset', () => {
  assert.deepEqual(newPlantCollectionDefaults, {
    origin: 'Purchased plant',
    startingStage: 'Juvenile Houseplant',
    acquisitionMethod: '',
    lifecycleStage: 'Juvenile Houseplant',
  });
  const manual = normalizePlantRecord({ ...newPlantCollectionDefaults, id: 'manual' }, 'fallback');
  assert.equal(manual.acquisitionMethod, '');
});

test('new explicit collection-history fields preserve their values independently', () => {
  const normalized = normalizePlantRecord({
    id: 'independent', origin: 'Purchased plant', startingStage: 'Corm',
    acquisitionMethod: 'Trade', lifecycleStage: 'Established Houseplant',
  }, 'fallback');
  assert.equal(normalized.startingStage, 'Corm');
  assert.equal(normalized.acquisitionMethod, 'Trade');
  assert.equal(normalized.lifecycleStage, 'Established Houseplant');
});

test('normalization preserves optional Species exactly and accepts legacy records without it', () => {
  const withSpecies = normalizePlantRecord({
    id: 'species-record', name: 'Named cultivar', genus: 'Monstera', species: 'deliciosa',
  }, 'fallback');
  const legacy = normalizePlantRecord({ id: 'legacy', name: 'Existing name' }, 'fallback');
  assert.equal(withSpecies.species, 'deliciosa');
  assert.equal(withSpecies.name, 'Named cultivar');
  assert.equal(legacy.species, undefined);
  assert.equal(legacy.name, 'Existing name');
});

test('legacy Origin projections are deterministic and preserve unknown values', () => {
  assert.deepEqual(projectLegacyOrigin('Purchased plant'), { startingStage: '', acquisitionMethod: 'Purchased' });
  assert.deepEqual(projectLegacyOrigin('Gift'), { startingStage: '', acquisitionMethod: 'Gift' });
  assert.deepEqual(projectLegacyOrigin('Tissue culture'), { startingStage: 'Tissue Culture', acquisitionMethod: '' });
  assert.deepEqual(projectLegacyOrigin('Corm'), { startingStage: 'Corm', acquisitionMethod: '' });
  assert.deepEqual(projectLegacyOrigin('Cutting'), { startingStage: 'Propagation', acquisitionMethod: '' });
  assert.deepEqual(projectLegacyOrigin('Division'), { startingStage: 'Propagation', acquisitionMethod: '' });
  assert.deepEqual(projectLegacyOrigin('Seed'), { startingStage: 'Propagation', acquisitionMethod: '' });
  assert.deepEqual(projectLegacyOrigin('Collector import'), { startingStage: '', acquisitionMethod: '' });
  assert.equal(normalizePlantRecord({ origin: 'Purchased plant' }, 'fallback').acquisitionMethod, 'Purchased');
  assert.equal(normalizePlantRecord({
    origin: 'Purchased plant', acquisitionMethod: '',
  }, 'fallback').acquisitionMethod, '');
  const custom = normalizePlantRecord({ origin: 'Collector import' }, 'fallback');
  assert.equal(custom.origin, 'Collector import');
  assert.equal(custom.startingStage, '');
  assert.equal(custom.acquisitionMethod, '');
});

test('meaningful detail values preserve zero and false while hiding blanks', () => {
  assert.equal(hasMeaningfulValue(0), true);
  assert.equal(hasMeaningfulValue(false), true);
  assert.equal(hasMeaningfulValue('  '), false);
  assert.equal(hasMeaningfulValue([]), false);
});

test('Corm phase dates accept real past dates but reject future and invalid dates', () => {
  assert.equal(isValidPastOrTodayDate('2026-07-28', '2026-07-29'), true);
  assert.equal(isValidPastOrTodayDate('2026-07-30', '2026-07-29'), false);
  assert.equal(isValidPastOrTodayDate('2026-02-30', '2026-07-29'), false);
});

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

test('Starting Stage remains unchanged when current Lifecycle Stage changes', () => {
  const before = normalizePlantRecord({
    id: 'history', origin: 'Corm', startingStage: 'Corm', lifecycleStage: 'Corm',
  }, 'fallback');
  const after = normalizePlantRecord({ ...before, lifecycleStage: 'Juvenile Houseplant' }, 'fallback');
  assert.equal(after.startingStage, 'Corm');
  assert.equal(after.lifecycleStage, 'Juvenile Houseplant');
  assert.equal(shouldShowCormTracker(after), true);
});

test('normalization preserves IDs and existing history arrays', () => {
  const history = [{ id: 'transition-1', previousStage: 'Corm', newStage: 'Juvenile Houseplant' }];
  const plant = normalizePlantRecord({ id: 'same-id', lifecycleHistory: history }, 'fallback');
  assert.equal(plant.id, 'same-id');
  assert.deepEqual(plant.lifecycleHistory, history);
});
