export const plantOriginOptions = [
  'Purchased plant', 'Tissue culture', 'Corm', 'Cutting',
  'Division', 'Seed', 'Gift', 'Other',
];

export const lifecycleStageOptions = [
  'Corm', 'Propagation', 'Tissue Culture', 'Acclimating',
  'Juvenile Houseplant', 'Established Houseplant', 'Rehab',
  'Garden Plant', 'Other',
];

export const cormPhaseOptions = [
  'Starting', 'Rooting', 'Growth point emerging', 'First leaf emerging',
  'First leaf opened', 'Additional growth', 'Established', 'Unsuccessful',
];

export const cormGrowthMethodOptions = [
  'Puddle method', 'Moss', 'Perlite', 'Fluval and perlite', 'Other',
];

export const cormInitialConditionOptions = [
  'Firm and healthy', 'Dry / dormant', 'Freshly harvested',
  'Rooted', 'Sprouting', 'Damaged / questionable', 'Other',
];

export const cormOutcomeOptions = [
  'In progress', 'Established plant', 'Returned to dormancy', 'Unsuccessful', 'Other',
];

export const cormTrackerFields = [
  'cormReceivedDate', 'cormStartedDate', 'cormParentPlantId', 'cormInitialCondition',
  'cormGrowthMethod', 'cormCustomGrowthMethod', 'cormSproutingMethod', 'cormMedium',
  'cormRootEmergenceDate', 'cormGrowthPointDate', 'cormFirstLeafEmergingDate',
  'cormFirstLeafOpenedDate', 'cormFirstLeafDate', 'cormTransferDate', 'cormEstablishedDate',
  'cormPhase', 'cormStage', 'cormPhaseHistory', 'cormProgressNotes', 'cormProgressPhotos', 'cormOutcome',
];

const legacyCormPhaseMap = {
  Dormant: 'Starting',
  Starting: 'Starting',
  Rooting: 'Rooting',
  Sprouting: 'Growth point emerging',
  'Growth point emerging': 'Growth point emerging',
  'Leaf emerging': 'First leaf emerging',
  'First leaf emerging': 'First leaf emerging',
  'First leaf opened': 'First leaf opened',
  'Additional growth': 'Additional growth',
  Established: 'Established',
  Unsuccessful: 'Unsuccessful',
};

const text = (value) => String(value ?? '').trim();

export function inferPlantOrigin(plant) {
  const combined = [plant.type, plant.source, plant.propagationStatus].map(text).join(' ').toLowerCase();
  if (combined.includes('tissue culture') || /\btc\b/.test(combined)) return 'Tissue culture';
  if (combined.includes('corm')) return 'Corm';
  if (combined.includes('cutting') || combined.includes('node')) return 'Cutting';
  if (combined.includes('division')) return 'Division';
  if (combined.includes('seed')) return 'Seed';
  if (combined.includes('gift') || combined.includes('friend') || combined.includes('giveaway')) return 'Gift';
  if (combined.includes('propagat')) return 'Cutting';
  return 'Purchased plant';
}

export function inferLifecycleStage(plant) {
  const combined = [plant.type, plant.status, plant.propagationStatus, plant.tcStage].map(text).join(' ').toLowerCase();
  if (combined.includes('corm')) return 'Corm';
  if (combined.includes('tissue culture') || /\btc\b/.test(combined)) {
    return combined.includes('acclimat') || plant.tcStage === 'Fully acclimated' ? 'Acclimating' : 'Tissue Culture';
  }
  if (combined.includes('propagat') || combined.includes('rooting') || combined.includes('cutting')) return 'Propagation';
  if (combined.includes('rehab')) return 'Rehab';
  if (combined.includes('garden') || combined.includes('outdoor')) return 'Garden Plant';
  if (combined.includes('established')) return 'Established Houseplant';
  return 'Juvenile Houseplant';
}

export function normalizePlantRecord(plant, fallbackId) {
  const origin = text(plant.origin) || inferPlantOrigin(plant);
  const lifecycleStage = text(plant.lifecycleStage) || inferLifecycleStage(plant);
  const cormPhase = normalizeCormPhase(plant.cormPhase || plant.cormStage);
  const cormStartedDate = text(plant.cormStartedDate) || text(plant.cormReceivedDate);
  const existingPhaseHistory = Array.isArray(plant.cormPhaseHistory) ? plant.cormPhaseHistory : [];
  return {
    ...plant,
    id: plant.id || fallbackId,
    lifecycleStatus: plant.lifecycleStatus || 'active',
    origin,
    lifecycleStage,
    lifecycleHistory: Array.isArray(plant.lifecycleHistory) ? plant.lifecycleHistory : [],
    activityLog: Array.isArray(plant.activityLog) ? plant.activityLog : [],
    photoLog: Array.isArray(plant.photoLog) ? plant.photoLog : [],
    timelineEntries: Array.isArray(plant.timelineEntries) ? plant.timelineEntries : [],
    cormProgressPhotos: Array.isArray(plant.cormProgressPhotos) ? plant.cormProgressPhotos : [],
    cormPhase,
    cormStage: plant.cormStage || cormPhase,
    cormStartedDate,
    cormFirstLeafEmergingDate: text(plant.cormFirstLeafEmergingDate) || text(plant.cormFirstLeafDate),
    cormFirstLeafOpenedDate: text(plant.cormFirstLeafOpenedDate),
    cormEstablishedDate: text(plant.cormEstablishedDate),
    cormGrowthMethod: text(plant.cormGrowthMethod) || normalizeLegacyGrowthMethod(plant.cormSproutingMethod),
    cormCustomGrowthMethod: text(plant.cormCustomGrowthMethod),
    cormPhaseHistory: sortCormPhaseHistory(existingPhaseHistory),
  };
}

export function normalizeCormPhase(value) {
  const original = text(value);
  return legacyCormPhaseMap[original] || (original ? 'Starting' : '');
}

function normalizeLegacyGrowthMethod(value) {
  const original = text(value);
  const match = cormGrowthMethodOptions.find((option) => option.toLowerCase() === original.toLowerCase());
  return match || (original ? 'Other' : '');
}

export function sortCormPhaseHistory(history) {
  return [...history].filter((entry) => entry && typeof entry === 'object').sort((a, b) => (
    String(a.date || a.createdAt || '').localeCompare(String(b.date || b.createdAt || ''))
  ));
}

export function isValidPastOrTodayDate(value, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value
    && value <= today;
}

export function hasMeaningfulValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  if (value === null || value === undefined) return false;
  return typeof value !== 'string' || value.trim().length > 0;
}

export function getCormPhaseStartedDate(plant) {
  const phase = plant.cormPhase || normalizeCormPhase(plant.cormStage);
  return [...(plant.cormPhaseHistory || [])]
    .filter((entry) => entry.phase === phase)
    .map((entry) => entry.date)
    .filter(Boolean)
    .sort()
    .at(-1)
    || plant.cormStartedDate
    || plant.cormReceivedDate
    || '';
}

export function getNextCormPhase(phase) {
  const index = cormPhaseOptions.indexOf(phase);
  return index >= 0 && index < cormPhaseOptions.length - 2 ? cormPhaseOptions[index + 1] : '';
}

export function hasCormTrackerData(plant) {
  return cormTrackerFields.some((field) => (
    Array.isArray(plant[field]) ? plant[field].length > 0 : Boolean(text(plant[field]))
  ));
}

export function shouldShowCormTracker(plant) {
  return plant.origin === 'Corm' || plant.lifecycleStage === 'Corm' || hasCormTrackerData(plant);
}

export function isTrackerCompleted(tracker, plant) {
  if (tracker === 'corm') {
    return ['Established', 'Unsuccessful'].includes(plant.cormPhase || normalizeCormPhase(plant.cormStage))
      || (hasCormTrackerData(plant) && !['Corm', 'Propagation'].includes(plant.lifecycleStage));
  }
  if (tracker === 'tc') {
    return ['Fully acclimated', 'Failed / lost'].includes(plant.tcStage)
      || (hasTcHistory(plant) && !['Tissue Culture', 'Acclimating'].includes(plant.lifecycleStage));
  }
  if (tracker === 'leca') return ['Stable', 'Failed / reverted to soil'].includes(plant.lecaStatus);
  return false;
}

function hasTcHistory(plant) {
  return ['tcStage', 'tcDeflaskDate', 'tcAcclimationStartDate', 'tcAcclimationEndDate',
    'tcSetup', 'tcHumidityLevel', 'tcNotes'].some((field) => Boolean(text(plant[field])));
}
