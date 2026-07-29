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

export function normalizeCormHistoryPhase(value) {
  return text(value).toLocaleLowerCase().replace(/\s+/g, ' ');
}

export function getDuplicateCormPhaseEntries(history) {
  const counts = new Map();
  (Array.isArray(history) ? history : []).forEach((entry) => {
    const phase = normalizeCormHistoryPhase(entry?.phase);
    if (phase) counts.set(phase, (counts.get(phase) || 0) + 1);
  });
  return (Array.isArray(history) ? history : []).filter((entry) => (
    (counts.get(normalizeCormHistoryPhase(entry?.phase)) || 0) > 1
  ));
}

export function hasCormPhaseConflict(history, phase, ignoredEntryId = '') {
  const normalizedPhase = normalizeCormHistoryPhase(phase);
  if (!normalizedPhase) return false;
  return (Array.isArray(history) ? history : []).some((entry) => (
    entry?.id !== ignoredEntryId && normalizeCormHistoryPhase(entry?.phase) === normalizedPhase
  ));
}

export function updateCormPhaseHistoryEntry(history, entryId, updates) {
  const date = text(updates?.date);
  if (!date) throw new Error('A phase date is required.');
  const phase = text(updates?.phase);
  if (hasCormPhaseConflict(history, phase, entryId)) {
    throw new Error('Each corm phase can appear only once. Edit or delete the existing entry first.');
  }
  return sortCormPhaseHistory((Array.isArray(history) ? history : []).map((entry) => (
    entry?.id === entryId
      ? { ...entry, ...updates, date, phase: text(updates?.phase) || entry.phase }
      : entry
  )));
}

export function removeCormPhaseHistoryEntry(history, entryId) {
  return sortCormPhaseHistory((Array.isArray(history) ? history : []).filter((entry) => entry?.id !== entryId));
}

const historicalPlantFields = new Set([
  'id', 'createdAt', 'updatedAt', 'modifiedAt', 'imageUrl', 'image',
  'activityLog', 'photoLog', 'timelineEntries', 'cormPhaseHistory', 'cormProgressPhotos',
  'lifecycleHistory', 'healthTimeline', 'checkIns', 'careHistory', 'journalEntries',
  'tcAcclimationHistory', 'lecaConversionHistory', 'recoveryHistory', 'observationHistory',
]);

export function createPlantDuplicateDraft(plant, plants = []) {
  const draft = Object.fromEntries(Object.entries(plant || {})
    .filter(([fieldName]) => !historicalPlantFields.has(fieldName)));
  draft.name = `${text(plant?.name) || 'Plant'} Copy`;
  draft.activityLog = [];
  draft.photoLog = [];
  draft.timelineEntries = [];
  draft.cormPhaseHistory = [];
  draft.cormProgressPhotos = [];
  draft.lifecycleHistory = [];
  if (draft.cormParentPlantId) {
    const parent = plants.find((candidate) => candidate.id === draft.cormParentPlantId);
    if (!parent || !isEligibleParentPlant(parent, { ...draft, id: '' })) draft.cormParentPlantId = '';
  }
  return draft;
}

export function normalizeLifecycleStage(value) {
  return text(value).toLocaleLowerCase().replace(/[\s_-]+/g, ' ');
}

export function isEligibleParentPlant(parent, child) {
  if (!parent || !parent.id || parent.id === child?.id) return false;
  if (!['corm', 'propagation'].includes(normalizeLifecycleStage(child?.lifecycleStage))) return true;
  return !['corm', 'tissue culture'].includes(normalizeLifecycleStage(parent.lifecycleStage));
}

export function getEligibleParentPlants(plants, child) {
  return (Array.isArray(plants) ? plants : []).filter((parent) => isEligibleParentPlant(parent, child));
}

export function getParentPlantValidation(plants, child) {
  if (!child?.cormParentPlantId) return { valid: true, parent: null };
  const parent = (plants || []).find((candidate) => candidate.id === child.cormParentPlantId);
  return {
    valid: Boolean(parent && isEligibleParentPlant(parent, child)),
    parent: parent || null,
  };
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
