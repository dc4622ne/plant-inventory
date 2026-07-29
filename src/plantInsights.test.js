import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateCormPhases,
  aggregateLecaStatuses,
  aggregateLifecyclePhases,
  aggregateTissueCultureStages,
  getCurrentCormPhase,
  getCurrentLecaStatus,
  getCurrentLifecyclePhase,
  getCurrentTissueCultureStage,
  matchesPlantInsightFilter,
} from './plantInsights.js';

const active = { lifecycleStatus: 'active' };

test('LECA aggregation uses latest history, counts once, and excludes archived plants', () => {
  const plants = [
    { ...active, id: 'a', trackLecaConversion: true, lecaStatus: 'Planning', lecaStatusHistory: [
      { status: 'Transitioning', date: '2026-01-01' }, { status: 'Stable', date: '2026-02-01' },
    ] },
    { ...active, id: 'b', medium: 'LECA', lecaStatus: 'Legacy mystery' },
    { lifecycleStatus: 'archived', id: 'c', medium: 'LECA', lecaStatus: 'Stable' },
  ];
  assert.equal(getCurrentLecaStatus(plants[0]), 'Stable');
  assert.deepEqual(aggregateLecaStatuses(plants), [
    { label: 'Stable', count: 1 }, { label: 'Other', count: 1 },
  ]);
});

test('Tissue Culture aggregation supports legacy, missing, unknown, and latest history', () => {
  const plants = [
    { ...active, id: 'a', origin: 'Tissue culture', tcStage: 'Deflasked', tcStageHistory: [
      { stage: 'Venting', date: '2026-02-01' },
    ] },
    { ...active, id: 'b', type: 'Tissue Culture', tcStage: '' },
    { ...active, id: 'c', lifecycleStage: 'Tissue Culture', tcStage: 'Legacy stage' },
  ];
  assert.equal(getCurrentTissueCultureStage(plants[0]), 'Venting');
  assert.deepEqual(aggregateTissueCultureStages(plants), [
    { label: 'Venting', count: 1 },
    { label: 'Not specified', count: 1 },
    { label: 'Other', count: 1 },
  ]);
});

test('Corm aggregation uses latest phase history and counts each tracked plant once', () => {
  const plants = [
    { ...active, id: 'a', origin: 'Corm', cormPhase: 'Starting', cormPhaseHistory: [
      { phase: 'Rooting', date: '2026-01-01' }, { phase: 'First leaf opened', date: '2026-02-01' },
    ] },
    { ...active, id: 'b', lifecycleStage: 'Corm' },
    { ...active, id: 'c', origin: 'Corm', cormPhase: 'Unknown legacy phase' },
  ];
  assert.equal(getCurrentCormPhase(plants[0]), 'First leaf opened');
  assert.deepEqual(aggregateCormPhases(plants), [
    { label: 'First leaf opened', count: 1 },
    { label: 'Not specified', count: 1 },
    { label: 'Other', count: 1 },
  ]);
});

test('lifecycle aggregation prefers latest history, supports legacy data, and includes every active plant', () => {
  const plants = [
    { ...active, id: 'a', lifecycleStage: 'Propagation', lifecycleHistory: [
      { newStage: 'Juvenile Houseplant', transitionDate: '2026-01-01' },
      { newStage: 'Established Houseplant', transitionDate: '2026-03-01' },
    ] },
    { ...active, id: 'b', origin: 'Corm' },
    { ...active, id: 'c' },
    { lifecycleStatus: 'archived', id: 'd', lifecycleStage: 'Rehab' },
  ];
  assert.equal(getCurrentLifecyclePhase(plants[0]), 'Established Houseplant');
  assert.deepEqual(aggregateLifecyclePhases(plants), [
    { label: 'Corm', count: 1 },
    { label: 'Established Houseplant', count: 1 },
    { label: 'Not specified', count: 1 },
  ]);
});

test('chart filter mapping matches the same current-value logic', () => {
  const corm = { ...active, origin: 'Corm', cormPhaseHistory: [{ phase: 'Rooting', date: '2026-01-01' }] };
  const leca = { ...active, medium: 'LECA', lecaStatus: 'Stable' };
  const tc = { ...active, origin: 'Tissue culture', tcStage: 'Venting' };
  const lifecycle = { ...active, lifecycleStage: 'Rehab' };
  assert.equal(matchesPlantInsightFilter(corm, { chart: 'corm-phase', value: 'Rooting' }), true);
  assert.equal(matchesPlantInsightFilter(corm, { chart: 'corm-phase', value: 'Starting' }), false);
  assert.equal(matchesPlantInsightFilter(leca, { chart: 'leca-status', value: 'Stable' }), true);
  assert.equal(matchesPlantInsightFilter(tc, { chart: 'tc-stage', value: 'Venting' }), true);
  assert.equal(matchesPlantInsightFilter(lifecycle, { chart: 'lifecycle-phase', value: 'Rehab' }), true);
});

test('empty inputs produce empty chart rows and segment totals equal included plants', () => {
  assert.deepEqual(aggregateLecaStatuses([]), []);
  assert.deepEqual(aggregateTissueCultureStages([]), []);
  assert.deepEqual(aggregateCormPhases([]), []);
  assert.deepEqual(aggregateLifecyclePhases([]), []);
  const rows = aggregateLecaStatuses([
    { ...active, medium: 'LECA', lecaStatus: 'Stable' },
    { ...active, medium: 'LECA', lecaStatus: 'Stable' },
  ]);
  assert.equal(rows.reduce((sum, row) => sum + row.count, 0), 2);
});
