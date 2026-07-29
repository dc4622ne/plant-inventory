import {
  cormPhaseOptions,
  lifecycleStageOptions,
  normalizeCormPhase,
  shouldShowCormTracker,
} from './plantData.js';

export const tissueCultureStageOptions = [
  'In vitro / unopened', 'Deflasked', 'Community cup', 'High humidity acclimation',
  'Venting', 'Transitioning to ambient', 'Fully acclimated', 'Failed / lost',
];

export const lecaStatusOptions = [
  'Planning', 'Converted', 'Transitioning', 'Rooting', 'Stable',
  'Struggling', 'Failed / reverted to soil',
];

const text = (value) => String(value ?? '').trim();
const entryDate = (entry) => text(entry?.date || entry?.transitionDate || entry?.createdAt);

function latestHistoryValue(history, valueFields) {
  if (!Array.isArray(history)) return '';
  return [...history]
    .filter((entry) => entry && typeof entry === 'object')
    .sort((a, b) => entryDate(a).localeCompare(entryDate(b)))
    .map((entry) => valueFields.map((field) => text(entry[field])).find(Boolean))
    .filter(Boolean)
    .at(-1) || '';
}

function canonicalOrFallback(value, options) {
  const normalized = text(value);
  if (!normalized) return 'Not specified';
  return options.includes(normalized) ? normalized : 'Other';
}

export function isTissueCulturePlant(plant) {
  return plant.origin === 'Tissue culture'
    || plant.lifecycleStage === 'Tissue Culture'
    || text(plant.type).toLowerCase() === 'tissue culture'
    || Boolean(text(plant.tcStage))
    || (Array.isArray(plant.tcStageHistory) && plant.tcStageHistory.length > 0);
}

export function isLecaTrackedPlant(plant) {
  const soilMix = text(plant.soilMix).toLowerCase();
  return text(plant.medium).toLowerCase() === 'leca'
    || soilMix === 'semi-hydro / leca'
    || soilMix === 'semi-hydro'
    || Boolean(plant.trackLecaConversion)
    || ['lecaStatus', 'lecaConversionStartDate', 'lecaRootStatus', 'lecaReservoirSetup',
      'lecaNutrientStatus', 'lecaFlushRhythm', 'lecaStressLevel', 'lecaNotes']
      .some((field) => Boolean(text(plant[field])))
    || (Array.isArray(plant.lecaStatusHistory) && plant.lecaStatusHistory.length > 0);
}

export function getCurrentLecaStatus(plant) {
  const historical = latestHistoryValue(
    plant.lecaStatusHistory || plant.lecaHistory,
    ['status', 'lecaStatus', 'newStatus'],
  );
  return canonicalOrFallback(historical || plant.lecaStatus, lecaStatusOptions);
}

export function getCurrentTissueCultureStage(plant) {
  const historical = latestHistoryValue(
    plant.tcStageHistory || plant.tissueCultureHistory,
    ['stage', 'tcStage', 'newStage'],
  );
  return canonicalOrFallback(historical || plant.tcStage, tissueCultureStageOptions);
}

export function getCurrentCormPhase(plant) {
  const historical = latestHistoryValue(plant.cormPhaseHistory, ['phase', 'cormPhase', 'stage']);
  const raw = historical || plant.cormPhase || plant.cormStage;
  if (!text(raw)) return 'Not specified';
  const knownLegacyPhases = new Set(['Dormant', 'Sprouting', 'Leaf emerging']);
  if (!cormPhaseOptions.includes(raw) && !knownLegacyPhases.has(raw)) return 'Other';
  const normalized = normalizeCormPhase(raw);
  return cormPhaseOptions.includes(normalized) ? normalized : 'Other';
}

export function getCurrentLifecyclePhase(plant) {
  const historical = latestHistoryValue(plant.lifecycleHistory, ['newStage', 'stage', 'lifecycleStage']);
  const stored = historical || text(plant.lifecycleStage);
  if (stored) return lifecycleStageOptions.includes(stored) ? stored : 'Other';
  if (shouldShowCormTracker(plant)) return 'Corm';
  if (isTissueCulturePlant(plant)) {
    return ['Fully acclimated', 'Failed / lost'].includes(getCurrentTissueCultureStage(plant))
      ? 'Established Houseplant'
      : 'Acclimating';
  }
  if (text(plant.careDifficulty).toLowerCase() === 'rehab / watch closely') return 'Rehab';
  return 'Not specified';
}

function aggregate(plants, isIncluded, getValue, preferredOrder = []) {
  const active = plants.filter((plant) => (
    (plant.lifecycleStatus || 'active') === 'active' && isIncluded(plant)
  ));
  const counts = new Map();
  active.forEach((plant) => {
    const value = getValue(plant);
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      const firstIndex = preferredOrder.indexOf(a.label);
      const secondIndex = preferredOrder.indexOf(b.label);
      const firstRank = firstIndex === -1 ? preferredOrder.length : firstIndex;
      const secondRank = secondIndex === -1 ? preferredOrder.length : secondIndex;
      return firstRank - secondRank || b.count - a.count || a.label.localeCompare(b.label);
    });
}

export function aggregateLecaStatuses(plants) {
  return aggregate(plants, isLecaTrackedPlant, getCurrentLecaStatus, [
    ...lecaStatusOptions, 'Not specified', 'Other',
  ]);
}

export function aggregateTissueCultureStages(plants) {
  return aggregate(plants, isTissueCulturePlant, getCurrentTissueCultureStage, [
    ...tissueCultureStageOptions, 'Not specified', 'Other',
  ]);
}

export function aggregateCormPhases(plants) {
  return aggregate(plants, shouldShowCormTracker, getCurrentCormPhase, [
    ...cormPhaseOptions, 'Not specified', 'Other',
  ]);
}

export function aggregateLifecyclePhases(plants) {
  return aggregate(plants, () => true, getCurrentLifecyclePhase);
}

export function matchesPlantInsightFilter(plant, filter) {
  if (!filter?.chart || !filter.value) return true;
  if ((plant.lifecycleStatus || 'active') !== 'active') return false;
  if (filter.chart === 'leca-status') return isLecaTrackedPlant(plant) && getCurrentLecaStatus(plant) === filter.value;
  if (filter.chart === 'tc-stage') return isTissueCulturePlant(plant) && getCurrentTissueCultureStage(plant) === filter.value;
  if (filter.chart === 'corm-phase') return shouldShowCormTracker(plant) && getCurrentCormPhase(plant) === filter.value;
  if (filter.chart === 'lifecycle-phase') return getCurrentLifecyclePhase(plant) === filter.value;
  return true;
}
