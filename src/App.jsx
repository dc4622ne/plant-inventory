import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import {
  dashboardCards,
  defaultDashboardPreferences,
  loadDashboardPreferences,
  saveDashboardPreferences,
} from './dashboardPreferences.js';
import Garden from './Garden';
import PlantSpaces from './PlantSpaces';
import Resources from './ResourceLibrary';
import { changelog, currentAppVersion } from './appVersion';
import { getGardenMetrics, loadGardenBeds } from './gardenData';
import ImageUploadField, { SafeImage } from './ImageUploadField';
import { useResolvedImageSource } from './resolvedImageSource';
import { uploadStoredImage } from './imageUploadUtils';
import {
  deleteImageAsset,
  materializeBackupImages,
  migrateEmbeddedImagesInBackup,
} from './imageAssetStore';
import { loadPlantSpaces, plantSpacesStorageKey, plantWallSpaceId } from './plantSpacesData';
import {
  applyBackupToLocalStorage,
  assembleBackup,
  auditBackupCoverage,
  backupHasZeroPlantsWarning,
  backupSchemaVersion,
  describeBackup,
  formatBackupSummary,
  getBackupSummary,
  getLocalMetadata,
  getRestoreSafetySnapshot,
  markLocalDataChanged,
  normalizeBackup,
  storageKeys,
} from './backupUtils';
import {
  getSoilMixByValue,
  getSoilMixDisplayName,
  soilMixGuideResourceId,
  soilMixOptions,
} from './resources';
import { reminderRules } from './reminderRules';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import {
  cormInitialConditionOptions,
  cormOutcomeOptions,
  cormPhaseOptions,
  cormGrowthMethodOptions,
  getCormPhaseStartedDate,
  getNextCormPhase,
  hasCormTrackerData,
  hasMeaningfulValue,
  isValidPastOrTodayDate,
  isTrackerCompleted,
  lifecycleStageOptions,
  normalizePlantRecord,
  plantOriginOptions,
  shouldShowCormTracker,
} from './plantData';
import { loadQuickNotes, quickNotesStorageKey } from './quickNotesData';
import {
  activeFilterValueCount,
  emptyPlantFilters,
  matchesFilterValue,
  matchesOriginLifecycleFilters,
  missingFilterValue,
} from './plantFilters';
import {
  aggregateCormPhases,
  aggregateLecaStatuses,
  aggregateLifecyclePhases,
  aggregateTissueCultureStages,
  isLecaTrackedPlant,
  isTissueCulturePlant,
  lecaStatusOptions,
  matchesPlantInsightFilter,
  tissueCultureStageOptions as tcStageOptions,
} from './plantInsights';
import {
  defaultPlantListState,
  duplicateQuickView,
  loadQuickViews,
  normalizePlantListState,
  quickViewMatchesState,
  removeQuickView,
  saveQuickViews,
  uniqueQuickViewName,
} from './quickViewsData';
import {
  buildPlantTimelineEntries,
  filterTimelineEntries,
  formatTimelineMonth,
  groupTimelineEntriesByMonth,
  sortTimelineEntries,
  timelineFilters,
  timelineSourceLabels,
  timelineTypeOptions,
  timelineTypes,
} from './timeline';

const initialPlants = [
  {
    lifecycleStatus: 'active',
    name: 'Monstera Albo',
    genus: 'Monstera',
    image: '🪴',
    type: 'Houseplant',
    source: 'Personal collection',
    location: 'Plant Wall',
    status: 'Watching for new growth',
    attention: 'Medium',
    lastWatered: '2026-07-04',
    repotDate: '2026-05-18',
    watering: 'Keep the LECA reservoir topped up without submerging the roots.',
    careNote: 'Keep in bright indirect light and monitor LECA roots.',
    lightNeeds: 'Bright indirect light',
    medium: 'LECA',
    potSize: '6 inch',
    acquiredDate: '2025-09-14',
    purchasePrice: '$25',
    wishlistStatus: 'Owned',
    propagationStatus: 'Established',
    pestNotes: 'Monitor for spider mites.',
    growthNotes: 'Watching the newest node for an unfurling leaf.',
  },
  {
    lifecycleStatus: 'active',
    name: 'Venom TC',
    genus: 'Alocasia',
    image: '🧪',
    type: 'Tissue Culture',
    source: 'Palmstreet',
    location: 'TC / Acclimation Area',
    status: 'Acclimating',
    attention: 'High',
    lastWatered: '2026-07-05',
    repotDate: 'Not yet repotted',
    watering: 'Keep the growing medium lightly moist, but never waterlogged.',
    careNote: 'Keep humidity high and avoid disturbing the roots.',
    lightNeeds: 'Grow light',
    medium: 'Tissue culture agar',
    potSize: 'N/A',
    acquiredDate: '2026-06-28',
    purchasePrice: '$25',
    wishlistStatus: 'Owned',
    propagationStatus: 'Tissue culture',
    pestNotes: 'No pests observed; keep the acclimation area clean.',
    growthNotes: 'Watch for firm new roots before lowering humidity.',
  },
  {
    lifecycleStatus: 'active',
    name: 'Sweet Potato Slips',
    genus: 'Sweet Potato',
    image: '🍠',
    type: 'Garden',
    source: 'Garden start',
    location: 'South Window',
    status: 'Growing outdoors',
    attention: 'Low',
    lastWatered: '2026-07-03',
    watering: 'Water deeply whenever the top inch of soil begins to dry.',
    careNote: 'Keep evenly watered while vines establish.',
    lightNeeds: 'Outdoor sun',
    medium: 'Garden bed',
    potSize: 'N/A',
    acquiredDate: '2026-04-12',
    purchasePrice: '$12',
    wishlistStatus: 'Owned',
    propagationStatus: 'Established',
    pestNotes: 'Watch for flea beetles and chewed leaves.',
    growthNotes: 'Vines are filling in; mound soil as they spread.',
  },
  {
    lifecycleStatus: 'active',
    name: 'Pothos Cuttings',
    genus: 'Epipremnum',
    image: '🌱',
    type: 'Propagation',
    source: 'Propagation',
    location: 'Propagation Area',
    status: 'Rooting',
    attention: 'Medium',
    lastWatered: '2026-07-06',
    repotDate: 'Not yet repotted',
    watering: 'Keep the nodes submerged and refresh the water regularly.',
    careNote: 'Change water regularly and pot up once roots are strong.',
    lightNeeds: 'Bright indirect light',
    medium: 'Water',
    potSize: 'N/A',
    acquiredDate: '2026-06-20',
    purchasePrice: '$0',
    wishlistStatus: 'Propagating',
    propagationStatus: 'Water rooting',
    pestNotes: 'No pests observed; inspect leaves during water changes.',
    growthNotes: 'Several roots are forming; pot up when they reach 2–3 inches.',
  },
];

const emptyPlant = {
  lifecycleStatus: 'active',
  origin: 'Purchased plant', lifecycleStage: 'Juvenile Houseplant', lifecycleHistory: [],
  name: '', genus: '', imageUrl: '', type: '', source: '', location: '', status: '', attention: 'Medium',
  lastWatered: '', repotDate: '', watering: '', careNote: '', lightNeeds: '', medium: '',
  wateringRhythm: '', moisturePreference: '', careDifficulty: '',
  potSize: '', thirstLevel: '', soilMix: '', acquiredDate: '', purchasePrice: '', wishlistStatus: 'Owned',
  propagationStatus: '', pestQuarantineStartDate: '', pestQuarantineEndDate: '',
  doNotTouchUntil: '',
  pestNotes: '', growthNotes: '', activityLog: [], photoLog: [],
  timelineEntries: [],
  tcStage: '', tcDeflaskDate: '', tcAcclimationStartDate: '', tcAcclimationEndDate: '',
  tcSetup: '', tcHumidityLevel: '', tcNotes: '',
  trackLecaConversion: false, lecaStatus: '', lecaConversionStartDate: '', lecaRootStatus: '',
  lecaReservoirSetup: '', lecaNutrientStatus: '', lecaFlushRhythm: '', lecaStressLevel: '', lecaNotes: '',
  cormReceivedDate: '', cormStartedDate: '', cormParentPlantId: '', cormInitialCondition: '',
  cormGrowthMethod: '', cormCustomGrowthMethod: '', cormSproutingMethod: '', cormMedium: '',
  cormRootEmergenceDate: '', cormGrowthPointDate: '', cormFirstLeafEmergingDate: '',
  cormFirstLeafOpenedDate: '', cormFirstLeafDate: '', cormTransferDate: '', cormEstablishedDate: '',
  cormPhase: '', cormStage: '', cormPhaseHistory: [], cormProgressNotes: '',
  cormProgressPhotos: [], cormOutcome: '',
};

const activityTypes = [
  'Watered', 'Fertilized', 'Repotted', 'Planted', 'Pruned', 'Propagated',
  'Pest treatment', 'Changed location', 'Changed pot size', 'Health check', 'Quick check-in',
  'General note',
  'LECA conversion', 'Reservoir refill', 'Full flush', 'Root check', 'Nutrient change',
];

const checkInActivityTypes = ['Health check', 'Quick check-in'];

const photoTypes = [
  'Growth update', 'New leaf', 'Repot progress', 'Pest issue',
  'Damage', 'Before/after', 'General photo',
];

const attentionOptions = ['Low', 'Medium', 'High'];
const thirstLevelOptions = ['Dry', 'Medium', 'Thirsty'];
const wateringRhythmOptions = [
  'Dry out fully', 'Mostly dry', 'Slightly moist', 'Keep moist',
  'Reservoir / semi-hydro', 'Propagation water', 'Outdoor seasonal',
];
const moisturePreferenceOptions = ['Dry', 'Moderate', 'Moist', 'Wet / boggy'];
const careDifficultyOptions = ['Easy', 'Moderate', 'Fussy', 'Rehab / watch closely'];
const careRhythmFields = ['wateringRhythm', 'moisturePreference', 'careDifficulty'];
const tcSetupOptions = [
  'Original TC cup', 'Community cup', 'Prop box', 'Humidity dome',
  'Greenhouse cabinet', 'Open air', 'Other',
];
const tcHumidityOptions = ['Very high', 'High', 'Moderate', 'Ambient'];
const acclimatingTcStages = [
  'Deflasked', 'Community cup', 'High humidity acclimation', 'Venting',
  'Transitioning to ambient',
];
const lecaRootStatusOptions = ['No new roots yet', 'Existing roots adapting', 'New water roots showing', 'Strong water roots', 'Root rot concern', 'Root trim done'];
const lecaReservoirOptions = ['No reservoir yet', 'Low reservoir', 'Standard reservoir', 'Wick system', 'Cachepot setup', 'Self-watering pot', 'Other'];
const lecaNutrientOptions = ['Plain water', 'Diluted nutrients', 'Full nutrients', 'Flush only', 'Paused nutrients'];
const lecaFlushOptions = ['Weekly', 'Every 2 weeks', 'Monthly', 'As needed'];
const lecaStressOptions = ['No stress', 'Mild droop', 'Leaf yellowing', 'Leaf drop', 'Severe stress', 'Recovering'];
const lecaTransitionStatuses = ['Transitioning', 'Rooting'];
const lecaStressLevels = ['Leaf yellowing', 'Leaf drop', 'Severe stress'];
const quickNoteDestinations = [
  ['checkin', 'Convert Journal Entry to Check-in'],
  ['activity', 'Convert Journal Entry to Activity Log'],
  ['health', 'Convert Journal Entry to Health Timeline'],
  ['care', 'Convert Journal Entry to Care Note'],
  ['general', 'Keep as permanent journal entry'],
];

function trackerSelectOptions(fieldName, plants = []) {
  if (fieldName === 'cormPhase') return cormPhaseOptions;
  if (fieldName === 'cormGrowthMethod') return cormGrowthMethodOptions;
  if (fieldName === 'cormInitialCondition') return cormInitialConditionOptions;
  if (fieldName === 'cormOutcome') return cormOutcomeOptions;
  if (fieldName === 'cormParentPlantId') return plants.map((plant) => ({ value: plant.id, label: plant.name }));
  return null;
}

const summaryFieldByActivity = {
  Watered: 'lastWatered',
  Repotted: 'repotDate',
};

function todayDate() {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function emptyLogEntry() {
  return { activityType: 'Watered', date: todayDate(), notes: '' };
}

function emptyPhotoEntry() {
  return { photoUrl: '', date: todayDate(), caption: '', photoType: 'General photo' };
}

function emptyTimelineEntry() {
  return { type: 'generalNote', date: todayDate(), title: '', note: '', photoUrl: '' };
}

function getActivitySummaryUpdates(activityLog, activityTypesToUpdate) {
  const summaryUpdates = {};

  [...new Set(activityTypesToUpdate)].forEach((activityType) => {
    const summaryField = summaryFieldByActivity[activityType];
    if (!summaryField) return;

    const matchingDates = activityLog
      .filter((entry) => entry.activityType === activityType)
      .map((entry) => dateInputValue(entry.date))
      .filter(Boolean)
      .sort();

    summaryUpdates[summaryField] = matchingDates.at(-1) || '';
  });

  return summaryUpdates;
}

const initialDropdownOptions = {
  genus: ['Alocasia', 'Epipremnum', 'Monstera', 'Sweet Potato'],
  type: ['Garden', 'Houseplant', 'Propagation', 'Tissue Culture'],
  source: ['Palmstreet', 'Etsy', 'Local nursery', 'Giveaway', 'Friend', 'Personal collection', 'Garden start', 'Propagation'],
  desiredStatus: ['Wishlist', 'Ordered', 'Shipped', 'Arrived', 'Converted', 'Passed', 'Cancelled'],
  status: ['Acclimating', 'Growing outdoors', 'New', 'Rooting', 'Watching for new growth'],
  location: ['Plant Wall', 'South Window', 'Kitchen', 'Basement Grow Light', 'TC / Acclimation Area', 'Propagation Area'],
  lightNeeds: ['Bright indirect light', 'Direct light', 'Grow light', 'Low light', 'Outdoor sun'],
  soilMix: soilMixOptions.map((option) => option.value),
  wateringRhythm: wateringRhythmOptions,
  moisturePreference: moisturePreferenceOptions,
  careDifficulty: careDifficultyOptions,
  tcStage: tcStageOptions,
  tcSetup: tcSetupOptions,
  tcHumidityLevel: tcHumidityOptions,
  lecaStatus: lecaStatusOptions,
  lecaRootStatus: lecaRootStatusOptions,
  lecaReservoirSetup: lecaReservoirOptions,
  lecaNutrientStatus: lecaNutrientOptions,
  lecaFlushRhythm: lecaFlushOptions,
  lecaStressLevel: lecaStressOptions,
};

const plantsStorageKey = storageKeys.plants;
const dropdownOptionsStorageKey = storageKeys.dropdownOptions;
const wishlistStorageKey = storageKeys.wishlistItems;
const remindersStorageKey = storageKeys.reminders;
const plantViewModeStorageKey = storageKeys.plantViewMode;
const plantPageSizesStorageKey = storageKeys.plantPageSizes;
const plantSortSessionKey = 'plant-tracker-plant-sort';
const cloudBackupTable = 'app_backups';
const cloudBackupId = 'primary';
const defaultPlantPageSizes = { cards: 12, gallery: 18, compact: 25 };
const defaultPlantSort = 'name-asc';
const plantSortOptions = [
  ['name-asc', 'Alphabetical: A–Z'],
  ['name-desc', 'Alphabetical: Z–A'],
  ['acquired-desc', 'Newest acquired'],
  ['acquired-asc', 'Oldest acquired'],
  ['added-desc', 'Recently added'],
  ['attention-first', 'Needs attention first'],
  ['next-check', 'Next check due'],
  ['checked-desc', 'Recently checked'],
  ['location', 'Location'],
  ['category', 'Category'],
  ['genus', 'Genus'],
];
const settingsSections = [
  ['quick-views', 'Quick Views'],
  ['cloud', 'Cloud Sync'],
  ['version', 'Version & Release'],
  ['backup', 'Backup & Restore'],
  ['export', 'Import & Export'],
  ['general', 'General'],
];

function loadPlantSort() {
  const savedSort = sessionStorage.getItem(plantSortSessionKey);
  return plantSortOptions.some(([value]) => value === savedSort) ? savedSort : defaultPlantSort;
}

function loadPlantViewMode() {
  const savedViewMode = localStorage.getItem(plantViewModeStorageKey);
  return ['cards', 'gallery', 'compact'].includes(savedViewMode) ? savedViewMode : 'cards';
}

function loadPlantPageSizes() {
  try {
    const savedPageSizes = JSON.parse(localStorage.getItem(plantPageSizesStorageKey) || '{}');
    const validPageSizes = [12, 18, 25, 50, 'all'];
    return Object.fromEntries(Object.entries(defaultPlantPageSizes).map(([viewMode, defaultSize]) => (
      [viewMode, validPageSizes.includes(savedPageSizes[viewMode]) ? savedPageSizes[viewMode] : defaultSize]
    )));
  } catch {
    return { ...defaultPlantPageSizes };
  }
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadCsv(filename, columns, rows) {
  const header = columns.map(([label]) => csvCell(label)).join(',');
  const body = rows.map((row) => columns.map(([, getValue]) => csvCell(getValue(row))).join(','));
  const url = URL.createObjectURL(new Blob(
    [`\uFEFF${[header, ...body].join('\r\n')}`],
    { type: 'text/csv;charset=utf-8' },
  ));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportDate() {
  return new Date().toISOString().slice(0, 10);
}

function makeId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadPlants() {
  const savedPlants = localStorage.getItem(plantsStorageKey);
  const plantsWithLogs = initialPlants.map((plant, index) => normalizePlantRecord(
    plant,
    plant.id || makeId(`starter-${index}`),
  ));

  if (!savedPlants) return plantsWithLogs;

  try {
    const parsedPlants = JSON.parse(savedPlants);
    if (!Array.isArray(parsedPlants)) return plantsWithLogs;

    return parsedPlants.map((plant, index) => normalizePlantRecord(plant, makeId(`plant-${index}`)));
  } catch {
    return plantsWithLogs;
  }
}

function loadReminders() {
  try {
    const saved = JSON.parse(localStorage.getItem(remindersStorageKey) || '[]');
    return Array.isArray(saved) ? saved.map(normalizeReminder).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function loadDropdownOptions() {
  const savedOptions = localStorage.getItem(dropdownOptionsStorageKey);
  let loadedOptions = initialDropdownOptions;

  try {
    const parsedOptions = savedOptions ? JSON.parse(savedOptions) : null;
    loadedOptions = parsedOptions && typeof parsedOptions === 'object'
      ? Object.fromEntries(Object.entries(initialDropdownOptions).map(([fieldName, options]) => [
        fieldName,
        [...new Set([...(parsedOptions[fieldName] || []), ...options])],
      ]))
      : initialDropdownOptions;
  } catch {
    loadedOptions = initialDropdownOptions;
  }

  // Preserve source values entered before Source became a reusable dropdown.
  const savedPlants = loadPlants();
  const savedPlantSources = savedPlants.map((plant) => plant.source).filter(Boolean);
  const customSoilMixValues = savedPlants
    .map((plant) => plant.soilMix)
    .filter((value) => value && !getSoilMixByValue(value));

  return {
    ...loadedOptions,
    source: [...new Set([...loadedOptions.source, ...savedPlantSources])],
    soilMix: [...new Set([...soilMixOptions.map((option) => option.value), ...customSoilMixValues])],
  };
}

const emptyWishlistItem = {
  id: '', name: '', genus: '', type: '', desiredStatus: 'Wishlist', source: '', price: '',
  orderDate: '', shipDate: '', expectedArrivalDate: '', actualArrivalDate: '',
  tracking: '', notes: '', imageUrl: '', converted: false, convertedPlantId: '',
};
const emptyWishlistFilters = { desiredStatus: '', source: '', type: '' };

function loadWishlistItems() {
  try {
    const saved = JSON.parse(localStorage.getItem(wishlistStorageKey) || '[]');
    return Array.isArray(saved) ? saved.map((item) => ({ ...emptyWishlistItem, ...item })) : [];
  } catch {
    return [];
  }
}

function formatPrice(value) {
  if (value === '' || value === null || value === undefined) return '';
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : value;
}

function getPlantImage(name, type) {
  const plantDetails = `${name} ${type}`.toLowerCase();

  if (plantDetails.includes('tissue culture') || plantDetails.includes(' tc')) return '🧪';
  if (plantDetails.includes('propagation') || plantDetails.includes('cutting')) return '🌱';
  if (plantDetails.includes('sweet potato') || plantDetails.includes('garden')) return '🍠';
  return '🪴';
}

function PlantImage({ plant, detail = false, onEnlarge }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = plant.imageUrl?.trim();
  const resolvedImageUrl = useResolvedImageSource(imageUrl);
  const className = `plant-image${detail ? ' detail-image' : ''}`;

  if (resolvedImageUrl && !imageFailed) {
    return (
      <button type="button" className={`${className}${onEnlarge ? ' enlargeable-plant-image' : ''}`}
        onClick={onEnlarge} aria-label={onEnlarge ? `Enlarge photo of ${plant.name}` : undefined}
        disabled={!onEnlarge}>
        <img
          src={resolvedImageUrl}
          alt={`${plant.name} plant`}
          onError={() => setImageFailed(true)}
        />
      </button>
    );
  }

  return (
    <span className={className} role="img" aria-label={`${plant.name} placeholder`}>
      {plant.image || getPlantImage(plant.name, plant.type)}
    </span>
  );
}

function PhotoLogImage({ entry, plantName }) {
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedPhotoUrl = useResolvedImageSource(entry.photoUrl);

  return (
    <div className="photo-log-image">
      {resolvedPhotoUrl && !imageFailed ? (
        <img src={resolvedPhotoUrl} alt={`${plantName}: ${entry.photoType}`}
          onError={() => setImageFailed(true)} />
      ) : (
        <span role="img" aria-label="Photo unavailable">🌿</span>
      )}
    </div>
  );
}

function displayValue(value) {
  return value || 'Not set';
}

function displaySoilMixValue(value) {
  return displayValue(getSoilMixDisplayName(value));
}

function normalizedFilterValue(value) {
  return String(value ?? '').trim();
}

function isTissueCulture(plant) {
  return isTissueCulturePlant(plant);
}

function hasTcTrackerData(plant) {
  return ['tcStage', 'tcDeflaskDate', 'tcAcclimationStartDate', 'tcAcclimationEndDate',
    'tcSetup', 'tcHumidityLevel', 'tcNotes'].some((fieldName) => normalizedFilterValue(plant[fieldName]));
}

function isLecaMedium(plant) {
  return normalizedFilterValue(plant.medium).toLowerCase() === 'leca';
}

function isSemiHydro(plant) {
  return getSoilMixByValue(plant.soilMix)?.id === 'semi-hydro'
    || normalizedFilterValue(plant.soilMix).toLowerCase() === 'semi-hydro / leca';
}

function hasLecaTrackerData(plant) {
  return ['lecaStatus', 'lecaConversionStartDate', 'lecaRootStatus', 'lecaReservoirSetup',
    'lecaNutrientStatus', 'lecaFlushRhythm', 'lecaStressLevel', 'lecaNotes']
    .some((fieldName) => normalizedFilterValue(plant[fieldName]));
}

function shouldShowLecaTracker(plant) {
  return isLecaTrackedPlant(plant);
}

function hasLecaStress(plant) {
  return lecaStressLevels.includes(plant.lecaStressLevel) || plant.lecaRootStatus === 'Root rot concern';
}

function countPlantsByField(plants, fieldName, preferredLabels = []) {
  const counts = new Map(preferredLabels.map((label) => [label, 0]));

  plants.forEach((plant) => {
    const label = normalizedFilterValue(fieldName === 'soilMix'
      ? getSoilMixDisplayName(plant[fieldName])
      : plant[fieldName]) || 'Not set';
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((firstItem, secondItem) => (
      secondItem.count - firstItem.count || firstItem.label.localeCompare(secondItem.label)
    ));
}

const chartColors = ['#52765b', '#d39a42', '#789f80', '#a96d57', '#7b708d', '#b7a45d'];

function prepareDonutRows(rows, maximumSlices = 6) {
  if (rows.length <= maximumSlices) return rows;

  const visibleRows = rows.slice(0, maximumSlices - 1);
  const otherCount = rows.slice(maximumSlices - 1)
    .reduce((total, row) => total + row.count, 0);
  return [...visibleRows, { label: 'Other', count: otherCount, isOther: true }];
}

function getDonutBackground(rows) {
  const countedRows = rows.filter((row) => row.count > 0);
  const total = countedRows.reduce((sum, row) => sum + row.count, 0);
  if (!total) return '#e8ece8';

  let previousPercentage = 0;
  const segments = countedRows.map((row) => {
    const nextPercentage = previousPercentage + (row.count / total) * 100;
    const segment = `${row.color} ${previousPercentage}% ${nextPercentage}%`;
    previousPercentage = nextPercentage;
    return segment;
  });
  return `conic-gradient(${segments.join(', ')})`;
}

function MultiValueFilter({ fieldName, label, value, options, onChange }) {
  const selectedValues = Array.isArray(value) ? value : [];
  const toggleValue = (option) => {
    onChange(selectedValues.includes(option)
      ? selectedValues.filter((item) => item !== option)
      : [...selectedValues, option]);
  };

  return (
    <details className="plant-filter multi-value-filter">
      <summary>{label}{selectedValues.length ? ` (${selectedValues.length})` : ''}</summary>
      <div className="multi-value-filter-options">
        {fieldName === 'tcStage' && <label><input type="checkbox"
          checked={selectedValues.includes('__acclimating__')}
          onChange={() => toggleValue('__acclimating__')} />Acclimating (all stages)</label>}
        {fieldName === 'lecaStatus' && <label><input type="checkbox"
          checked={selectedValues.includes('__leca__')}
          onChange={() => toggleValue('__leca__')} />All LECA tracked plants</label>}
        {fieldName === 'lecaStatus' && <label><input type="checkbox"
          checked={selectedValues.includes('__transitioning__')}
          onChange={() => toggleValue('__transitioning__')} />Transitioning or rooting</label>}
        {fieldName === 'lecaStressLevel' && <label><input type="checkbox"
          checked={selectedValues.includes('__stress__')}
          onChange={() => toggleValue('__stress__')} />Stress concern</label>}
        {[...options, missingFilterValue].map((option) => (
          <label key={option}>
            <input type="checkbox" checked={selectedValues.includes(option)}
              onChange={() => toggleValue(option)} />
            {option === missingFilterValue ? 'Unknown or not recorded' : option}
          </label>
        ))}
        {selectedValues.length > 0 && (
          <button type="button" className="multi-value-filter-clear" onClick={() => onChange([])}>
            Clear {label}
          </button>
        )}
      </div>
    </details>
  );
}

function lifecycleLabel(lifecycleStatus) {
  return lifecycleStatus === 'archived'
    ? 'Archived'
    : lifecycleStatus === 'graveyard' ? 'Graveyard' : 'Active';
}

function dateInputValue(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : '';
}

function addDaysToDate(dateValue, numberOfDays) {
  if (!dateInputValue(dateValue)) return '';

  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + numberOfDays);
  return date.toISOString().slice(0, 10);
}

function normalizeReminder(reminder) {
  if (!reminder || typeof reminder !== 'object' || Array.isArray(reminder)) return null;
  return {
    id: reminder.id || makeId('reminder'),
    plantId: reminder.plantId || '',
    reminderType: reminder.reminderType || 'manual',
    title: reminder.title || 'Check plant',
    dueDate: dateInputValue(reminder.dueDate),
    status: ['active', 'completed', 'dismissed'].includes(reminder.status) ? reminder.status : 'active',
    source: reminder.source === 'automatic' ? 'automatic' : 'manual',
    createdAt: reminder.createdAt || new Date().toISOString(),
    completedAt: reminder.completedAt || '',
    note: reminder.note || '',
    nextCheckDate: dateInputValue(reminder.nextCheckDate),
    linkedTracker: reminder.linkedTracker || '',
    linkedStage: reminder.linkedStage || '',
  };
}

function formatReminderTiming(dueDate) {
  if (!dateInputValue(dueDate)) return 'No date yet';
  const due = new Date(`${dueDate}T00:00:00`);
  const today = new Date(`${todayDate()}T00:00:00`);
  const diffDays = Math.round((due - today) / 86400000);
  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} late`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  return `Due in ${diffDays} days`;
}

function isActiveReminderDuplicate(reminders, reminder) {
  return reminders.some((existingReminder) => (
    existingReminder.status === 'active'
    && existingReminder.plantId === reminder.plantId
    && existingReminder.reminderType === reminder.reminderType
    && existingReminder.dueDate === reminder.dueDate
  ));
}

function getLastCheckedDate(plant) {
  return (plant.activityLog || [])
    .filter((entry) => checkInActivityTypes.includes(entry.activityType))
    .map((entry) => dateInputValue(entry.date))
    .filter(Boolean)
    .sort()
    .at(-1) || '';
}

function daysBetweenTodayAnd(dateValue) {
  if (!dateInputValue(dateValue)) return '';
  const start = new Date(`${dateValue}T00:00:00`);
  const today = new Date(`${todayDate()}T00:00:00`);
  return Math.max(0, Math.floor((today - start) / 86400000));
}

function wasRecentlyChecked(plant, today = todayDate()) {
  const lastChecked = getLastCheckedDate(plant);
  const sevenDaysAgo = addDaysToDate(today, -6);
  return Boolean(lastChecked) && lastChecked >= sevenDaysAgo && lastChecked <= today;
}

function getQuarantineStatus(plant, today = todayDate()) {
  const acquiredDate = dateInputValue(plant.acquiredDate);
  const newPlantQuarantineEnd = addDaysToDate(acquiredDate, 14);
  const pestQuarantineStart = dateInputValue(plant.pestQuarantineStartDate);
  const pestQuarantineEnd = dateInputValue(plant.pestQuarantineEndDate);
  const sevenDaysFromToday = addDaysToDate(today, 7);

  const isInNewPlantQuarantine = Boolean(acquiredDate)
    && acquiredDate <= today
    && newPlantQuarantineEnd >= today;
  const isInPestQuarantine = Boolean(pestQuarantineStart)
    && pestQuarantineStart <= today
    && (!pestQuarantineEnd || pestQuarantineEnd >= today);
  const isNewPlantQuarantineEndingSoon = Boolean(newPlantQuarantineEnd)
    && newPlantQuarantineEnd >= today
    && newPlantQuarantineEnd <= sevenDaysFromToday;
  const isPestQuarantineEndingSoon = Boolean(pestQuarantineStart)
    && pestQuarantineStart <= today
    && pestQuarantineEnd >= today
    && pestQuarantineEnd <= sevenDaysFromToday;

  return {
    isInNewPlantQuarantine,
    isInPestQuarantine,
    isInAnyQuarantine: isInNewPlantQuarantine || isInPestQuarantine,
    isAnyQuarantineEndingSoon: isNewPlantQuarantineEndingSoon || isPestQuarantineEndingSoon,
    newPlantQuarantineEnd,
    pestQuarantineEnd,
  };
}

function isPlantInNewPlantQuarantine(plant) {
  return getQuarantineStatus(plant).isInNewPlantQuarantine;
}

function isPlantInPestQuarantine(plant) {
  return getQuarantineStatus(plant).isInPestQuarantine;
}

function isPlantTcAcclimating(plant) {
  return isTissueCulture(plant)
    && plant.tcStage !== 'Venting'
    && (acclimatingTcStages.includes(plant.tcStage) || normalizedFilterValue(plant.status) === 'Acclimating');
}

function isPlantTcVenting(plant) {
  return isTissueCulture(plant) && plant.tcStage === 'Venting';
}

function isPlantLecaTransitioning(plant) {
  return lecaTransitionStatuses.includes(plant.lecaStatus);
}

function isPlantInRehab(plant) {
  return normalizedFilterValue(plant.careDifficulty).toLowerCase() === 'rehab / watch closely';
}

function isPlantCormOrPropagation(plant) {
  const propagationText = [
    plant.type,
    plant.status,
    plant.propagationStatus,
  ].map((value) => normalizedFilterValue(value).toLowerCase()).join(' ');

  return /\b(corm|propagat|rooting|cutting|node)\b/.test(propagationText);
}

function getAutomaticReminderCandidates(plant, today = todayDate()) {
  if ((plant.lifecycleStatus || 'active') !== 'active') return [];
  const plantId = plant.id;
  const candidates = [];
  const addRule = (ruleKey, linkedTracker = '', linkedStage = '', exactDueDate = '') => {
    const rule = reminderRules[ruleKey];
    const dueDate = exactDueDate || addDaysToDate(today, rule.delayDays);
    if (!plantId || !dateInputValue(dueDate)) return;
    candidates.push({
      id: makeId('reminder'),
      plantId,
      reminderType: rule.reminderType,
      title: rule.title,
      dueDate,
      status: 'active',
      source: 'automatic',
      createdAt: new Date().toISOString(),
      completedAt: '',
      note: '',
      nextCheckDate: '',
      linkedTracker,
      linkedStage,
    });
  };

  if (isPlantInNewPlantQuarantine(plant)) addRule('newPlantQuarantine', 'quarantine', 'new plant');
  if (isPlantInPestQuarantine(plant)) addRule('pestQuarantine', 'quarantine', 'pest');
  if (isPlantTcVenting(plant)) addRule('tcVenting', 'tcStage', plant.tcStage);
  else if (isPlantTcAcclimating(plant)) addRule('tcAcclimating', 'tcStage', plant.tcStage || plant.status);
  if (isPlantLecaTransitioning(plant)) addRule('lecaTransitioning', 'lecaStatus', plant.lecaStatus);
  if (isPlantInRehab(plant)) addRule('rehab', 'careDifficulty', plant.careDifficulty);
  if (isPlantCormOrPropagation(plant)) addRule('cormPropagation', 'propagationStatus', plant.propagationStatus || plant.status || plant.type);
  if (dateInputValue(plant.doNotTouchUntil)) {
    addRule('doNotTouchUntil', 'doNotTouchUntil', plant.doNotTouchUntil, plant.doNotTouchUntil);
  }

  return candidates;
}

function getPlantBadges(plant) {
  const quarantine = getQuarantineStatus(plant);
  const attention = normalizedFilterValue(plant.attention).toLowerCase();
  const badges = [];

  if (quarantine.isInNewPlantQuarantine) badges.push({ label: 'New', kind: 'new' });
  if (isLecaMedium(plant)) {
    badges.push({ label: 'LECA', kind: 'leca' });
  }
  if (isSemiHydro(plant)) badges.push({ label: 'Semi-hydro', kind: 'leca' });
  if (lecaTransitionStatuses.includes(plant.lecaStatus)) badges.push({ label: 'Transitioning', kind: 'leca-transitioning' });
  if (plant.lecaStatus === 'Stable') badges.push({ label: 'Stable LECA', kind: 'leca-stable' });
  if (hasLecaStress(plant)) badges.push({ label: 'LECA stress', kind: 'leca-stress' });
  if (plant.lecaStressLevel === 'Recovering') badges.push({ label: 'Recovering', kind: 'leca-recovering' });
  if (isTissueCulture(plant)) {
    badges.push({ label: 'TC', kind: 'tc' });
  }
  if (acclimatingTcStages.includes(plant.tcStage)) {
    badges.push({ label: 'Acclimating', kind: 'tc-acclimating' });
  } else if (plant.tcStage === 'Fully acclimated') {
    badges.push({ label: 'Fully acclimated', kind: 'tc-acclimated' });
  } else if (plant.tcStage === 'Failed / lost') {
    badges.push({ label: 'Failed TC', kind: 'tc-failed' });
  }
  if (quarantine.isInNewPlantQuarantine) {
    badges.push({ label: 'Quarantine', kind: 'quarantine' });
  }
  if (quarantine.isInPestQuarantine) {
    badges.push({ label: 'Pest quarantine', kind: 'pest-quarantine' });
  }
  if (attention === 'high' || attention === 'needs attention') {
    badges.push({ label: 'Needs attention', kind: 'attention' });
  }
  if (attention === 'watch' || attention === 'watch list') {
    badges.push({ label: 'Watch', kind: 'watch' });
  }
  if (normalizedFilterValue(plant.wateringRhythm).toLowerCase() === 'keep moist') {
    badges.push({ label: 'Keep moist', kind: 'keep-moist' });
  }
  if (normalizedFilterValue(plant.careDifficulty).toLowerCase() === 'rehab / watch closely') {
    badges.push({ label: 'Rehab', kind: 'rehab' });
  }
  if (normalizedFilterValue(plant.careDifficulty).toLowerCase() === 'fussy') {
    badges.push({ label: 'Fussy', kind: 'fussy' });
  }

  return badges;
}

function comparePresentValues(firstValue, secondValue, direction = 'asc') {
  const first = String(firstValue || '').trim();
  const second = String(secondValue || '').trim();
  if (!first && !second) return 0;
  if (!first) return 1;
  if (!second) return -1;
  return first.localeCompare(second, undefined, { sensitivity: 'base', numeric: true })
    * (direction === 'desc' ? -1 : 1);
}

function PlantBadges({ plant }) {
  const badges = getPlantBadges(plant);
  if (!badges.length) return null;

  return (
    <div className="plant-badges" aria-label="Plant care badges">
      {badges.map((badge) => (
        <span className={`plant-badge badge-${badge.kind}`} key={badge.label}>{badge.label}</span>
      ))}
    </div>
  );
}

const detailSections = [
  {
    title: 'Plant information',
    fields: [
      ['genus', 'Genus'], ['type', 'Type / category'], ['source', 'Source'],
      ['location', 'Location'], ['status', 'Status'], ['attention', 'Attention'],
    ],
  },
  {
    title: 'Care details',
    fields: [
      ['lightNeeds', 'Lighting'], ['medium', 'Growing medium'], ['potSize', 'Pot size'],
      ['wateringRhythm', 'Watering rhythm'], ['moisturePreference', 'Moisture preference'],
      ['careDifficulty', 'Care difficulty'],
      ['thirstLevel', 'Thirst level'], ['soilMix', 'Soil mix / substrate mix'],
      ['watering', 'Watering notes'], ['lastWatered', 'Last watered'],
    ],
  },
  {
    title: 'Collection details',
    fields: [
      ['acquiredDate', 'Acquired'], ['purchasePrice', 'Purchase price'],
      ['wishlistStatus', 'Collection'], ['propagationStatus', 'Propagation'],
      ['pestQuarantineStartDate', 'Pest quarantine start'],
      ['pestQuarantineEndDate', 'Pest quarantine end'],
      ['doNotTouchUntil', 'Do not touch until'],
    ],
  },
  {
    title: 'Notes',
    fields: [
      ['careNote', 'Care notes'], ['pestNotes', 'Pest notes'], ['growthNotes', 'Growth notes'],
    ],
  },
];

function getDetailSections(plant) {
  const dateField = ['repotDate', 'Repotted date'];

  return detailSections.map((section) => {
    if (section.title !== 'Care details' || !plant[dateField[0]]) return section;

    return { ...section, fields: [...section.fields, dateField] };
  }).map((section) => ({
    ...section,
    fields: section.fields.filter(([fieldName]) => hasMeaningfulValue(plant[fieldName])),
  })).filter((section) => section.fields.length > 0);
}

const wishlistFieldLabels = {
  name: 'Plant name',
  genus: 'Genus',
  type: 'Type / category',
  imageUrl: 'Photo URL',
  desiredStatus: 'Purchase status',
  priority: 'Purchase priority',
  purchasePriority: 'Purchase priority',
  source: 'Source / seller',
  price: 'Price',
  orderDate: 'Order date',
  shipDate: 'Ship date',
  expectedArrivalDate: 'Expected arrival',
  actualArrivalDate: 'Actual arrival',
  dateAdded: 'Date added',
  createdAt: 'Date added',
  tracking: 'Tracking',
  notes: 'Notes',
  converted: 'Added to inventory',
  convertedPlantId: 'Inventory plant ID',
};

const primaryWishlistFields = [
  'genus', 'type', 'source', 'price', 'desiredStatus', 'orderDate',
  'shipDate', 'expectedArrivalDate', 'actualArrivalDate', 'tracking',
  'converted', 'convertedPlantId', 'notes',
];

function wishlistDisplayValue(fieldName, value) {
  if (fieldName === 'price') return formatPrice(value);
  if (typeof value === 'boolean') return value ? 'Yes' : '';
  return value;
}

function getWishlistDetailFields(item) {
  const knownFields = primaryWishlistFields
    .map((fieldName) => [fieldName, wishlistFieldLabels[fieldName], wishlistDisplayValue(fieldName, item[fieldName])])
    .filter(([, , value]) => value !== '' && value !== null && value !== undefined);
  const knownFieldNames = new Set(['id', 'name', 'imageUrl', ...primaryWishlistFields]);
  const extraFields = Object.entries(item)
    .filter(([fieldName, value]) => !knownFieldNames.has(fieldName) && value !== '' && value !== null && value !== undefined)
    .map(([fieldName, value]) => [fieldName, wishlistFieldLabels[fieldName] || fieldName, wishlistDisplayValue(fieldName, value)]);

  return [...knownFields, ...extraFields];
}

function App() {
  const [plants, setPlants] = useState(loadPlants);
  const [reminders, setReminders] = useState(loadReminders);
  const [quickNotes, setQuickNotes] = useState(loadQuickNotes);
  const [userQuickViews, setUserQuickViews] = useState(loadQuickViews);
  const [gardenBeds, setGardenBeds] = useState(loadGardenBeds);
  const [plantSpaces, setPlantSpaces] = useState(loadPlantSpaces);
  const [gardenFilter, setGardenFilter] = useState({});
  const [focusedPlantSpace, setFocusedPlantSpace] = useState({ spaceId: plantWallSpaceId, plantId: '' });
  const [appView, setAppView] = useState('dashboard');
  const [dashboardPreferences, setDashboardPreferences] = useState(loadDashboardPreferences);
  const [isCustomizingDashboard, setIsCustomizingDashboard] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [selectedSoilMixRecipeId, setSelectedSoilMixRecipeId] = useState('');
  const [resourceReturnPlantId, setResourceReturnPlantId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [plantFormBaseline, setPlantFormBaseline] = useState(JSON.stringify(emptyPlant));
  const [dropdownOptions, setDropdownOptions] = useState(loadDropdownOptions);
  const [newOptionText, setNewOptionText] = useState({
    genus: '', type: '', source: '', desiredStatus: '', status: '', location: '', lightNeeds: '', soilMix: '',
    wateringRhythm: '', moisturePreference: '', careDifficulty: '',
    tcStage: '', tcSetup: '', tcHumidityLevel: '',
    lecaStatus: '', lecaRootStatus: '', lecaReservoirSetup: '', lecaNutrientStatus: '',
    lecaFlushRhythm: '', lecaStressLevel: '',
  });
  const [plantFilters, setPlantFilters] = useState(emptyPlantFilters);
  const [searchText, setSearchText] = useState('');
  const [areMoreFiltersVisible, setAreMoreFiltersVisible] = useState(false);
  const [newPlant, setNewPlant] = useState(emptyPlant);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [lifecycleView, setLifecycleView] = useState('active');
  const [quarantineFilter, setQuarantineFilter] = useState('');
  const [recentlyCheckedFilter, setRecentlyCheckedFilter] = useState(false);
  const [recentlyAcquiredFilter, setRecentlyAcquiredFilter] = useState(false);
  const [plantInsightFilter, setPlantInsightFilter] = useState(null);
  const [activeQuickView, setActiveQuickView] = useState('');
  const [quickViewEditor, setQuickViewEditor] = useState(null);
  const [settingsSection, setSettingsSection] = useState('quick-views');
  const [settingsQuickViewMessage, setSettingsQuickViewMessage] = useState('');
  const [plantViewMode, setPlantViewMode] = useState(loadPlantViewMode);
  const [plantSort, setPlantSort] = useState(loadPlantSort);
  const [plantPageSizes, setPlantPageSizes] = useState(loadPlantPageSizes);
  const [plantPage, setPlantPage] = useState(1);
  const [addPlantMessage, setAddPlantMessage] = useState('');
  const [plantImageFile, setPlantImageFile] = useState(null);
  const [plantImagePreviewUrl, setPlantImagePreviewUrl] = useState('');
  const [plantImageUploadError, setPlantImageUploadError] = useState('');
  const [plantSubmitStatus, setPlantSubmitStatus] = useState('');
  const [isPlantSubmitting, setIsPlantSubmitting] = useState(false);
  const [newLogEntry, setNewLogEntry] = useState(emptyLogEntry);
  const [editingLogEntry, setEditingLogEntry] = useState(null);
  const [logEntryDraft, setLogEntryDraft] = useState(emptyLogEntry);
  const [newPhotoEntry, setNewPhotoEntry] = useState(emptyPhotoEntry);
  const [editingPhotoEntry, setEditingPhotoEntry] = useState(null);
  const [photoEntryDraft, setPhotoEntryDraft] = useState(emptyPhotoEntry);
  const [photoEntryFile, setPhotoEntryFile] = useState(null);
  const [photoEntryPreviewUrl, setPhotoEntryPreviewUrl] = useState('');
  const [photoEntryUploadError, setPhotoEntryUploadError] = useState('');
  const [photoEntrySubmitStatus, setPhotoEntrySubmitStatus] = useState('');
  const [isPhotoEntrySubmitting, setIsPhotoEntrySubmitting] = useState(false);
  const [photoEditFile, setPhotoEditFile] = useState(null);
  const [photoEditPreviewUrl, setPhotoEditPreviewUrl] = useState('');
  const [photoEditUploadError, setPhotoEditUploadError] = useState('');
  const [photoEditSubmitStatus, setPhotoEditSubmitStatus] = useState('');
  const [isPhotoEditSubmitting, setIsPhotoEditSubmitting] = useState(false);
  const [timelineSortOrder, setTimelineSortOrder] = useState('newest');
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [timelineSearch, setTimelineSearch] = useState('');
  const [showTimelineForm, setShowTimelineForm] = useState(false);
  const [timelineDraft, setTimelineDraft] = useState(emptyTimelineEntry);
  const [editingTimelineEntryId, setEditingTimelineEntryId] = useState('');
  const [timelineEntryFile, setTimelineEntryFile] = useState(null);
  const [timelineEntryPreviewUrl, setTimelineEntryPreviewUrl] = useState('');
  const [timelineEntryUploadError, setTimelineEntryUploadError] = useState('');
  const [timelineEntrySubmitStatus, setTimelineEntrySubmitStatus] = useState('');
  const [isTimelineEntrySubmitting, setIsTimelineEntrySubmitting] = useState(false);
  const [timelineLightboxPhoto, setTimelineLightboxPhoto] = useState(null);
  const [profilePhotoLightboxOpen, setProfilePhotoLightboxOpen] = useState(false);
  const [showReturnToTop, setShowReturnToTop] = useState(false);
  const [soilMixIsCustom, setSoilMixIsCustom] = useState(false);
  const [showPhotoComparison, setShowPhotoComparison] = useState(false);
  const [comparisonPhotoIds, setComparisonPhotoIds] = useState({ before: '', after: '' });
  const [quickCheckMessage, setQuickCheckMessage] = useState('');
  const [trackerEditor, setTrackerEditor] = useState('');
  const [trackerDraft, setTrackerDraft] = useState({});
  const [trackerPhotoFile, setTrackerPhotoFile] = useState(null);
  const [trackerPhotoPreviewUrl, setTrackerPhotoPreviewUrl] = useState('');
  const [quickNoteDraft, setQuickNoteDraft] = useState({ text: '', plantId: '', photoUrl: '' });
  const [quickNoteFile, setQuickNoteFile] = useState(null);
  const [quickNotePreviewUrl, setQuickNotePreviewUrl] = useState('');
  const [quickNoteMessage, setQuickNoteMessage] = useState('');
  const [isQuickNoteSubmitting, setIsQuickNoteSubmitting] = useState(false);
  const [showQuickNoteForm, setShowQuickNoteForm] = useState(false);
  const [quickNoteConversion, setQuickNoteConversion] = useState(null);
  const [activeDetailSection, setActiveDetailSection] = useState('plant-overview');
  const [manualReminderDraft, setManualReminderDraft] = useState({ title: '', dueDate: todayDate(), note: '' });
  const [showManualReminderForm, setShowManualReminderForm] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [backupMessageType, setBackupMessageType] = useState('success');
  const [cloudMessage, setCloudMessage] = useState('');
  const [cloudMessageType, setCloudMessageType] = useState('success');
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState('');
  const [cloudRestoredAt, setCloudRestoredAt] = useState('');
  const [cloudPreview, setCloudPreview] = useState(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [backupPreview, setBackupPreview] = useState(null);
  const [restoreSnapshotInfo, setRestoreSnapshotInfo] = useState(() => getRestoreSafetySnapshot());
  const [isChangelogExpanded, setIsChangelogExpanded] = useState(false);
  const [wishlistItems, setWishlistItems] = useState(loadWishlistItems);
  const [wishlistDraft, setWishlistDraft] = useState(emptyWishlistItem);
  const [editingWishlistId, setEditingWishlistId] = useState('');
  const [showWishlistForm, setShowWishlistForm] = useState(false);
  const [wishlistFormBaseline, setWishlistFormBaseline] = useState(JSON.stringify(emptyWishlistItem));
  const [wishlistImageFile, setWishlistImageFile] = useState(null);
  const [wishlistImagePreviewUrl, setWishlistImagePreviewUrl] = useState('');
  const [wishlistImageUploadError, setWishlistImageUploadError] = useState('');
  const [wishlistSubmitStatus, setWishlistSubmitStatus] = useState('');
  const [isWishlistSubmitting, setIsWishlistSubmitting] = useState(false);
  const [gardenFormDirty, setGardenFormDirty] = useState(false);
  const [wishlistSearch, setWishlistSearch] = useState('');
  const [wishlistFilters, setWishlistFilters] = useState(emptyWishlistFilters);
  const [selectedWishlistItemId, setSelectedWishlistItemId] = useState('');
  const importInputRef = useRef(null);
  const plantResultsRef = useRef(null);
  const plantFormRef = useRef(null);
  const hasNewOptionDraft = Object.values(newOptionText).some((value) => value.trim());
  const plantFormDirty = showForm && (JSON.stringify(newPlant) !== plantFormBaseline || hasNewOptionDraft || Boolean(plantImageFile));
  const wishlistFormDirty = showWishlistForm && (JSON.stringify(wishlistDraft) !== wishlistFormBaseline || hasNewOptionDraft || Boolean(wishlistImageFile));
  const hasUnsavedFormChanges = plantFormDirty || wishlistFormDirty || gardenFormDirty;
  const localBackupSummary = getBackupSummary(createBackup());
  const localMetadata = getLocalMetadata();
  const backupAudit = useMemo(() => auditBackupCoverage(), []);
  const unprocessedQuickNotes = quickNotes.filter((note) => note.status === 'unprocessed');
  const filedQuickNotes = quickNotes.filter((note) => note.status === 'filed');

  function changePlantViewMode(nextViewMode) {
    setPlantViewMode(nextViewMode);
    setPlantPage(1);
    localStorage.setItem(plantViewModeStorageKey, nextViewMode);
    markLocalDataChanged('preference');
  }

  function changePlantSort(nextSort) {
    setPlantSort(nextSort);
    setPlantPage(1);
    sessionStorage.setItem(plantSortSessionKey, nextSort);
  }

  function changePlantPageSize(nextPageSize) {
    const updatedPageSizes = { ...plantPageSizes, [plantViewMode]: nextPageSize };
    setPlantPageSizes(updatedPageSizes);
    setPlantPage(1);
    localStorage.setItem(plantPageSizesStorageKey, JSON.stringify(updatedPageSizes));
    markLocalDataChanged('preference');
  }

  function isMobilePlantLayout() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function scrollPlantResultsIntoView() {
    if (!isMobilePlantLayout()) return;
    window.setTimeout(() => {
      plantResultsRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 80);
  }

  function openPlantDetails(plant) {
    setAppView('plants');
    setSelectedPlant(plant);
    setNewLogEntry(emptyLogEntry());
    setManualReminderDraft({ title: '', dueDate: todayDate(), note: '' });
    setShowManualReminderForm(false);
    setTimelineFilter('all');
    setTimelineSearch('');
    resetTimelineEntryForm();
    setTimelineLightboxPhoto(null);
    setShowPhotoComparison(false);
    setQuickCheckMessage('');
    cancelEditingLogEntry();
  }

  function saveReminders(nextReminders) {
    localStorage.setItem(remindersStorageKey, JSON.stringify(nextReminders));
    markLocalDataChanged('reminders');
    setReminders(nextReminders);
  }

  function createAutomaticRemindersForPlant(plant, previousPlant = null) {
    const candidates = getAutomaticReminderCandidates(plant);
    if (!candidates.length) return;

    const previousKeys = new Set(
      previousPlant
        ? getAutomaticReminderCandidates(previousPlant).map((reminder) => `${reminder.reminderType}|${reminder.dueDate}`)
        : [],
    );
    const remindersToCreate = candidates.filter((candidate) => (
      !previousKeys.has(`${candidate.reminderType}|${candidate.dueDate}`)
    ));
    if (!remindersToCreate.length) return;

    setReminders((currentReminders) => {
      const nextReminders = [...currentReminders];
      remindersToCreate.forEach((candidate) => {
        if (!isActiveReminderDuplicate(nextReminders, candidate)) nextReminders.push(candidate);
      });
      localStorage.setItem(remindersStorageKey, JSON.stringify(nextReminders));
      markLocalDataChanged('reminders');
      return nextReminders;
    });
  }

  function createManualReminder(event) {
    event.preventDefault();
    if (!selectedPlant || !manualReminderDraft.title.trim()) return;
    const reminder = normalizeReminder({
      id: makeId('reminder'),
      plantId: selectedPlant.id,
      reminderType: 'manual',
      title: manualReminderDraft.title.trim(),
      dueDate: dateInputValue(manualReminderDraft.dueDate),
      status: 'active',
      source: 'manual',
      createdAt: new Date().toISOString(),
      completedAt: '',
      note: manualReminderDraft.note.trim(),
      nextCheckDate: '',
    });
    saveReminders([...reminders, reminder]);
    setManualReminderDraft({ title: '', dueDate: todayDate(), note: '' });
    setShowManualReminderForm(false);
  }

  function updateReminder(updatedReminder) {
    const nextReminders = reminders.map((reminder) => reminder.id === updatedReminder.id ? updatedReminder : reminder);
    saveReminders(nextReminders);
  }

  function completeReminder(reminder) {
    const note = window.prompt('Observation note (optional)', reminder.note || '') ?? reminder.note;
    const nextCheckDate = window.prompt('Next check date (YYYY-MM-DD, optional)', '') || '';
    const completedReminder = {
      ...reminder,
      status: 'completed',
      completedAt: new Date().toISOString(),
      note: note.trim(),
      nextCheckDate: dateInputValue(nextCheckDate),
    };
    const nextReminders = reminders.map((item) => item.id === reminder.id ? completedReminder : item);

    if (dateInputValue(nextCheckDate)) {
      const followUpReminder = normalizeReminder({
        id: makeId('reminder'),
        plantId: reminder.plantId,
        reminderType: reminder.reminderType,
        title: reminder.title,
        dueDate: nextCheckDate,
        status: 'active',
        source: reminder.source,
        createdAt: new Date().toISOString(),
        note: '',
        linkedTracker: reminder.linkedTracker,
        linkedStage: reminder.linkedStage,
      });
      if (!isActiveReminderDuplicate(nextReminders, followUpReminder)) nextReminders.push(followUpReminder);
    }

    saveReminders(nextReminders);
  }

  function dismissReminder(reminder) {
    updateReminder({ ...reminder, status: 'dismissed' });
  }

  function snoozeReminder(reminder, option) {
    const customDate = option === 'custom'
      ? window.prompt('Snooze until (YYYY-MM-DD)', reminder.dueDate || todayDate())
      : '';
    const dueDate = option === 'tomorrow'
      ? addDaysToDate(todayDate(), 1)
      : option === '3-days'
        ? addDaysToDate(todayDate(), 3)
        : option === '1-week'
          ? addDaysToDate(todayDate(), 7)
          : dateInputValue(customDate);
    if (!dateInputValue(dueDate)) return;
    updateReminder({ ...reminder, dueDate });
  }

  function setReminderNextCheck(reminder) {
    const nextCheckDate = window.prompt('Next check date (YYYY-MM-DD)', reminder.nextCheckDate || reminder.dueDate || todayDate());
    if (!dateInputValue(nextCheckDate)) return;
    const followUpReminder = normalizeReminder({
      id: makeId('reminder'),
      plantId: reminder.plantId,
      reminderType: reminder.reminderType,
      title: reminder.title,
      dueDate: nextCheckDate,
      status: 'active',
      source: reminder.source,
      createdAt: new Date().toISOString(),
      note: '',
      nextCheckDate,
      linkedTracker: reminder.linkedTracker,
      linkedStage: reminder.linkedStage,
    });
    if (isActiveReminderDuplicate(reminders, followUpReminder)) return;
    saveReminders([...reminders, followUpReminder]);
  }

  useEffect(() => {
    if (!hasUnsavedFormChanges) return undefined;
    const warnBeforeUnload = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedFormChanges]);

  useEffect(() => {
    const onScroll = () => setShowReturnToTop(window.scrollY > 520);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const lightboxOpen = profilePhotoLightboxOpen || Boolean(timelineLightboxPhoto) || showPhotoComparison;
    if (!lightboxOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setProfilePhotoLightboxOpen(false);
      setTimelineLightboxPhoto(null);
      setShowPhotoComparison(false);
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [profilePhotoLightboxOpen, timelineLightboxPhoto, showPhotoComparison]);

  useEffect(() => () => {
    if (plantImagePreviewUrl) URL.revokeObjectURL(plantImagePreviewUrl);
  }, [plantImagePreviewUrl]);

  useEffect(() => () => {
    if (wishlistImagePreviewUrl) URL.revokeObjectURL(wishlistImagePreviewUrl);
  }, [wishlistImagePreviewUrl]);

  useEffect(() => () => {
    if (photoEntryPreviewUrl) URL.revokeObjectURL(photoEntryPreviewUrl);
  }, [photoEntryPreviewUrl]);

  useEffect(() => () => {
    if (photoEditPreviewUrl) URL.revokeObjectURL(photoEditPreviewUrl);
  }, [photoEditPreviewUrl]);

  useEffect(() => () => {
    if (timelineEntryPreviewUrl) URL.revokeObjectURL(timelineEntryPreviewUrl);
  }, [timelineEntryPreviewUrl]);

  useEffect(() => {
    if (!selectedWishlistItemId) return undefined;
    const closeWishlistDetails = (event) => {
      if (event.key === 'Escape') setSelectedWishlistItemId('');
    };
    window.addEventListener('keydown', closeWishlistDetails);
    return () => window.removeEventListener('keydown', closeWishlistDetails);
  }, [selectedWishlistItemId]);

  function clearPlantImageSelection() {
    if (plantImagePreviewUrl) URL.revokeObjectURL(plantImagePreviewUrl);
    setPlantImageFile(null);
    setPlantImagePreviewUrl('');
    setPlantImageUploadError('');
    setPlantSubmitStatus('');
  }

  function selectPlantImageFile(file) {
    if (!file) {
      clearPlantImageSelection();
      return;
    }

    if (plantImagePreviewUrl) URL.revokeObjectURL(plantImagePreviewUrl);
    setPlantImageFile(file);
    setPlantImagePreviewUrl(URL.createObjectURL(file));
    setPlantImageUploadError('');
    setPlantSubmitStatus('');
    setNewPlant((plant) => ({ ...plant, imageUrl: '' }));
  }

  function clearWishlistImageSelection() {
    if (wishlistImagePreviewUrl) URL.revokeObjectURL(wishlistImagePreviewUrl);
    setWishlistImageFile(null);
    setWishlistImagePreviewUrl('');
    setWishlistImageUploadError('');
    setWishlistSubmitStatus('');
  }

  function selectWishlistImageFile(file) {
    if (!file) {
      clearWishlistImageSelection();
      return;
    }

    if (wishlistImagePreviewUrl) URL.revokeObjectURL(wishlistImagePreviewUrl);
    setWishlistImageFile(file);
    setWishlistImagePreviewUrl(URL.createObjectURL(file));
    setWishlistImageUploadError('');
    setWishlistSubmitStatus('');
  }

  function clearPhotoEntryImageSelection() {
    if (photoEntryPreviewUrl) URL.revokeObjectURL(photoEntryPreviewUrl);
    setPhotoEntryFile(null);
    setPhotoEntryPreviewUrl('');
    setPhotoEntryUploadError('');
    setPhotoEntrySubmitStatus('');
  }

  function selectPhotoEntryImageFile(file) {
    if (!file) {
      clearPhotoEntryImageSelection();
      return;
    }

    if (photoEntryPreviewUrl) URL.revokeObjectURL(photoEntryPreviewUrl);
    setPhotoEntryFile(file);
    setPhotoEntryPreviewUrl(URL.createObjectURL(file));
    setPhotoEntryUploadError('');
    setPhotoEntrySubmitStatus('');
  }

  function clearPhotoEditImageSelection() {
    if (photoEditPreviewUrl) URL.revokeObjectURL(photoEditPreviewUrl);
    setPhotoEditFile(null);
    setPhotoEditPreviewUrl('');
    setPhotoEditUploadError('');
    setPhotoEditSubmitStatus('');
  }

  function selectPhotoEditImageFile(file) {
    if (!file) {
      clearPhotoEditImageSelection();
      return;
    }

    if (photoEditPreviewUrl) URL.revokeObjectURL(photoEditPreviewUrl);
    setPhotoEditFile(file);
    setPhotoEditPreviewUrl(URL.createObjectURL(file));
    setPhotoEditUploadError('');
    setPhotoEditSubmitStatus('');
  }

  function clearTimelineEntryImageSelection() {
    if (timelineEntryPreviewUrl) URL.revokeObjectURL(timelineEntryPreviewUrl);
    setTimelineEntryFile(null);
    setTimelineEntryPreviewUrl('');
    setTimelineEntryUploadError('');
    setTimelineEntrySubmitStatus('');
  }

  function selectTimelineEntryImageFile(file) {
    if (!file) {
      clearTimelineEntryImageSelection();
      return;
    }

    if (timelineEntryPreviewUrl) URL.revokeObjectURL(timelineEntryPreviewUrl);
    setTimelineEntryFile(file);
    setTimelineEntryPreviewUrl(URL.createObjectURL(file));
    setTimelineEntryUploadError('');
    setTimelineEntrySubmitStatus('');
    setTimelineDraft((draft) => ({ ...draft, photoUrl: '' }));
  }

  function resetTimelineEntryForm() {
    setTimelineDraft(emptyTimelineEntry());
    setEditingTimelineEntryId('');
    setShowTimelineForm(false);
    clearTimelineEntryImageSelection();
  }

  function confirmDiscardChanges(isDirty = hasUnsavedFormChanges) {
    return !isDirty || window.confirm('You have unsaved changes. Discard them and continue?');
  }

  function resetMajorFormDrafts() {
    setNewPlant(emptyPlant);
    setPlantFormBaseline(JSON.stringify(emptyPlant));
    clearPlantImageSelection();
    setShowForm(false);
    setIsEditing(false);
    setWishlistDraft(emptyWishlistItem);
    setWishlistFormBaseline(JSON.stringify(emptyWishlistItem));
    setEditingWishlistId('');
    setShowWishlistForm(false);
    setSelectedWishlistItemId('');
    clearWishlistImageSelection();
    setNewPhotoEntry(emptyPhotoEntry());
    cancelEditingPhotoEntry();
    clearPhotoEntryImageSelection();
    clearPhotoEditImageSelection();
    resetTimelineEntryForm();
    setTimelineLightboxPhoto(null);
    setShowPhotoComparison(false);
    setNewOptionText({
      genus: '', type: '', source: '', desiredStatus: '', status: '', location: '', lightNeeds: '', soilMix: '',
      wateringRhythm: '', moisturePreference: '', careDifficulty: '',
      tcStage: '', tcSetup: '', tcHumidityLevel: '',
      lecaStatus: '', lecaRootStatus: '', lecaReservoirSetup: '', lecaNutrientStatus: '',
      lecaFlushRhythm: '', lecaStressLevel: '',
    });
  }

  const normalizedSearch = searchText.trim().toLowerCase();
  const searchableFields = [
    'name', 'genus', 'type', 'status', 'location', 'lightNeeds', 'origin', 'lifecycleStage',
    'soilMix', 'careNote', 'watering', 'pestNotes', 'growthNotes',
    'wateringRhythm', 'moisturePreference', 'careDifficulty',
    'tcStage', 'tcSetup', 'tcHumidityLevel', 'tcNotes',
    'lecaStatus', 'lecaRootStatus', 'lecaReservoirSetup', 'lecaNutrientStatus',
    'lecaFlushRhythm', 'lecaStressLevel', 'lecaNotes',
    'cormGrowthMethod', 'cormCustomGrowthMethod', 'cormMedium', 'cormPhase',
    'cormProgressNotes', 'cormOutcome',
  ];
  const primaryFilterFields = [
    ['medium', 'Growing medium'], ['type', 'Type / category'], ['location', 'Location'],
  ];
  const advancedFilterFields = [
    ['genus', 'Genus'], ['status', 'Status'], ['potSize', 'Pot size'],
    ['attention', 'Attention'], ['thirstLevel', 'Thirst level'],
    ['soilMix', 'Soil mix / substrate mix'],
    ['wateringRhythm', 'Watering rhythm'], ['moisturePreference', 'Moisture preference'],
    ['careDifficulty', 'Care difficulty'],
    ['tcStage', 'TC stage'],
    ['lecaStatus', 'LECA conversion status'], ['lecaStressLevel', 'LECA stress level'],
  ];
  const filterFields = [...primaryFilterFields, ...advancedFilterFields];
  const getFilterOptions = (fieldName) => {
    if (fieldName === 'soilMix') {
      return [
        ...new Set([
          ...soilMixOptions.map((option) => option.label),
          ...plants.map((plant) => getSoilMixDisplayName(plant.soilMix)),
        ].map(normalizedFilterValue).filter(Boolean)),
      ].sort((firstOption, secondOption) => firstOption.localeCompare(secondOption));
    }

    return [
      ...new Set([
        ...(dropdownOptions[fieldName] || []),
        ...(fieldName === 'attention' ? attentionOptions : []),
        ...plants.map((plant) => plant[fieldName]),
      ].map(normalizedFilterValue).filter(Boolean)),
    ].sort((firstOption, secondOption) => firstOption.localeCompare(secondOption));
  };
  const getPlantNextCheckDate = (plant) => reminders
    .filter((reminder) => reminder.plantId === plant.id && reminder.status === 'active')
    .map((reminder) => dateInputValue(reminder.dueDate || reminder.nextCheckDate))
    .filter(Boolean)
    .sort()[0] || '';
  const plantNeedsAttention = (plant) => {
    const attentionBadgeKinds = new Set(['attention', 'watch', 'rehab', 'leca-stress']);
    const hasAttentionBadge = getPlantBadges(plant).some((badge) => attentionBadgeKinds.has(badge.kind));
    const nextCheckDate = getPlantNextCheckDate(plant);
    return hasAttentionBadge || (Boolean(nextCheckDate) && nextCheckDate < todayDate());
  };
  const comparePlants = (firstPlant, secondPlant) => {
    let result = 0;
    if (plantSort === 'name-asc') result = comparePresentValues(firstPlant.name, secondPlant.name);
    if (plantSort === 'name-desc') result = comparePresentValues(firstPlant.name, secondPlant.name, 'desc');
    if (plantSort === 'acquired-desc') result = comparePresentValues(firstPlant.acquiredDate, secondPlant.acquiredDate, 'desc');
    if (plantSort === 'acquired-asc') result = comparePresentValues(firstPlant.acquiredDate, secondPlant.acquiredDate);
    if (plantSort === 'added-desc') result = comparePresentValues(firstPlant.createdAt, secondPlant.createdAt, 'desc');
    if (plantSort === 'next-check') result = comparePresentValues(getPlantNextCheckDate(firstPlant), getPlantNextCheckDate(secondPlant));
    if (plantSort === 'checked-desc') result = comparePresentValues(getLastCheckedDate(firstPlant), getLastCheckedDate(secondPlant), 'desc');
    if (plantSort === 'location') result = comparePresentValues(firstPlant.location, secondPlant.location);
    if (plantSort === 'category') result = comparePresentValues(firstPlant.type, secondPlant.type);
    if (plantSort === 'genus') result = comparePresentValues(firstPlant.genus, secondPlant.genus);
    if (plantSort === 'attention-first') {
      result = Number(plantNeedsAttention(secondPlant)) - Number(plantNeedsAttention(firstPlant));
    }
    return result || comparePresentValues(firstPlant.name, secondPlant.name);
  };
  const visiblePlants = plants
    .filter((plant) => {
      const matchesLifecycle = lifecycleView === 'all'
        || (plant.lifecycleStatus || 'active') === lifecycleView;
      const matchesFilters = filterFields.every(([fieldName]) => {
        const selectedFilters = Array.isArray(plantFilters[fieldName])
          ? plantFilters[fieldName]
          : plantFilters[fieldName] ? [plantFilters[fieldName]] : [];
        const plantValue = normalizedFilterValue(fieldName === 'soilMix'
          ? getSoilMixDisplayName(plant[fieldName])
          : plant[fieldName]);

        if (!selectedFilters.length) return true;
        return selectedFilters.some((selectedFilter) => {
          if (selectedFilter === missingFilterValue) return !plantValue;
          if (fieldName === 'attention' && selectedFilter === 'Watch list') {
            return ['Watch', 'Watch list'].includes(plantValue);
          }
          if (fieldName === 'tcStage' && selectedFilter === '__acclimating__') {
            return acclimatingTcStages.includes(plantValue);
          }
          if (fieldName === 'type' && selectedFilter === '__tissue_culture__') return isTissueCulture(plant);
          if (fieldName === 'lecaStatus' && selectedFilter === '__leca__') return shouldShowLecaTracker(plant);
          if (fieldName === 'lecaStatus' && selectedFilter === '__transitioning__') return lecaTransitionStatuses.includes(plantValue);
          if (fieldName === 'lecaStressLevel' && selectedFilter === '__stress__') return hasLecaStress(plant);
          return matchesFilterValue(plantValue, [selectedFilter]);
        });
      });
      const matchesSearch = !normalizedSearch
        || searchableFields.some((fieldName) => (
          String(fieldName === 'soilMix' ? getSoilMixDisplayName(plant[fieldName]) : plant[fieldName] || '')
            .toLowerCase().includes(normalizedSearch)
        ))
        || quickNotes.some((entry) => (
          entry.plantId === plant.id && entry.text.toLowerCase().includes(normalizedSearch)
        ));
      const quarantineStatus = getQuarantineStatus(plant);
      const matchesQuarantine = !quarantineFilter
        || (quarantineFilter === 'current' && quarantineStatus.isInAnyQuarantine)
        || (quarantineFilter === 'soon' && quarantineStatus.isAnyQuarantineEndingSoon)
        || (quarantineFilter === 'new' && quarantineStatus.isInNewPlantQuarantine)
        || (quarantineFilter === 'pest' && quarantineStatus.isInPestQuarantine);
      const matchesRecentlyChecked = !recentlyCheckedFilter || wasRecentlyChecked(plant);
      const fourteenDaysAgo = addDaysToDate(todayDate(), -13);
      const acquiredDate = dateInputValue(plant.acquiredDate);
      const matchesRecentlyAcquired = !recentlyAcquiredFilter || (
        Boolean(acquiredDate) && acquiredDate >= fourteenDaysAgo && acquiredDate <= todayDate()
      );

      const matchesOriginLifecycle = plantFilters.origin.includes('__corm__')
        ? shouldShowCormTracker(plant) && matchesFilterValue(plant.lifecycleStage, plantFilters.lifecycleStage)
        : matchesOriginLifecycleFilters(plant, plantFilters);

      return matchesLifecycle && matchesFilters && matchesOriginLifecycle
        && matchesSearch && matchesQuarantine
        && matchesRecentlyChecked && matchesRecentlyAcquired
        && matchesPlantInsightFilter(plant, plantInsightFilter);
    })
    .sort(comparePlants);

  const plantPageSize = plantPageSizes[plantViewMode];
  const plantPageCount = plantPageSize === 'all'
    ? 1
    : Math.max(1, Math.ceil(visiblePlants.length / plantPageSize));
  const currentPlantPage = Math.min(plantPage, plantPageCount);
  const firstVisiblePlantIndex = plantPageSize === 'all'
    ? 0
    : (currentPlantPage - 1) * plantPageSize;
  const paginatedPlants = plantPageSize === 'all'
    ? visiblePlants
    : visiblePlants.slice(firstVisiblePlantIndex, firstVisiblePlantIndex + plantPageSize);
  const lastVisiblePlantIndex = firstVisiblePlantIndex + paginatedPlants.length;

  useEffect(() => {
    setPlantPage(1);
  }, [searchText, plantFilters, lifecycleView, quarantineFilter, recentlyCheckedFilter,
    recentlyAcquiredFilter, plantInsightFilter, plantViewMode, plantSort]);

  useEffect(() => {
    if (plantPage > plantPageCount) setPlantPage(plantPageCount);
  }, [plantPage, plantPageCount]);

  useEffect(() => {
    const handleSettingsHistory = () => {
      const sectionId = window.location.hash.replace('#settings-', '');
      if (settingsSections.some(([id]) => id === sectionId)) setSettingsSection(sectionId);
    };
    window.addEventListener('popstate', handleSettingsHistory);
    return () => window.removeEventListener('popstate', handleSettingsHistory);
  }, []);

  const countPlants = (matchesPlant) => plants.filter(matchesPlant).length;
  const lifecycleCounts = {
    active: countPlants((plant) => (plant.lifecycleStatus || 'active') === 'active'),
    archived: countPlants((plant) => plant.lifecycleStatus === 'archived'),
    graveyard: countPlants((plant) => plant.lifecycleStatus === 'graveyard'),
  };
  const activePlants = plants.filter((plant) => (plant.lifecycleStatus || 'active') === 'active');
  const isPlantInQuarantine = (plant) => getQuarantineStatus(plant).isInAnyQuarantine;
  const isPlantLeavingQuarantineSoon = (plant) => (
    getQuarantineStatus(plant).isAnyQuarantineEndingSoon
  );
  const selectedPlantQuarantine = selectedPlant ? getQuarantineStatus(selectedPlant) : null;
  const activeReminders = reminders.filter((reminder) => reminder.status === 'active');
  const completedReminders = reminders.filter((reminder) => reminder.status === 'completed');
  const reminderPlantById = new Map(plants.map((plant) => [plant.id, plant]));
  const sortRemindersByDueDate = (firstReminder, secondReminder) => {
    if (!firstReminder.dueDate && !secondReminder.dueDate) return secondReminder.createdAt.localeCompare(firstReminder.createdAt);
    if (!firstReminder.dueDate) return 1;
    if (!secondReminder.dueDate) return -1;
    return firstReminder.dueDate.localeCompare(secondReminder.dueDate);
  };
  const dueNowReminders = activeReminders
    .filter((reminder) => reminder.dueDate && reminder.dueDate <= todayDate())
    .sort(sortRemindersByDueDate);
  const overdueReminders = dueNowReminders.filter((reminder) => reminder.dueDate < todayDate());
  const upcomingReminders = activeReminders
    .filter((reminder) => reminder.dueDate && reminder.dueDate > todayDate())
    .sort(sortRemindersByDueDate);
  const noDateReminders = activeReminders.filter((reminder) => !reminder.dueDate);
  const recentlyCompletedReminders = completedReminders
    .sort((firstReminder, secondReminder) => (secondReminder.completedAt || '').localeCompare(firstReminder.completedAt || ''))
    .slice(0, 12);
  const thisWeekReminders = upcomingReminders.filter((reminder) => reminder.dueDate <= addDaysToDate(todayDate(), 7));
  const selectedPlantReminders = selectedPlant
    ? reminders
      .filter((reminder) => reminder.plantId === selectedPlant.id && ['active', 'completed', 'dismissed'].includes(reminder.status))
      .sort((firstReminder, secondReminder) => {
        if (firstReminder.status === 'active' && secondReminder.status !== 'active') return -1;
        if (firstReminder.status !== 'active' && secondReminder.status === 'active') return 1;
        return sortRemindersByDueDate(firstReminder, secondReminder);
      })
      .slice(0, 8)
    : [];
  const selectedPlantTimelineEntries = useMemo(() => (
    selectedPlant ? buildPlantTimelineEntries(selectedPlant, reminders) : []
  ), [selectedPlant, reminders]);
  const selectedPlantSpacePlacement = selectedPlant
    ? plantSpaces
      .map((space) => ({ space, placement: (space.placements || []).find((item) => item.plantId === selectedPlant.id) }))
      .find((item) => item.placement)
    : null;
  const visibleTimelineEntries = useMemo(() => (
    sortTimelineEntries(
      filterTimelineEntries(selectedPlantTimelineEntries, timelineFilter, timelineSearch),
      timelineSortOrder,
    )
  ), [selectedPlantTimelineEntries, timelineFilter, timelineSearch, timelineSortOrder]);
  const timelineMonthGroups = useMemo(() => (
    [...groupTimelineEntriesByMonth(visibleTimelineEntries).entries()]
  ), [visibleTimelineEntries]);
  const timelinePhotoEntries = useMemo(() => (
    selectedPlantTimelineEntries
      .filter((entry) => entry.photoUrl)
      .sort((firstEntry, secondEntry) => firstEntry.date.localeCompare(secondEntry.date))
  ), [selectedPlantTimelineEntries]);
  const selectedComparisonPhotos = {
    before: timelinePhotoEntries.find((entry) => entry.id === comparisonPhotoIds.before) || null,
    after: timelinePhotoEntries.find((entry) => entry.id === comparisonPhotoIds.after) || null,
  };
  const comparisonDaysBetween = selectedComparisonPhotos.before && selectedComparisonPhotos.after
    ? Math.abs(Math.round(
      (new Date(`${selectedComparisonPhotos.after.date}T00:00:00`) - new Date(`${selectedComparisonPhotos.before.date}T00:00:00`)) / 86400000,
    ))
    : null;
  const timelineSummary = {
    total: selectedPlantTimelineEntries.length,
    photos: timelinePhotoEntries.length,
    firstDate: selectedPlantTimelineEntries.map((entry) => entry.date).filter(Boolean).sort()[0] || '',
    latestDate: selectedPlantTimelineEntries.map((entry) => entry.date).filter(Boolean).sort().at(-1) || '',
  };
  const hasActiveTimelineFilters = timelineFilter !== 'all' || timelineSearch.trim();
  const keyMetrics = [
    { label: 'Active plants', count: activePlants.length, lifecycle: 'active' },
    { label: 'Total plants', count: plants.length, lifecycle: 'all' },
    { label: 'Archived plants', count: lifecycleCounts.archived, lifecycle: 'archived' },
    { label: 'Graveyard plants', count: lifecycleCounts.graveyard, lifecycle: 'graveyard' },
  ];
  const carePriorityMetrics = [
    { label: 'Needs attention', count: activePlants.filter((plant) => normalizedFilterValue(plant.attention).toLowerCase() === 'high').length, lifecycle: 'active', filter: ['attention', 'High'] },
    { label: 'Watch list', count: activePlants.filter((plant) => ['watch', 'watch list'].includes(normalizedFilterValue(plant.attention).toLowerCase())).length, lifecycle: 'active', filter: ['attention', 'Watch list'] },
    { label: 'Keep moist', count: activePlants.filter((plant) => normalizedFilterValue(plant.wateringRhythm).toLowerCase() === 'keep moist').length, lifecycle: 'active', filter: ['wateringRhythm', 'Keep moist'] },
    { label: 'Rehab / watch closely', count: activePlants.filter((plant) => normalizedFilterValue(plant.careDifficulty).toLowerCase() === 'rehab / watch closely').length, lifecycle: 'active', filter: ['careDifficulty', 'Rehab / watch closely'] },
    { label: 'Fussy plants', count: activePlants.filter((plant) => normalizedFilterValue(plant.careDifficulty).toLowerCase() === 'fussy').length, lifecycle: 'active', filter: ['careDifficulty', 'Fussy'] },
    { label: 'Recently checked', count: activePlants.filter((plant) => wasRecentlyChecked(plant)).length, lifecycle: 'active', recentlyChecked: true },
  ];
  const quarantineMetrics = [
    { label: 'New plants', count: activePlants.filter((plant) => getQuarantineStatus(plant).isInNewPlantQuarantine).length, lifecycle: 'active', quarantine: 'new' },
    { label: 'Plants in quarantine', count: activePlants.filter(isPlantInQuarantine).length, lifecycle: 'active', quarantine: 'current' },
    { label: 'Coming out of quarantine soon', count: activePlants.filter(isPlantLeavingQuarantineSoon).length, lifecycle: 'active', quarantine: 'soon' },
    { label: 'Pest quarantine', count: activePlants.filter((plant) => getQuarantineStatus(plant).isInPestQuarantine).length, lifecycle: 'active', quarantine: 'pest' },
  ];
  const tcMetrics = [
    { label: 'Tissue cultures', count: activePlants.filter(isTissueCulture).length, lifecycle: 'active', filter: ['type', 'Tissue Culture'] },
    { label: 'TC acclimating', count: activePlants.filter((plant) => isTissueCulture(plant) && acclimatingTcStages.includes(plant.tcStage)).length, lifecycle: 'active', filter: ['tcStage', '__acclimating__'] },
    { label: 'TC fully acclimated', count: activePlants.filter((plant) => isTissueCulture(plant) && plant.tcStage === 'Fully acclimated').length, lifecycle: 'active', filter: ['tcStage', 'Fully acclimated'] },
    { label: 'Failed/lost TC', count: activePlants.filter((plant) => isTissueCulture(plant) && plant.tcStage === 'Failed / lost').length, lifecycle: 'active', filter: ['tcStage', 'Failed / lost'] },
  ];
  const lecaMetrics = [
    { label: 'LECA plants', count: activePlants.filter(shouldShowLecaTracker).length, lifecycle: 'active', filter: ['lecaStatus', '__leca__'] },
    { label: 'LECA transitioning', count: activePlants.filter((plant) => lecaTransitionStatuses.includes(plant.lecaStatus)).length, lifecycle: 'active', filter: ['lecaStatus', '__transitioning__'] },
    { label: 'Stable LECA plants', count: activePlants.filter((plant) => plant.lecaStatus === 'Stable').length, lifecycle: 'active', filter: ['lecaStatus', 'Stable'] },
    { label: 'LECA stress', count: activePlants.filter(hasLecaStress).length, lifecycle: 'active', filter: ['lecaStressLevel', '__stress__'] },
    { label: 'Recovering LECA plants', count: activePlants.filter((plant) => plant.lecaStressLevel === 'Recovering').length, lifecycle: 'active', filter: ['lecaStressLevel', 'Recovering'] },
  ];
  const today = todayDate();
  const sevenDaysFromToday = addDaysToDate(today, 7);
  const wishlistMetrics = [
    { label: 'Wishlist', count: wishlistItems.filter((item) => item.desiredStatus === 'Wishlist').length, filter: 'Wishlist' },
    { label: 'Ordered', count: wishlistItems.filter((item) => item.desiredStatus === 'Ordered').length, filter: 'Ordered' },
    { label: 'Shipped', count: wishlistItems.filter((item) => item.desiredStatus === 'Shipped').length, filter: 'Shipped' },
    { label: 'Arriving soon', count: wishlistItems.filter((item) => {
      const date = dateInputValue(item.expectedArrivalDate);
      return !item.converted && Boolean(date) && date >= today && date <= sevenDaysFromToday;
    }).length, arrivingSoon: true },
  ];
  const gardenMetrics = getGardenMetrics(gardenBeds);
  const wishlistFilterOptions = (field) => [...new Set(wishlistItems.map((item) => item[field]).filter(Boolean))].sort();
  const selectedWishlistItem = wishlistItems.find((item) => item.id === selectedWishlistItemId);
  const visibleWishlistItems = wishlistItems.filter((item) => {
    const matchesSearch = !wishlistSearch.trim() || item.name.toLowerCase().includes(wishlistSearch.trim().toLowerCase());
    const matchesFilters = Object.entries(wishlistFilters).every(([field, value]) => !value || item[field] === value);
    const date = dateInputValue(item.expectedArrivalDate);
    const matchesSoon = !wishlistFilters.arrivingSoon || (!item.converted && date && date >= today && date <= sevenDaysFromToday);
    return matchesSearch && matchesFilters && matchesSoon;
  });
  const dashboardCharts = [
    {
      title: 'Plants by type / category',
      description: 'Active plants',
      rows: prepareDonutRows(countPlantsByField(activePlants, 'type')),
      fieldName: 'type',
    },
    {
      title: 'Plants by growing medium',
      description: 'Active plants',
      rows: prepareDonutRows(countPlantsByField(activePlants, 'medium')),
      fieldName: 'medium',
    },
    {
      title: 'Current Lifecycle Phase',
      description: 'Active plants',
      rows: aggregateLifecyclePhases(plants),
      insightChart: 'lifecycle-phase',
    },
    {
      title: 'LECA Status',
      description: 'Active LECA-tracked plants',
      rows: aggregateLecaStatuses(plants),
      insightChart: 'leca-status',
    },
    {
      title: 'Tissue Culture Stages',
      description: 'Active Tissue Culture plants',
      rows: aggregateTissueCultureStages(plants),
      insightChart: 'tc-stage',
    },
    {
      title: 'Corm Progress',
      description: 'Active corm-tracked plants',
      rows: aggregateCormPhases(plants),
      insightChart: 'corm-phase',
    },
  ];

  function openPlantList(metric = {}) {
    if (!confirmDiscardChanges()) return;
    resetMajorFormDrafts();
    const nextFilters = { ...emptyPlantFilters };
    if (metric.filter) nextFilters[metric.filter[0]] = metric.filter[1];
    const nextLifecycle = metric.lifecycle === 'all' ? 'all' : (metric.lifecycle || 'active');
    const matchingQuickView = quickViews.find((quickView) => (
      quickView.lifecycle === nextLifecycle
      && (quickView.quarantine || '') === (metric.quarantine || '')
      && Boolean(quickView.recentlyChecked) === Boolean(metric.recentlyChecked)
      && !quickView.recentlyAcquired
      && JSON.stringify(quickView.filter || null) === JSON.stringify(metric.filter || null)
    ));

    setPlantFilters(nextFilters);
    setSearchText('');
    setQuarantineFilter(metric.quarantine || '');
    setRecentlyCheckedFilter(Boolean(metric.recentlyChecked));
    setRecentlyAcquiredFilter(Boolean(metric.recentlyAcquired));
    setPlantInsightFilter(metric.insight || null);
    if (metric.sort) setPlantSort(metric.sort);
    setActiveQuickView(matchingQuickView?.id || '');
    setLifecycleView(nextLifecycle);
    setAreMoreFiltersVisible(false);
    setSelectedPlant(null);
    setPlantPage(1);
    setAppView('plants');
  }

  function openDashboard() {
    if (!confirmDiscardChanges()) return;
    resetMajorFormDrafts();
    setSelectedPlant(null);
    setShowForm(false);
    setIsEditing(false);
    setAddPlantMessage('');
    setQuickCheckMessage('');
    setAppView('dashboard');
  }

  function updateDashboardPreferences(nextPreferences) {
    setDashboardPreferences(saveDashboardPreferences(nextPreferences));
  }

  function moveDashboardCard(cardId, direction) {
    const cards = [...dashboardPreferences.cards];
    const index = cards.findIndex((card) => card.id === cardId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= cards.length) return;
    [cards[index], cards[nextIndex]] = [cards[nextIndex], cards[index]];
    updateDashboardPreferences({ ...dashboardPreferences, cards });
  }

  function toggleDashboardCard(cardId) {
    updateDashboardPreferences({
      ...dashboardPreferences,
      cards: dashboardPreferences.cards.map((card) => (
        card.id === cardId ? { ...card, visible: !card.visible } : card
      )),
    });
  }

  function openSettings() {
    if (!confirmDiscardChanges()) return;
    resetMajorFormDrafts();
    setSelectedPlant(null);
    setShowForm(false);
    setIsEditing(false);
    setAddPlantMessage('');
    setQuickCheckMessage('');
    const hashSection = window.location.hash.replace('#settings-', '');
    setSettingsSection(settingsSections.some(([id]) => id === hashSection) ? hashSection : 'quick-views');
    setAppView('settings');
  }

  function navigateSettingsSection(sectionId) {
    setSettingsSection(sectionId);
    window.history.pushState(null, '', `#settings-${sectionId}`);
    window.setTimeout(() => {
      document.getElementById(`settings-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  function openResources(resourceId = '') {
    if (!confirmDiscardChanges()) return;
    resetMajorFormDrafts();
    setSelectedPlant(null);
    setSelectedSoilMixRecipeId('');
    setResourceReturnPlantId('');
    setShowForm(false);
    setIsEditing(false);
    setAddPlantMessage('');
    setQuickCheckMessage('');
    setSelectedResourceId(resourceId);
    setAppView('resources');
  }

  function openReminders() {
    if (!confirmDiscardChanges()) return;
    resetMajorFormDrafts();
    setSelectedPlant(null);
    setShowForm(false);
    setIsEditing(false);
    setAddPlantMessage('');
    setQuickCheckMessage('');
    setAppView('reminders');
  }

  function openPlantSpaces(spaceId = plantWallSpaceId, plantId = '') {
    if (!confirmDiscardChanges()) return;
    resetMajorFormDrafts();
    setSelectedPlant(null);
    setShowForm(false);
    setIsEditing(false);
    setAddPlantMessage('');
    setQuickCheckMessage('');
    setFocusedPlantSpace({ spaceId, plantId });
    setAppView('plant-spaces');
  }

  function openSoilMixRecipeForPlant(recipeId) {
    if (!confirmDiscardChanges()) return;
    resetMajorFormDrafts();
    setSelectedResourceId(soilMixGuideResourceId);
    setSelectedSoilMixRecipeId(recipeId);
    setResourceReturnPlantId(selectedPlant?.id || selectedPlant?.name || '');
    setAppView('resources');
  }

  function returnToPlantFromResource() {
    setSelectedResourceId('');
    setSelectedSoilMixRecipeId('');
    setResourceReturnPlantId('');
    setAppView('plants');
  }

  function renderSoilMixDetail(value) {
    const recipe = getSoilMixByValue(value);

    if (!recipe) return displaySoilMixValue(value);

    return (
      <div className="soil-mix-detail-value">
        <span>Soil Mix: {recipe.name}</span>
        <button type="button" onClick={() => openSoilMixRecipeForPlant(recipe.id)}>
          View recipe
        </button>
        <small>
          {[...(recipe.ingredients || []).slice(0, 2), ...(recipe.characteristics || []).slice(0, 2)]
            .join(' · ')}
        </small>
      </div>
    );
  }

  function renderDetailValue(fieldName, value) {
    return fieldName === 'soilMix' ? renderSoilMixDetail(value) : displayValue(value);
  }

  async function checkForUpdates() {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update()));
      }
    } finally {
      const reloadUrl = new URL(window.location.href);
      reloadUrl.searchParams.set('update', Date.now().toString());
      window.location.replace(reloadUrl.toString());
    }
  }

  function openWishlist(metric = {}) {
    if (!confirmDiscardChanges()) return;
    resetMajorFormDrafts();
    setSelectedPlant(null);
    setShowForm(false);
    setIsEditing(false);
    setWishlistSearch('');
    setWishlistFilters(metric.arrivingSoon
      ? { ...emptyWishlistFilters, arrivingSoon: true }
      : { ...emptyWishlistFilters, desiredStatus: metric.filter || '' });
    setAppView('wishlist');
  }

  function openGarden(filter = {}) {
    if (!confirmDiscardChanges()) return;
    resetMajorFormDrafts();
    setSelectedPlant(null);
    setShowForm(false);
    setIsEditing(false);
    setGardenFilter(filter);
    setAppView('garden');
  }

  function saveWishlist(nextItems) {
    localStorage.setItem(wishlistStorageKey, JSON.stringify(nextItems));
    markLocalDataChanged('wishlist');
    setWishlistItems(nextItems);
  }

  function savePlants(nextPlants, reason = 'plants') {
    localStorage.setItem(plantsStorageKey, JSON.stringify(nextPlants));
    markLocalDataChanged(reason);
    setPlants(nextPlants);
    if (selectedPlant) {
      setSelectedPlant(nextPlants.find((plant) => plant.id === selectedPlant.id) || selectedPlant);
    }
  }

  function saveQuickNotes(nextNotes, reason = 'quick-notes') {
    localStorage.setItem(quickNotesStorageKey, JSON.stringify(nextNotes));
    markLocalDataChanged(reason);
    setQuickNotes(nextNotes);
  }

  function openQuickNote(plantId = '') {
    setQuickNoteDraft({ text: '', plantId, photoUrl: '' });
    setQuickNoteFile(null);
    setQuickNotePreviewUrl('');
    setQuickNoteMessage('');
    setShowQuickNoteForm(true);
  }

  function closeQuickNote() {
    if (quickNotePreviewUrl) URL.revokeObjectURL(quickNotePreviewUrl);
    setQuickNoteFile(null);
    setQuickNotePreviewUrl('');
    setShowQuickNoteForm(false);
  }

  async function createQuickNote(event) {
    event.preventDefault();
    if (!quickNoteDraft.text.trim() || isQuickNoteSubmitting) return;
    setIsQuickNoteSubmitting(true);
    setQuickNoteMessage('');
    try {
      const photoUrl = quickNoteFile
        ? await uploadStoredImage(quickNoteFile, 'quick-notes')
        : quickNoteDraft.photoUrl;
      const createdAt = new Date().toISOString();
      saveQuickNotes([...quickNotes, {
        id: makeId('quick-note'),
        text: quickNoteDraft.text.trim(),
        plantId: quickNoteDraft.plantId,
        photoUrl,
        createdAt,
        observedAt: createdAt,
        status: 'unprocessed',
        filedAt: '',
        filedAs: '',
        destinationId: '',
      }]);
      closeQuickNote();
    } catch (error) {
      console.error('Quick note photo upload failed:', error);
      setQuickNoteMessage(error.message || 'The journal entry could not be saved.');
    } finally {
      setIsQuickNoteSubmitting(false);
    }
  }

  function fileQuickNote(note, filedAs = 'Filed', destinationId = '') {
    saveQuickNotes(quickNotes.map((item) => item.id === note.id ? {
      ...item,
      status: 'filed',
      filedAt: new Date().toISOString(),
      filedAs,
      destinationId,
    } : item));
  }

  function startQuickNoteConversion(note, destination) {
    setQuickNoteMessage('');
    setQuickNoteConversion({
      note,
      destination,
      text: note.text,
      date: dateInputValue(note.observedAt) || todayDate(),
      plantId: note.plantId,
      photoUrl: note.photoUrl,
    });
  }

  function convertQuickNote(event) {
    event.preventDefault();
    const conversion = quickNoteConversion;
    if (!conversion) return;
    const { note, destination } = conversion;
    const plant = plants.find((item) => item.id === conversion.plantId);
    if (destination !== 'general' && !plant) {
      setQuickNoteMessage('Choose a plant before converting this note.');
      return;
    }
    const entryId = makeId(`quick-note-${destination}`);
    const entryDate = dateInputValue(conversion.date) || todayDate();
    const entryText = conversion.text.trim();
    let nextPlants = plants;
    let nextReminders = reminders;

    if (destination === 'checkin') {
      nextReminders = [...reminders, normalizeReminder({
        id: entryId,
        plantId: plant.id,
        reminderType: 'quick-note',
        title: 'Plant Journal check-in',
        dueDate: entryDate,
        status: 'completed',
        source: 'quick-note',
        createdAt: note.createdAt,
        completedAt: note.observedAt,
        note: entryText,
      })];
    } else if (destination === 'health') {
      nextPlants = plants.map((item) => item.id === plant.id ? {
        ...item,
        timelineEntries: [...(item.timelineEntries || []), {
          id: entryId, type: 'generalNote', date: entryDate, title: 'Plant Journal entry',
          note: entryText, photoUrl: conversion.photoUrl, createdAt: note.createdAt,
        }],
      } : item);
    } else if (destination === 'care') {
      nextPlants = plants.map((item) => item.id === plant.id ? {
        ...item,
        careNote: [item.careNote, `${entryDate}: ${entryText}`].filter(Boolean).join('\n'),
      } : item);
    } else if (destination === 'activity') {
      nextPlants = plants.map((item) => item.id === plant.id ? {
        ...item,
        activityLog: [...(item.activityLog || []), {
          id: entryId, activityType: 'General note', date: entryDate,
          notes: entryText, createdAt: note.createdAt, photoUrl: conversion.photoUrl,
        }],
      } : item);
    }

    if (conversion.photoUrl && plant && !['health', 'activity'].includes(destination)) {
      nextPlants = nextPlants.map((item) => item.id === plant.id ? {
        ...item,
        photoLog: [...(item.photoLog || []), {
          id: makeId('quick-note-photo'), photoUrl: conversion.photoUrl, date: entryDate,
          caption: entryText, photoType: 'General photo', createdAt: note.createdAt,
        }],
      } : item);
    }

    if (nextPlants !== plants) savePlants(nextPlants, 'quick-note-conversion');
    if (nextReminders !== reminders) saveReminders(nextReminders);
    fileQuickNote(note, destination === 'general' ? 'Permanent journal entry' : destination, entryId);
    setQuickNoteConversion(null);
    setQuickNoteMessage('Journal entry filed successfully.');
  }

  function deleteQuickNote(note) {
    if (!window.confirm('Delete this journal entry? This cannot be undone.')) return;
    saveQuickNotes(quickNotes.filter((item) => item.id !== note.id));
  }

  function openTrackerEditor(tracker) {
    setTrackerDraft({
      ...selectedPlant,
      cormPhase: selectedPlant.cormPhase || '',
      cormPhaseDate: todayDate(),
      cormPhaseNote: '',
    });
    setTrackerPhotoFile(null);
    setTrackerPhotoPreviewUrl('');
    setTrackerEditor(tracker);
  }

  function closeTrackerEditor() {
    if (trackerPhotoPreviewUrl) URL.revokeObjectURL(trackerPhotoPreviewUrl);
    setTrackerPhotoFile(null);
    setTrackerPhotoPreviewUrl('');
    setTrackerEditor('');
    setTrackerDraft({});
  }

  async function saveTrackerUpdate(event) {
    event.preventDefault();
    const previousPlant = selectedPlant;
    const fieldNames = trackerEditor === 'tc'
      ? ['tcStage', 'tcDeflaskDate', 'tcAcclimationStartDate', 'tcAcclimationEndDate', 'tcSetup', 'tcHumidityLevel', 'tcNotes']
      : trackerEditor === 'corm'
        ? ['cormReceivedDate', 'cormStartedDate', 'cormParentPlantId', 'cormInitialCondition',
          'cormGrowthMethod', 'cormCustomGrowthMethod', 'cormSproutingMethod', 'cormMedium',
          'cormRootEmergenceDate', 'cormGrowthPointDate', 'cormFirstLeafEmergingDate',
          'cormFirstLeafOpenedDate', 'cormTransferDate', 'cormEstablishedDate',
          'cormPhase', 'cormProgressNotes', 'cormOutcome']
        : ['trackLecaConversion', 'lecaStatus', 'lecaConversionStartDate', 'lecaRootStatus', 'lecaReservoirSetup',
          'lecaNutrientStatus', 'lecaFlushRhythm', 'lecaStressLevel', 'lecaNotes'];
    const updates = Object.fromEntries(fieldNames.map((fieldName) => [fieldName, trackerDraft[fieldName] ?? '']));
    if (trackerEditor === 'corm') {
      const phaseDate = trackerDraft.cormPhaseDate;
      if (trackerDraft.cormPhase !== (selectedPlant.cormPhase || '')
        && !isValidPastOrTodayDate(phaseDate, todayDate())) {
        event.currentTarget.querySelector('#tracker-cormPhaseDate')?.focus();
        return;
      }
      const photoUrl = trackerPhotoFile ? await uploadStoredImage(trackerPhotoFile, 'corm-progress') : '';
      const phaseChanged = trackerDraft.cormPhase
        && trackerDraft.cormPhase !== (selectedPlant.cormPhase || '');
      updates.cormStage = selectedPlant.cormStage || trackerDraft.cormPhase;
      updates.cormPhaseHistory = phaseChanged
        ? [...(selectedPlant.cormPhaseHistory || []), {
          id: makeId('corm-phase'),
          phase: trackerDraft.cormPhase,
          date: phaseDate,
          note: trackerDraft.cormPhaseNote?.trim() || '',
          photoUrl,
          createdAt: new Date().toISOString(),
        }].sort((a, b) => String(a.date || a.createdAt || '').localeCompare(String(b.date || b.createdAt || '')))
        : (selectedPlant.cormPhaseHistory || []);
      updates.cormProgressPhotos = photoUrl
        ? [...(selectedPlant.cormProgressPhotos || []), {
          id: makeId('corm-photo'), photoUrl, date: todayDate(), caption: trackerDraft.cormProgressNotes || '',
        }]
        : (selectedPlant.cormProgressPhotos || []);
    }
    const updatedPlant = { ...selectedPlant, ...updates };
    savePlants(plants.map((plant) => plant.id === selectedPlant.id ? updatedPlant : plant), `${trackerEditor}-tracker`);
    createAutomaticRemindersForPlant(updatedPlant, previousPlant);
    closeTrackerEditor();
  }

  function scrollToDetailSection(sectionId) {
    setActiveDetailSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function savePlantSpaces(nextSpaces) {
    localStorage.setItem(plantSpacesStorageKey, JSON.stringify(nextSpaces));
    markLocalDataChanged('plant-spaces');
    setPlantSpaces(nextSpaces);
  }

  async function submitWishlistItem(event) {
    event.preventDefault();
    if (isWishlistSubmitting) return;

    setWishlistImageUploadError('');
    setIsWishlistSubmitting(true);
    setWishlistSubmitStatus(wishlistImageFile ? 'Uploading photo...' : 'Saving wishlist item...');

    try {
      const uploadedImageUrl = wishlistImageFile
        ? await uploadStoredImage(wishlistImageFile, 'wishlist')
        : wishlistDraft.imageUrl;
      setWishlistSubmitStatus('Saving wishlist item...');

      const item = {
        ...wishlistDraft,
        id: editingWishlistId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: wishlistDraft.name.trim(),
        imageUrl: uploadedImageUrl,
      };
      saveWishlist(editingWishlistId
        ? wishlistItems.map((current) => current.id === editingWishlistId ? item : current)
        : [...wishlistItems, item]);
      setWishlistDraft(emptyWishlistItem);
      setWishlistFormBaseline(JSON.stringify(emptyWishlistItem));
      setEditingWishlistId('');
      setShowWishlistForm(false);
      clearWishlistImageSelection();
    } catch (error) {
      console.error('Wishlist image upload failed:', error);
      setWishlistImageUploadError(error.message || String(error));
      setWishlistSubmitStatus('');
    } finally {
      setIsWishlistSubmitting(false);
    }
  }

  function editWishlistItem(item) {
    clearWishlistImageSelection();
    setWishlistDraft({ ...emptyWishlistItem, ...item });
    setWishlistFormBaseline(JSON.stringify({ ...emptyWishlistItem, ...item }));
    setEditingWishlistId(item.id);
    setShowWishlistForm(true);
  }

  function deleteWishlistItem(item) {
    if (!window.confirm(`Delete ${item.name} from Wishlist / Purchases?`)) return;
    saveWishlist(wishlistItems.filter((current) => current.id !== item.id));
    if (selectedWishlistItemId === item.id) setSelectedWishlistItemId('');
  }

  function convertWishlistItem(item) {
    if (item.converted) return;
    const plantId = `wishlist-${item.id}`;
    if (plants.some((plant) => plant.id === plantId)) {
      saveWishlist(wishlistItems.map((current) => current.id === item.id
        ? { ...current, converted: true, convertedPlantId: plantId, desiredStatus: 'Converted' }
        : current));
      return;
    }
    const newInventoryPlant = {
      ...emptyPlant,
      id: plantId,
      name: item.name,
      genus: item.genus,
      type: item.type,
      source: item.source,
      acquiredDate: item.actualArrivalDate || item.expectedArrivalDate,
      imageUrl: item.imageUrl,
      careNote: item.notes,
      purchasePrice: item.price,
      image: getPlantImage(item.name, item.type),
    };
    const updatedPlants = [...plants, newInventoryPlant];
    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    markLocalDataChanged('plants');
    setPlants(updatedPlants);
    createAutomaticRemindersForPlant(newInventoryPlant);
    saveWishlist(wishlistItems.map((current) => current.id === item.id
      ? { ...current, converted: true, convertedPlantId: plantId, desiredStatus: 'Converted' }
      : current));
  }

  function clearAllFilters() {
    setSearchText('');
    setPlantFilters({ ...emptyPlantFilters });
    setQuarantineFilter('');
    setRecentlyCheckedFilter(false);
    setRecentlyAcquiredFilter(false);
    setPlantInsightFilter(null);
    setLifecycleView('active');
    setActiveQuickView('');
    setPlantPage(1);
  }

  function updatePlantFilter(fieldName, value) {
    setPlantFilters((currentFilters) => ({
      ...currentFilters, [fieldName]: value,
    }));
    scrollPlantResultsIntoView();
  }

  const quickViews = userQuickViews;
  const currentPlantListState = normalizePlantListState({
    searchText,
    filters: plantFilters,
    lifecycleView,
    quarantineFilter,
    recentlyCheckedFilter,
    recentlyAcquiredFilter,
    sort: plantSort,
    viewMode: plantViewMode,
    pageSize: plantPageSize,
  });
  const activePlantFilterCount = activeFilterValueCount(plantFilters)
    + (lifecycleView !== 'active' ? 1 : 0)
    + (quarantineFilter ? 1 : 0)
    + (recentlyCheckedFilter ? 1 : 0)
    + (recentlyAcquiredFilter ? 1 : 0)
    + (plantInsightFilter ? 1 : 0)
    + (searchText.trim() ? 1 : 0);
  const activeQuickViewRecord = quickViews.find((quickView) => quickView.id === activeQuickView);
  const activeQuickViewLabel = activeQuickViewRecord?.name || '';
  const activeQuickViewModified = Boolean(
    activeQuickViewRecord && !quickViewMatchesState(activeQuickViewRecord, currentPlantListState),
  );
  const hasActivePlantFilters = activePlantFilterCount > 0;

  function applyQuickView(quickView) {
    const state = normalizePlantListState(quickView.state);
    setSearchText(state.searchText);
    setPlantFilters(state.filters);
    setLifecycleView(state.lifecycleView);
    setQuarantineFilter(state.quarantineFilter);
    setRecentlyCheckedFilter(state.recentlyCheckedFilter);
    setRecentlyAcquiredFilter(state.recentlyAcquiredFilter);
    setPlantInsightFilter(null);
    changePlantSort(state.sort);
    changePlantViewMode(state.viewMode);
    if (state.pageSize !== undefined) {
      const updatedPageSizes = { ...plantPageSizes, [state.viewMode]: state.pageSize };
      setPlantPageSizes(updatedPageSizes);
      localStorage.setItem(plantPageSizesStorageKey, JSON.stringify(updatedPageSizes));
    }
    setAreMoreFiltersVisible(false);
    setActiveQuickView(quickView.id);
    setPlantPage(1);
    scrollPlantResultsIntoView();
  }

  function restoreDefaultPlantList() {
    const state = normalizePlantListState(defaultPlantListState);
    setSearchText(state.searchText);
    setPlantFilters(state.filters);
    setLifecycleView(state.lifecycleView);
    setQuarantineFilter('');
    setRecentlyCheckedFilter(false);
    setRecentlyAcquiredFilter(false);
    setPlantInsightFilter(null);
    changePlantSort(state.sort);
    changePlantViewMode(state.viewMode);
    const resetPageSizes = { ...plantPageSizes, cards: defaultPlantPageSizes.cards };
    setPlantPageSizes(resetPageSizes);
    localStorage.setItem(plantPageSizesStorageKey, JSON.stringify(resetPageSizes));
    setActiveQuickView('');
    setPlantPage(1);
  }

  function persistUserQuickViews(nextViews) {
    const savedViews = saveQuickViews(nextViews);
    setUserQuickViews(savedViews);
    markLocalDataChanged('quick-views');
    return savedViews;
  }

  function openQuickViewEditor(view = null, context = 'plant-list') {
    setQuickViewEditor({
      mode: view ? 'edit' : 'create',
      context,
      id: view?.id || '',
      name: view?.name || '',
      includeSearch: view ? Boolean(view.state.searchText) : Boolean(searchText.trim()),
      includePageSize: view ? view.state.pageSize !== undefined : true,
      state: view ? normalizePlantListState(view.state) : currentPlantListState,
    });
  }

  function saveQuickViewEditor() {
    if (!quickViewEditor) return;
    const now = new Date().toISOString();
    const state = normalizePlantListState({
      ...quickViewEditor.state,
      searchText: quickViewEditor.includeSearch ? quickViewEditor.state.searchText : '',
      pageSize: quickViewEditor.includePageSize ? quickViewEditor.state.pageSize : undefined,
    });
    if (quickViewEditor.mode === 'edit') {
      const existing = userQuickViews.find((view) => view.id === quickViewEditor.id);
      if (!existing) return;
      persistUserQuickViews(userQuickViews.map((view) => view.id === existing.id ? {
        ...existing,
        name: uniqueQuickViewName(quickViewEditor.name, userQuickViews, existing.id),
        state,
        updatedAt: now,
      } : view));
      if (activeQuickView === existing.id) {
        setSettingsQuickViewMessage(`“${existing.name}” was updated. Reapply it from the Plant List to use the saved changes.`);
      }
    } else {
      const id = `quick-view-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      persistUserQuickViews([...userQuickViews, {
        id,
        name: uniqueQuickViewName(quickViewEditor.name, quickViews),
        state,
        createdAt: now,
        updatedAt: now,
      }]);
      setActiveQuickView(id);
      setPlantPage(1);
    }
    setQuickViewEditor(null);
  }

  function updateQuickViewEditorState(patch) {
    setQuickViewEditor((editor) => editor ? {
      ...editor,
      state: normalizePlantListState({ ...editor.state, ...patch }),
    } : editor);
  }

  function updateQuickViewEditorFilter(fieldName, value) {
    setQuickViewEditor((editor) => editor ? {
      ...editor,
      state: {
        ...editor.state,
        filters: { ...editor.state.filters, [fieldName]: value },
      },
    } : editor);
  }

  function duplicateSavedQuickView(view) {
    const copy = duplicateQuickView(
      view, quickViews, `quick-view-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    );
    persistUserQuickViews([...userQuickViews, copy]);
    setSettingsQuickViewMessage(`Created “${copy.name}”.`);
  }

  function deleteSavedQuickView(view) {
    if (!window.confirm(`Delete the Quick View “${view.name}”?`)) return;
    persistUserQuickViews(removeQuickView(userQuickViews, view.id));
    if (activeQuickView === view.id) setActiveQuickView('');
    setSettingsQuickViewMessage(`Deleted “${view.name}”.`);
  }

  function quickViewCriteriaSummary(view) {
    const state = normalizePlantListState(view.state);
    const filterLabels = Object.fromEntries([
      ...primaryFilterFields,
      ...advancedFilterFields,
      ['origin', 'Plant origin'],
      ['lifecycleStage', 'Lifecycle stage'],
    ]);
    const specialValueLabels = {
      [missingFilterValue]: 'Unknown or not recorded',
      __leca__: 'All LECA tracked plants',
      __transitioning__: 'Transitioning or rooting',
      __stress__: 'Stress concern',
      __acclimating__: 'Acclimating',
    };
    const filters = Object.entries(state.filters)
      .filter(([, values]) => values.length)
      .map(([fieldName, values]) => (
        `${filterLabels[fieldName] || fieldName}: ${values.map((value) => specialValueLabels[value] || value).join(', ')}`
      ));
    return [
      ...filters,
      state.searchText ? `search: “${state.searchText}”` : '',
      state.lifecycleView !== 'active' ? `plant view: ${state.lifecycleView}` : '',
      state.quarantineFilter ? `quarantine: ${state.quarantineFilter}` : '',
      state.recentlyCheckedFilter ? 'recently checked' : '',
      state.recentlyAcquiredFilter ? 'recently acquired' : '',
      `sort: ${plantSortOptions.find(([value]) => value === state.sort)?.[1] || state.sort}`,
      `layout: ${state.viewMode}`,
      state.pageSize !== undefined ? `${state.pageSize} per page` : '',
    ].filter(Boolean).join(' · ');
  }

  function createBackup() {
    return assembleBackup({
      plants,
      dropdownOptions,
      wishlistItems,
      gardenBeds,
      plantSpaces,
      reminders,
      quickNotes,
      quickViews: userQuickViews,
      appVersion: currentAppVersion.version,
    });
  }

  function refreshRestoredState(returnToDashboard = true) {
    setPlants(loadPlants());
    setReminders(loadReminders());
    setQuickNotes(loadQuickNotes());
    setUserQuickViews(loadQuickViews());
    setDropdownOptions(loadDropdownOptions());
    setWishlistItems(loadWishlistItems());
    setGardenBeds(loadGardenBeds());
    setPlantSpaces(loadPlantSpaces());
    setPlantViewMode(loadPlantViewMode());
    setPlantPageSizes(loadPlantPageSizes());
    setSelectedPlant(null);
    setShowForm(false);
    setIsEditing(false);
    if (returnToDashboard) setAppView('dashboard');
    clearAllFilters();
    setLifecycleView('active');
    setRestoreSnapshotInfo(getRestoreSafetySnapshot());
  }

  async function exportData() {
    let backup;
    try {
      backup = await materializeBackupImages(createBackup());
    } catch (error) {
      console.error('[plant-tracker:backup]', {
        phase: 'materialize-images', status: 'failed', errorName: error?.name || 'Error',
      });
      setBackupMessageType('error');
      setBackupMessage('The backup could not be prepared because a local photo asset is unavailable.');
      return;
    }
    const summary = getBackupSummary(backup);
    if (!window.confirm(`Download JSON backup?\n\n${describeBackup(backup)}`)) return;
    const date = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: 'application/json' },
    ));
    const link = document.createElement('a');
    link.href = url;
    link.download = `plant-inventory-backup-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setBackupPreview(summary);
    setBackupMessageType('success');
    setBackupMessage(`Backup exported successfully.\n${formatBackupSummary(summary)}`);
  }

  async function restoreBackup(backup, returnToDashboard = true) {
    let incomingMigration;
    let currentMigration;
    console.info('[plant-tracker:restore]', { phase: 'photo-migration', status: 'start' });
    try {
      incomingMigration = await migrateEmbeddedImagesInBackup(backup);
      currentMigration = await migrateEmbeddedImagesInBackup(createBackup());
      console.info('[plant-tracker:restore]', {
        phase: 'photo-migration',
        status: 'complete',
        migratedImageCount: incomingMigration.migratedCount,
        migratedImageCharacters: incomingMigration.migratedCharacters,
        migratedImageApproximateBytes: incomingMigration.migratedApproximateBytes,
      });
    } catch (error) {
      const partialReferences = [
        ...(incomingMigration?.createdReferences || []),
        ...(currentMigration?.createdReferences || []),
      ];
      await Promise.allSettled(partialReferences.map((reference) => deleteImageAsset(reference)));
      console.error('[plant-tracker:restore]', {
        phase: 'photo-migration', status: 'failed',
        code: 'RESTORE_PHOTO_MIGRATION_FAILED', errorName: error?.name || 'Error',
      });
      return { ok: false, code: 'RESTORE_PHOTO_MIGRATION_FAILED', phase: 'photo-migration' };
    }
    const createdImageReferences = [
      ...incomingMigration.createdReferences,
      ...currentMigration.createdReferences,
    ];
    let result;
    try {
      result = applyBackupToLocalStorage(incomingMigration.backup, {
        createSnapshot: true,
        currentBackup: currentMigration.backup,
      });
    } catch (error) {
      console.error('[plant-tracker:restore]', {
        phase: error?.phase || 'unknown',
        status: 'failed',
        code: error?.code || 'RESTORE_UNKNOWN_FAILED',
        errorName: error?.cause?.name || error?.name || 'Error',
        ...error?.diagnostics,
      });
      await Promise.allSettled(createdImageReferences.map((reference) => deleteImageAsset(reference)));
      return {
        ok: false,
        code: error?.code || 'RESTORE_UNKNOWN_FAILED',
        phase: error?.phase || 'unknown',
      };
    }
    try {
      refreshRestoredState(returnToDashboard);
    } catch (error) {
      console.error('[plant-tracker:restore]', {
        phase: 'refresh', status: 'failed', code: 'RESTORE_REFRESH_FAILED',
        errorName: error?.name || 'Error',
      });
      window.location.reload();
    }
    return result;
  }

  function undoLastRestore() {
    const snapshot = getRestoreSafetySnapshot();
    if (!snapshot) {
      setBackupMessageType('error');
      setBackupMessage('No restore safety snapshot is available yet.');
      return;
    }
    if (!window.confirm(`Undo the most recent restore and return to the local data saved on ${new Date(snapshot.createdAt).toLocaleString()}?`)) return;
    try {
      applyBackupToLocalStorage(snapshot.backup, { createSnapshot: false });
      refreshRestoredState(true);
      setBackupMessageType('success');
      setBackupMessage('Restore undone. Your safety snapshot is still available until the next successful restore replaces it.');
    } catch (error) {
      console.error('Restore undo failed:', error);
      setBackupMessageType('error');
      setBackupMessage('The restore could not be undone. Your current data was not changed.');
    }
  }

  async function fetchCloudBackup() {
    return supabase
      .from(cloudBackupTable)
      .select('data, updated_at')
      .eq('id', cloudBackupId)
      .maybeSingle();
  }

  async function checkCloudStatus() {
    if (cloudBusy) return;
    if (!isSupabaseConfigured) {
      setCloudMessageType('error');
      setCloudMessage('Supabase is not configured. Add the environment variables described in the README.');
      return;
    }
    setCloudBusy(true);
    setCloudMessage('');
    const { data, error } = await fetchCloudBackup();
    setCloudBusy(false);
    if (error) {
      console.error('Cloud status check failed:', error);
      setCloudMessageType('error');
      setCloudMessage('Cloud status could not be checked. Confirm the Supabase table and access policy are set up.');
      return;
    }
    setCloudUpdatedAt(data?.updated_at || '');
    const normalized = data ? normalizeBackup(data.data) : null;
    setCloudPreview(normalized?.ok ? getBackupSummary(normalized.backup) : null);
    setCloudMessageType('success');
    setCloudMessage(data && normalized?.ok
      ? `Cloud backup is available.\n${formatBackupSummary(getBackupSummary(normalized.backup))}`
      : 'Supabase is connected, but no valid cloud backup has been saved yet.');
  }

  async function saveToCloud() {
    if (cloudBusy) return;
    if (!isSupabaseConfigured) {
      setCloudMessageType('error');
      setCloudMessage('Supabase is not configured. Add the environment variables described in the README.');
      return;
    }
    let backup;
    try {
      backup = await materializeBackupImages(createBackup());
    } catch (error) {
      console.error('[plant-tracker:backup]', {
        phase: 'materialize-images', status: 'failed', errorName: error?.name || 'Error',
      });
      setCloudMessageType('error');
      setCloudMessage('The cloud backup could not be prepared because a local photo asset is unavailable.');
      return;
    }
    if (!window.confirm(`Save current local data to cloud?\n\n${describeBackup(backup)}`)) return;
    setCloudBusy(true);
    setCloudMessage('');
    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from(cloudBackupTable).upsert({
      id: cloudBackupId,
      data: backup,
      updated_at: updatedAt,
    });
    setCloudBusy(false);
    if (error) {
      console.error('Cloud backup save failed:', error);
      setCloudMessageType('error');
      setCloudMessage('Your data could not be saved to the cloud. Your local data is unchanged. Check the Supabase setup and try again.');
      return;
    }
    setCloudUpdatedAt(updatedAt);
    setCloudPreview(getBackupSummary(backup));
    setCloudMessageType('success');
    setCloudMessage('Cloud backup saved successfully. Your local data is still here.');
  }

  async function previewCloudBackup() {
    if (cloudBusy) return;
    if (!isSupabaseConfigured) {
      setCloudMessageType('error');
      setCloudMessage('Supabase is not configured. Add the environment variables described in the README.');
      return;
    }
    setCloudBusy(true);
    setCloudMessage('');
    const { data, error } = await fetchCloudBackup();
    setCloudBusy(false);
    if (error) {
      console.error('Cloud backup preview failed:', error);
      setCloudMessageType('error');
      setCloudMessage('The cloud backup could not be previewed.');
      return;
    }
    const normalized = data ? normalizeBackup(data.data) : { ok: false, error: 'No cloud backup was found.' };
    if (!normalized.ok) {
      setCloudPreview(null);
      setCloudMessageType('error');
      setCloudMessage(normalized.error);
      return;
    }
    const summary = getBackupSummary(normalized.backup);
    setCloudUpdatedAt(data.updated_at || normalized.backup.exportedAt);
    setCloudPreview(summary);
    setCloudMessageType('success');
    setCloudMessage(`Cloud backup preview:\n${formatBackupSummary(summary)}`);
  }

  async function loadFromCloud() {
    if (cloudBusy) return;
    if (!isSupabaseConfigured) {
      setCloudMessageType('error');
      setCloudMessage('Supabase is not configured. Add the environment variables described in the README.');
      return;
    }
    setCloudBusy(true);
    setCloudMessage('');
    console.info('[plant-tracker:restore]', { phase: 'download', status: 'start', source: 'cloud' });
    const { data, error } = await fetchCloudBackup();
    setCloudBusy(false);
    if (error) {
      console.error('[plant-tracker:restore]', {
        phase: 'download', status: 'failed', code: 'RESTORE_DOWNLOAD_FAILED',
        errorName: error.name || 'SupabaseError', statusCode: error.code || '',
      });
      setCloudMessageType('error');
      setCloudMessage('The cloud backup could not be loaded. Your local data was not changed.');
      return;
    }
    console.info('[plant-tracker:restore]', {
      phase: 'download', status: 'complete', source: 'cloud', backupFound: Boolean(data),
    });
    console.info('[plant-tracker:restore]', { phase: 'normalize', status: 'start' });
    const normalized = data ? normalizeBackup(data.data) : { ok: false, error: 'No cloud backup was found.' };
    if (!normalized.ok) {
      console.error('[plant-tracker:restore]', {
        phase: 'normalize', status: 'failed', code: 'RESTORE_NORMALIZE_FAILED',
      });
      setCloudMessageType('error');
      setCloudMessage(`${normalized.error} Your local data was not changed.`);
      return;
    }
    console.info('[plant-tracker:restore]', {
      phase: 'normalize', status: 'complete', schemaVersion: normalized.backup.schemaVersion,
    });
    const backup = normalized.backup;
    const warning = backupHasZeroPlantsWarning(backup, plants.length);
    const localModifiedAt = getLocalMetadata().lastModifiedAt;
    const cloudTime = data.updated_at || backup.exportedAt;
    const cloudLooksOlder = localModifiedAt && cloudTime && new Date(cloudTime) < new Date(localModifiedAt);
    const choice = window.prompt(
      [
        'Restore cloud backup?',
        '',
        describeBackup(backup),
        warning,
        cloudLooksOlder ? `Warning: the cloud backup appears older than local changes from ${new Date(localModifiedAt).toLocaleString()}.` : '',
        '',
        'Type RESTORE to overwrite local data, SAVE to save current local data to cloud first, or leave blank to cancel.',
      ].filter(Boolean).join('\n'),
    );
    if (!choice) return;
    if (choice.trim().toUpperCase() === 'SAVE') {
      await saveToCloud();
      return;
    }
    if (choice.trim().toUpperCase() !== 'RESTORE') {
      setCloudMessageType('error');
      setCloudMessage('Cloud restore canceled. Your local data was not changed.');
      return;
    }
    const restoreResult = await restoreBackup(backup, false);
    if (!restoreResult.ok) {
      setCloudMessageType('error');
      setCloudMessage(
        `The cloud backup could not be restored. Your previous local data has been put back. `
        + `Reference: ${restoreResult.code} (${restoreResult.phase}).`,
      );
      return;
    }
    setCloudUpdatedAt(data.updated_at || '');
    setCloudRestoredAt(new Date().toISOString());
    setCloudPreview(getBackupSummary(backup));
    setCloudMessageType('success');
    setCloudMessage('Cloud backup restored. A local safety snapshot was created so you can undo this restore.');
  }

  function exportPlantsCsv() {
    const columns = [
      ['Plant Name', (plant) => plant.name],
      ['Origin', (plant) => plant.origin],
      ['Lifecycle Stage', (plant) => plant.lifecycleStage],
      ['Genus', (plant) => plant.genus],
      ['Type / Category', (plant) => plant.type],
      ['Status', (plant) => plant.status],
      ['Lifecycle State', (plant) => lifecycleLabel(plant.lifecycleStatus)],
      ['Location', (plant) => plant.location],
      ['Source', (plant) => plant.source],
      ['Date Acquired', (plant) => plant.acquiredDate],
      ['Growing Medium', (plant) => plant.medium],
      ['Soil Mix / Substrate Mix', (plant) => getSoilMixDisplayName(plant.soilMix)],
      ['Pot Size', (plant) => plant.potSize],
      ['Attention', (plant) => plant.attention],
      ['Thirst Level', (plant) => plant.thirstLevel],
      ['Watering Rhythm', (plant) => plant.wateringRhythm],
      ['Moisture Preference', (plant) => plant.moisturePreference],
      ['Care Difficulty', (plant) => plant.careDifficulty],
      ['Light Level', (plant) => plant.lightNeeds],
      ['Last Watered Date', (plant) => plant.lastWatered],
      ['Last Repotted Date', (plant) => plant.repotDate],
      ['Last Checked Date', (plant) => getLastCheckedDate(plant)],
      ['Pest Quarantine Start Date', (plant) => plant.pestQuarantineStartDate],
      ['Pest Quarantine End Date', (plant) => plant.pestQuarantineEndDate],
      ['TC Stage', (plant) => plant.tcStage],
      ['LECA Conversion Status', (plant) => plant.lecaStatus],
      ['LECA Stress Level', (plant) => plant.lecaStressLevel],
      ['Image URL', (plant) => plant.imageUrl],
      ['Watering Notes', (plant) => plant.watering],
      ['Care Notes', (plant) => plant.careNote],
      ['Growth Notes', (plant) => plant.growthNotes],
      ['Pest Notes', (plant) => plant.pestNotes],
    ];
    downloadCsv(`plant-inventory-export-${exportDate()}.csv`, columns, plants);
  }

  function exportWishlistCsv() {
    const columns = [
      ['Plant Name', (item) => item.name], ['Genus', (item) => item.genus],
      ['Type / Category', (item) => item.type], ['Desired Status', (item) => item.desiredStatus],
      ['Source / Seller', (item) => item.source], ['Price', (item) => item.price],
      ['Order Date', (item) => item.orderDate], ['Ship Date', (item) => item.shipDate],
      ['Expected Arrival Date', (item) => item.expectedArrivalDate],
      ['Actual Arrival Date', (item) => item.actualArrivalDate],
      ['Tracking Number / Link', (item) => item.tracking],
      ['Converted Status', (item) => item.converted ? 'Converted to plant inventory' : 'Not converted'],
      ['Notes', (item) => item.notes], ['Image URL', (item) => item.imageUrl],
    ];
    downloadCsv(`plant-wishlist-export-${exportDate()}.csv`, columns, wishlistItems);
  }

  function exportGardenCsv() {
    const datedName = (name) => `garden-${name}-export-${exportDate()}.csv`;
    downloadCsv(datedName('beds'), [
      ['Bed Name', (bed) => bed.name], ['Bed Location', (bed) => bed.location],
      ['Bed Size', (bed) => bed.size], ['Sun Exposure', (bed) => bed.sunExposure],
      ['Notes', (bed) => bed.notes], ['Image URL', (bed) => bed.imageUrl],
    ], gardenBeds);

    const cropRows = gardenBeds.flatMap((bed) => (bed.crops || []).map((crop) => ({ bed, crop })));
    downloadCsv(datedName('crops'), [
      ['Bed Name', ({ bed }) => bed.name], ['Bed Location', ({ bed }) => bed.location],
      ['Crop Name', ({ crop }) => crop.name], ['Crop Type / Category', ({ crop }) => crop.type],
      ['Variety', ({ crop }) => crop.variety], ['Planting Date', ({ crop }) => crop.plantingDate],
      ['Expected Harvest Date', ({ crop }) => crop.expectedHarvestDate],
      ['Actual Harvest Date', ({ crop }) => crop.actualHarvestDate],
      ['Days to Maturity', ({ crop }) => crop.daysToMaturity],
      ['Days Since Planting', ({ crop }) => daysBetweenTodayAnd(crop.plantingDate)],
      ['Crop Status', ({ crop }) => crop.status], ['Companion Notes', ({ crop }) => crop.companionNotes],
      ['Pest Notes', ({ crop }) => crop.pestNotes], ['Fertilizing Notes', ({ crop }) => crop.fertilizingNotes],
      ['General Notes', ({ crop }) => crop.notes], ['Image URL', ({ crop }) => crop.imageUrl],
    ], cropRows);

    const activityRows = gardenBeds.flatMap((bed) => (bed.activities || []).map((entry) => ({ bed, entry })));
    downloadCsv(datedName('activity-log'), [
      ['Bed Name', ({ bed }) => bed.name], ['Bed Location', ({ bed }) => bed.location],
      ['Activity Type', ({ entry }) => entry.activityType], ['Date', ({ entry }) => entry.date],
      ['Notes', ({ entry }) => entry.notes],
    ], activityRows);

    const harvestRows = gardenBeds.flatMap((bed) => (bed.harvests || []).map((entry) => ({ bed, entry })));
    downloadCsv(datedName('harvest-log'), [
      ['Bed Name', ({ bed }) => bed.name], ['Bed Location', ({ bed }) => bed.location],
      ['Crop Name', ({ entry }) => entry.cropName], ['Date', ({ entry }) => entry.date],
      ['Amount', ({ entry }) => entry.amount], ['Notes', ({ entry }) => entry.notes],
    ], harvestRows);
  }

  function exportPlantActivityCsv() {
    const rows = plants.flatMap((plant) => (plant.activityLog || []).map((entry) => ({ plant, entry })));
    downloadCsv(`plant-activity-log-export-${exportDate()}.csv`, [
      ['Plant Name', ({ plant }) => plant.name], ['Activity Type', ({ entry }) => entry.activityType],
      ['Date', ({ entry }) => entry.date], ['Notes', ({ entry }) => entry.notes],
    ], rows);
  }

  function exportPlantPhotoCsv() {
    const rows = plants.flatMap((plant) => (plant.photoLog || []).map((entry) => ({ plant, entry })));
    downloadCsv(`plant-photo-log-export-${exportDate()}.csv`, [
      ['Plant Name', ({ plant }) => plant.name], ['Photo URL', ({ entry }) => entry.photoUrl],
      ['Date', ({ entry }) => entry.date], ['Category / Type', ({ entry }) => entry.photoType],
      ['Caption / Notes', ({ entry }) => entry.caption],
    ], rows);
  }

  async function importData(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    let parsedBackup;
    try {
      parsedBackup = JSON.parse(await file.text());
    } catch {
      setBackupMessageType('error');
      setBackupMessage('That file is not valid JSON. Please choose a backup exported from this app.');
      return;
    }

    const normalized = normalizeBackup(parsedBackup);
    if (!normalized.ok) {
      setBackupMessageType('error');
      setBackupMessage(`${normalized.error} Your current data was not changed.`);
      return;
    }

    const warning = backupHasZeroPlantsWarning(normalized.backup, plants.length);
    if (!window.confirm(
      [
        'Importing this backup will replace your current local Plant Tracker data.',
        'A local safety snapshot will be created first so you can undo this restore.',
        '',
        describeBackup(normalized.backup),
        warning,
        '',
        'Continue?',
      ].filter(Boolean).join('\n'),
    )) return;

    const restoreResult = await restoreBackup(normalized.backup);
    if (restoreResult.ok) {
      const summary = getBackupSummary(normalized.backup);
      setBackupPreview(summary);
      setBackupMessageType('success');
      setBackupMessage(`Backup imported successfully. Your restored plants are ready.\n${formatBackupSummary(summary)}`);
    } else {
      setBackupMessageType('error');
      setBackupMessage('The backup could not be imported. Your previous data has been restored.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isPlantSubmitting) return;

    const shouldAddAnother = !isEditing
      && event.nativeEvent.submitter?.value === 'add-another';

    setPlantImageUploadError('');
    setAddPlantMessage('');
    setIsPlantSubmitting(true);
    setPlantSubmitStatus(plantImageFile ? 'Uploading photo...' : 'Saving plant...');

    try {
      const uploadedImageUrl = plantImageFile ? await uploadStoredImage(plantImageFile, 'plants') : newPlant.imageUrl;
      setPlantSubmitStatus('Saving plant...');

      const savedPlant = {
        ...newPlant,
        id: newPlant.id || makeId('plant'),
        createdAt: newPlant.createdAt || new Date().toISOString(),
        imageUrl: uploadedImageUrl,
        image: getPlantImage(newPlant.name, newPlant.type),
      };
      if (isEditing && selectedPlant.lifecycleStage !== savedPlant.lifecycleStage) {
        savedPlant.lifecycleHistory = [...(selectedPlant.lifecycleHistory || []), {
          id: makeId('lifecycle-transition'),
          previousStage: selectedPlant.lifecycleStage || '',
          newStage: savedPlant.lifecycleStage,
          transitionDate: todayDate(),
          note: 'Stage updated from Edit Plant',
          createdAt: new Date().toISOString(),
        }];
      }

      // Keep older text values unless the user chooses a replacement date.
      if (isEditing) {
        ['lastWatered', 'repotDate', 'acquiredDate', 'pestQuarantineStartDate', 'pestQuarantineEndDate', 'doNotTouchUntil'].forEach((fieldName) => {
          const previousValue = selectedPlant[fieldName];
          const isLegacyText = previousValue && !dateInputValue(previousValue);

          if (!newPlant[fieldName] && isLegacyText) savedPlant[fieldName] = previousValue;
        });
      }
      const updatedPlants = isEditing
        ? plants.map((plant) => plant === selectedPlant ? savedPlant : plant)
        : [...plants, savedPlant];

      localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
      markLocalDataChanged('plants');
      setPlants(updatedPlants);
      createAutomaticRemindersForPlant(savedPlant, isEditing ? selectedPlant : null);

      if (isEditing) setSelectedPlant(savedPlant);
      setNewPlant(emptyPlant);
      setPlantFormBaseline(JSON.stringify(emptyPlant));
      clearPlantImageSelection();
      setNewOptionText({ genus: '', type: '', source: '', desiredStatus: '', status: '', location: '', lightNeeds: '', soilMix: '', wateringRhythm: '', moisturePreference: '', careDifficulty: '', tcStage: '', tcSetup: '', tcHumidityLevel: '' });
      setShowForm(shouldAddAnother);
      setAddPlantMessage(shouldAddAnother ? 'Plant added. Ready for the next one.' : '');
      setSoilMixIsCustom(false);
      setIsEditing(false);
      if (shouldAddAnother) {
        requestAnimationFrame(() => {
          const form = plantFormRef.current;
          const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          form?.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
          if (!window.matchMedia('(pointer: coarse)').matches) {
            form?.querySelector('#plant-name')?.focus({ preventScroll: true });
          }
        });
      }
    } catch (error) {
      console.error('Plant image upload failed:', error);
      setPlantImageUploadError(error.message || String(error));
      setPlantSubmitStatus('');
    } finally {
      setIsPlantSubmitting(false);
    }
  }

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target;
    setNewPlant((currentPlant) => ({ ...currentPlant, [name]: type === 'checkbox' ? checked : value }));
  }

  function getSoilMixSelectValue(value) {
    if (soilMixIsCustom) return '__custom__';
    if (!value) return '';
    return getSoilMixByValue(value)?.id || '__custom__';
  }

  function handleSoilMixSelectChange(event) {
    const value = event.target.value;
    const custom = value === '__custom__';
    setSoilMixIsCustom(custom);
    setNewPlant((currentPlant) => ({
      ...currentPlant,
      soilMix: custom
        ? (getSoilMixByValue(currentPlant.soilMix) ? '' : currentPlant.soilMix)
        : value,
    }));
  }

  function handleSoilMixCustomChange(event) {
    setNewPlant((currentPlant) => ({ ...currentPlant, soilMix: event.target.value }));
  }

  function addDropdownOption(fieldName, formName = 'plant') {
    const option = newOptionText[fieldName].trim();
    if (!option) return;

    setDropdownOptions((currentOptions) => {
      const updatedOptions = {
        ...currentOptions,
        [fieldName]: currentOptions[fieldName].includes(option)
          ? currentOptions[fieldName]
          : [...currentOptions[fieldName], option],
      };

      localStorage.setItem(dropdownOptionsStorageKey, JSON.stringify(updatedOptions));
      markLocalDataChanged('dropdown-options');
      return updatedOptions;
    });
    if (formName === 'wishlist') {
      setWishlistDraft((currentItem) => ({ ...currentItem, [fieldName]: option }));
    } else {
      setNewPlant((currentPlant) => ({ ...currentPlant, [fieldName]: option }));
    }
    setNewOptionText((currentText) => ({ ...currentText, [fieldName]: '' }));
  }

  function cancelForm() {
    if (!confirmDiscardChanges(plantFormDirty)) return;
    setNewPlant(emptyPlant);
    setPlantFormBaseline(JSON.stringify(emptyPlant));
    clearPlantImageSelection();
    setNewOptionText({ genus: '', type: '', source: '', desiredStatus: '', status: '', location: '', lightNeeds: '', soilMix: '', wateringRhythm: '', moisturePreference: '', careDifficulty: '', tcStage: '', tcSetup: '', tcHumidityLevel: '' });
    setAddPlantMessage('');
    setSoilMixIsCustom(false);
    setShowForm(false);
    setIsEditing(false);
  }

  function startEditing() {
    cancelEditingLogEntry();
    cancelEditingPhotoEntry();
    const editablePlant = {
      ...emptyPlant,
      ...selectedPlant,
      lastWatered: dateInputValue(selectedPlant.lastWatered),
      repotDate: dateInputValue(selectedPlant.repotDate),
      acquiredDate: dateInputValue(selectedPlant.acquiredDate),
      pestQuarantineStartDate: dateInputValue(selectedPlant.pestQuarantineStartDate),
      pestQuarantineEndDate: dateInputValue(selectedPlant.pestQuarantineEndDate),
      doNotTouchUntil: dateInputValue(selectedPlant.doNotTouchUntil),
      tcDeflaskDate: dateInputValue(selectedPlant.tcDeflaskDate),
      tcAcclimationStartDate: dateInputValue(selectedPlant.tcAcclimationStartDate),
      tcAcclimationEndDate: dateInputValue(selectedPlant.tcAcclimationEndDate),
      lecaConversionStartDate: dateInputValue(selectedPlant.lecaConversionStartDate),
    };
    setNewPlant(editablePlant);
    setSoilMixIsCustom(Boolean(editablePlant.soilMix && !getSoilMixByValue(editablePlant.soilMix)));
    setPlantFormBaseline(JSON.stringify(editablePlant));
    clearPlantImageSelection();
    setNewOptionText({ genus: '', type: '', source: '', desiredStatus: '', status: '', location: '', lightNeeds: '', soilMix: '', wateringRhythm: '', moisturePreference: '', careDifficulty: '', tcStage: '', tcSetup: '', tcHumidityLevel: '' });
    setAddPlantMessage('');
    setIsEditing(true);
  }

  function deleteSelectedPlant() {
    const shouldDelete = window.confirm(
      `Permanently delete ${selectedPlant.name}? This cannot be undone.`,
    );

    if (!shouldDelete) return;

    const updatedPlants = plants.filter((plant) => plant !== selectedPlant);
    savePlants(updatedPlants);
    savePlantSpaces(plantSpaces.map((space) => ({
      ...space,
      placements: (space.placements || []).filter((placement) => placement.plantId !== selectedPlant.id),
    })));
    setSelectedPlant(null);
  }

  function changeSelectedPlantLifecycle(nextStatus) {
    const action = nextStatus === 'active'
      ? 'restore'
      : nextStatus === 'archived' ? 'archive' : 'move to the graveyard';
    const shouldChange = window.confirm(
      `Are you sure you want to ${action} ${selectedPlant.name}?`,
    );

    if (!shouldChange) return;

    const updatedPlant = { ...selectedPlant, lifecycleStatus: nextStatus };
    const updatedPlants = plants.map((plant) => plant === selectedPlant ? updatedPlant : plant);
    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    markLocalDataChanged('plants');
    setPlants(updatedPlants);
    setSelectedPlant(nextStatus === 'active' ? updatedPlant : null);
    setLifecycleView(nextStatus);
  }

  function transitionSelectedPlantStage(nextStage) {
    if (!nextStage || nextStage === selectedPlant.lifecycleStage) return;
    const note = window.prompt('Transition note (optional)', '') ?? '';
    const transition = {
      id: makeId('lifecycle-transition'),
      previousStage: selectedPlant.lifecycleStage || '',
      newStage: nextStage,
      transitionDate: todayDate(),
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };
    const updatedPlant = {
      ...selectedPlant,
      lifecycleStage: nextStage,
      lifecycleHistory: [...(selectedPlant.lifecycleHistory || []), transition],
    };
    savePlants(plants.map((plant) => plant.id === selectedPlant.id ? updatedPlant : plant), 'lifecycle-transition');
  }

  function reverseLifecycleTransition(transition) {
    const correction = {
      id: makeId('lifecycle-transition'),
      previousStage: selectedPlant.lifecycleStage || transition.newStage,
      newStage: transition.previousStage,
      transitionDate: todayDate(),
      note: `Correction of transition from ${transition.previousStage} to ${transition.newStage}`,
      createdAt: new Date().toISOString(),
      correctsTransitionId: transition.id,
    };
    const updatedPlant = {
      ...selectedPlant,
      lifecycleStage: transition.previousStage,
      lifecycleHistory: [...(selectedPlant.lifecycleHistory || []), correction],
    };
    savePlants(plants.map((plant) => plant.id === selectedPlant.id ? updatedPlant : plant), 'lifecycle-correction');
  }

  function addLogEntry(event) {
    event.preventDefault();

    const logEntry = {
      ...newLogEntry,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      notes: newLogEntry.notes.trim(),
    };
    const updatedActivityLog = [...(selectedPlant.activityLog || []), logEntry];

    const updatedPlant = {
      ...selectedPlant,
      ...getActivitySummaryUpdates(updatedActivityLog, [logEntry.activityType]),
      activityLog: updatedActivityLog,
    };
    const updatedPlants = plants.map((plant) => plant === selectedPlant ? updatedPlant : plant);

    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    markLocalDataChanged('activity-log');
    setPlants(updatedPlants);
    setSelectedPlant(updatedPlant);
    setNewLogEntry(emptyLogEntry());
    setQuickCheckMessage('');
  }

  function addQuickCheckIn() {
    const logEntry = {
      activityType: 'Quick check-in',
      date: todayDate(),
      notes: '',
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
    };
    const updatedPlant = {
      ...selectedPlant,
      activityLog: [...(selectedPlant.activityLog || []), logEntry],
    };
    const updatedPlants = plants.map((plant) => plant === selectedPlant ? updatedPlant : plant);

    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    markLocalDataChanged('activity-log');
    setPlants(updatedPlants);
    setSelectedPlant(updatedPlant);
    setQuickCheckMessage("Checked in today — you're all set.");
  }

  function startEditingLogEntry(entry) {
    setEditingLogEntry(entry);
    setLogEntryDraft({
      activityType: entry.activityType,
      date: dateInputValue(entry.date),
      notes: entry.notes || '',
    });
  }

  function cancelEditingLogEntry() {
    setEditingLogEntry(null);
    setLogEntryDraft(emptyLogEntry());
  }

  function saveEditedLogEntry(event) {
    event.preventDefault();

    const updatedEntry = {
      ...editingLogEntry,
      ...logEntryDraft,
      notes: logEntryDraft.notes.trim(),
    };
    const updatedActivityLog = selectedPlant.activityLog.map((entry) => (
      entry === editingLogEntry ? updatedEntry : entry
    ));
    const affectedActivityTypes = [editingLogEntry.activityType, updatedEntry.activityType];
    const updatedPlant = {
      ...selectedPlant,
      ...getActivitySummaryUpdates(updatedActivityLog, affectedActivityTypes),
      activityLog: updatedActivityLog,
    };
    const updatedPlants = plants.map((plant) => plant === selectedPlant ? updatedPlant : plant);

    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    markLocalDataChanged('activity-log');
    setPlants(updatedPlants);
    setSelectedPlant(updatedPlant);
    cancelEditingLogEntry();
  }

  function deleteLogEntry(entryToDelete) {
    const shouldDelete = window.confirm(
      `Delete this ${entryToDelete.activityType.toLowerCase()} log entry?`,
    );
    if (!shouldDelete) return;

    const updatedActivityLog = selectedPlant.activityLog.filter((entry) => entry !== entryToDelete);
    const updatedPlant = {
      ...selectedPlant,
      ...getActivitySummaryUpdates(updatedActivityLog, [entryToDelete.activityType]),
      activityLog: updatedActivityLog,
    };
    const updatedPlants = plants.map((plant) => plant === selectedPlant ? updatedPlant : plant);

    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    markLocalDataChanged('activity-log');
    setPlants(updatedPlants);
    setSelectedPlant(updatedPlant);
    if (editingLogEntry === entryToDelete) cancelEditingLogEntry();
  }

  function savePhotoLog(photoLog) {
    const updatedPlant = { ...selectedPlant, photoLog };
    const updatedPlants = plants.map((plant) => plant === selectedPlant ? updatedPlant : plant);

    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    markLocalDataChanged('photo-log');
    setPlants(updatedPlants);
    setSelectedPlant(updatedPlant);
  }

  async function addPhotoEntry(event) {
    event.preventDefault();
    if (isPhotoEntrySubmitting) return;
    if (!photoEntryFile && !newPhotoEntry.photoUrl.trim()) return;

    setPhotoEntryUploadError('');
    setIsPhotoEntrySubmitting(true);
    setPhotoEntrySubmitStatus(photoEntryFile ? 'Uploading photo...' : 'Saving photo...');

    try {
      const uploadedPhotoUrl = photoEntryFile
        ? await uploadStoredImage(photoEntryFile, 'photo-log')
        : newPhotoEntry.photoUrl.trim();
      setPhotoEntrySubmitStatus('Saving photo...');
      const photoEntry = {
        ...newPhotoEntry,
        photoUrl: uploadedPhotoUrl,
        caption: newPhotoEntry.caption.trim(),
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: new Date().toISOString(),
      };

      savePhotoLog([...(selectedPlant.photoLog || []), photoEntry]);
      setNewPhotoEntry(emptyPhotoEntry());
      clearPhotoEntryImageSelection();
    } catch (error) {
      console.error('Photo log image upload failed:', error);
      setPhotoEntryUploadError(error.message || String(error));
      setPhotoEntrySubmitStatus('');
    } finally {
      setIsPhotoEntrySubmitting(false);
    }
  }

  function startEditingPhotoEntry(entry) {
    clearPhotoEditImageSelection();
    setEditingPhotoEntry(entry);
    setPhotoEntryDraft({
      photoUrl: entry.photoUrl || '',
      date: dateInputValue(entry.date),
      caption: entry.caption || '',
      photoType: entry.photoType || 'General photo',
    });
  }

  function cancelEditingPhotoEntry() {
    setEditingPhotoEntry(null);
    setPhotoEntryDraft(emptyPhotoEntry());
    clearPhotoEditImageSelection();
  }

  async function saveEditedPhotoEntry(event) {
    event.preventDefault();
    if (isPhotoEditSubmitting) return;
    if (!photoEditFile && !photoEntryDraft.photoUrl.trim()) return;

    setPhotoEditUploadError('');
    setIsPhotoEditSubmitting(true);
    setPhotoEditSubmitStatus(photoEditFile ? 'Uploading replacement photo...' : 'Saving changes...');

    try {
      const uploadedPhotoUrl = photoEditFile
        ? await uploadStoredImage(photoEditFile, 'photo-log')
        : photoEntryDraft.photoUrl.trim();
      setPhotoEditSubmitStatus('Saving changes...');
      const updatedEntry = {
        ...editingPhotoEntry,
        ...photoEntryDraft,
        photoUrl: uploadedPhotoUrl,
        caption: photoEntryDraft.caption.trim(),
      };
      const updatedPhotoLog = (selectedPlant.photoLog || []).map((entry) => (
        entry === editingPhotoEntry ? updatedEntry : entry
      ));

      savePhotoLog(updatedPhotoLog);
      cancelEditingPhotoEntry();
    } catch (error) {
      console.error('Photo log replacement upload failed:', error);
      setPhotoEditUploadError(error.message || String(error));
      setPhotoEditSubmitStatus('');
    } finally {
      setIsPhotoEditSubmitting(false);
    }
  }

  function deletePhotoEntry(entryToDelete) {
    if (!window.confirm('Delete this photo log entry?')) return;

    savePhotoLog((selectedPlant.photoLog || []).filter((entry) => entry !== entryToDelete));
    if (editingPhotoEntry === entryToDelete) cancelEditingPhotoEntry();
  }

  function saveManualTimelineEntries(timelineEntries) {
    const updatedPlant = { ...selectedPlant, timelineEntries };
    const updatedPlants = plants.map((plant) => plant === selectedPlant ? updatedPlant : plant);

    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    markLocalDataChanged('timeline');
    setPlants(updatedPlants);
    setSelectedPlant(updatedPlant);
  }

  async function saveManualTimelineEntry(event) {
    event.preventDefault();
    if (isTimelineEntrySubmitting || !timelineDraft.title.trim()) return;

    setTimelineEntryUploadError('');
    setIsTimelineEntrySubmitting(true);
    setTimelineEntrySubmitStatus(timelineEntryFile ? 'Uploading photo...' : 'Saving timeline entry...');

    try {
      const uploadedPhotoUrl = timelineEntryFile
        ? await uploadStoredImage(timelineEntryFile, 'timeline')
        : timelineDraft.photoUrl.trim();
      setTimelineEntrySubmitStatus('Saving timeline entry...');
      const now = new Date().toISOString();
      const manualEntry = {
        ...timelineDraft,
        id: editingTimelineEntryId || makeId('timeline'),
        title: timelineDraft.title.trim(),
        note: timelineDraft.note.trim(),
        photoUrl: uploadedPhotoUrl,
        date: dateInputValue(timelineDraft.date) || todayDate(),
        createdAt: editingTimelineEntryId
          ? (selectedPlant.timelineEntries || []).find((entry) => entry.id === editingTimelineEntryId)?.createdAt || now
          : now,
        updatedAt: now,
      };
      const existingEntries = selectedPlant.timelineEntries || [];
      const nextEntries = editingTimelineEntryId
        ? existingEntries.map((entry) => entry.id === editingTimelineEntryId ? manualEntry : entry)
        : [...existingEntries, manualEntry];

      saveManualTimelineEntries(nextEntries);
      resetTimelineEntryForm();
    } catch (error) {
      console.error('Timeline image upload failed:', error);
      setTimelineEntryUploadError(error.message || String(error));
      setTimelineEntrySubmitStatus('');
    } finally {
      setIsTimelineEntrySubmitting(false);
    }
  }

  function startEditingTimelineEntry(entry) {
    if (entry.source !== 'manual') return;
    clearTimelineEntryImageSelection();
    setEditingTimelineEntryId(entry.sourceId || entry.id);
    setTimelineDraft({
      type: entry.type,
      date: dateInputValue(entry.date),
      title: entry.title,
      note: entry.note || '',
      photoUrl: entry.photoUrl || '',
    });
    setShowTimelineForm(true);
  }

  function deleteManualTimelineEntry(entry) {
    if (entry.source !== 'manual') return;
    if (!window.confirm('Delete this manual timeline entry?')) return;
    saveManualTimelineEntries((selectedPlant.timelineEntries || []).filter((item) => item.id !== entry.sourceId));
  }

  function openTimelineSource(entry) {
    const sectionId = ({
      activityLog: 'activity-log-heading',
      photoLog: 'photo-log-heading',
      reminder: 'plant-checkins-heading',
      plantFields: 'plant-detail-heading',
    })[entry.source];
    if (sectionId) document.getElementById(sectionId)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function renderReminderCard(reminder, compact = false) {
    const plant = reminderPlantById.get(reminder.plantId);
    return (
      <article className={`reminder-card${compact ? ' reminder-card-compact' : ''}`} key={reminder.id}>
        <div className="reminder-card-main">
          <div>
            <span className={`reminder-status reminder-status-${reminder.status}`}>{reminder.status}</span>
            <h4>{reminder.title}</h4>
            <p>{plant?.name || 'Plant not found'}{reminder.linkedStage ? ` · ${reminder.linkedStage}` : ''}</p>
          </div>
          <div className="reminder-date">
            <strong>{reminder.dueDate || 'No date'}</strong>
            <span>{formatReminderTiming(reminder.dueDate)}</span>
          </div>
        </div>
        {reminder.note && <p className="reminder-note">{reminder.note}</p>}
        {reminder.status === 'active' && (
          <div className="reminder-actions">
            {plant && <button type="button" onClick={() => openPlantDetails(plant)}>Open plant</button>}
            <button type="button" onClick={() => completeReminder(reminder)}>Mark complete</button>
            <select aria-label={`Snooze ${reminder.title}`} defaultValue=""
              onChange={(event) => {
                if (!event.target.value) return;
                snoozeReminder(reminder, event.target.value);
                event.target.value = '';
              }}>
              <option value="" disabled>Snooze</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="3-days">3 days</option>
              <option value="1-week">1 week</option>
              <option value="custom">Custom date</option>
            </select>
            <button type="button" onClick={() => setReminderNextCheck(reminder)}>Set next check</button>
            <button type="button" onClick={() => dismissReminder(reminder)}>Dismiss</button>
          </div>
        )}
      </article>
    );
  }

  function renderReminderGroup(title, items, emptyText) {
    return (
      <section className="reminder-group" aria-labelledby={`${title.toLowerCase().replaceAll(' ', '-')}-heading`}>
        <div className="dashboard-section-heading">
          <h3 id={`${title.toLowerCase().replaceAll(' ', '-')}-heading`}>{title}</h3>
          <p>{items.length} item{items.length === 1 ? '' : 's'}</p>
        </div>
        <div className="reminder-list">
          {items.length ? items.map((reminder) => renderReminderCard(reminder)) : <p className="empty-message">{emptyText}</p>}
        </div>
      </section>
    );
  }

  function renderDashboardHome() {
    const cardMetadata = new Map(dashboardCards.map((card) => [card.id, card]));
    const highAttentionPlants = activePlants.filter(
      (plant) => normalizedFilterValue(plant.attention).toLowerCase() === 'high',
    );
    const watchPlants = activePlants.filter(
      (plant) => ['watch', 'watch list'].includes(normalizedFilterValue(plant.attention).toLowerCase()),
    );
    const tissueCulturePlants = activePlants.filter(isTissueCulture);
    const lecaPlants = activePlants.filter(shouldShowLecaTracker);
    const cormPlants = activePlants.filter(shouldShowCormTracker);
    const quarantinedPlants = activePlants.filter(isPlantInQuarantine);
    const recentlyAddedPlants = [...activePlants]
      .filter((plant) => plant.createdAt || plant.acquiredDate)
      .sort((a, b) => (b.createdAt || b.acquiredDate || '').localeCompare(a.createdAt || a.acquiredDate || ''))
      .slice(0, 3);
    const recentActivity = [
      ...plants.flatMap((plant) => (plant.activityLog || []).map((entry) => ({
        id: `activity-${plant.id}-${entry.id || entry.date}`,
        date: entry.date || '',
        title: entry.title || entry.type || 'Plant activity',
        context: plant.name,
      }))),
      ...quickNotes.map((note) => ({
        id: `journal-${note.id}`,
        date: note.createdAt || note.date || '',
        title: 'Journal entry',
        context: note.plantId ? reminderPlantById.get(note.plantId)?.name || 'Plant journal' : 'Plant journal',
      })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

    const cardContent = {
      'needs-attention': {
        count: highAttentionPlants.length + dueNowReminders.length,
        summary: highAttentionPlants.length || dueNowReminders.length
          ? `${highAttentionPlants.length} high-priority plant${highAttentionPlants.length === 1 ? '' : 's'} · ${dueNowReminders.length} check-in${dueNowReminders.length === 1 ? '' : 's'} due`
          : 'Nothing marked high priority and no check-ins due.',
        action: () => (highAttentionPlants.length
          ? openPlantList({ lifecycle: 'active', filter: ['attention', 'High'] })
          : openReminders()),
        actionLabel: highAttentionPlants.length ? 'View high-priority plants' : 'View check-ins',
      },
      'check-ins': {
        count: dueNowReminders.length,
        summary: dueNowReminders.length
          ? `${overdueReminders.length} overdue · ${thisWeekReminders.length} upcoming this week`
          : `${thisWeekReminders.length} upcoming this week · ${recentlyCompletedReminders.length} recently completed`,
        action: openReminders,
        actionLabel: 'Open check-ins',
      },
      quarantine: {
        count: quarantinedPlants.length,
        summary: quarantinedPlants.length
          ? `${activePlants.filter(isPlantLeavingQuarantineSoon).length} ending soon · ${activePlants.filter((plant) => getQuarantineStatus(plant).isInPestQuarantine).length} pest-related`
          : 'No active plants are currently quarantined.',
        action: () => openPlantList({ lifecycle: 'active', quarantine: 'current' }),
        actionLabel: 'View quarantined plants',
      },
      'recently-added': {
        count: recentlyAddedPlants.length,
        summary: recentlyAddedPlants.length
          ? recentlyAddedPlants.map((plant) => plant.name).join(', ')
          : 'New plants will appear here.',
        action: () => openPlantList({ lifecycle: 'active', sort: 'added-desc' }),
        actionLabel: 'View newest plants',
      },
      'watch-list': {
        count: watchPlants.length,
        summary: watchPlants.length ? 'Plants you have marked to monitor closely.' : 'No plants are on your Watch List.',
        action: () => openPlantList({ lifecycle: 'active', filter: ['attention', 'Watch list'] }),
        actionLabel: 'Open Watch List',
      },
      'tissue-culture': {
        count: tissueCulturePlants.length,
        summary: tissueCulturePlants.length
          ? `${tissueCulturePlants.filter((plant) => acclimatingTcStages.includes(plant.tcStage)).length} currently acclimating`
          : 'No tissue cultures are being tracked.',
        action: () => openPlantList({ lifecycle: 'active', filter: ['type', '__tissue_culture__'] }),
        actionLabel: 'View tissue cultures',
      },
      leca: {
        count: lecaPlants.length,
        summary: lecaPlants.length
          ? `${lecaPlants.filter((plant) => lecaTransitionStatuses.includes(plant.lecaStatus)).length} currently transitioning`
          : 'No LECA conversions are being tracked.',
        action: () => openPlantList({ lifecycle: 'active', filter: ['lecaStatus', '__leca__'] }),
        actionLabel: 'View LECA plants',
      },
      corms: {
        count: cormPlants.length,
        summary: cormPlants.length
          ? `${cormPlants.filter((plant) => !['Established', 'Unsuccessful'].includes(plant.cormPhase)).length} in progress`
          : 'No corm progress is being tracked.',
        action: () => openPlantList({ lifecycle: 'active', filter: ['origin', '__corm__'] }),
        actionLabel: 'View corm plants',
      },
      'recent-activity': {
        count: recentActivity.length,
        summary: recentActivity.length ? (
          <ul className="dashboard-activity-list">
            {recentActivity.map((entry) => (
              <li key={entry.id}><strong>{entry.title}</strong><span>{entry.context}{entry.date ? ` · ${String(entry.date).slice(0, 10)}` : ''}</span></li>
            ))}
          </ul>
        ) : 'Activity and journal updates will appear here.',
        action: () => openPlantList({ lifecycle: 'active', sort: 'checked-desc' }),
        actionLabel: 'View recent plants',
      },
      journal: {
        count: unprocessedQuickNotes.length,
        summary: unprocessedQuickNotes.length
          ? `${unprocessedQuickNotes.length} unfiled entr${unprocessedQuickNotes.length === 1 ? 'y' : 'ies'} ready to organize.`
          : 'No unfiled entries. Capture an observation whenever you need.',
        action: () => setAppView('quick-notes'),
        actionLabel: 'Open Plant Journal',
      },
      'plant-insights': {
        count: dashboardCharts.length,
        summary: (
          <div className="dashboard-charts" aria-label="Collection breakdown charts">
            {dashboardCharts.map((chart) => {
              const total = chart.rows.reduce((sum, row) => sum + row.count, 0);
              const coloredRows = chart.rows.map((row, index) => ({
                ...row,
                color: chartColors[index % chartColors.length],
              }));
              return (
                <section className="dashboard-chart" key={chart.title}>
                  <div className="dashboard-chart-heading"><h4>{chart.title}</h4><span>{chart.description}</span></div>
                  {coloredRows.length && total ? (
                    <div className="dashboard-chart-content">
                      <div className="dashboard-donut" style={{ background: getDonutBackground(coloredRows) }}
                        role="img" aria-label={`${chart.title}: ${total} plants total`}>
                        <span><strong>{total}</strong>plants</span>
                      </div>
                      <div className="dashboard-chart-rows">
                        {coloredRows.map((row) => {
                          const filterValue = row.label === 'Not set' ? missingFilterValue : row.label;
                          const chartTarget = chart.insightChart
                            ? { lifecycle: 'active', insight: { chart: chart.insightChart, value: row.label } }
                            : row.lifecycle
                              ? { lifecycle: row.lifecycle }
                              : { lifecycle: 'active', filter: [chart.fieldName, filterValue] };
                          return row.isOther ? (
                            <div className="dashboard-chart-row dashboard-chart-row-static" key={row.label}>
                              <span className="dashboard-chart-key" style={{ backgroundColor: row.color }} aria-hidden="true" />
                              <span className="dashboard-chart-label">{row.label}</span>
                              <span className="dashboard-chart-count">{row.count}</span>
                            </div>
                          ) : (
                            <button className="dashboard-chart-row" type="button" key={row.label}
                              onClick={() => openPlantList(chartTarget)}>
                              <span className="dashboard-chart-key" style={{ backgroundColor: row.color }} aria-hidden="true" />
                              <span className="dashboard-chart-label">{row.label}</span>
                              <span className="dashboard-chart-count">{row.count}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : <p className="dashboard-chart-empty">Add plant details to see this insight.</p>}
                </section>
              );
            })}
          </div>
        ),
        action: () => openPlantList({ lifecycle: 'all' }),
        actionLabel: 'Explore all plants',
      },
      statistics: {
        count: activePlants.length,
        summary: (
          <dl className="dashboard-stat-list">
            <div><dt>Total plants</dt><dd>{plants.length}</dd></div>
            <div><dt>Watch List</dt><dd>{watchPlants.length}</dd></div>
            <div><dt>Tissue Culture</dt><dd>{tissueCulturePlants.length}</dd></div>
            <div><dt>LECA</dt><dd>{lecaPlants.length}</dd></div>
            <div><dt>Corms</dt><dd>{cormPlants.length}</dd></div>
            <div><dt>Due today</dt><dd>{dueNowReminders.length}</dd></div>
          </dl>
        ),
        action: () => openPlantList({ lifecycle: 'all' }),
        actionLabel: 'View full collection',
      },
    };

    return (
      <section className="dashboard-home dashboard-smart-home" aria-labelledby="dashboard-heading">
        <div className="dashboard-heading">
          <div>
            <p className="detail-eyebrow">Today at a glance</p>
            <h2 id="dashboard-heading">Your plant home</h2>
            <p>See what needs attention, then pick up where you left off.</p>
          </div>
          <button className="secondary-button dashboard-customize-button" type="button"
            aria-expanded={isCustomizingDashboard}
            onClick={() => setIsCustomizingDashboard((visible) => !visible)}>
            {isCustomizingDashboard ? 'Done' : 'Customize Dashboard'}
          </button>
        </div>
        <section className="dashboard-primary-actions" aria-label="Quick add actions">
          <button className="dashboard-add-button" type="button" onClick={() => {
            setAddPlantMessage('');
            setNewPlant(emptyPlant);
            setPlantFormBaseline(JSON.stringify(emptyPlant));
            setSoilMixIsCustom(false);
            clearPlantImageSelection();
            setShowForm(true);
          }}>+ Add New Plant</button>
          <button className="secondary-button" type="button" onClick={() => openQuickNote()}>
            + New Journal Entry
          </button>
        </section>
        {isCustomizingDashboard && (
          <section className="dashboard-customizer" aria-labelledby="dashboard-customizer-heading">
            <div className="dashboard-customizer-heading">
              <div><h3 id="dashboard-customizer-heading">Customize Dashboard</h3><p>Choose sections and adjust their order.</p></div>
              <button className="secondary-button" type="button"
                onClick={() => updateDashboardPreferences(defaultDashboardPreferences())}>Restore Default</button>
            </div>
            <ol className="dashboard-customizer-list">
              {dashboardPreferences.cards.map((card, index) => (
                <li key={card.id}>
                  <label><input type="checkbox" checked={card.visible}
                    onChange={() => toggleDashboardCard(card.id)} />{cardMetadata.get(card.id)?.title}</label>
                  <span className="dashboard-move-controls">
                    <button type="button" disabled={index === 0} onClick={() => moveDashboardCard(card.id, -1)}
                      aria-label={`Move ${cardMetadata.get(card.id)?.title} up`}>↑</button>
                    <button type="button" disabled={index === dashboardPreferences.cards.length - 1}
                      onClick={() => moveDashboardCard(card.id, 1)}
                      aria-label={`Move ${cardMetadata.get(card.id)?.title} down`}>↓</button>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
        <div className="dashboard-card-grid">
          {dashboardPreferences.cards.filter((card) => card.visible).map((preference) => {
            const metadata = cardMetadata.get(preference.id);
            const content = cardContent[preference.id];
            if (!metadata || !content) return null;
            return (
              <article className={`dashboard-home-card dashboard-home-card-${metadata.size}`} key={preference.id}>
                <div className="dashboard-home-card-heading">
                  <h3>{metadata.title}</h3><strong>{content.count}</strong>
                </div>
                <div className="dashboard-home-card-summary">{content.summary}</div>
                <button type="button" onClick={content.action}>{content.actionLabel} →</button>
              </article>
            );
          })}
          {!dashboardPreferences.cards.some((card) => card.visible) && (
            <div className="dashboard-empty-state">
              <h3>Your Dashboard is clear</h3>
              <p>Use Customize Dashboard to show any section again.</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <main className="plant-inventory">
      <header className="brand-header">
        <p className="brand-name">Grow With Gibre</p>
        <h1>Plant Tracker</h1>
        <p className="brand-tagline">From the city to the soil</p>
      </header>

      <nav className="app-navigation" aria-label="Main navigation">
        <button type="button" className={appView === 'dashboard' ? 'active' : ''}
          aria-current={appView === 'dashboard' ? 'page' : undefined} onClick={openDashboard}>
          Dashboard
        </button>
        <button type="button" className={appView === 'plants' ? 'active' : ''}
          aria-current={appView === 'plants' ? 'page' : undefined} onClick={() => openPlantList()}>
          Plant List
        </button>
        <button type="button" className={appView === 'wishlist' ? 'active' : ''}
          aria-current={appView === 'wishlist' ? 'page' : undefined} onClick={() => openWishlist()}>
          Wishlist
        </button>
        <button type="button" className={appView === 'garden' ? 'active' : ''}
          aria-current={appView === 'garden' ? 'page' : undefined} onClick={() => openGarden()}>
          Garden Beds
        </button>
        <button type="button" className={appView === 'plant-spaces' ? 'active' : ''}
          aria-current={appView === 'plant-spaces' ? 'page' : undefined} onClick={() => openPlantSpaces()}>
          Plant Spaces
        </button>
        <button type="button" className={appView === 'reminders' ? 'active' : ''}
          aria-current={appView === 'reminders' ? 'page' : undefined} onClick={openReminders}>
          Check-ins
        </button>
        <button type="button" className={appView === 'quick-notes' ? 'active' : ''}
          aria-current={appView === 'quick-notes' ? 'page' : undefined}
          onClick={() => { setSelectedPlant(null); setAppView('quick-notes'); }}>
          Plant Journal{unprocessedQuickNotes.length ? <span className="nav-count">{unprocessedQuickNotes.length}</span> : null}
        </button>
        <button type="button" className={appView === 'resources' ? 'active' : ''}
          aria-current={appView === 'resources' ? 'page' : undefined} onClick={() => openResources()}>
          Resources
        </button>
        <button type="button" className={appView === 'settings' ? 'active' : ''}
          aria-current={appView === 'settings' ? 'page' : undefined} onClick={openSettings}>
          Settings
        </button>
      </nav>

      <section className="plant-section">
        {appView === 'plants' && selectedPlant && !isEditing ? (
        <article className="plant-detail" aria-labelledby="plant-detail-heading">
          <div className="detail-actions">
            <button className="back-button" type="button" onClick={() => {
              setSelectedPlant(null);
              setNewLogEntry(emptyLogEntry());
              setNewPhotoEntry(emptyPhotoEntry());
              setQuickCheckMessage('');
              cancelEditingLogEntry();
              cancelEditingPhotoEntry();
            }}>
              ← Back to Plant List
            </button>
            <div className="plant-change-actions">
              {selectedPlantSpacePlacement && (
                <button className="secondary-button" type="button"
                  onClick={() => openPlantSpaces(selectedPlantSpacePlacement.space.id, selectedPlant.id)}>
                  Find in Plant Space
                </button>
              )}
              <button className="edit-plant-button" type="button" onClick={startEditing}
                aria-label="Edit plant" title="Edit plant">
                ✏️
              </button>
              {(selectedPlant.lifecycleStatus || 'active') === 'active' ? (
                <>
                  <button className="archive-plant-button" type="button"
                    aria-label="Archive plant" title="Archive plant"
                    onClick={() => changeSelectedPlantLifecycle('archived')}>
                    🗄️
                  </button>
                  <button className="graveyard-plant-button" type="button"
                    aria-label="Move plant to graveyard" title="Move plant to graveyard"
                    onClick={() => changeSelectedPlantLifecycle('graveyard')}>
                    🪦
                  </button>
                </>
              ) : (
                <button className="restore-plant-button" type="button"
                  aria-label="Restore plant" title="Restore plant"
                  onClick={() => changeSelectedPlantLifecycle('active')}>
                  ↩️
                </button>
              )}
              <button className="delete-plant-button" type="button" onClick={deleteSelectedPlant}
                aria-label="Permanently delete plant" title="Permanently delete plant">
                🗑️
              </button>
            </div>
          </div>
          <div className="detail-heading" id="plant-overview">
            <PlantImage key={selectedPlant.imageUrl || 'placeholder'} plant={selectedPlant} detail
              onEnlarge={selectedPlant.imageUrl?.trim() ? () => setProfilePhotoLightboxOpen(true) : undefined} />
            <div>
              <p className="detail-eyebrow">Plant details</p>
              <h2 id="plant-detail-heading">{selectedPlant.name}</h2>
              <p><strong>Origin:</strong> {selectedPlant.origin} · <strong>Stage:</strong> {selectedPlant.lifecycleStage}</p>
              <p>{displayValue(selectedPlant.genus)} · {displayValue(selectedPlant.type)}</p>
              <p className={`lifecycle-badge lifecycle-${selectedPlant.lifecycleStatus || 'active'}`}>
                {lifecycleLabel(selectedPlant.lifecycleStatus)}
              </p>
              <PlantBadges plant={selectedPlant} />
            </div>
          </div>
          <nav className="detail-section-nav" aria-label="Plant detail sections">
            {[
              ['plant-overview', 'Overview'],
              ['plant-care', 'Care'],
              ['plant-health', 'Health'],
              ['plant-checkins', 'Check-ins'],
              ...((isTissueCulture(selectedPlant) || hasTcTrackerData(selectedPlant)) ? [['plant-tissue-culture', 'Tissue Culture']] : []),
              ...(shouldShowCormTracker(selectedPlant) ? [['plant-corm', 'Corm Tracker']] : []),
              ...(shouldShowLecaTracker(selectedPlant) ? [['plant-leca', 'LECA']] : []),
              ['plant-photos', 'Photos'],
              ['plant-activity', 'Activity'],
            ].map(([sectionId, label]) => (
              <button type="button" key={sectionId}
                className={activeDetailSection === sectionId ? 'active' : ''}
                aria-current={activeDetailSection === sectionId ? 'location' : undefined}
                onClick={() => scrollToDetailSection(sectionId)}>
                {label}
              </button>
            ))}
          </nav>
          <div className="quick-check-in-panel">
            <div>
              <strong>Last checked</strong>
              <span>{displayValue(getLastCheckedDate(selectedPlant))}</span>
            </div>
            <button type="button" onClick={addQuickCheckIn}>✅ Quick Check-In</button>
            <button type="button" onClick={() => openQuickNote(selectedPlant.id)}>New Journal Entry</button>
          </div>
          {quickCheckMessage && <p className="quick-check-message" role="status">{quickCheckMessage}</p>}
          {selectedPlantQuarantine?.isInAnyQuarantine && (
            <aside className="quarantine-status" aria-label="Current quarantine status">
              <strong>Currently in quarantine</strong>
              <div>
                {selectedPlantQuarantine.isInNewPlantQuarantine && (
                  <span>New plant quarantine through {selectedPlantQuarantine.newPlantQuarantineEnd}</span>
                )}
                {selectedPlantQuarantine.isInPestQuarantine && (
                  <span>
                    Pest quarantine
                    {selectedPlantQuarantine.pestQuarantineEnd
                      ? ` through ${selectedPlantQuarantine.pestQuarantineEnd}`
                      : ' — no end date set'}
                  </span>
                )}
              </div>
            </aside>
          )}
          <div className="detail-sections">
            <section className="detail-section lifecycle-section" id="plant-lifecycle">
              <h3>Origin & lifecycle</h3>
              <dl className="detail-list">
                <div><dt>Permanent origin</dt><dd>{selectedPlant.origin}</dd></div>
                <div><dt>Current lifecycle stage</dt><dd>{selectedPlant.lifecycleStage}</dd></div>
              </dl>
              <div className="lifecycle-transition-control">
                <label htmlFor="plant-stage-transition">Transition to</label>
                <select id="plant-stage-transition" value={selectedPlant.lifecycleStage}
                  onChange={(event) => transitionSelectedPlantStage(event.target.value)}>
                  {lifecycleStageOptions.map((stage) => <option key={stage}>{stage}</option>)}
                </select>
              </div>
              {(selectedPlant.lifecycleHistory || []).length > 0 && (
                <ol className="lifecycle-history">
                  {[...(selectedPlant.lifecycleHistory || [])].reverse().map((transition) => (
                    <li key={transition.id}>
                      <div><strong>{transition.previousStage} → {transition.newStage}</strong><time>{transition.transitionDate}</time></div>
                      {transition.note && <p>{transition.note}</p>}
                      <button type="button" className="secondary-button"
                        onClick={() => reverseLifecycleTransition(transition)}>Correct / reverse</button>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            {getDetailSections(selectedPlant).map((section) => (
              <section className="detail-section" key={section.title}
                id={section.title === 'Care details' ? 'plant-care' : section.title === 'Plant information' ? 'plant-information' : undefined}>
                <h3>{section.title}</h3>
                <dl className="detail-list">
                  {section.fields.map(([fieldName, label]) => (
                    <div key={fieldName}>
                      <dt>{label}</dt>
                      <dd>{renderDetailValue(fieldName, selectedPlant[fieldName])}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
            {(isTissueCulture(selectedPlant) || hasTcTrackerData(selectedPlant)) && (
              <section className={`tracker-section-card tc-detail-section${isTrackerCompleted('tc', selectedPlant) ? ' tracker-completed' : ''}`} id="plant-tissue-culture">
                <div className="tracker-section-heading">
                  <div>
                    <p className="detail-eyebrow">Current stage · {displayValue(selectedPlant.tcStage)}</p>
                    <h3>🧪 Tissue Culture Acclimation</h3>
                    <p>{selectedPlant.tcHumidityLevel || selectedPlant.tcSetup || 'Add setup and humidity details to track progress.'}</p>
                  </div>
                  <button type="button" onClick={() => openTrackerEditor('tc')}>Update Acclimation</button>
                </div>
                {hasTcTrackerData(selectedPlant) ? (
                  <dl className="detail-list">
                    {[
                      ['tcStage', 'TC stage'], ['tcDeflaskDate', 'Deflask date'],
                      ['tcAcclimationStartDate', 'Acclimation start'],
                      ['tcAcclimationEndDate', 'Acclimation end'], ['tcSetup', 'Current setup'],
                      ['tcHumidityLevel', 'Humidity level'], ['tcNotes', 'Notes'],
                    ].filter(([fieldName]) => selectedPlant[fieldName]).map(([fieldName, label]) => (
                      <div key={fieldName}><dt>{label}</dt><dd>{selectedPlant[fieldName]}</dd></div>
                    ))}
                  </dl>
                ) : <p className="tracker-empty-state">No acclimation details yet. Add the current stage, dates, setup, humidity, and notes.</p>}
              </section>
            )}
            {shouldShowCormTracker(selectedPlant) && (
              <section className={`tracker-section-card corm-detail-section${isTrackerCompleted('corm', selectedPlant) ? ' tracker-completed' : ''}`} id="plant-corm">
                <div className="tracker-section-heading">
                  <div>
                    <p className="detail-eyebrow">{isTrackerCompleted('corm', selectedPlant) ? 'Completed history' : 'Active tracker'} · {displayValue(selectedPlant.cormPhase)}</p>
                    <h3>Corm Tracker</h3>
                    <p>{selectedPlant.cormProgressNotes || 'Record rooting, sprouting, leaf, and transfer milestones.'}</p>
                  </div>
                  <button type="button" onClick={() => openTrackerEditor('corm')}>Update Corm Tracker</button>
                </div>
                {hasCormTrackerData(selectedPlant) ? (
                  <>
                    <dl className="detail-list">
                      {[
                        ['cormPhase', 'Current phase'], ['cormGrowthMethod', 'Growth Method'],
                        ['cormCustomGrowthMethod', 'Custom growth method'],
                        ['cormSproutingMethod', 'Legacy sprouting method'], ['cormMedium', 'Medium'],
                        ['cormStartedDate', 'Started date'], ['cormReceivedDate', 'Received / harvested'],
                        ['cormParentPlantId', 'Parent plant'], ['cormInitialCondition', 'Initial condition'],
                        ['cormRootEmergenceDate', 'First root date'],
                        ['cormGrowthPointDate', 'Growth point date'],
                        ['cormFirstLeafEmergingDate', 'First leaf emerging date'],
                        ['cormFirstLeafOpenedDate', 'First leaf opened date'],
                        ['cormTransferDate', 'Pot-up / transfer date'],
                        ['cormEstablishedDate', 'Established date'],
                        ['cormProgressNotes', 'Progress notes'], ['cormOutcome', 'Outcome'],
                      ].filter(([fieldName]) => selectedPlant[fieldName]).map(([fieldName, label]) => (
                        <div key={fieldName}><dt>{label}</dt><dd>
                          {fieldName === 'cormParentPlantId'
                            ? plants.find((plant) => plant.id === selectedPlant[fieldName])?.name || selectedPlant[fieldName]
                            : selectedPlant[fieldName]}
                        </dd></div>
                      ))}
                    </dl>
                    <div className="corm-phase-summary">
                      <div><strong>Time in current phase</strong><span>
                        {getCormPhaseStartedDate(selectedPlant)
                          ? `${daysBetweenTodayAnd(getCormPhaseStartedDate(selectedPlant))} days`
                          : 'Start date not recorded'}
                      </span></div>
                      <div><strong>Upcoming likely milestone</strong><span>
                        {getNextCormPhase(selectedPlant.cormPhase) || 'No next milestone'}
                      </span></div>
                    </div>
                    {(selectedPlant.cormPhaseHistory || []).length > 0 && (
                      <ol className="corm-milestone-timeline" aria-label="Completed Corm milestones">
                        {selectedPlant.cormPhaseHistory.map((entry) => (
                          <li key={entry.id}>
                            <div><strong>{entry.phase}</strong><time dateTime={entry.date}>{entry.date}</time></div>
                            {entry.note && <p>{entry.note}</p>}
                            {entry.photoUrl && <SafeImage src={entry.photoUrl} alt={`${entry.phase} milestone`} fallback={<span>Photo unavailable</span>} />}
                          </li>
                        ))}
                      </ol>
                    )}
                    {(selectedPlant.cormProgressPhotos || []).length > 0 && (
                      <div className="corm-photo-grid">
                        {selectedPlant.cormProgressPhotos.map((photo) => (
                          <figure key={photo.id}>
                            <SafeImage src={photo.photoUrl} alt={`Corm progress on ${photo.date}`} fallback={<span>Photo unavailable</span>} />
                            <figcaption>{photo.date}{photo.caption ? ` · ${photo.caption}` : ''}</figcaption>
                          </figure>
                        ))}
                      </div>
                    )}
                  </>
                ) : <p className="tracker-empty-state">No corm milestones yet. Add the started date, growth method, medium, and current phase.</p>}
              </section>
            )}
            {shouldShowLecaTracker(selectedPlant) && (
              <section className={`tracker-section-card leca-detail-section${isTrackerCompleted('leca', selectedPlant) ? ' tracker-completed' : ''}`} id="plant-leca">
                <div className="tracker-section-heading">
                  <div>
                    <p className="detail-eyebrow">Current status · {displayValue(selectedPlant.lecaStatus)}</p>
                    <h3>⚗️ LECA Conversion</h3>
                    <p>{selectedPlant.lecaRootStatus || selectedPlant.lecaStressLevel || 'Add root and stress details to track progress.'}</p>
                  </div>
                  <button type="button" onClick={() => openTrackerEditor('leca')}>Update LECA Conversion</button>
                </div>
                {hasLecaTrackerData(selectedPlant) ? (
                  <dl className="detail-list">
                    {[
                      ['lecaStatus', 'Conversion status'], ['lecaConversionStartDate', 'Conversion start date'],
                      ['lecaRootStatus', 'Root status'], ['lecaReservoirSetup', 'Reservoir setup'],
                      ['lecaNutrientStatus', 'Nutrient status'], ['lecaFlushRhythm', 'Flush / rinse rhythm'],
                      ['lecaStressLevel', 'Stress level'], ['lecaNotes', 'Notes'],
                    ].filter(([fieldName]) => selectedPlant[fieldName]).map(([fieldName, label]) => (
                      <div key={fieldName}><dt>{label}</dt><dd>{selectedPlant[fieldName]}</dd></div>
                    ))}
                  </dl>
                ) : <p className="tracker-empty-state">No LECA conversion details yet. Add the status, start date, roots, reservoir, nutrients, and notes.</p>}
              </section>
            )}
          </div>
          <section className="plant-timeline tracker-section-card" id="plant-health" aria-labelledby="plant-timeline-heading">
            <div className="timeline-heading">
              <div>
                <p className="detail-eyebrow">Unified history</p>
                <h3 id="plant-timeline-heading">Plant Health Timeline</h3>
              </div>
              <div className="timeline-heading-actions">
                {timelinePhotoEntries.length >= 2 && (
                  <button type="button" className="secondary-button" onClick={() => {
                    setComparisonPhotoIds({
                      before: comparisonPhotoIds.before || timelinePhotoEntries[0].id,
                      after: comparisonPhotoIds.after || timelinePhotoEntries.at(-1).id,
                    });
                    setShowPhotoComparison(true);
                  }}>
                    Compare photos
                  </button>
                )}
                <button type="button" onClick={() => {
                  setShowTimelineForm((isVisible) => !isVisible);
                  if (!showTimelineForm) {
                    setEditingTimelineEntryId('');
                    setTimelineDraft(emptyTimelineEntry());
                    clearTimelineEntryImageSelection();
                  }
                }}>
                  Add Timeline Entry
                </button>
              </div>
            </div>
            <dl className="timeline-summary">
              <div><dt>Total entries</dt><dd>{timelineSummary.total}</dd></div>
              <div><dt>Photos</dt><dd>{timelineSummary.photos}</dd></div>
              {timelineSummary.firstDate && <div><dt>First recorded</dt><dd>{timelineSummary.firstDate}</dd></div>}
              {timelineSummary.latestDate && <div><dt>Most recent</dt><dd>{timelineSummary.latestDate}</dd></div>}
            </dl>
            {showTimelineForm && (
              <form className="timeline-entry-form" onSubmit={saveManualTimelineEntry}>
                {timelineEntryUploadError && (
                  <p className="form-error-message timeline-form-message" role="alert">{timelineEntryUploadError}</p>
                )}
                {timelineEntrySubmitStatus && (
                  <p className="form-status-message timeline-form-message" role="status">{timelineEntrySubmitStatus}</p>
                )}
                <div className="form-field">
                  <label htmlFor="timeline-entry-type">Entry type</label>
                  <select id="timeline-entry-type" value={timelineDraft.type}
                    onChange={(event) => setTimelineDraft((draft) => ({ ...draft, type: event.target.value }))}>
                    {timelineTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="timeline-entry-date">Date</label>
                  <input id="timeline-entry-date" type="date" required value={timelineDraft.date}
                    onChange={(event) => setTimelineDraft((draft) => ({ ...draft, date: event.target.value }))} />
                </div>
                <div className="form-field">
                  <label htmlFor="timeline-entry-title">Title</label>
                  <input id="timeline-entry-title" required value={timelineDraft.title}
                    onChange={(event) => setTimelineDraft((draft) => ({ ...draft, title: event.target.value }))} />
                </div>
                <div className="form-field timeline-note-field">
                  <label htmlFor="timeline-entry-note">Note (optional)</label>
                  <textarea id="timeline-entry-note" rows="3" value={timelineDraft.note}
                    onChange={(event) => setTimelineDraft((draft) => ({ ...draft, note: event.target.value }))} />
                </div>
                <ImageUploadField id="timeline-entry-photo" className="timeline-photo-field" label="Photo URL (optional)"
                  value={timelineDraft.photoUrl}
                  onChange={(photoUrl) => {
                    clearTimelineEntryImageSelection();
                    setTimelineDraft((draft) => ({ ...draft, photoUrl }));
                  }}
                  onFileSelected={selectTimelineEntryImageFile}
                  selectedFileName={timelineEntryFile?.name || ''}
                  previewUrl={timelineEntryPreviewUrl}
                  disabled={isTimelineEntrySubmitting}
                  message={timelineEntryUploadError}
                  messageType={timelineEntryUploadError ? 'error' : 'status'} />
                <div className="form-actions timeline-form-actions">
                  <button type="submit" disabled={isTimelineEntrySubmitting}>
                    {isTimelineEntrySubmitting ? (timelineEntryFile ? 'Uploading photo...' : 'Saving entry...') : editingTimelineEntryId ? 'Save timeline entry' : 'Add timeline entry'}
                  </button>
                  <button className="secondary-button" type="button" disabled={isTimelineEntrySubmitting}
                    onClick={resetTimelineEntryForm}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
            <div className="timeline-tools">
              <div className="form-field">
                <label htmlFor="timeline-search">Search timeline</label>
                <input id="timeline-search" type="search" value={timelineSearch}
                  placeholder="Search title, note, or type"
                  onChange={(event) => setTimelineSearch(event.target.value)} />
              </div>
              <div className="form-field">
                <label htmlFor="timeline-filter">Filter</label>
                <select id="timeline-filter" value={timelineFilter}
                  onChange={(event) => setTimelineFilter(event.target.value)}>
                  {timelineFilters.map((filter) => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
                </select>
              </div>
              <div className="timeline-sort" role="group" aria-label="Timeline sort order">
                <span>Sort</span>
                <button type="button" aria-pressed={timelineSortOrder === 'newest'}
                  className={timelineSortOrder === 'newest' ? 'timeline-sort-active' : ''}
                  onClick={() => setTimelineSortOrder('newest')}>
                  Newest first
                </button>
                <button type="button" aria-pressed={timelineSortOrder === 'oldest'}
                  className={timelineSortOrder === 'oldest' ? 'timeline-sort-active' : ''}
                  onClick={() => setTimelineSortOrder('oldest')}>
                  Oldest first
                </button>
              </div>
              {hasActiveTimelineFilters && (
                <button type="button" className="secondary-button timeline-reset-button"
                  onClick={() => {
                    setTimelineFilter('all');
                    setTimelineSearch('');
                  }}>
                  Reset
                </button>
              )}
            </div>
            <p className="timeline-count" aria-live="polite">
              {visibleTimelineEntries.length} matching timeline entr{visibleTimelineEntries.length === 1 ? 'y' : 'ies'}
            </p>
            {timelineMonthGroups.length ? (
              <div className="timeline-months">
                {timelineMonthGroups.map(([monthKey, entries]) => (
                  <section className="timeline-month" key={monthKey} aria-labelledby={`timeline-${monthKey}`}>
                    <h4 id={`timeline-${monthKey}`}>{formatTimelineMonth(monthKey)}</h4>
                    <ol className="timeline-list">
                      {entries.map((entry) => {
                        const typeConfig = timelineTypes[entry.type] || timelineTypes.generalNote;
                        return (
                          <li className="timeline-entry" key={entry.id}>
                            <div className="timeline-entry-icon" aria-hidden="true">{typeConfig.icon}</div>
                            <div className="timeline-entry-body">
                              <div className="timeline-entry-heading">
                                <div>
                                  <span className="timeline-type">{typeConfig.label}</span>
                                  <h5>{entry.title}</h5>
                                </div>
                                <time dateTime={entry.date}>{entry.date}</time>
                              </div>
                              {entry.note && <p>{entry.note}</p>}
                              {entry.photoUrl && (
                                <button type="button" className="timeline-photo-button"
                                  onClick={() => setTimelineLightboxPhoto(entry)}
                                  aria-label={`Open larger photo for ${entry.title}`}>
                                  <SafeImage src={entry.photoUrl} alt={`${entry.title} photo`}
                                    fallback={<span>Photo unavailable</span>} />
                                </button>
                              )}
                              <div className="timeline-entry-meta">
                                {timelineSourceLabels[entry.source] && <span>{timelineSourceLabels[entry.source]}</span>}
                                {entry.source === 'manual' ? (
                                  <>
                                    <button type="button" onClick={() => startEditingTimelineEntry(entry)}>Edit</button>
                                    <button type="button" onClick={() => deleteManualTimelineEntry(entry)}>Delete</button>
                                  </>
                                ) : (
                                  <button type="button" onClick={() => openTimelineSource(entry)}>Open source record</button>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                ))}
              </div>
            ) : (
              <p className="activity-empty-message">No matching timeline entries yet.</p>
            )}
          </section>
          <section className="plant-checkins-panel tracker-section-card" id="plant-checkins" aria-labelledby="plant-checkins-heading">
            <div className="plant-checkins-heading">
              <div>
                <h3 id="plant-checkins-heading">Check-ins</h3>
                <p>{selectedPlantReminders.length ? 'Active and recent observations for this plant.' : 'No check-ins for this plant yet.'}</p>
              </div>
              <button type="button" onClick={() => setShowManualReminderForm((isVisible) => !isVisible)}>
                Add reminder
              </button>
            </div>
            {showManualReminderForm && (
              <form className="manual-reminder-form" onSubmit={createManualReminder}>
                <div className="form-field">
                  <label htmlFor="manual-reminder-title">Title</label>
                  <input id="manual-reminder-title" required value={manualReminderDraft.title}
                    onChange={(event) => setManualReminderDraft((draft) => ({ ...draft, title: event.target.value }))} />
                </div>
                <div className="form-field">
                  <label htmlFor="manual-reminder-due">Due date</label>
                  <input id="manual-reminder-due" type="date" value={manualReminderDraft.dueDate}
                    onChange={(event) => setManualReminderDraft((draft) => ({ ...draft, dueDate: event.target.value }))} />
                </div>
                <div className="form-field manual-reminder-note">
                  <label htmlFor="manual-reminder-note">Note (optional)</label>
                  <textarea id="manual-reminder-note" rows="2" value={manualReminderDraft.note}
                    onChange={(event) => setManualReminderDraft((draft) => ({ ...draft, note: event.target.value }))} />
                </div>
                <div className="form-actions">
                  <button type="submit">Save reminder</button>
                  <button className="secondary-button" type="button" onClick={() => setShowManualReminderForm(false)}>Cancel</button>
                </div>
              </form>
            )}
            <div className="reminder-list reminder-list-compact">
              {selectedPlantReminders.length
                ? selectedPlantReminders.map((reminder) => renderReminderCard(reminder, true))
                : <p className="empty-message">Add a reminder when you want to review this plant later.</p>}
            </div>
          </section>
          <section className="photo-log tracker-section-card" id="plant-photos" aria-labelledby="photo-log-heading">
            <h3 id="photo-log-heading">Photo Log</h3>
            <form className="photo-form" onSubmit={addPhotoEntry}>
              {photoEntryUploadError && (
                <p className="form-error-message photo-form-message" role="alert">{photoEntryUploadError}</p>
              )}
              {photoEntrySubmitStatus && (
                <p className="form-status-message photo-form-message" role="status">{photoEntrySubmitStatus}</p>
              )}
              <ImageUploadField id="photo" className="photo-url-field" label="Photo URL" required
                value={newPhotoEntry.photoUrl}
                onChange={(photoUrl) => {
                  clearPhotoEntryImageSelection();
                  setNewPhotoEntry((entry) => ({ ...entry, photoUrl }));
                }}
                onFileSelected={selectPhotoEntryImageFile}
                selectedFileName={photoEntryFile?.name || ''}
                previewUrl={photoEntryPreviewUrl}
                disabled={isPhotoEntrySubmitting}
                message={photoEntryUploadError}
                messageType={photoEntryUploadError ? 'error' : 'status'} />
              <div className="form-field">
                <label htmlFor="photo-date">Date</label>
                <input id="photo-date" type="date" required value={newPhotoEntry.date}
                  onChange={(event) => setNewPhotoEntry((entry) => ({
                    ...entry, date: event.target.value,
                  }))} />
              </div>
              <div className="form-field">
                <label htmlFor="photo-type">Photo type</label>
                <select id="photo-type" value={newPhotoEntry.photoType}
                  onChange={(event) => setNewPhotoEntry((entry) => ({
                    ...entry, photoType: event.target.value,
                  }))}>
                  {photoTypes.map((photoType) => <option key={photoType}>{photoType}</option>)}
                </select>
              </div>
              <div className="form-field photo-caption-field">
                <label htmlFor="photo-caption">Caption or notes (optional)</label>
                <textarea id="photo-caption" rows="3" value={newPhotoEntry.caption}
                  placeholder="What changed since the last photo?"
                  onChange={(event) => setNewPhotoEntry((entry) => ({
                    ...entry, caption: event.target.value,
                  }))} />
              </div>
              <button type="submit" disabled={isPhotoEntrySubmitting}>
                {isPhotoEntrySubmitting ? (photoEntryFile ? 'Uploading photo...' : 'Saving photo...') : 'Add photo'}
              </button>
            </form>
            {(selectedPlant.photoLog || []).length > 0 ? (
              <ol className="photo-list">
                {[...(selectedPlant.photoLog || [])]
                  .sort((firstEntry, secondEntry) => (
                    secondEntry.date.localeCompare(firstEntry.date)
                    || (secondEntry.createdAt || '').localeCompare(firstEntry.createdAt || '')
                  ))
                  .map((entry, entryIndex) => (
                    <li key={entry.id || `${entry.date}-${entry.photoUrl}-${entryIndex}`}>
                      {editingPhotoEntry === entry ? (
                        <form className="photo-edit-form" onSubmit={saveEditedPhotoEntry}>
                          {photoEditUploadError && (
                            <p className="form-error-message photo-form-message" role="alert">{photoEditUploadError}</p>
                          )}
                          {photoEditSubmitStatus && (
                            <p className="form-status-message photo-form-message" role="status">{photoEditSubmitStatus}</p>
                          )}
                          <ImageUploadField id={`edit-photo-${entry.id || entryIndex}`} className="photo-url-field" label="Photo URL" required
                            value={photoEntryDraft.photoUrl}
                            onChange={(photoUrl) => {
                              clearPhotoEditImageSelection();
                              setPhotoEntryDraft((draft) => ({ ...draft, photoUrl }));
                            }}
                            onFileSelected={selectPhotoEditImageFile}
                            selectedFileName={photoEditFile?.name || ''}
                            previewUrl={photoEditPreviewUrl}
                            disabled={isPhotoEditSubmitting}
                            message={photoEditUploadError}
                            messageType={photoEditUploadError ? 'error' : 'status'} />
                          <div className="form-field">
                            <label htmlFor="edit-photo-date">Date</label>
                            <input id="edit-photo-date" type="date" required
                              value={photoEntryDraft.date}
                              onChange={(event) => setPhotoEntryDraft((draft) => ({
                                ...draft, date: event.target.value,
                              }))} />
                          </div>
                          <div className="form-field">
                            <label htmlFor="edit-photo-type">Photo type</label>
                            <select id="edit-photo-type" value={photoEntryDraft.photoType}
                              onChange={(event) => setPhotoEntryDraft((draft) => ({
                                ...draft, photoType: event.target.value,
                              }))}>
                              {photoTypes.map((photoType) => <option key={photoType}>{photoType}</option>)}
                            </select>
                          </div>
                          <div className="form-field photo-caption-field">
                            <label htmlFor="edit-photo-caption">Caption or notes (optional)</label>
                            <textarea id="edit-photo-caption" rows="3"
                              value={photoEntryDraft.caption}
                              onChange={(event) => setPhotoEntryDraft((draft) => ({
                                ...draft, caption: event.target.value,
                              }))} />
                          </div>
                          <div className="photo-entry-actions">
                            <button type="submit" disabled={isPhotoEditSubmitting}>
                              {isPhotoEditSubmitting ? (photoEditFile ? 'Uploading photo...' : 'Saving changes...') : 'Save changes'}
                            </button>
                            <button type="button" disabled={isPhotoEditSubmitting} onClick={cancelEditingPhotoEntry}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <PhotoLogImage key={entry.photoUrl} entry={entry}
                            plantName={selectedPlant.name} />
                          <div className="photo-entry-content">
                            <div className="photo-entry-heading">
                              <strong>{entry.photoType}</strong>
                              <time dateTime={entry.date}>{entry.date}</time>
                            </div>
                            {entry.caption && <p>{entry.caption}</p>}
                            <div className="photo-entry-actions">
                              <button type="button" onClick={() => startEditingPhotoEntry(entry)}>
                                ✏️ Edit
                              </button>
                              <button className="photo-delete-button" type="button"
                                onClick={() => deletePhotoEntry(entry)}>
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="activity-empty-message">No photos logged yet.</p>
            )}
          </section>
          <section className="activity-log tracker-section-card" id="plant-activity" aria-labelledby="activity-log-heading">
            <h3 id="activity-log-heading">Activity Log</h3>
            <form className="activity-form" onSubmit={addLogEntry}>
              <div className="form-field">
                <label htmlFor="activity-type">Activity type</label>
                <select id="activity-type" value={newLogEntry.activityType}
                  onChange={(event) => setNewLogEntry((entry) => ({
                    ...entry, activityType: event.target.value,
                  }))}>
                  {activityTypes.map((activityType) => (
                    <option key={activityType}>{activityType}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="activity-date">Date</label>
                <input id="activity-date" type="date" required value={newLogEntry.date}
                  onChange={(event) => setNewLogEntry((entry) => ({
                    ...entry, date: event.target.value,
                  }))} />
              </div>
              <div className="form-field activity-notes-field">
                <label htmlFor="activity-notes">Notes (optional)</label>
                <textarea id="activity-notes" rows="3" value={newLogEntry.notes}
                  placeholder="Add details such as soil mix, treatment used, or a new location."
                  onChange={(event) => setNewLogEntry((entry) => ({
                    ...entry, notes: event.target.value,
                  }))} />
              </div>
              <button type="submit">Add log entry</button>
            </form>
            {(selectedPlant.activityLog || []).length > 0 ? (
              <ol className="activity-list">
                {[...(selectedPlant.activityLog || [])]
                  .sort((firstEntry, secondEntry) => (
                    secondEntry.date.localeCompare(firstEntry.date)
                    || (secondEntry.createdAt || '').localeCompare(firstEntry.createdAt || '')
                  ))
                  .map((entry, entryIndex) => (
                    <li key={entry.id || `${entry.date}-${entry.activityType}-${entryIndex}`}>
                      {editingLogEntry === entry ? (
                        <form className="activity-edit-form" onSubmit={saveEditedLogEntry}>
                          <div className="form-field">
                            <label htmlFor="edit-activity-type">Activity type</label>
                            <select id="edit-activity-type" value={logEntryDraft.activityType}
                              onChange={(event) => setLogEntryDraft((draft) => ({
                                ...draft, activityType: event.target.value,
                              }))}>
                              {activityTypes.map((activityType) => (
                                <option key={activityType}>{activityType}</option>
                              ))}
                            </select>
                          </div>
                          <div className="form-field">
                            <label htmlFor="edit-activity-date">Date</label>
                            <input id="edit-activity-date" type="date" required
                              value={logEntryDraft.date}
                              onChange={(event) => setLogEntryDraft((draft) => ({
                                ...draft, date: event.target.value,
                              }))} />
                          </div>
                          <div className="form-field activity-notes-field">
                            <label htmlFor="edit-activity-notes">Notes (optional)</label>
                            <textarea id="edit-activity-notes" rows="3"
                              value={logEntryDraft.notes}
                              onChange={(event) => setLogEntryDraft((draft) => ({
                                ...draft, notes: event.target.value,
                              }))} />
                          </div>
                          <div className="activity-edit-actions">
                            <button type="submit">Save changes</button>
                            <button className="activity-cancel-button" type="button"
                              onClick={cancelEditingLogEntry}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="activity-entry-heading">
                            <strong>{entry.activityType}</strong>
                            <time dateTime={entry.date}>{entry.date}</time>
                          </div>
                          {entry.notes && <p>{entry.notes}</p>}
                          <div className="activity-entry-actions">
                            <button type="button" onClick={() => startEditingLogEntry(entry)}>
                              ✏️ Edit
                            </button>
                            <button className="activity-delete-button" type="button"
                              onClick={() => deleteLogEntry(entry)}>
                              🗑️ Delete
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="activity-empty-message">No activity logged yet.</p>
            )}
          </section>
          {trackerEditor && (
            <div className="tracker-modal-backdrop" role="presentation" onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeTrackerEditor();
            }}>
              <section className="tracker-modal" role="dialog" aria-modal="true" aria-labelledby="tracker-editor-heading">
                <div className="tracker-modal-heading">
                  <div>
                    <p className="detail-eyebrow">Focused update</p>
                    <h3 id="tracker-editor-heading">
                      {trackerEditor === 'tc' ? 'Update Tissue Culture Acclimation'
                        : trackerEditor === 'corm' ? 'Update Corm Tracker' : 'Update LECA Conversion'}
                    </h3>
                  </div>
                  <button type="button" className="secondary-button" onClick={closeTrackerEditor}>Close</button>
                </div>
                <form onSubmit={saveTrackerUpdate}>
                  {trackerEditor === 'leca' && (
                    <label className="tracker-modal-checkbox">
                      <input type="checkbox" checked={Boolean(trackerDraft.trackLecaConversion)}
                        onChange={(event) => setTrackerDraft((draft) => ({ ...draft, trackLecaConversion: event.target.checked }))} />
                      Track LECA conversion
                    </label>
                  )}
                  <div className="tracker-modal-grid">
                    {(trackerEditor === 'tc'
                      ? [
                        ['tcStage', 'TC stage', 'select'], ['tcSetup', 'Current acclimation setup', 'select'],
                        ['tcHumidityLevel', 'Humidity level', 'select'], ['tcDeflaskDate', 'Deflask date', 'date'],
                        ['tcAcclimationStartDate', 'Acclimation start date', 'date'],
                        ['tcAcclimationEndDate', 'Acclimation end date', 'date'], ['tcNotes', 'Acclimation notes', 'textarea'],
                      ]
                      : trackerEditor === 'corm'
                        ? [
                          ['cormPhase', 'Current phase', 'select'], ['cormPhaseDate', 'Phase date', 'date'],
                          ['cormPhaseNote', 'Phase note', 'textarea'],
                          ['cormGrowthMethod', 'Growth Method', 'select'], ['cormCustomGrowthMethod', 'Custom growth method', 'text'],
                          ['cormStartedDate', 'Started date', 'date'], ['cormReceivedDate', 'Received / harvested date', 'date'],
                          ['cormParentPlantId', 'Parent plant', 'select'], ['cormInitialCondition', 'Initial condition', 'select'],
                          ['cormMedium', 'Medium', 'text'], ['cormRootEmergenceDate', 'First root date', 'date'],
                          ['cormGrowthPointDate', 'Growth point date', 'date'],
                          ['cormFirstLeafEmergingDate', 'First leaf emerging date', 'date'],
                          ['cormFirstLeafOpenedDate', 'First leaf opened date', 'date'],
                          ['cormTransferDate', 'Pot-up / transfer date', 'date'],
                          ['cormEstablishedDate', 'Established date', 'date'],
                          ['cormOutcome', 'Outcome', 'select'], ['cormProgressNotes', 'Progress notes', 'textarea'],
                        ]
                        : [
                        ['lecaStatus', 'LECA conversion status', 'select'], ['lecaRootStatus', 'Root status', 'select'],
                        ['lecaReservoirSetup', 'Reservoir setup', 'select'], ['lecaNutrientStatus', 'Nutrient status', 'select'],
                        ['lecaFlushRhythm', 'Flush / rinse rhythm', 'select'], ['lecaStressLevel', 'Stress level', 'select'],
                        ['lecaConversionStartDate', 'Conversion start date', 'date'], ['lecaNotes', 'Conversion notes', 'textarea'],
                      ]).filter(([fieldName]) => (
                        fieldName !== 'cormCustomGrowthMethod' || trackerDraft.cormGrowthMethod === 'Other'
                      )).map(([fieldName, label, fieldType]) => (
                      <div className={`form-field${fieldType === 'textarea' ? ' tracker-modal-wide' : ''}`} key={fieldName}>
                        <label htmlFor={`tracker-${fieldName}`}>{label}</label>
                        {fieldType === 'select' ? (
                          <select id={`tracker-${fieldName}`} value={trackerDraft[fieldName] || ''}
                            onChange={(event) => setTrackerDraft((draft) => ({ ...draft, [fieldName]: event.target.value }))}>
                            <option value="">Not set</option>
                            {(trackerSelectOptions(fieldName, plants) || dropdownOptions[fieldName] || []).map((option) => (
                              typeof option === 'object'
                                ? <option key={option.value} value={option.value}>{option.label}</option>
                                : <option key={option}>{option}</option>
                            ))}
                          </select>
                        ) : fieldType === 'textarea' ? (
                          <textarea id={`tracker-${fieldName}`} rows="4" value={trackerDraft[fieldName] || ''}
                            onChange={(event) => setTrackerDraft((draft) => ({ ...draft, [fieldName]: event.target.value }))} />
                        ) : fieldType === 'text' ? (
                          <input id={`tracker-${fieldName}`} type="text" value={trackerDraft[fieldName] || ''}
                            onChange={(event) => setTrackerDraft((draft) => ({ ...draft, [fieldName]: event.target.value }))} />
                        ) : (
                          <input id={`tracker-${fieldName}`} type="date" value={trackerDraft[fieldName] || ''}
                            max={fieldName === 'cormPhaseDate' ? todayDate() : undefined}
                            required={fieldName === 'cormPhaseDate' && trackerDraft.cormPhase !== (selectedPlant.cormPhase || '')}
                            onChange={(event) => setTrackerDraft((draft) => ({ ...draft, [fieldName]: event.target.value }))} />
                        )}
                      </div>
                    ))}
                  </div>
                  {trackerEditor === 'corm' && (
                    <ImageUploadField id="corm-progress-photo" value=""
                      onChange={() => {}}
                      onFileSelected={(file) => {
                        if (trackerPhotoPreviewUrl) URL.revokeObjectURL(trackerPhotoPreviewUrl);
                        setTrackerPhotoFile(file);
                        setTrackerPhotoPreviewUrl(file ? URL.createObjectURL(file) : '');
                      }}
                      selectedFileName={trackerPhotoFile?.name || ''}
                      previewUrl={trackerPhotoPreviewUrl}
                      label="Add progress photo" />
                  )}
                  <div className="form-actions">
                    <button type="submit">Save update</button>
                    <button type="button" className="secondary-button" onClick={closeTrackerEditor}>Cancel</button>
                  </div>
                </form>
              </section>
            </div>
          )}
          {timelineLightboxPhoto && (
            <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="Timeline photo preview">
              <div className="image-lightbox-panel">
                <button type="button" className="image-lightbox-close"
                  onClick={() => setTimelineLightboxPhoto(null)}
                  aria-label="Close photo preview">
                  Close
                </button>
                <SafeImage src={timelineLightboxPhoto.photoUrl} alt={`${timelineLightboxPhoto.title} larger view`}
                  fallback={<p>Photo unavailable.</p>} />
                <div>
                  <strong>{timelineLightboxPhoto.title}</strong>
                  <span>{timelineLightboxPhoto.date}</span>
                  {timelineLightboxPhoto.note && <p>{timelineLightboxPhoto.note}</p>}
                </div>
              </div>
            </div>
          )}
          {profilePhotoLightboxOpen && selectedPlant.imageUrl?.trim() && (
            <div className="image-lightbox profile-photo-lightbox" role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setProfilePhotoLightboxOpen(false);
              }}>
              <div className="image-lightbox-panel" role="dialog" aria-modal="true"
                aria-labelledby="profile-photo-lightbox-heading">
                <button type="button" className="image-lightbox-close"
                  onClick={() => setProfilePhotoLightboxOpen(false)} autoFocus>
                  Close
                </button>
                <h3 id="profile-photo-lightbox-heading">{selectedPlant.name}</h3>
                <SafeImage src={selectedPlant.imageUrl} alt={`${selectedPlant.name} plant, enlarged`}
                  fallback={<div className="image-preview-fallback">Photo unavailable</div>} />
              </div>
            </div>
          )}
          {showPhotoComparison && (
            <div className="photo-comparison" role="dialog" aria-modal="true" aria-labelledby="photo-comparison-heading">
              <div className="photo-comparison-panel">
                <div className="photo-comparison-heading">
                  <div>
                    <p className="detail-eyebrow">Progress photos</p>
                    <h3 id="photo-comparison-heading">Compare Photos</h3>
                  </div>
                  <button type="button" className="secondary-button"
                    onClick={() => setShowPhotoComparison(false)}>
                    Close
                  </button>
                </div>
                <div className="photo-comparison-selectors">
                  <div className="form-field">
                    <label htmlFor="comparison-before">Before photo</label>
                    <select id="comparison-before" value={comparisonPhotoIds.before}
                      onChange={(event) => setComparisonPhotoIds((current) => ({ ...current, before: event.target.value }))}>
                      {timelinePhotoEntries.map((entry) => (
                        <option key={entry.id} value={entry.id}>{entry.date} · {entry.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="comparison-after">After photo</label>
                    <select id="comparison-after" value={comparisonPhotoIds.after}
                      onChange={(event) => setComparisonPhotoIds((current) => ({ ...current, after: event.target.value }))}>
                      {timelinePhotoEntries.map((entry) => (
                        <option key={entry.id} value={entry.id}>{entry.date} · {entry.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedComparisonPhotos.before && selectedComparisonPhotos.after && (
                  <>
                    <p className="comparison-days">
                      {comparisonDaysBetween} day{comparisonDaysBetween === 1 ? '' : 's'} between photos
                    </p>
                    <div className="photo-comparison-grid">
                      {[
                        ['Before', selectedComparisonPhotos.before],
                        ['After', selectedComparisonPhotos.after],
                      ].map(([label, entry]) => (
                        <figure className="comparison-photo" key={`${label}-${entry.id}`}>
                          <figcaption>
                            <strong>{label}</strong>
                            <span>{entry.date}</span>
                          </figcaption>
                          <SafeImage src={entry.photoUrl} alt={`${label}: ${entry.title}`}
                            fallback={<div className="image-preview-fallback">Photo unavailable</div>} />
                          {(entry.note || entry.title) && <p>{entry.note || entry.title}</p>}
                        </figure>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </article>
        ) : showForm || isEditing ? (
        <form className="plant-form" onSubmit={handleSubmit} ref={plantFormRef}>
          <h2>{isEditing ? `Edit ${selectedPlant.name}` : 'Add New Plant'}</h2>
          {!isEditing && addPlantMessage && (
            <p className="form-success-message" role="status">{addPlantMessage}</p>
          )}
          {plantImageUploadError && (
            <p className="form-error-message" role="alert">{plantImageUploadError}</p>
          )}
          {plantSubmitStatus && (
            <p className="form-status-message" role="status">{plantSubmitStatus}</p>
          )}
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="plant-origin">Plant origin</label>
              <select id="plant-origin" name="origin" value={newPlant.origin} onChange={handleInputChange}>
                {plantOriginOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
              <small>Origin is permanent history and stays separate from the current stage.</small>
            </div>
            <div className="form-field">
              <label htmlFor="plant-lifecycleStage">Current lifecycle stage</label>
              <select id="plant-lifecycleStage" name="lifecycleStage" value={newPlant.lifecycleStage} onChange={handleInputChange}>
                {lifecycleStageOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            {[
              ['name', 'Plant name'],
              ['medium', 'Growing medium'], ['potSize', 'Pot size'],
              ['watering', 'Watering notes'], ['propagationStatus', 'Propagation'],
              ['purchasePrice', 'Purchase price'],
            ].map(([fieldName, label]) => (
              <div className="form-field" key={fieldName}>
                <label htmlFor={`plant-${fieldName}`}>{label}</label>
                <input id={`plant-${fieldName}`} name={fieldName} value={newPlant[fieldName]}
                  type={fieldName === 'imageUrl' ? 'url' : 'text'}
                  placeholder={fieldName === 'imageUrl' ? 'https://example.com/plant.jpg' : undefined}
                  onChange={handleInputChange} required={fieldName === 'name'} />
              </div>
            ))}

            <ImageUploadField id="plant-image" value={newPlant.imageUrl}
              onChange={(imageUrl) => {
                clearPlantImageSelection();
                setNewPlant((plant) => ({ ...plant, imageUrl }));
              }}
              onFileSelected={selectPlantImageFile}
              selectedFileName={plantImageFile?.name || ''}
              previewUrl={plantImagePreviewUrl}
              disabled={isPlantSubmitting}
              message={plantImageUploadError}
              messageType={plantImageUploadError ? 'error' : 'status'} />

            {[
              ['genus', 'Genus'], ['type', 'Type / category'], ['source', 'Source'], ['status', 'Status'],
              ['location', 'Location'], ['lightNeeds', 'Light level'],
              ['soilMix', 'Soil mix / substrate mix'], ['wateringRhythm', 'Watering rhythm'],
              ['moisturePreference', 'Moisture preference'], ['careDifficulty', 'Care difficulty'],
            ].map(([fieldName, label]) => (
              fieldName === 'soilMix' ? (
                <div className="form-field" key={fieldName}>
                  <label htmlFor="plant-soilMix">Soil mix / substrate mix</label>
                  <select id="plant-soilMix" value={getSoilMixSelectValue(newPlant.soilMix)}
                    onChange={handleSoilMixSelectChange}>
                    <option value="">Not selected</option>
                    {soilMixOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                    <option value="__custom__">Custom / Other</option>
                  </select>
                  {getSoilMixSelectValue(newPlant.soilMix) === '__custom__' && (
                    <input
                      type="text"
                      aria-label="Custom soil mix"
                      placeholder="Enter custom soil mix"
                      value={newPlant.soilMix}
                      onChange={handleSoilMixCustomChange}
                    />
                  )}
                </div>
              ) : (
                <div className="form-field" key={fieldName}>
                  <label htmlFor={`plant-${fieldName}`}>{label}</label>
                  <select id={`plant-${fieldName}`} name={fieldName} value={newPlant[fieldName]}
                    onChange={handleInputChange}>
                    <option value="">
                      {careRhythmFields.includes(fieldName) ? 'Not set' : `Select ${label.toLowerCase()}`}
                    </option>
                    {dropdownOptions[fieldName].map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <div className="new-option-row">
                    <input
                      type="text"
                      aria-label={`New ${label.toLowerCase()} option`}
                      placeholder="Add new option"
                      value={newOptionText[fieldName]}
                      onChange={(event) => setNewOptionText((currentText) => ({
                        ...currentText,
                        [fieldName]: event.target.value,
                      }))}
                    />
                    <button type="button" onClick={() => addDropdownOption(fieldName)}>Add option</button>
                  </div>
                </div>
              )
            ))}

            <div className="form-field">
              <label htmlFor="plant-attention">Attention</label>
              <select id="plant-attention" name="attention" value={newPlant.attention} onChange={handleInputChange}>
                {attentionOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="plant-thirstLevel">Thirst level</label>
              <select id="plant-thirstLevel" name="thirstLevel" value={newPlant.thirstLevel}
                onChange={handleInputChange}>
                <option value="">Not set</option>
                {thirstLevelOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="plant-wishlistStatus">Collection</label>
              <input id="plant-wishlistStatus" name="wishlistStatus" value={newPlant.wishlistStatus}
                onChange={handleInputChange} />
            </div>
            {[
              ['lastWatered', 'Last watered date'],
              ['repotDate', 'Repotted date'],
              ['acquiredDate', 'Acquired date'],
              ['pestQuarantineStartDate', 'Pest quarantine start date'],
              ['pestQuarantineEndDate', 'Pest quarantine end date'],
              ['doNotTouchUntil', 'Do not touch until'],
            ].map(([fieldName, label]) => (
              <div className="form-field" key={fieldName}>
                <label htmlFor={`plant-${fieldName}`}>{label}</label>
                <input id={`plant-${fieldName}`} name={fieldName} type="date" value={newPlant[fieldName]}
                  onChange={handleInputChange} />
              </div>
            ))}
            {[
              ['careNote', 'Care notes'], ['pestNotes', 'Pest notes'], ['growthNotes', 'Growth notes'],
            ].map(([fieldName, label]) => (
              <div className="form-field form-field-wide" key={fieldName}>
                <label htmlFor={`plant-${fieldName}`}>{label}</label>
                <textarea id={`plant-${fieldName}`} name={fieldName} value={newPlant[fieldName]}
                  onChange={handleInputChange} rows="3" />
              </div>
            ))}
            {isTissueCulture(newPlant) && (
              <fieldset className="tc-form-section">
                <legend>Tissue Culture Acclimation</legend>
                <p>Optional details for tracking this plant from arrival through ambient conditions.</p>
                <div className="tc-form-grid">
                  {[
                    ['tcStage', 'TC stage'], ['tcSetup', 'Current acclimation setup'],
                    ['tcHumidityLevel', 'Humidity level'],
                  ].map(([fieldName, label]) => (
                    <div className="form-field" key={fieldName}>
                      <label htmlFor={`plant-${fieldName}`}>{label}</label>
                      <select id={`plant-${fieldName}`} name={fieldName} value={newPlant[fieldName]}
                        onChange={handleInputChange}>
                        <option value="">Not set</option>
                        {dropdownOptions[fieldName].map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <div className="new-option-row">
                        <input type="text" aria-label={`New ${label.toLowerCase()} option`}
                          placeholder="Add new option" value={newOptionText[fieldName]}
                          onChange={(event) => setNewOptionText((currentText) => ({
                            ...currentText, [fieldName]: event.target.value,
                          }))} />
                        <button type="button" onClick={() => addDropdownOption(fieldName)}>Add option</button>
                      </div>
                    </div>
                  ))}
                  {[
                    ['tcDeflaskDate', 'Deflask date'],
                    ['tcAcclimationStartDate', 'Acclimation start date'],
                    ['tcAcclimationEndDate', 'Acclimation end date'],
                  ].map(([fieldName, label]) => (
                    <div className="form-field" key={fieldName}>
                      <label htmlFor={`plant-${fieldName}`}>{label}</label>
                      <input id={`plant-${fieldName}`} name={fieldName} type="date"
                        value={newPlant[fieldName]} onChange={handleInputChange} />
                    </div>
                  ))}
                  <div className="form-field form-field-wide">
                    <label htmlFor="plant-tcNotes">TC acclimation notes</label>
                    <textarea id="plant-tcNotes" name="tcNotes" value={newPlant.tcNotes}
                      onChange={handleInputChange} rows="3" />
                  </div>
                </div>
              </fieldset>
            )}
            <div className="form-field form-field-wide tracker-toggle">
              <label htmlFor="plant-trackLecaConversion">
                <input id="plant-trackLecaConversion" name="trackLecaConversion" type="checkbox"
                  checked={Boolean(newPlant.trackLecaConversion)} onChange={handleInputChange} />
                Track LECA conversion
              </label>
              <small>Turn this on for a planned conversion or any semi-hydro setup.</small>
            </div>
            {shouldShowLecaTracker(newPlant) && (
              <fieldset className="tc-form-section leca-form-section">
                <legend>LECA Conversion</legend>
                <p>Optional details for transition progress, roots, reservoir habits, and outcomes.</p>
                <div className="tc-form-grid">
                  {[
                    ['lecaStatus', 'LECA conversion status'], ['lecaRootStatus', 'Root status'],
                    ['lecaReservoirSetup', 'Reservoir setup'], ['lecaNutrientStatus', 'Nutrient status'],
                    ['lecaFlushRhythm', 'Flush / rinse rhythm'], ['lecaStressLevel', 'Stress level'],
                  ].map(([fieldName, label]) => (
                    <div className="form-field" key={fieldName}>
                      <label htmlFor={`plant-${fieldName}`}>{label}</label>
                      <select id={`plant-${fieldName}`} name={fieldName} value={newPlant[fieldName]} onChange={handleInputChange}>
                        <option value="">Not set</option>
                        {dropdownOptions[fieldName].map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                      <div className="new-option-row">
                        <input type="text" aria-label={`New ${label.toLowerCase()} option`} placeholder="Add new option"
                          value={newOptionText[fieldName] || ''} onChange={(event) => setNewOptionText((currentText) => ({ ...currentText, [fieldName]: event.target.value }))} />
                        <button type="button" onClick={() => addDropdownOption(fieldName)}>Add option</button>
                      </div>
                    </div>
                  ))}
                  <div className="form-field">
                    <label htmlFor="plant-lecaConversionStartDate">Conversion start date</label>
                    <input id="plant-lecaConversionStartDate" name="lecaConversionStartDate" type="date"
                      value={newPlant.lecaConversionStartDate} onChange={handleInputChange} />
                  </div>
                  <div className="form-field form-field-wide">
                    <label htmlFor="plant-lecaNotes">LECA conversion notes</label>
                    <textarea id="plant-lecaNotes" name="lecaNotes" value={newPlant.lecaNotes} onChange={handleInputChange} rows="3" />
                  </div>
                </div>
              </fieldset>
            )}
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isPlantSubmitting}>
              {isPlantSubmitting ? (plantImageFile ? 'Uploading photo...' : 'Saving plant...') : (isEditing ? 'Save changes' : 'Add Plant & Close')}
            </button>
            {!isEditing && (
              <button className="add-another-button" type="submit" value="add-another" disabled={isPlantSubmitting}>
                {isPlantSubmitting ? 'Saving plant...' : 'Save & Add Another'}
              </button>
            )}
            <button className="secondary-button" type="button" onClick={cancelForm} disabled={isPlantSubmitting}>Cancel</button>
          </div>
        </form>
        ) : (
        appView === 'dashboard' ? (/* oxlint-disable-next-line no-constant-condition */ false ? (
        <section className="dashboard-home" aria-labelledby="dashboard-heading">
          <div className="dashboard-heading">
            <div>
              <p className="detail-eyebrow">Collection overview</p>
              <h2 id="dashboard-heading">Dashboard</h2>
              <p>Your collection, care tasks, and insights at a glance.</p>
            </div>
          </div>
          <section className="dashboard-section dashboard-quick-actions" aria-labelledby="quick-actions-heading">
            <div className="dashboard-section-heading">
              <h3 id="quick-actions-heading">Quick Actions</h3>
              <p>Jump straight to the things you use most.</p>
            </div>
            <div className="dashboard-action-buttons">
              <button className="dashboard-add-button" type="button" onClick={() => {
                setAddPlantMessage('');
                setNewPlant(emptyPlant);
                setPlantFormBaseline(JSON.stringify(emptyPlant));
                setSoilMixIsCustom(false);
                clearPlantImageSelection();
                setShowForm(true);
              }}>+ Add New Plant</button>
              <button className="secondary-button" type="button" onClick={() => openPlantList()}>
                View Plant List
              </button>
              <button className="secondary-button" type="button" onClick={() => openPlantSpaces()}>
                Plant Spaces
              </button>
              <button className="secondary-button" type="button" onClick={openReminders}>
                Today&apos;s Check-ins
              </button>
              <button className="secondary-button" type="button" onClick={() => openQuickNote()}>
                + New Journal Entry
              </button>
              <button className="secondary-button" type="button" onClick={() => setAppView('quick-notes')}>
                Plant Journal{unprocessedQuickNotes.length ? ` (${unprocessedQuickNotes.length})` : ''}
              </button>
              <button className="secondary-button" type="button" onClick={openSettings}>
                Settings / Tools
              </button>
            </div>
          </section>
          <section className="dashboard-section" aria-labelledby="check-in-metrics-heading">
            <div className="dashboard-section-heading">
              <h3 id="check-in-metrics-heading">Check-ins</h3>
              <p>Observation reminders due now and coming up.</p>
            </div>
            <div className="dashboard-metrics">
              {[
                ['Due now', dueNowReminders.length],
                ['Overdue', overdueReminders.length],
                ['Upcoming this week', thisWeekReminders.length],
              ].map(([label, count]) => (
                <button className="dashboard-metric-card" type="button" key={label} onClick={openReminders}>
                  <strong>{count}</strong><span>{label}</span><small>Open check-ins →</small>
                </button>
              ))}
            </div>
          </section>
          <section className="dashboard-section dashboard-checkins-panel" aria-labelledby="today-checkins-heading">
            <div className="dashboard-section-heading">
              <h3 id="today-checkins-heading">Today&apos;s Check-ins</h3>
              <p>{dueNowReminders.length ? 'Sorted with overdue items first.' : 'Nothing due right now.'}</p>
            </div>
            <button className="today-checkins-button" type="button" onClick={openReminders}>
              {dueNowReminders.slice(0, 4).map((reminder) => {
                const plant = reminderPlantById.get(reminder.plantId);
                return (
                  <span className="today-checkin-row" key={reminder.id}>
                    <strong>{reminder.title}</strong>
                    <small>{plant?.name || 'Plant not found'} · {formatReminderTiming(reminder.dueDate)}</small>
                  </span>
                );
              })}
              {!dueNowReminders.length && <span className="today-checkin-row"><strong>No due check-ins</strong><small>Open upcoming reminders</small></span>}
            </button>
          </section>
          {[
            ['key-metrics-heading', 'Key Metrics', 'A simple snapshot of your collection.', keyMetrics],
            ['care-priorities-heading', 'Care Priorities', 'Plants that may need your attention next.', carePriorityMetrics],
            ['quarantine-heading', 'Quarantine / New Plants', 'Keep arrivals and isolated plants easy to track.', quarantineMetrics],
            ['tc-metrics-heading', 'Tissue Culture Acclimation', 'Follow tissue cultures through acclimation.', tcMetrics],
            ['leca-metrics-heading', 'LECA Conversion', 'Track transitions, stability, and recovery.', lecaMetrics],
          ].map(([headingId, title, description, metrics]) => (
            <section className="dashboard-section" aria-labelledby={headingId} key={headingId}>
              <div className="dashboard-section-heading">
                <h3 id={headingId}>{title}</h3>
                <p>{description}</p>
              </div>
              <div className="dashboard-metrics">
                {metrics.map((metric) => (
                  <button className="dashboard-metric-card" type="button" key={metric.label}
                    onClick={() => openPlantList(metric)}>
                    <strong>{metric.count}</strong>
                    <span>{metric.label}</span>
                    <small>View plants →</small>
                  </button>
                ))}
              </div>
            </section>
          ))}
          <section className="dashboard-section" aria-labelledby="wishlist-metrics-heading">
            <div className="dashboard-section-heading">
              <h3 id="wishlist-metrics-heading">Wishlist / Purchases</h3>
              <p>Ideas, orders, and plants on their way.</p>
            </div>
            <div className="dashboard-metrics">
              {wishlistMetrics.map((metric) => (
                <button className="dashboard-metric-card" type="button" key={metric.label}
                  onClick={() => openWishlist(metric)}>
                  <strong>{metric.count}</strong><span>{metric.label}</span><small>View purchases →</small>
                </button>
              ))}
            </div>
          </section>
          <section className="dashboard-section" aria-labelledby="garden-metrics-heading">
            <div className="dashboard-section-heading">
              <h3 id="garden-metrics-heading">Garden Beds</h3>
              <p>Outdoor crops, harvest readiness, and pest notes.</p>
            </div>
            <div className="dashboard-metrics">
              {gardenMetrics.map((metric) => (
                <button className="dashboard-metric-card" type="button" key={metric.label}
                  onClick={() => openGarden(metric.filter)}>
                  <strong>{metric.count}</strong><span>{metric.label}</span><small>View garden →</small>
                </button>
              ))}
            </div>
          </section>
          <section className="dashboard-section" aria-labelledby="collection-breakdown-heading">
            <div className="dashboard-section-heading">
              <p className="detail-eyebrow">Plant insights</p>
              <h3 id="collection-breakdown-heading">Collection Breakdown</h3>
              <p>Select a legend item to see those plants.</p>
            </div>
            <div className="dashboard-charts" aria-label="Collection breakdown charts">
            {dashboardCharts.map((chart) => {
              const total = chart.rows.reduce((sum, row) => sum + row.count, 0);
              const coloredRows = chart.rows.map((row, index) => ({
                ...row,
                color: chartColors[index % chartColors.length],
              }));

              return (
                <section className="dashboard-chart" key={chart.title}>
                  <div className="dashboard-chart-heading">
                    <h4>{chart.title}</h4>
                    <span>{chart.description}</span>
                  </div>
                  {coloredRows.length ? (
                    <div className="dashboard-chart-content">
                      <div className="dashboard-donut"
                        style={{ background: getDonutBackground(coloredRows) }}
                        role="img" aria-label={`${chart.title}: ${total} plants total`}>
                        <span><strong>{total}</strong>plants</span>
                      </div>
                      <div className="dashboard-chart-rows">
                        {coloredRows.map((row) => {
                      const filterValue = row.label === 'Not set' ? missingFilterValue : row.label;
                      const chartTarget = row.lifecycle
                        ? { lifecycle: row.lifecycle }
                        : { lifecycle: 'active', filter: [chart.fieldName, filterValue] };

                      if (row.isOther) {
                        return (
                          <div className="dashboard-chart-row dashboard-chart-row-static"
                            key={row.label} title="Several smaller categories combined">
                            <span className="dashboard-chart-key"
                              style={{ backgroundColor: row.color }} aria-hidden="true" />
                            <span className="dashboard-chart-label">{row.label}</span>
                            <span className="dashboard-chart-count">{row.count}</span>
                          </div>
                        );
                      }

                      return (
                        <button className="dashboard-chart-row" type="button"
                          key={row.label} onClick={() => openPlantList(chartTarget)}
                          aria-label={`View ${row.count} ${row.label} plants`}>
                          <span className="dashboard-chart-key"
                            style={{ backgroundColor: row.color }} aria-hidden="true" />
                          <span className="dashboard-chart-label">{row.label}</span>
                          <span className="dashboard-chart-count">{row.count}</span>
                        </button>
                      );
                        })}
                      </div>
                    </div>
                  ) : <p className="dashboard-chart-empty">No active plant data yet.</p>}
                </section>
              );
            })}
            </div>
          </section>
        </section>
        ) : renderDashboardHome()) : appView === 'quick-notes' ? (
        <section className="quick-notes-view" aria-labelledby="quick-notes-heading">
          <div className="section-heading">
            <div>
              <p className="detail-eyebrow">Low-friction capture</p>
              <h2 id="quick-notes-heading">Plant Journal</h2>
              <p>{unprocessedQuickNotes.length} unfiled entr{unprocessedQuickNotes.length === 1 ? 'y' : 'ies'}</p>
            </div>
            <button type="button" onClick={() => openQuickNote()}>+ New Journal Entry</button>
          </div>
          {quickNoteMessage && <p className="quick-note-message" role="status">{quickNoteMessage}</p>}
          <div className="quick-note-list">
            {unprocessedQuickNotes.length ? unprocessedQuickNotes.map((note) => {
              const plant = plants.find((item) => item.id === note.plantId);
              return (
                <article className="quick-note-card" key={note.id}>
                  <div className="quick-note-card-heading">
                    <div>
                      <time dateTime={note.observedAt}>{new Date(note.observedAt).toLocaleString()}</time>
                      <strong>{plant?.name || 'General journal entry'}</strong>
                    </div>
                    <span>Unfiled</span>
                  </div>
                  <p>{note.text}</p>
                  {note.photoUrl && <SafeImage src={note.photoUrl} alt="Journal entry attachment" fallback={<span>Photo unavailable</span>} />}
                  {!plant && (
                    <div className="form-field">
                      <label htmlFor={`quick-note-plant-${note.id}`}>Associate plant to convert</label>
                      <select id={`quick-note-plant-${note.id}`} value={note.plantId}
                        onChange={(event) => saveQuickNotes(quickNotes.map((item) => item.id === note.id
                          ? { ...item, plantId: event.target.value } : item))}>
                        <option value="">No plant</option>
                        {plants.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="quick-note-actions">
                    {quickNoteDestinations.map(([destination, label]) => (
                      <button type="button" key={destination} className={destination === 'general' ? 'secondary-button' : ''}
                        onClick={() => startQuickNoteConversion(note, destination)}>{label}</button>
                    ))}
                    <button type="button" className="secondary-button" onClick={() => fileQuickNote(note)}>File Entry</button>
                    <button type="button" className="delete-plant-button" onClick={() => deleteQuickNote(note)}>Delete</button>
                  </div>
                </article>
              );
            }) : <p className="empty-message">No unfiled entries. New journal observations will stay here until you file them.</p>}
          </div>
          <details className="filed-journal-entries">
            <summary>Filed Entries ({filedQuickNotes.length})</summary>
            {filedQuickNotes.length ? (
              <div className="quick-note-list">
                {[...filedQuickNotes].reverse().map((note) => (
                  <article className="quick-note-card quick-note-card-filed" key={note.id}>
                    <div className="quick-note-card-heading">
                      <div>
                        <time dateTime={note.observedAt}>{new Date(note.observedAt).toLocaleString()}</time>
                        <strong>{plants.find((plant) => plant.id === note.plantId)?.name || 'General journal entry'}</strong>
                      </div>
                      <span>Filed</span>
                    </div>
                    <p>{note.text}</p>
                    {note.photoUrl && <SafeImage src={note.photoUrl} alt="Filed journal entry attachment" fallback={<span>Photo unavailable</span>} />}
                    <small>Filed as: {note.filedAs || 'Filed entry'}</small>
                  </article>
                ))}
              </div>
            ) : <p className="empty-message">No filed entries yet.</p>}
          </details>
        </section>
        ) : appView === 'reminders' ? (
        <section className="reminders-view" aria-labelledby="reminders-heading">
          <div className="section-heading">
            <div>
              <p className="detail-eyebrow">Observations</p>
              <h2 id="reminders-heading" className="section-title">Check-ins</h2>
              <p>Review time-sensitive plant stages without changing plant status automatically.</p>
            </div>
          </div>
          {renderReminderGroup('Due now', dueNowReminders, 'No check-ins due right now.')}
          {renderReminderGroup('Upcoming', upcomingReminders, 'No upcoming check-ins yet.')}
          {renderReminderGroup('No date yet', noDateReminders, 'No undated check-ins.')}
          {renderReminderGroup('Recently completed', recentlyCompletedReminders, 'No completed check-ins yet.')}
        </section>
        ) : appView === 'garden' ? (
          <Garden key={JSON.stringify(gardenFilter)} beds={gardenBeds} onChange={setGardenBeds}
            initialFilter={gardenFilter} onDirtyChange={setGardenFormDirty} />
        ) : appView === 'plant-spaces' ? (
          <PlantSpaces
            spaces={plantSpaces}
            plants={plants}
            reminders={reminders}
            dropdownOptions={dropdownOptions}
            focusSpaceId={focusedPlantSpace.spaceId}
            focusPlantId={focusedPlantSpace.plantId}
            onChange={savePlantSpaces}
            onPlantsChange={(nextPlants) => savePlants(nextPlants)}
            onOpenPlant={openPlantDetails}
            onFocusHandled={() => setFocusedPlantSpace((current) => ({ ...current, plantId: '' }))}
          />
        ) : appView === 'resources' ? (
          <Resources
            selectedResourceId={selectedResourceId}
            selectedSoilMixRecipeId={selectedSoilMixRecipeId}
            returnLabel={resourceReturnPlantId ? 'Back to Plant' : ''}
            onOpenResource={setSelectedResourceId}
            onBackToResources={() => setSelectedResourceId('')}
            onBackToPlant={returnToPlantFromResource}
          />
        ) : appView === 'wishlist' ? (
        <section className="wishlist-view" aria-labelledby="wishlist-heading">
          <div className="section-heading">
            <div>
              <p className="detail-eyebrow">Before the plant shelf</p>
              <h2 className="section-title" id="wishlist-heading">Wishlist / Purchases</h2>
            </div>
            <button className="add-plant-button" type="button" onClick={() => {
              setWishlistDraft(emptyWishlistItem); setWishlistFormBaseline(JSON.stringify(emptyWishlistItem)); setEditingWishlistId(''); clearWishlistImageSelection(); setShowWishlistForm(true);
            }} aria-label="Add wishlist or purchase item" title="Add item">+</button>
          </div>
          {showWishlistForm ? (
            <form className="plant-form wishlist-form" onSubmit={submitWishlistItem}>
              <div className="form-heading">
                <div><p className="detail-eyebrow">Wishlist / purchase</p><h2>{editingWishlistId ? 'Edit item' : 'Add item'}</h2></div>
              </div>
              {wishlistImageUploadError && (
                <p className="form-error-message" role="alert">{wishlistImageUploadError}</p>
              )}
              {wishlistSubmitStatus && (
                <p className="form-status-message" role="status">{wishlistSubmitStatus}</p>
              )}
              <div className="form-grid">
                <div className="form-field"><label htmlFor="wish-name">Plant name *</label>
                  <input id="wish-name" name="name" required value={wishlistDraft.name} onChange={(e) => setWishlistDraft({ ...wishlistDraft, name: e.target.value })} /></div>
                {[["price", "Price"], ["tracking", "Tracking number or link"]].map(([field, label]) => (
                  <div className="form-field" key={field}><label htmlFor={`wish-${field}`}>{label}</label>
                    <input id={`wish-${field}`} type={field === 'price' ? 'number' : field === 'imageUrl' ? 'url' : 'text'} step={field === 'price' ? '0.01' : undefined}
                      value={wishlistDraft[field]} onChange={(e) => setWishlistDraft({ ...wishlistDraft, [field]: e.target.value })} /></div>
                ))}
                <ImageUploadField id="wish-image" label="Image URL" value={wishlistDraft.imageUrl}
                  onChange={(imageUrl) => {
                    clearWishlistImageSelection();
                    setWishlistDraft({ ...wishlistDraft, imageUrl });
                  }}
                  onFileSelected={selectWishlistImageFile}
                  selectedFileName={wishlistImageFile?.name || ''}
                  previewUrl={wishlistImagePreviewUrl}
                  disabled={isWishlistSubmitting}
                  message={wishlistImageUploadError}
                  messageType={wishlistImageUploadError ? 'error' : 'status'} />
                {[["genus", "Genus"], ["type", "Type / category"], ["desiredStatus", "Desired status"], ["source", "Source / seller"]].map(([field, label]) => (
                  <div className="form-field" key={field}>
                    <label htmlFor={`wish-${field}`}>{label}</label>
                    <select id={`wish-${field}`} value={wishlistDraft[field]}
                      onChange={(e) => setWishlistDraft({ ...wishlistDraft, [field]: e.target.value })}>
                      <option value="">Select {label.toLowerCase()}</option>
                      {dropdownOptions[field].map((option) => <option value={option} key={option}>{option}</option>)}
                    </select>
                    <div className="new-option-row">
                      <input type="text" aria-label={`New ${label.toLowerCase()} option`}
                        placeholder="Add new option" value={newOptionText[field]}
                        onChange={(event) => setNewOptionText((currentText) => ({ ...currentText, [field]: event.target.value }))} />
                      <button type="button" onClick={() => addDropdownOption(field, 'wishlist')}>Add option</button>
                    </div>
                  </div>
                ))}
                {[["orderDate", "Order date"], ["shipDate", "Ship date"], ["expectedArrivalDate", "Expected arrival date"], ["actualArrivalDate", "Actual arrival date"]].map(([field, label]) => (
                  <div className="form-field" key={field}><label htmlFor={`wish-${field}`}>{label}</label>
                    <input id={`wish-${field}`} type="date" value={wishlistDraft[field]}
                      onChange={(e) => setWishlistDraft({ ...wishlistDraft, [field]: e.target.value })} /></div>
                ))}
                <div className="form-field form-field-wide"><label htmlFor="wish-notes">Notes</label>
                  <textarea id="wish-notes" rows="3" value={wishlistDraft.notes} onChange={(e) => setWishlistDraft({ ...wishlistDraft, notes: e.target.value })} /></div>
              </div>
              <div className="form-actions"><button type="submit" disabled={isWishlistSubmitting}>
                {isWishlistSubmitting ? (wishlistImageFile ? 'Uploading photo...' : 'Saving wishlist item...') : (editingWishlistId ? 'Save changes' : 'Add item')}
              </button>
                <button className="secondary-button" type="button" disabled={isWishlistSubmitting}
                  onClick={() => { if (confirmDiscardChanges(wishlistFormDirty)) { setShowWishlistForm(false); setEditingWishlistId(''); setWishlistDraft(emptyWishlistItem); setWishlistFormBaseline(JSON.stringify(emptyWishlistItem)); clearWishlistImageSelection(); } }}>Cancel</button></div>
            </form>
          ) : (
            <>
              {selectedWishlistItem && (
                <article className="wishlist-detail plant-detail" aria-labelledby="wishlist-detail-heading">
                  <div className="detail-actions">
                    <button className="back-button" type="button" onClick={() => setSelectedWishlistItemId('')}>
                      ← Back to Wishlist
                    </button>
                    <div className="plant-change-actions">
                      <button className="edit-plant-button" type="button" onClick={() => editWishlistItem(selectedWishlistItem)}
                        aria-label={`Edit ${selectedWishlistItem.name}`} title="Edit">✏️</button>
                      <button className="delete-plant-button" type="button" onClick={() => deleteWishlistItem(selectedWishlistItem)}
                        aria-label={`Delete ${selectedWishlistItem.name}`} title="Delete">🗑️</button>
                    </div>
                  </div>
                  <div className="detail-heading">
                    {selectedWishlistItem.imageUrl ? (
                      <SafeImage key={selectedWishlistItem.imageUrl} className="wishlist-detail-image"
                        src={selectedWishlistItem.imageUrl} alt={`${selectedWishlistItem.name} plant`}
                        fallback={<div className="wishlist-placeholder wishlist-detail-placeholder" aria-hidden="true">🌱</div>} />
                    ) : (
                      <div className="wishlist-placeholder wishlist-detail-placeholder" aria-hidden="true">🌱</div>
                    )}
                    <div>
                      <p className="detail-eyebrow">Wishlist / purchase details</p>
                      <h2 id="wishlist-detail-heading">{selectedWishlistItem.name}</h2>
                      <p>{[selectedWishlistItem.genus, selectedWishlistItem.type].filter(Boolean).join(' · ') || 'Plant details not set'}</p>
                      {selectedWishlistItem.desiredStatus && <p className="wishlist-status">{selectedWishlistItem.desiredStatus}</p>}
                    </div>
                  </div>
                  <section className="detail-section">
                    <h3>Item details</h3>
                    <dl className="detail-list">
                      {getWishlistDetailFields(selectedWishlistItem).map(([fieldName, label, value]) => (
                        <div key={fieldName}><dt>{label}</dt><dd>{value}</dd></div>
                      ))}
                    </dl>
                  </section>
                  <div className="wishlist-detail-actions">
                    <button type="button" className="convert-button" disabled={selectedWishlistItem.converted}
                      onClick={() => convertWishlistItem(selectedWishlistItem)}>
                      {selectedWishlistItem.converted ? 'Added to Plant Inventory' : 'Add to Plant Inventory'}
                    </button>
                    <button className="secondary-button" type="button" onClick={() => setSelectedWishlistItemId('')}>
                      Close details
                    </button>
                  </div>
                </article>
              )}
              <div className="wishlist-tools">
                <div className="plant-search"><label htmlFor="wishlist-search">Search by plant name</label>
                  <input id="wishlist-search" type="search" placeholder="Search wishlist..." value={wishlistSearch} onChange={(e) => setWishlistSearch(e.target.value)} /></div>
                {[["desiredStatus", "Status"], ["source", "Source / seller"], ["type", "Type / category"]].map(([field, label]) => (
                  <div className="plant-filter" key={field}><label htmlFor={`wishlist-filter-${field}`}>{label}</label>
                    <select id={`wishlist-filter-${field}`} value={wishlistFilters[field] || ''} onChange={(e) => setWishlistFilters({ ...wishlistFilters, arrivingSoon: false, [field]: e.target.value })}>
                      <option value="">All</option>{wishlistFilterOptions(field).map((value) => <option key={value}>{value}</option>)}
                    </select></div>
                ))}
                <button className="clear-filters-button" type="button" onClick={() => { setWishlistSearch(''); setWishlistFilters(emptyWishlistFilters); }}>Clear filters</button>
              </div>
              {wishlistFilters.arrivingSoon && <p className="applied-dashboard-filter">Showing arrivals expected in the next 7 days.</p>}
              <div className="wishlist-list">
                {visibleWishlistItems.length ? visibleWishlistItems.map((item) => (
                  <article className="wishlist-card" key={item.id}
                    role="button" tabIndex="0" aria-label={`View details for ${item.name}`}
                    onClick={() => setSelectedWishlistItemId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedWishlistItemId(item.id);
                      }
                    }}>
                    {item.imageUrl ? <SafeImage key={item.imageUrl} src={item.imageUrl} alt={`${item.name} plant`}
                      fallback={<div className="wishlist-placeholder" aria-hidden="true">🌱</div>} /> : <div className="wishlist-placeholder" aria-hidden="true">🌱</div>}
                    <div className="wishlist-card-body"><div className="wishlist-card-heading"><div><span className="wishlist-status">{item.desiredStatus || 'Wishlist'}</span><h3>{item.name}</h3></div>
                      <div className="wishlist-card-actions">
                        <button type="button" onClick={(event) => { event.stopPropagation(); editWishlistItem(item); }}
                          aria-label={`Edit ${item.name}`} title="Edit">✏️</button>
                        <button className="delete-plant-button" type="button" onClick={(event) => { event.stopPropagation(); deleteWishlistItem(item); }}
                          aria-label={`Delete ${item.name}`} title="Delete">🗑️</button>
                      </div></div>
                      <dl className="wishlist-summary"><div><dt>Source</dt><dd>{displayValue(item.source)}</dd></div><div><dt>Expected</dt><dd>{displayValue(item.expectedArrivalDate)}</dd></div>{item.price !== '' && <div><dt>Price</dt><dd>{formatPrice(item.price)}</dd></div>}</dl>
                      <button type="button" className="convert-button" disabled={item.converted}
                        onClick={(event) => { event.stopPropagation(); convertWishlistItem(item); }}>
                        {item.converted ? 'Added to Plant Inventory' : 'Add to Plant Inventory'}
                      </button>
                      <span className="view-details">View details →</span>
                    </div>
                  </article>
                )) : <p className="empty-message">No wishlist or purchase items found.</p>}
              </div>
            </>
          )}
        </section>
        ) : appView === 'settings' ? (
        <section className="settings-view" aria-labelledby="settings-heading">
          <div className="settings-heading">
            <p className="detail-eyebrow">App tools</p>
            <h2 id="settings-heading">Settings</h2>
            <p>Manage your backups, cloud sync setup, and app information.</p>
          </div>

          <nav className="settings-section-nav" aria-label="Settings sections">
            <label htmlFor="settings-section-selector">Jump to section</label>
            <select id="settings-section-selector" value={settingsSection}
              onChange={(event) => navigateSettingsSection(event.target.value)}>
              {settingsSections.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            <div className="settings-section-links">
              {settingsSections.map(([id, label]) => (
                <button type="button" key={id}
                  className={settingsSection === id ? 'settings-section-active' : ''}
                  aria-current={settingsSection === id ? 'location' : undefined}
                  onClick={() => navigateSettingsSection(id)}>
                  {label}
                </button>
              ))}
            </div>
          </nav>

          <section className="settings-card quick-view-settings-card" id="settings-quick-views"
            aria-labelledby="settings-quick-views-heading">
            <div className="settings-card-heading">
              <div>
                <h3 id="settings-quick-views-heading">Quick Views</h3>
                <p className="settings-card-intro">Edit and organize the saved Plant List views available in the Quick View selector.</p>
              </div>
              <button type="button" onClick={() => {
                setAppView('plants');
                setPlantPage(1);
              }}>Create from Plant List</button>
            </div>
            {settingsQuickViewMessage && <p className="backup-message backup-message-success" role="status">{settingsQuickViewMessage}</p>}
            <div className="settings-quick-view-list">
              {quickViews.map((quickView) => (
                <article className="settings-quick-view-row" key={quickView.id}>
                  <div className="settings-quick-view-copy">
                    <div className="settings-quick-view-title">
                      <h4>{quickView.name}</h4>
                      {activeQuickView === quickView.id && <span>Currently active</span>}
                    </div>
                    <p>{quickViewCriteriaSummary(quickView)}</p>
                    <time dateTime={quickView.updatedAt}>
                      Updated {new Date(quickView.updatedAt).toLocaleString()}
                    </time>
                  </div>
                  <div className="settings-quick-view-controls">
                    <button type="button" onClick={() => openQuickViewEditor(quickView, 'settings')}
                      aria-label={`Edit Quick View ${quickView.name}`}>Edit</button>
                    <details>
                      <summary aria-label={`More actions for Quick View ${quickView.name}`}>More</summary>
                      <div>
                        <button type="button" onClick={() => duplicateSavedQuickView(quickView)}
                          aria-label={`Duplicate Quick View ${quickView.name}`}>Duplicate</button>
                        <button type="button" onClick={() => deleteSavedQuickView(quickView)}
                          aria-label={`Delete Quick View ${quickView.name}`}>Delete</button>
                      </div>
                    </details>
                  </div>
                </article>
              ))}
              {!quickViews.length && <p className="empty-message">No Quick Views saved yet. Create one from the Plant List.</p>}
            </div>
          </section>

          <section className="settings-card" id="settings-cloud" aria-labelledby="cloud-sync-heading">
            <h3 id="cloud-sync-heading">Cloud Sync</h3>
            <p className="settings-card-intro">Cloud sync is manual backup and restore, not live real-time sync across devices.</p>
            <dl className="backup-meta-grid">
              <div><dt>Supabase</dt><dd>{isSupabaseConfigured ? 'Configured' : 'Not configured'}</dd></div>
              <div><dt>Sync status</dt><dd>{cloudBusy ? 'Working...' : 'Ready'}</dd></div>
              <div><dt>Last cloud backup</dt><dd>{cloudUpdatedAt ? new Date(cloudUpdatedAt).toLocaleString() : 'Not checked'}</dd></div>
              <div><dt>Last cloud restore</dt><dd>{cloudRestoredAt ? new Date(cloudRestoredAt).toLocaleString() : 'Not restored'}</dd></div>
              <div><dt>Local changes</dt><dd>{localMetadata.lastModifiedAt ? new Date(localMetadata.lastModifiedAt).toLocaleString() : 'Not recorded yet'}</dd></div>
              <div><dt>Schema</dt><dd>v{backupSchemaVersion}</dd></div>
            </dl>
            <div className="cloud-sync-actions">
              <button type="button" onClick={saveToCloud} disabled={cloudBusy}>Save cloud backup</button>
              <button type="button" onClick={previewCloudBackup} disabled={cloudBusy}>Preview cloud backup</button>
              <button type="button" onClick={loadFromCloud} disabled={cloudBusy}>Restore cloud backup</button>
              <button type="button" onClick={checkCloudStatus} disabled={cloudBusy}>Check cloud status</button>
            </div>
            {cloudPreview && (
              <dl className="backup-summary-grid" aria-label="Cloud backup contents">
                <div><dt>Plants</dt><dd>{cloudPreview.plants}</dd></div>
                <div><dt>Wishlist</dt><dd>{cloudPreview.wishlistItems}</dd></div>
                <div><dt>Reminders</dt><dd>{cloudPreview.reminders}</dd></div>
                <div><dt>Timeline</dt><dd>{cloudPreview.timelineEntries}</dd></div>
                <div><dt>Photo Log</dt><dd>{cloudPreview.photoLogEntries}</dd></div>
                <div><dt>Garden beds</dt><dd>{cloudPreview.gardenBeds}</dd></div>
                <div><dt>Garden crops</dt><dd>{cloudPreview.gardenCrops}</dd></div>
                <div><dt>Plant spaces</dt><dd>{cloudPreview.plantSpaces}</dd></div>
                <div><dt>Placements</dt><dd>{cloudPreview.plantSpacePlacements}</dd></div>
                <div><dt>Trackers</dt><dd>{cloudPreview.trackerRecords}</dd></div>
              </dl>
            )}
            {cloudMessage && (
              <p className={`backup-message backup-message-${cloudMessageType}`}
                role={cloudMessageType === 'error' ? 'alert' : 'status'}>
                {cloudMessage}
              </p>
            )}
          </section>

          <section className="settings-card app-version-card" id="settings-version" aria-labelledby="app-version-heading">
            <div className="app-version-heading">
              <div>
                <p className="detail-eyebrow">Current release</p>
                <h3 id="app-version-heading">App Version</h3>
              </div>
              <span className="app-version-badge">{currentAppVersion.version}</span>
            </div>
            <dl className="app-version-details">
              <div><dt>Current app version</dt><dd>{currentAppVersion.version}</dd></div>
              <div><dt>Build date/time</dt><dd>{currentAppVersion.buildDateTime}</dd></div>
              <div><dt>Release summary</dt><dd>{currentAppVersion.releaseName}</dd></div>
            </dl>
            <button className="check-updates-button" type="button" onClick={checkForUpdates}>
              Check for updates
            </button>
          </section>

          <section className="settings-card changelog-card" aria-labelledby="changelog-heading">
            <div className="changelog-card-heading">
              <div>
                <h3 id="changelog-heading">Changelog</h3>
                <p>{changelog.length} releases</p>
              </div>
              <button
                className="changelog-toggle-button"
                type="button"
                aria-expanded={isChangelogExpanded}
                aria-controls="settings-changelog-list"
                onClick={() => setIsChangelogExpanded((isExpanded) => !isExpanded)}
              >
                {isChangelogExpanded ? 'Hide Changelog' : 'Show Changelog'}
              </button>
            </div>
            {isChangelogExpanded && (
              <div className="changelog-list" id="settings-changelog-list">
                {changelog.map((release) => (
                  <article className="changelog-entry" key={release.version}>
                    <div className="changelog-entry-heading">
                      <h4>{release.version}</h4>
                      <time dateTime={release.releaseDate}>{release.releaseDate}</time>
                    </div>
                    <ul>
                      {release.changes.map((change) => <li key={change}>{change}</li>)}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="settings-card" id="settings-backup" aria-labelledby="data-tools-heading">
            <h3 id="data-tools-heading">Data Backup</h3>
            <p className="settings-card-intro">JSON backup includes plants, Plant Spaces, placements, logs, reminders, timeline entries, photos as URLs, garden data, wishlist items, Quick Views, dropdown values, and preferences.</p>
            <dl className="backup-summary-grid" aria-label="Current local backup contents">
              <div><dt>Plants</dt><dd>{localBackupSummary.plants}</dd></div>
              <div><dt>Wishlist</dt><dd>{localBackupSummary.wishlistItems}</dd></div>
              <div><dt>Reminders</dt><dd>{localBackupSummary.reminders}</dd></div>
              <div><dt>Quick Views</dt><dd>{localBackupSummary.quickViews}</dd></div>
              <div><dt>Timeline</dt><dd>{localBackupSummary.timelineEntries}</dd></div>
              <div><dt>Photo Log</dt><dd>{localBackupSummary.photoLogEntries}</dd></div>
              <div><dt>Garden beds</dt><dd>{localBackupSummary.gardenBeds}</dd></div>
              <div><dt>Garden crops</dt><dd>{localBackupSummary.gardenCrops}</dd></div>
              <div><dt>Plant spaces</dt><dd>{localBackupSummary.plantSpaces}</dd></div>
              <div><dt>Placements</dt><dd>{localBackupSummary.plantSpacePlacements}</dd></div>
              <div><dt>Trackers</dt><dd>{localBackupSummary.trackerRecords}</dd></div>
            </dl>
            <div className="data-tool-row">
              <div>
                <h4>Download JSON backup</h4>
                <p>Creates a complete local file backup without image file blobs.</p>
              </div>
              <button type="button" onClick={exportData}>Download JSON backup</button>
            </div>
            <div className="data-tool-row">
              <div>
                <h4>Import JSON backup</h4>
                <p>Validates the file, shows a summary, then creates a safety snapshot before restore.</p>
              </div>
              <button type="button" onClick={() => importInputRef.current?.click()}>Import JSON backup</button>
              <input ref={importInputRef} className="visually-hidden" type="file"
                accept=".json,application/json" onChange={importData}
                aria-label="Choose a Plant Inventory backup file" />
            </div>
            <div className="data-tool-row">
              <div>
                <h4>Undo last restore</h4>
                <p>{restoreSnapshotInfo ? `Available from ${new Date(restoreSnapshotInfo.createdAt).toLocaleString()}.` : 'Available after a restore creates a safety snapshot.'}</p>
              </div>
              <button type="button" onClick={undoLastRestore} disabled={!restoreSnapshotInfo}>Undo last restore</button>
            </div>
            <p className={`backup-audit-note${backupAudit.ok ? '' : ' backup-audit-warning'}`}>
              Backup audit: {backupAudit.ok ? 'all registered collections are included.' : `missing ${backupAudit.missing.join(', ')}.`}
            </p>
            {backupPreview && (
              <p className="backup-audit-note">
                Latest JSON action: {backupPreview.plants} plants, {backupPreview.reminders} reminders, {backupPreview.timelineEntries} timeline entries.
              </p>
            )}
            {backupMessage && (
              <p className={`backup-message backup-message-${backupMessageType}`}
                role={backupMessageType === 'error' ? 'alert' : 'status'}>
                {backupMessage}
              </p>
            )}
          </section>

          <section className="settings-card" id="settings-export" aria-labelledby="csv-export-heading">
            <h3 id="csv-export-heading">CSV Export</h3>
            <p className="settings-card-intro">Create spreadsheet-friendly files for reviewing, sorting, or printing your plant data. CSV export is one-way; use Data Backup for full backup and restore.</p>
            <div className="data-tool-row">
              <div><h4>Plant Inventory</h4><p>Includes active, archived, and graveyard plants.</p></div>
              <button type="button" onClick={exportPlantsCsv}>Export Plants CSV</button>
            </div>
            <div className="data-tool-row">
              <div><h4>Wishlist / Purchases</h4><p>Export wishlist, order, shipping, and arrival details.</p></div>
              <button type="button" onClick={exportWishlistCsv}>Export Wishlist CSV</button>
            </div>
            <div className="data-tool-row">
              <div><h4>Garden</h4><p>Downloads separate files for beds, crops, activity, and harvests.</p></div>
              <button type="button" onClick={exportGardenCsv}>Export Garden CSV</button>
            </div>
            <div className="data-tool-row">
              <div><h4>Plant Activity Log</h4><p>Export dated care and plant activity entries.</p></div>
              <button type="button" onClick={exportPlantActivityCsv}>Export Plant Activity Log CSV</button>
            </div>
            <div className="data-tool-row">
              <div><h4>Plant Photo Log</h4><p>Export photo links, dates, categories, and captions.</p></div>
              <button type="button" onClick={exportPlantPhotoCsv}>Export Plant Photo Log CSV</button>
            </div>
          </section>

          <section className="settings-card" id="settings-general" aria-labelledby="app-info-heading">
            <h3 id="app-info-heading">App Info</h3>
            <dl className="app-info-list">
              <div><dt>App name</dt><dd>Grow With Gibre Plant Tracker</dd></div>
              <div><dt>Current storage type</dt><dd>Browser local storage</dd></div>
            </dl>
            <p className="storage-note">
              Data is stored in this browser's local storage and does not automatically sync.
              Use manual Cloud Sync or Export/Import JSON backup to move your data.
            </p>
          </section>
          {quickViewEditor?.context === 'settings' && (
            <div className="tracker-modal-backdrop" role="presentation">
              <section className="tracker-modal quick-view-editor quick-view-settings-editor"
                role="dialog" aria-modal="true" aria-labelledby="settings-quick-view-editor-heading">
                <div className="tracker-modal-heading">
                  <h3 id="settings-quick-view-editor-heading">Edit Quick View</h3>
                  <button type="button" onClick={() => setQuickViewEditor(null)}
                    aria-label="Cancel Quick View changes">Close</button>
                </div>
                <label htmlFor="settings-quick-view-name">View name</label>
                <input id="settings-quick-view-name" autoFocus value={quickViewEditor.name}
                  onChange={(event) => setQuickViewEditor({ ...quickViewEditor, name: event.target.value })} />
                <label className="tracker-modal-checkbox">
                  <input type="checkbox" checked={quickViewEditor.includeSearch}
                    onChange={(event) => setQuickViewEditor({
                      ...quickViewEditor, includeSearch: event.target.checked,
                    })} />
                  Include search text
                </label>
                {quickViewEditor.includeSearch && (
                  <>
                    <label htmlFor="settings-quick-view-search">Saved search text</label>
                    <input id="settings-quick-view-search" value={quickViewEditor.state.searchText}
                      onChange={(event) => updateQuickViewEditorState({ searchText: event.target.value })} />
                  </>
                )}
                <div className="quick-view-editor-filters">
                  {[...primaryFilterFields, ...advancedFilterFields].map(([fieldName, label]) => (
                    <MultiValueFilter key={fieldName} fieldName={fieldName} label={label}
                      value={quickViewEditor.state.filters[fieldName]} options={getFilterOptions(fieldName)}
                      onChange={(value) => updateQuickViewEditorFilter(fieldName, value)} />
                  ))}
                  <MultiValueFilter fieldName="origin" label="Plant Origin"
                    value={quickViewEditor.state.filters.origin} options={plantOriginOptions}
                    onChange={(value) => updateQuickViewEditorFilter('origin', value)} />
                  <MultiValueFilter fieldName="lifecycleStage" label="Lifecycle Stage"
                    value={quickViewEditor.state.filters.lifecycleStage} options={lifecycleStageOptions}
                    onChange={(value) => updateQuickViewEditorFilter('lifecycleStage', value)} />
                </div>
                <div className="quick-view-editor-presentation">
                  <label htmlFor="settings-quick-view-plant-state">Plant view</label>
                  <select id="settings-quick-view-plant-state" value={quickViewEditor.state.lifecycleView}
                    onChange={(event) => updateQuickViewEditorState({ lifecycleView: event.target.value })}>
                    <option value="all">All plants</option>
                    <option value="active">Active plants</option>
                    <option value="archived">Archived plants</option>
                    <option value="graveyard">Graveyard plants</option>
                  </select>
                  <label htmlFor="settings-quick-view-sort">Sort</label>
                  <select id="settings-quick-view-sort" value={quickViewEditor.state.sort}
                    onChange={(event) => updateQuickViewEditorState({ sort: event.target.value })}>
                    {plantSortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <label htmlFor="settings-quick-view-layout">View mode</label>
                  <select id="settings-quick-view-layout" value={quickViewEditor.state.viewMode}
                    onChange={(event) => updateQuickViewEditorState({ viewMode: event.target.value })}>
                    <option value="cards">Cards</option>
                    <option value="gallery">Gallery</option>
                    <option value="compact">Compact list</option>
                  </select>
                  <label htmlFor="settings-quick-view-quarantine">Quarantine</label>
                  <select id="settings-quick-view-quarantine" value={quickViewEditor.state.quarantineFilter}
                    onChange={(event) => updateQuickViewEditorState({ quarantineFilter: event.target.value })}>
                    <option value="">Any quarantine state</option>
                    <option value="current">Currently in quarantine</option>
                    <option value="soon">Leaving quarantine soon</option>
                    <option value="new">New-plant quarantine</option>
                    <option value="pest">Pest quarantine</option>
                  </select>
                  <span>Additional criteria</span>
                  <div className="quick-view-editor-toggles">
                    <label className="tracker-modal-checkbox">
                      <input type="checkbox" checked={quickViewEditor.state.recentlyCheckedFilter}
                        onChange={(event) => updateQuickViewEditorState({
                          recentlyCheckedFilter: event.target.checked,
                        })} />
                      Recently checked
                    </label>
                    <label className="tracker-modal-checkbox">
                      <input type="checkbox" checked={quickViewEditor.state.recentlyAcquiredFilter}
                        onChange={(event) => updateQuickViewEditorState({
                          recentlyAcquiredFilter: event.target.checked,
                        })} />
                      Recently acquired
                    </label>
                  </div>
                  <label className="tracker-modal-checkbox">
                    <input type="checkbox" checked={quickViewEditor.includePageSize}
                      onChange={(event) => setQuickViewEditor({
                        ...quickViewEditor, includePageSize: event.target.checked,
                      })} />
                    Include plants per page
                  </label>
                  {quickViewEditor.includePageSize && (
                    <>
                      <label htmlFor="settings-quick-view-page-size">Plants per page</label>
                      <select id="settings-quick-view-page-size" value={quickViewEditor.state.pageSize ?? 12}
                        onChange={(event) => updateQuickViewEditorState({
                          pageSize: event.target.value === 'all' ? 'all' : Number(event.target.value),
                        })}>
                        {[12, 18, 25, 50].map((value) => <option key={value} value={value}>{value}</option>)}
                        <option value="all">All</option>
                      </select>
                    </>
                  )}
                </div>
                <p className="quick-view-criteria-preview">{quickViewCriteriaSummary({
                  ...quickViewEditor,
                  state: {
                    ...quickViewEditor.state,
                    searchText: quickViewEditor.includeSearch ? quickViewEditor.state.searchText : '',
                    pageSize: quickViewEditor.includePageSize ? quickViewEditor.state.pageSize : undefined,
                  },
                })}</p>
                <div className="form-actions">
                  <button type="button" onClick={saveQuickViewEditor}
                    disabled={!quickViewEditor.name.trim()}>Save Changes</button>
                  <button type="button" className="secondary-button"
                    onClick={() => setQuickViewEditor(null)}>Cancel</button>
                </div>
              </section>
            </div>
          )}
          <p className="settings-version-footer">
            Grow With Gibre Plant Tracker {currentAppVersion.version} — {currentAppVersion.releaseName}
          </p>
        </section>
        ) : (
        <>
        <div className="section-heading">
          <h2 className="section-title" id="plant-list-heading">Plant List</h2>
          <button className="secondary-button" type="button" onClick={() => openQuickNote()}>New Journal Entry</button>
          <button className="add-plant-button" type="button" onClick={() => {
            setAddPlantMessage('');
            setNewPlant(emptyPlant);
            setPlantFormBaseline(JSON.stringify(emptyPlant));
            setSoilMixIsCustom(false);
            clearPlantImageSelection();
            setShowForm(true);
          }}
            aria-label="Add new plant" title="Add new plant">
            +
          </button>
        </div>
        <section className="quick-views quick-views-compact" aria-labelledby="quick-views-heading">
          <div className="quick-views-heading">
            <div>
              <h3 id="quick-views-heading">Quick Views</h3>
              {activeQuickViewLabel && (
                <p>{activeQuickViewLabel}{activeQuickViewModified ? ' · Modified' : ' · Active'}</p>
              )}
            </div>
          </div>
          <div className="quick-view-compact-controls">
            <label htmlFor="quick-view-selector">Quick View</label>
            <select id="quick-view-selector" value={activeQuickView}
              onChange={(event) => {
                const view = quickViews.find((item) => item.id === event.target.value);
                if (view) applyQuickView(view);
              }}>
              <option value="">Custom / default state</option>
              {quickViews.map((quickView) => (
                <option key={quickView.id} value={quickView.id}>{quickView.name}</option>
              ))}
            </select>
            <button type="button" onClick={() => openQuickViewEditor(null, 'plant-list')}>
              Save as Quick View
            </button>
            <button type="button" className="secondary-button" onClick={restoreDefaultPlantList}>
              Restore Default
            </button>
          </div>
        </section>
        {quickViewEditor?.context === 'plant-list' && (
          <div className="tracker-modal-backdrop" role="presentation">
            <section className="tracker-modal quick-view-editor" role="dialog" aria-modal="true"
              aria-labelledby="quick-view-editor-heading">
              <div className="tracker-modal-heading">
                <h3 id="quick-view-editor-heading">
                  Create Quick View
                </h3>
                <button type="button" onClick={() => setQuickViewEditor(null)}
                  aria-label="Cancel Quick View changes">Close</button>
              </div>
              <label htmlFor="quick-view-name">View name</label>
              <input id="quick-view-name" autoFocus value={quickViewEditor.name}
                onChange={(event) => setQuickViewEditor({
                  ...quickViewEditor, name: event.target.value,
                })} />
              <label className="tracker-modal-checkbox">
                <input type="checkbox" checked={quickViewEditor.includeSearch}
                  onChange={(event) => setQuickViewEditor({
                    ...quickViewEditor, includeSearch: event.target.checked,
                  })} />
                Include search text
              </label>
              <label className="tracker-modal-checkbox">
                <input type="checkbox" checked={quickViewEditor.includePageSize}
                  onChange={(event) => setQuickViewEditor({
                    ...quickViewEditor, includePageSize: event.target.checked,
                  })} />
                Include plants per page
              </label>
              <dl className="quick-view-summary">
                <div><dt>Filters</dt><dd>{activeFilterValueCount(quickViewEditor.state.filters) || 'None'}</dd></div>
                <div><dt>Sort</dt><dd>{plantSortOptions.find(([value]) => value === quickViewEditor.state.sort)?.[1]}</dd></div>
                <div><dt>Layout</dt><dd>{quickViewEditor.state.viewMode}</dd></div>
              </dl>
              <div className="form-actions">
                <button type="button" onClick={saveQuickViewEditor}
                  disabled={!quickViewEditor.name.trim()}>Save</button>
                <button type="button" className="secondary-button"
                  onClick={() => setQuickViewEditor(null)}>Cancel</button>
              </div>
            </section>
          </div>
        )}
        <div className="plant-search-tools">
          {quarantineFilter && (
            <div className="applied-dashboard-filter" role="status">
              <span>{({
                current: 'Plants in quarantine',
                soon: 'Coming out of quarantine soon',
                new: 'New plants',
                pest: 'Pest quarantine',
              })[quarantineFilter]}</span>
              <button type="button" onClick={() => {
                setQuarantineFilter('');
              }}>Clear</button>
            </div>
          )}
          {recentlyCheckedFilter && (
            <div className="applied-dashboard-filter" role="status">
              <span>Recently checked</span>
              <button type="button" onClick={() => {
                setRecentlyCheckedFilter(false);
              }}>Clear</button>
            </div>
          )}
          <div className="plant-search">
            <label htmlFor="plant-search">Search plants</label>
            <input
              id="plant-search"
              type="search"
              placeholder="Search plants..."
              value={searchText}
              onChange={(event) => {
                setSearchText(event.target.value);
              }}
            />
          </div>
          <div className="mobile-primary-controls">
            <div className="plant-filter plant-sort-control">
              <label htmlFor="plant-sort">Sort</label>
              <select id="plant-sort" value={plantSort}
                onChange={(event) => changePlantSort(event.target.value)}>
                {plantSortOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className={`plant-filter-panel${areMoreFiltersVisible ? ' plant-filter-panel-open' : ''}`}
              aria-label="Filter plants">
              <div className="filter-panel-heading">
                <div>
                  <h3>Filters</h3>
                  {hasActivePlantFilters && <p>{activePlantFilterCount} active</p>}
                </div>
                <div className="filter-actions">
                  <button className="more-filters-button" type="button"
                    aria-expanded={areMoreFiltersVisible} aria-controls="plant-filter-controls"
                    onClick={() => setAreMoreFiltersVisible((isVisible) => !isVisible)}>
                    <span className="desktop-filter-label">{areMoreFiltersVisible ? 'Hide Filters' : 'More Filters'}</span>
                    <span className="mobile-filter-label">
                      {areMoreFiltersVisible ? 'Hide' : 'Filters'}{hasActivePlantFilters ? ` (${activePlantFilterCount})` : ''}
                    </span>
                  </button>
                  {hasActivePlantFilters && (
                    <button className="clear-filters-button desktop-clear-filters-button" type="button" onClick={clearAllFilters}>
                      Clear All
                    </button>
                  )}
                </div>
              </div>
              <div className="plant-filter-controls" id="plant-filter-controls">
              <div className="plant-filter-dropdowns primary-filters">
                <div className="plant-filter">
                  <label htmlFor="lifecycle-filter">Plant view</label>
                  <select id="lifecycle-filter" value={lifecycleView}
                    onChange={(event) => {
                      setLifecycleView(event.target.value);
                      scrollPlantResultsIntoView();
                    }}>
                    <option value="all">All Plants</option>
                    <option value="active">Active Plants</option>
                    <option value="archived">Archived Plants</option>
                    <option value="graveyard">Graveyard Plants</option>
                  </select>
                </div>
                {primaryFilterFields.map(([fieldName, label]) => (
                  <MultiValueFilter key={fieldName} fieldName={fieldName} label={label}
                    value={plantFilters[fieldName]} options={getFilterOptions(fieldName)}
                    onChange={(value) => updatePlantFilter(fieldName, value)} />
                ))}
              </div>
              {areMoreFiltersVisible && (
                <div className="plant-filter-dropdowns advanced-filters" id="advanced-plant-filters">
                  <MultiValueFilter fieldName="origin" label="Plant Origin"
                    value={plantFilters.origin} options={plantOriginOptions}
                    onChange={(value) => updatePlantFilter('origin', value)} />
                  <MultiValueFilter fieldName="lifecycleStage" label="Lifecycle Stage"
                    value={plantFilters.lifecycleStage} options={lifecycleStageOptions}
                    onChange={(value) => updatePlantFilter('lifecycleStage', value)} />
                  {advancedFilterFields.map(([fieldName, label]) => (
                    <MultiValueFilter key={fieldName} fieldName={fieldName} label={label}
                      value={plantFilters[fieldName]} options={getFilterOptions(fieldName)}
                      onChange={(value) => updatePlantFilter(fieldName, value)} />
                  ))}
                </div>
              )}
              {hasActivePlantFilters && (
                <button className="clear-filters-button mobile-clear-filters-button" type="button" onClick={clearAllFilters}>
                  Clear All Filters
                </button>
              )}
              </div>
            </div>
          </div>
          <div className="mobile-secondary-controls">
            <div className="view-mode-control" role="group" aria-label="Plant display layout">
              <span>View</span>
              <div className="view-mode-buttons">
                {[
                  ['cards', 'Cards'],
                  ['gallery', 'Gallery'],
                  ['compact', 'Compact List'],
                ].map(([viewMode, label]) => (
                  <button key={viewMode} type="button"
                    className={plantViewMode === viewMode ? 'view-mode-active' : ''}
                    aria-pressed={plantViewMode === viewMode}
                    onClick={() => changePlantViewMode(viewMode)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="page-size-control">
              <label htmlFor="plant-page-size">
                <span className="desktop-page-size-label">Plants per page</span>
                <span className="mobile-page-size-label">Per page</span>
              </label>
              <select id="plant-page-size" value={plantPageSize}
                onChange={(event) => changePlantPageSize(
                  event.target.value === 'all' ? 'all' : Number(event.target.value),
                )}>
                <option value={12}>12</option>
                <option value={18}>18</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </div>
        <hr className="plant-list-divider" ref={plantResultsRef} />
        {visiblePlants.length > 0 && (
          <p className="plant-result-summary" aria-live="polite">
            Showing {firstVisiblePlantIndex + 1}–{lastVisiblePlantIndex} of {visiblePlants.length} plants
          </p>
        )}
        <div className={`plant-list plant-list-${plantViewMode}`}>
          {paginatedPlants.length > 0 && plantViewMode === 'cards' && paginatedPlants.map((plant, plantIndex) => (
            <button
              className="plant-card"
              type="button"
              key={`${plant.name}-${plantIndex}`}
              onClick={() => openPlantDetails(plant)}
              aria-label={`View details for ${plant.name}`}
            >
              <div className="plant-card-heading">
                <PlantImage key={plant.imageUrl || 'placeholder'} plant={plant} />
                <div className="plant-card-title">
                  <h2>{plant.name}</h2>
                  <p className="plant-type">{displayValue(plant.type)}</p>
                </div>
              </div>
              <PlantBadges plant={plant} />
              <section className="card-section">
                <dl className="plant-details">
                  <div><dt>Genus</dt><dd>{displayValue(plant.genus)}</dd></div>
                  <div><dt>Location</dt><dd>{displayValue(plant.location)}</dd></div>
                  <div><dt>Status</dt><dd>{displayValue(plant.status)}</dd></div>
                </dl>
              </section>
              <span className="view-details">View details →</span>
            </button>
          ))}
          {paginatedPlants.length > 0 && plantViewMode === 'gallery' && paginatedPlants.map((plant, plantIndex) => (
            <button className="gallery-card" type="button" key={`${plant.name}-${plantIndex}`}
              onClick={() => openPlantDetails(plant)} aria-label={`View details for ${plant.name}`}>
              <div className="gallery-image"><PlantImage key={plant.imageUrl || 'placeholder'} plant={plant} /></div>
              <div className="gallery-card-content">
                <h2>{plant.name}</h2>
                <p>{displayValue(plant.genus)} · {displayValue(plant.type)}</p>
                <PlantBadges plant={plant} />
              </div>
            </button>
          ))}
          {paginatedPlants.length > 0 && plantViewMode === 'compact' && paginatedPlants.map((plant, plantIndex) => (
            <button className="compact-plant-row" type="button" key={`${plant.name}-${plantIndex}`}
              onClick={() => openPlantDetails(plant)} aria-label={`View details for ${plant.name}`}>
              <PlantImage key={plant.imageUrl || 'placeholder'} plant={plant} />
              <span className="compact-plant-identity">
                <strong>{plant.name}</strong>
                <small>{displayValue(plant.genus)}</small>
              </span>
              <span className="compact-field"><small>Type</small>{displayValue(plant.type)}</span>
              <span className="compact-field"><small>Medium</small>{displayValue(plant.medium)}</span>
              <span className="compact-field"><small>Location</small>{displayValue(plant.location)}</span>
              <span className="compact-field"><small>Attention</small>{displayValue(plant.attention)}</span>
              <PlantBadges plant={plant} />
              <span className="compact-row-arrow" aria-hidden="true">→</span>
            </button>
          ))}
          {visiblePlants.length === 0 && <p className="empty-message">No plants found.</p>}
        </div>
        {visiblePlants.length > 0 && plantPageCount > 1 && (
          <nav className="plant-pagination" aria-label="Plant list pages">
            <button type="button" disabled={currentPlantPage === 1}
              onClick={() => setPlantPage((page) => Math.max(1, page - 1))}>
              Previous
            </button>
            <span>Page {currentPlantPage} of {plantPageCount}</span>
            <button type="button" disabled={currentPlantPage === plantPageCount}
              onClick={() => setPlantPage((page) => Math.min(plantPageCount, page + 1))}>
              Next
            </button>
          </nav>
        )}
        </>
        )
        )}
      </section>
      {quickNoteConversion && (
        <div className="tracker-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setQuickNoteConversion(null);
        }}>
          <section className="tracker-modal quick-note-modal" role="dialog" aria-modal="true"
            aria-labelledby="quick-note-conversion-heading">
            <div className="tracker-modal-heading">
              <div>
                <p className="detail-eyebrow">Review before filing</p>
                <h3 id="quick-note-conversion-heading">
                  {quickNoteDestinations.find(([value]) => value === quickNoteConversion.destination)?.[1]}
                </h3>
              </div>
              <button type="button" className="secondary-button" onClick={() => setQuickNoteConversion(null)}>Close</button>
            </div>
            <form onSubmit={convertQuickNote}>
              <div className="tracker-modal-grid">
                <div className="form-field tracker-modal-wide">
                  <label htmlFor="quick-note-conversion-text">Note text</label>
                  <textarea id="quick-note-conversion-text" rows="5" required value={quickNoteConversion.text}
                    onChange={(event) => setQuickNoteConversion((draft) => ({ ...draft, text: event.target.value }))} />
                </div>
                <div className="form-field">
                  <label htmlFor="quick-note-conversion-date">Date</label>
                  <input id="quick-note-conversion-date" type="date" required value={quickNoteConversion.date}
                    onChange={(event) => setQuickNoteConversion((draft) => ({ ...draft, date: event.target.value }))} />
                </div>
                <div className="form-field">
                  <label htmlFor="quick-note-conversion-plant">Plant association</label>
                  <select id="quick-note-conversion-plant" value={quickNoteConversion.plantId}
                    disabled={quickNoteConversion.destination === 'general'}
                    onChange={(event) => setQuickNoteConversion((draft) => ({ ...draft, plantId: event.target.value }))}>
                    <option value="">No plant</option>
                    {plants.map((plant) => <option key={plant.id} value={plant.id}>{plant.name}</option>)}
                  </select>
                </div>
              </div>
              {quickNoteConversion.photoUrl && (
                <div className="conversion-photo-preview">
                  <SafeImage src={quickNoteConversion.photoUrl} alt="Journal entry photo carried into destination"
                    fallback={<span>Photo unavailable</span>} />
                  <span>Photo will be carried into the destination where supported.</span>
                </div>
              )}
              {quickNoteMessage && <p className="form-error-message" role="alert">{quickNoteMessage}</p>}
              <div className="form-actions">
                <button type="submit">Save conversion</button>
                <button type="button" className="secondary-button" onClick={() => setQuickNoteConversion(null)}>
                  Cancel — keep unprocessed
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {showQuickNoteForm && (
        <div className="tracker-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeQuickNote();
        }}>
          <section className="tracker-modal quick-note-modal" role="dialog" aria-modal="true" aria-labelledby="quick-note-form-heading">
            <div className="tracker-modal-heading">
              <div><p className="detail-eyebrow">Capture now, organize later</p><h3 id="quick-note-form-heading">New Journal Entry</h3></div>
              <button type="button" className="secondary-button" onClick={closeQuickNote}>Close</button>
            </div>
            <form onSubmit={createQuickNote}>
              <div className="form-field">
                <label htmlFor="quick-note-text">Observation</label>
                <textarea id="quick-note-text" rows="5" required autoFocus value={quickNoteDraft.text}
                  onChange={(event) => setQuickNoteDraft((draft) => ({ ...draft, text: event.target.value }))} />
              </div>
              <div className="form-field">
                <label htmlFor="quick-note-plant">Plant (optional)</label>
                <select id="quick-note-plant" value={quickNoteDraft.plantId}
                  onChange={(event) => setQuickNoteDraft((draft) => ({ ...draft, plantId: event.target.value }))}>
                  <option value="">General / assign later</option>
                  {plants.map((plant) => <option key={plant.id} value={plant.id}>{plant.name}</option>)}
                </select>
              </div>
              <ImageUploadField id="quick-note-photo" value={quickNoteDraft.photoUrl}
                onChange={(photoUrl) => setQuickNoteDraft((draft) => ({ ...draft, photoUrl }))}
                onFileSelected={(file) => {
                  if (quickNotePreviewUrl) URL.revokeObjectURL(quickNotePreviewUrl);
                  setQuickNoteFile(file);
                  setQuickNotePreviewUrl(file ? URL.createObjectURL(file) : '');
                }}
                selectedFileName={quickNoteFile?.name || ''}
                previewUrl={quickNotePreviewUrl}
                disabled={isQuickNoteSubmitting} />
              {quickNoteMessage && <p className="form-error-message" role="alert">{quickNoteMessage}</p>}
              <div className="form-actions">
                <button type="submit" disabled={isQuickNoteSubmitting}>
                  {isQuickNoteSubmitting ? 'Saving...' : 'Save Journal Entry'}
                </button>
                <button type="button" className="secondary-button" onClick={closeQuickNote}>Cancel</button>
              </div>
            </form>
          </section>
        </div>
      )}
      {showReturnToTop && !trackerEditor && !showQuickNoteForm && !quickNoteConversion
        && !profilePhotoLightboxOpen && !timelineLightboxPhoto && !showPhotoComparison && (
        <button type="button" className="return-to-top" aria-label="Return to top"
          onClick={() => window.scrollTo({
            top: 0,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
          })}>
          ↑
        </button>
      )}
    </main>
  );
}

export default App;
