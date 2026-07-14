import { useEffect, useRef, useState } from 'react';
import './App.css';
import Garden from './Garden';
import Resources from './ResourceLibrary';
import { changelog, currentAppVersion } from './appVersion';
import { gardenStorageKey, getGardenMetrics, loadGardenBeds } from './gardenData';
import ImageUploadField, { SafeImage } from './ImageUploadField';
import { uploadStoredImage } from './imageUploadUtils';
import {
  getSoilMixByValue,
  getSoilMixDisplayName,
  soilMixGuideResourceId,
  soilMixOptions,
} from './resources';
import { isSupabaseConfigured, supabase } from './supabaseClient';

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
  name: '', genus: '', imageUrl: '', type: '', source: '', location: '', status: '', attention: 'Medium',
  lastWatered: '', repotDate: '', watering: '', careNote: '', lightNeeds: '', medium: '',
  wateringRhythm: '', moisturePreference: '', careDifficulty: '',
  potSize: '', thirstLevel: '', soilMix: '', acquiredDate: '', purchasePrice: '', wishlistStatus: 'Owned',
  propagationStatus: '', pestQuarantineStartDate: '', pestQuarantineEndDate: '',
  pestNotes: '', growthNotes: '', activityLog: [], photoLog: [],
  tcStage: '', tcDeflaskDate: '', tcAcclimationStartDate: '', tcAcclimationEndDate: '',
  tcSetup: '', tcHumidityLevel: '', tcNotes: '',
  trackLecaConversion: false, lecaStatus: '', lecaConversionStartDate: '', lecaRootStatus: '',
  lecaReservoirSetup: '', lecaNutrientStatus: '', lecaFlushRhythm: '', lecaStressLevel: '', lecaNotes: '',
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
const tcStageOptions = [
  'In vitro / unopened', 'Deflasked', 'Community cup', 'High humidity acclimation',
  'Venting', 'Transitioning to ambient', 'Fully acclimated', 'Failed / lost',
];
const tcSetupOptions = [
  'Original TC cup', 'Community cup', 'Prop box', 'Humidity dome',
  'Greenhouse cabinet', 'Open air', 'Other',
];
const tcHumidityOptions = ['Very high', 'High', 'Moderate', 'Ambient'];
const acclimatingTcStages = [
  'Deflasked', 'Community cup', 'High humidity acclimation', 'Venting',
  'Transitioning to ambient',
];
const lecaStatusOptions = ['Planning', 'Converted', 'Transitioning', 'Rooting', 'Stable', 'Struggling', 'Failed / reverted to soil'];
const lecaRootStatusOptions = ['No new roots yet', 'Existing roots adapting', 'New water roots showing', 'Strong water roots', 'Root rot concern', 'Root trim done'];
const lecaReservoirOptions = ['No reservoir yet', 'Low reservoir', 'Standard reservoir', 'Wick system', 'Cachepot setup', 'Self-watering pot', 'Other'];
const lecaNutrientOptions = ['Plain water', 'Diluted nutrients', 'Full nutrients', 'Flush only', 'Paused nutrients'];
const lecaFlushOptions = ['Weekly', 'Every 2 weeks', 'Monthly', 'As needed'];
const lecaStressOptions = ['No stress', 'Mild droop', 'Leaf yellowing', 'Leaf drop', 'Severe stress', 'Recovering'];
const lecaTransitionStatuses = ['Transitioning', 'Rooting'];
const lecaStressLevels = ['Leaf yellowing', 'Leaf drop', 'Severe stress'];

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

const plantsStorageKey = 'plant-inventory-plants';
const dropdownOptionsStorageKey = 'plant-inventory-dropdown-options';
const wishlistStorageKey = 'plant-inventory-wishlist';
const plantViewModeStorageKey = 'plant-inventory-view-mode';
const plantPageSizesStorageKey = 'plant-inventory-page-sizes';
const appStoragePrefix = 'plant-inventory-';
const backupFormatVersion = 1;
const cloudBackupTable = 'app_backups';
const cloudBackupId = 'primary';
const defaultPlantPageSizes = { cards: 12, gallery: 18, compact: 25 };

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

function getAppStorageData() {
  return Object.fromEntries(
    Object.keys(localStorage)
      .filter((key) => key.startsWith(appStoragePrefix))
      .map((key) => [key, localStorage.getItem(key)]),
  );
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

function validateBackup(backup) {
  const hasValidPlants = Array.isArray(backup?.plants)
    && backup.plants.every((plant) => plant && typeof plant === 'object' && !Array.isArray(plant));
  const hasValidOptions = backup?.dropdownOptions
    && typeof backup.dropdownOptions === 'object'
    && !Array.isArray(backup.dropdownOptions)
    && Object.values(backup.dropdownOptions).every((options) => (
      Array.isArray(options) && options.every((option) => typeof option === 'string')
    ));
  const hasValidStorage = backup?.storage
    && typeof backup.storage === 'object'
    && !Array.isArray(backup.storage)
    && Object.entries(backup.storage).every(([key, value]) => (
      key.startsWith(appStoragePrefix) && typeof value === 'string'
    ));
  const hasValidWishlist = backup?.wishlistItems === undefined || (
    Array.isArray(backup.wishlistItems)
    && backup.wishlistItems.every((item) => item && typeof item === 'object' && !Array.isArray(item))
  );
  const hasValidGarden = backup?.gardenBeds === undefined || (
    Array.isArray(backup.gardenBeds)
    && backup.gardenBeds.every((bed) => bed && typeof bed === 'object' && !Array.isArray(bed))
  );

  return backup?.app === 'plant-inventory'
    && backup.version === backupFormatVersion
    && hasValidPlants
    && hasValidOptions
    && hasValidWishlist
    && hasValidGarden
    && hasValidStorage;
}

function loadPlants() {
  const savedPlants = localStorage.getItem(plantsStorageKey);
  const plantsWithLogs = initialPlants.map((plant) => ({
    ...plant, activityLog: [], photoLog: [],
  }));

  if (!savedPlants) return plantsWithLogs;

  try {
    const parsedPlants = JSON.parse(savedPlants);
    if (!Array.isArray(parsedPlants)) return plantsWithLogs;

    return parsedPlants.map((plant) => {
      return {
        ...plant,
        lifecycleStatus: plant.lifecycleStatus || 'active',
        activityLog: Array.isArray(plant.activityLog) ? plant.activityLog : [],
        photoLog: Array.isArray(plant.photoLog) ? plant.photoLog : [],
      };
    });
  } catch {
    return plantsWithLogs;
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

function PlantImage({ plant, detail = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = plant.imageUrl?.trim();
  const className = `plant-image${detail ? ' detail-image' : ''}`;

  if (imageUrl && !imageFailed) {
    return (
      <span className={className}>
        <img
          src={imageUrl}
          alt={`${plant.name} plant`}
          onError={() => setImageFailed(true)}
        />
      </span>
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

  return (
    <div className="photo-log-image">
      {!imageFailed ? (
        <img src={entry.photoUrl} alt={`${plantName}: ${entry.photoType}`}
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

const missingFilterValue = '__missing__';
const emptyPlantFilters = {
  genus: '', type: '', status: '', location: '',
  medium: '', potSize: '', attention: '', thirstLevel: '', soilMix: '',
  wateringRhythm: '', moisturePreference: '', careDifficulty: '',
  tcStage: '',
  lecaStatus: '', lecaStressLevel: '',
};

function normalizedFilterValue(value) {
  return String(value ?? '').trim();
}

function isTissueCulture(plant) {
  return normalizedFilterValue(plant.type).toLowerCase() === 'tissue culture';
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
  return isLecaMedium(plant) || isSemiHydro(plant) || Boolean(plant.trackLecaConversion) || hasLecaTrackerData(plant);
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

function FilterDropdown({ fieldName, label, value, options, onChange }) {
  return (
    <div className="plant-filter">
      <label htmlFor={`${fieldName}-filter`}>{label}</label>
      <select id={`${fieldName}-filter`} value={value}
        onChange={(event) => onChange(event.target.value)}>
        <option value="">All</option>
        {fieldName === 'tcStage' && <option value="__acclimating__">Acclimating (all stages)</option>}
        {fieldName === 'lecaStatus' && <option value="__leca__">All LECA tracked plants</option>}
        {fieldName === 'lecaStatus' && <option value="__transitioning__">Transitioning or rooting</option>}
        {fieldName === 'lecaStressLevel' && <option value="__stress__">Stress concern</option>}
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
        <option value={missingFilterValue}>Not set</option>
      </select>
    </div>
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
  });
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
  const [gardenBeds, setGardenBeds] = useState(loadGardenBeds);
  const [gardenFilter, setGardenFilter] = useState({});
  const [appView, setAppView] = useState('dashboard');
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
  const [activeQuickView, setActiveQuickView] = useState('all-active');
  const [plantViewMode, setPlantViewMode] = useState(loadPlantViewMode);
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
  const [quickCheckMessage, setQuickCheckMessage] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const [backupMessageType, setBackupMessageType] = useState('success');
  const [cloudMessage, setCloudMessage] = useState('');
  const [cloudMessageType, setCloudMessageType] = useState('success');
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState('');
  const [cloudBusy, setCloudBusy] = useState(false);
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
  const hasNewOptionDraft = Object.values(newOptionText).some((value) => value.trim());
  const plantFormDirty = showForm && (JSON.stringify(newPlant) !== plantFormBaseline || hasNewOptionDraft || Boolean(plantImageFile));
  const wishlistFormDirty = showWishlistForm && (JSON.stringify(wishlistDraft) !== wishlistFormBaseline || hasNewOptionDraft || Boolean(wishlistImageFile));
  const hasUnsavedFormChanges = plantFormDirty || wishlistFormDirty || gardenFormDirty;

  function changePlantViewMode(nextViewMode) {
    setPlantViewMode(nextViewMode);
    setPlantPage(1);
    localStorage.setItem(plantViewModeStorageKey, nextViewMode);
  }

  function changePlantPageSize(nextPageSize) {
    const updatedPageSizes = { ...plantPageSizes, [plantViewMode]: nextPageSize };
    setPlantPageSizes(updatedPageSizes);
    setPlantPage(1);
    localStorage.setItem(plantPageSizesStorageKey, JSON.stringify(updatedPageSizes));
  }

  function openPlantDetails(plant) {
    setAppView('plants');
    setSelectedPlant(plant);
    setNewLogEntry(emptyLogEntry());
    setQuickCheckMessage('');
    cancelEditingLogEntry();
  }

  useEffect(() => {
    if (!hasUnsavedFormChanges) return undefined;
    const warnBeforeUnload = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasUnsavedFormChanges]);

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
    'name', 'genus', 'type', 'status', 'location', 'lightNeeds',
    'soilMix', 'careNote', 'watering', 'pestNotes', 'growthNotes',
    'wateringRhythm', 'moisturePreference', 'careDifficulty',
    'tcStage', 'tcSetup', 'tcHumidityLevel', 'tcNotes',
    'lecaStatus', 'lecaRootStatus', 'lecaReservoirSetup', 'lecaNutrientStatus',
    'lecaFlushRhythm', 'lecaStressLevel', 'lecaNotes',
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
  const visiblePlants = plants
    .filter((plant) => {
      const matchesLifecycle = lifecycleView === 'all'
        || (plant.lifecycleStatus || 'active') === lifecycleView;
      const matchesFilters = filterFields.every(([fieldName]) => {
        const selectedFilter = plantFilters[fieldName];
        const plantValue = normalizedFilterValue(fieldName === 'soilMix'
          ? getSoilMixDisplayName(plant[fieldName])
          : plant[fieldName]);

        if (!selectedFilter) return true;
        if (selectedFilter === missingFilterValue) return !plantValue;
        if (fieldName === 'attention' && selectedFilter === 'Watch list') {
          return ['Watch', 'Watch list'].includes(plantValue);
        }
        if (fieldName === 'tcStage' && selectedFilter === '__acclimating__') {
          return acclimatingTcStages.includes(plantValue);
        }
        if (fieldName === 'lecaStatus' && selectedFilter === '__leca__') return shouldShowLecaTracker(plant);
        if (fieldName === 'lecaStatus' && selectedFilter === '__transitioning__') return lecaTransitionStatuses.includes(plantValue);
        if (fieldName === 'lecaStressLevel' && selectedFilter === '__stress__') return hasLecaStress(plant);
        return plantValue === selectedFilter;
      });
      const matchesSearch = !normalizedSearch || searchableFields.some((fieldName) => (
        String(fieldName === 'soilMix' ? getSoilMixDisplayName(plant[fieldName]) : plant[fieldName] || '')
          .toLowerCase().includes(normalizedSearch)
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

      return matchesLifecycle && matchesFilters && matchesSearch && matchesQuarantine
        && matchesRecentlyChecked && matchesRecentlyAcquired;
    })
    .sort((firstPlant, secondPlant) => (firstPlant.genus || '').localeCompare(secondPlant.genus || ''));

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
    recentlyAcquiredFilter, plantViewMode]);

  useEffect(() => {
    if (plantPage > plantPageCount) setPlantPage(plantPageCount);
  }, [plantPage, plantPageCount]);

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
      title: 'Plants by attention status',
      description: 'Active plants',
      rows: countPlantsByField(activePlants, 'attention', attentionOptions),
      fieldName: 'attention',
    },
    {
      title: 'Plants by lifecycle state',
      description: 'All plants',
      rows: [
        { label: 'Active', count: lifecycleCounts.active, lifecycle: 'active' },
        { label: 'Archived', count: lifecycleCounts.archived, lifecycle: 'archived' },
        { label: 'Graveyard', count: lifecycleCounts.graveyard, lifecycle: 'graveyard' },
      ],
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
    setRecentlyAcquiredFilter(false);
    setActiveQuickView(matchingQuickView?.id || '');
    setLifecycleView(nextLifecycle);
    setAreMoreFiltersVisible(Boolean(
      metric.filter && advancedFilterFields.some(([fieldName]) => fieldName === metric.filter[0])
    ));
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

  function openSettings() {
    if (!confirmDiscardChanges()) return;
    resetMajorFormDrafts();
    setSelectedPlant(null);
    setShowForm(false);
    setIsEditing(false);
    setAddPlantMessage('');
    setQuickCheckMessage('');
    setAppView('settings');
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
    setWishlistItems(nextItems);
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
    setPlants(updatedPlants);
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
    setLifecycleView('active');
    setActiveQuickView('all-active');
    setPlantPage(1);
  }

  const quickViews = [
    { id: 'all-active', label: 'All active plants', lifecycle: 'active' },
    { id: 'leca', label: 'LECA plants', lifecycle: 'active', filter: ['lecaStatus', '__leca__'] },
    { id: 'leca-transitioning', label: 'LECA transitioning', lifecycle: 'active', filter: ['lecaStatus', '__transitioning__'] },
    { id: 'leca-stable', label: 'Stable LECA', lifecycle: 'active', filter: ['lecaStatus', 'Stable'] },
    { id: 'leca-stress', label: 'LECA stress', lifecycle: 'active', filter: ['lecaStressLevel', '__stress__'] },
    { id: 'leca-recovering', label: 'Recovering LECA', lifecycle: 'active', filter: ['lecaStressLevel', 'Recovering'] },
    { id: 'tissue-cultures', label: 'Tissue cultures', lifecycle: 'active', filter: ['type', 'Tissue Culture'] },
    { id: 'tc-acclimating', label: 'TC acclimating', lifecycle: 'active', filter: ['tcStage', '__acclimating__'] },
    { id: 'tc-acclimated', label: 'Fully acclimated TC', lifecycle: 'active', filter: ['tcStage', 'Fully acclimated'] },
    { id: 'tc-failed', label: 'Failed/lost TC', lifecycle: 'active', filter: ['tcStage', 'Failed / lost'] },
    { id: 'new', label: 'New plants', lifecycle: 'active', recentlyAcquired: true },
    { id: 'quarantine', label: 'In quarantine', lifecycle: 'active', quarantine: 'current' },
    { id: 'pest-quarantine', label: 'Pest quarantine', lifecycle: 'active', quarantine: 'pest' },
    { id: 'attention', label: 'Needs attention', lifecycle: 'active', filter: ['attention', 'High'] },
    { id: 'watch-list', label: 'Watch list', lifecycle: 'active', filter: ['attention', 'Watch list'] },
    { id: 'rehab', label: 'Rehab plants', lifecycle: 'active', filter: ['careDifficulty', 'Rehab / watch closely'] },
    { id: 'fussy', label: 'Fussy plants', lifecycle: 'active', filter: ['careDifficulty', 'Fussy'] },
    { id: 'keep-moist', label: 'Keep moist plants', lifecycle: 'active', filter: ['wateringRhythm', 'Keep moist'] },
    { id: 'recently-checked', label: 'Recently checked', lifecycle: 'active', recentlyChecked: true },
    { id: 'archived', label: 'Archived plants', lifecycle: 'archived' },
    { id: 'graveyard', label: 'Graveyard plants', lifecycle: 'graveyard' },
  ];

  function applyQuickView(quickView) {
    const nextFilters = { ...emptyPlantFilters };
    if (quickView.filter) nextFilters[quickView.filter[0]] = quickView.filter[1];

    setSearchText('');
    setPlantFilters(nextFilters);
    setLifecycleView(quickView.lifecycle);
    setQuarantineFilter(quickView.quarantine || '');
    setRecentlyCheckedFilter(Boolean(quickView.recentlyChecked));
    setRecentlyAcquiredFilter(Boolean(quickView.recentlyAcquired));
    setAreMoreFiltersVisible(Boolean(
      quickView.filter
      && advancedFilterFields.some(([fieldName]) => fieldName === quickView.filter[0])
    ));
    setActiveQuickView(quickView.id);
    setPlantPage(1);
  }

  function createBackup() {
    return {
      app: 'plant-inventory',
      version: backupFormatVersion,
      exportedAt: new Date().toISOString(),
      plants,
      dropdownOptions,
      wishlistItems,
      gardenBeds,
      storage: getAppStorageData(),
    };
  }

  function exportData() {
    const backup = createBackup();
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
    setBackupMessageType('success');
    setBackupMessage('Backup exported successfully.');
  }

  function restoreBackup(backup, returnToDashboard = true) {
    const previousStorage = getAppStorageData();
    try {
      Object.keys(previousStorage).forEach((key) => localStorage.removeItem(key));
      Object.entries(backup.storage).forEach(([key, value]) => localStorage.setItem(key, value));
      // These named values are the source of truth, even if a backup contains stale storage copies.
      localStorage.setItem(plantsStorageKey, JSON.stringify(backup.plants));
      localStorage.setItem(dropdownOptionsStorageKey, JSON.stringify(backup.dropdownOptions));
      if (Array.isArray(backup.wishlistItems)) {
        localStorage.setItem(wishlistStorageKey, JSON.stringify(backup.wishlistItems));
      }
      if (Array.isArray(backup.gardenBeds)) {
        localStorage.setItem(gardenStorageKey, JSON.stringify(backup.gardenBeds));
      }

      setPlants(loadPlants());
      setDropdownOptions(loadDropdownOptions());
      setWishlistItems(loadWishlistItems());
      setGardenBeds(loadGardenBeds());
      setSelectedPlant(null);
      setShowForm(false);
      setIsEditing(false);
      if (returnToDashboard) setAppView('dashboard');
      clearAllFilters();
      setLifecycleView('active');
      return true;
    } catch {
      Object.keys(getAppStorageData()).forEach((key) => localStorage.removeItem(key));
      Object.entries(previousStorage).forEach(([key, value]) => localStorage.setItem(key, value));
      setPlants(loadPlants());
      setDropdownOptions(loadDropdownOptions());
      setWishlistItems(loadWishlistItems());
      setGardenBeds(loadGardenBeds());
      return false;
    }
  }

  async function checkCloudStatus() {
    if (!isSupabaseConfigured) {
      setCloudMessageType('error');
      setCloudMessage('Supabase is not configured. Add the environment variables described in the README.');
      return;
    }
    setCloudBusy(true);
    setCloudMessage('');
    const { data, error } = await supabase
      .from(cloudBackupTable)
      .select('updated_at')
      .eq('id', cloudBackupId)
      .maybeSingle();
    setCloudBusy(false);
    if (error) {
      setCloudMessageType('error');
      setCloudMessage('Cloud status could not be checked. Confirm the Supabase table and access policy are set up.');
      return;
    }
    setCloudUpdatedAt(data?.updated_at || '');
    setCloudMessageType('success');
    setCloudMessage(data ? 'Cloud backup is available.' : 'Supabase is connected, but no cloud backup has been saved yet.');
  }

  async function saveToCloud() {
    if (!isSupabaseConfigured) {
      setCloudMessageType('error');
      setCloudMessage('Supabase is not configured. Add the environment variables described in the README.');
      return;
    }
    setCloudBusy(true);
    setCloudMessage('');
    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from(cloudBackupTable).upsert({
      id: cloudBackupId,
      data: createBackup(),
      updated_at: updatedAt,
    });
    setCloudBusy(false);
    if (error) {
      setCloudMessageType('error');
      setCloudMessage('Your data could not be saved to the cloud. Your local data is unchanged. Check the Supabase setup and try again.');
      return;
    }
    setCloudUpdatedAt(updatedAt);
    setCloudMessageType('success');
    setCloudMessage('Cloud backup saved successfully. Your local data is still here.');
  }

  async function loadFromCloud() {
    if (!isSupabaseConfigured) {
      setCloudMessageType('error');
      setCloudMessage('Supabase is not configured. Add the environment variables described in the README.');
      return;
    }
    if (!window.confirm(
      'Loading from cloud will replace the current local browser data. This cannot be undone unless you have another backup. Continue?',
    )) return;

    setCloudBusy(true);
    setCloudMessage('');
    const { data, error } = await supabase
      .from(cloudBackupTable)
      .select('data, updated_at')
      .eq('id', cloudBackupId)
      .maybeSingle();
    setCloudBusy(false);
    if (error) {
      setCloudMessageType('error');
      setCloudMessage('The cloud backup could not be loaded. Your local data was not changed.');
      return;
    }
    if (!data || !validateBackup(data.data)) {
      setCloudMessageType('error');
      setCloudMessage('No valid cloud backup was found. Your local data was not changed.');
      return;
    }
    if (!restoreBackup(data.data, false)) {
      setCloudMessageType('error');
      setCloudMessage('The cloud backup could not be restored. Your previous local data has been put back.');
      return;
    }
    setCloudUpdatedAt(data.updated_at || '');
    setCloudMessageType('success');
    setCloudMessage('Cloud backup loaded successfully. Your local browser data has been restored.');
  }

  function exportPlantsCsv() {
    const columns = [
      ['Plant Name', (plant) => plant.name],
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

    let backup;
    try {
      backup = JSON.parse(await file.text());
    } catch {
      setBackupMessageType('error');
      setBackupMessage('That file is not valid JSON. Please choose a backup exported from this app.');
      return;
    }

    if (!validateBackup(backup)) {
      setBackupMessageType('error');
      setBackupMessage('That file is not a valid Plant Inventory backup. Your current data was not changed.');
      return;
    }

    if (!window.confirm(
      'Importing this backup will replace your current local Plant Inventory data. Continue?',
    )) return;

    if (restoreBackup(backup)) {
      setBackupMessageType('success');
      setBackupMessage('Backup imported successfully. Your restored plants are ready.');
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
        imageUrl: uploadedImageUrl,
        image: getPlantImage(newPlant.name, newPlant.type),
      };

      // Keep older text values unless the user chooses a replacement date.
      if (isEditing) {
        ['lastWatered', 'repotDate', 'acquiredDate', 'pestQuarantineStartDate', 'pestQuarantineEndDate'].forEach((fieldName) => {
          const previousValue = selectedPlant[fieldName];
          const isLegacyText = previousValue && !dateInputValue(previousValue);

          if (!newPlant[fieldName] && isLegacyText) savedPlant[fieldName] = previousValue;
        });
      }
      const updatedPlants = isEditing
        ? plants.map((plant) => plant === selectedPlant ? savedPlant : plant)
        : [...plants, savedPlant];

      localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
      setPlants(updatedPlants);

      if (isEditing) setSelectedPlant(savedPlant);
      setNewPlant(emptyPlant);
      setPlantFormBaseline(JSON.stringify(emptyPlant));
      clearPlantImageSelection();
      setNewOptionText({ genus: '', type: '', source: '', desiredStatus: '', status: '', location: '', lightNeeds: '', soilMix: '', wateringRhythm: '', moisturePreference: '', careDifficulty: '', tcStage: '', tcSetup: '', tcHumidityLevel: '' });
      setShowForm(shouldAddAnother);
      setAddPlantMessage(shouldAddAnother ? 'Plant added. Ready for the next one.' : '');
      setIsEditing(false);
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
    if (!value) return '';
    return getSoilMixByValue(value)?.id || '__custom__';
  }

  function handleSoilMixSelectChange(event) {
    const value = event.target.value;
    setNewPlant((currentPlant) => ({
      ...currentPlant,
      soilMix: value === '__custom__'
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
      tcDeflaskDate: dateInputValue(selectedPlant.tcDeflaskDate),
      tcAcclimationStartDate: dateInputValue(selectedPlant.tcAcclimationStartDate),
      tcAcclimationEndDate: dateInputValue(selectedPlant.tcAcclimationEndDate),
      lecaConversionStartDate: dateInputValue(selectedPlant.lecaConversionStartDate),
    };
    setNewPlant(editablePlant);
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
    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    setPlants(updatedPlants);
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
    setPlants(updatedPlants);
    setSelectedPlant(nextStatus === 'active' ? updatedPlant : null);
    setLifecycleView(nextStatus);
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
    setPlants(updatedPlants);
    setSelectedPlant(updatedPlant);
    if (editingLogEntry === entryToDelete) cancelEditingLogEntry();
  }

  function savePhotoLog(photoLog) {
    const updatedPlant = { ...selectedPlant, photoLog };
    const updatedPlants = plants.map((plant) => plant === selectedPlant ? updatedPlant : plant);

    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
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
          <div className="detail-heading">
            <PlantImage key={selectedPlant.imageUrl || 'placeholder'} plant={selectedPlant} detail />
            <div>
              <p className="detail-eyebrow">Plant details</p>
              <h2 id="plant-detail-heading">{selectedPlant.name}</h2>
              <p>{displayValue(selectedPlant.genus)} · {displayValue(selectedPlant.type)}</p>
              <p className={`lifecycle-badge lifecycle-${selectedPlant.lifecycleStatus || 'active'}`}>
                {lifecycleLabel(selectedPlant.lifecycleStatus)}
              </p>
              <PlantBadges plant={selectedPlant} />
            </div>
          </div>
          <div className="quick-check-in-panel">
            <div>
              <strong>Last checked</strong>
              <span>{displayValue(getLastCheckedDate(selectedPlant))}</span>
            </div>
            <button type="button" onClick={addQuickCheckIn}>✅ Quick Check-In</button>
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
            {getDetailSections(selectedPlant).map((section) => (
              <section className="detail-section" key={section.title}>
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
              <section className="detail-section tc-detail-section">
                <h3>TC Acclimation</h3>
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
                ) : <p className="tc-empty-message">No TC acclimation details added yet.</p>}
              </section>
            )}
            {shouldShowLecaTracker(selectedPlant) && (
              <section className="detail-section leca-detail-section">
                <h3>LECA Conversion</h3>
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
                ) : <p className="tc-empty-message">No LECA conversion details added yet.</p>}
              </section>
            )}
          </div>
          <section className="photo-log" aria-labelledby="photo-log-heading">
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
          <section className="activity-log" aria-labelledby="activity-log-heading">
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
        </article>
        ) : showForm || isEditing ? (
        <form className="plant-form" onSubmit={handleSubmit}>
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
        appView === 'dashboard' ? (
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
                clearPlantImageSelection();
                setShowForm(true);
              }}>+ Add New Plant</button>
              <button className="secondary-button" type="button" onClick={() => openPlantList()}>
                View Plant List
              </button>
              <button className="secondary-button" type="button" onClick={openSettings}>
                Settings / Tools
              </button>
            </div>
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
        ) : appView === 'garden' ? (
          <Garden key={JSON.stringify(gardenFilter)} beds={gardenBeds} onChange={setGardenBeds}
            initialFilter={gardenFilter} onDirtyChange={setGardenFormDirty} />
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

          <section className="settings-card" aria-labelledby="cloud-sync-heading">
            <h3 id="cloud-sync-heading">Cloud Sync</h3>
            <p>Supabase configuration: <strong>{isSupabaseConfigured ? 'Configured' : 'Not configured'}</strong></p>
            <p>Last cloud save: <strong>{cloudUpdatedAt ? new Date(cloudUpdatedAt).toLocaleString() : 'Not checked'}</strong></p>
            <p>Local browser storage is still used. Cloud sync is manual.</p>
            <div className="cloud-sync-actions">
              <button type="button" onClick={saveToCloud} disabled={cloudBusy}>Save to Cloud</button>
              <button type="button" onClick={loadFromCloud} disabled={cloudBusy}>Load from Cloud</button>
              <button type="button" onClick={checkCloudStatus} disabled={cloudBusy}>Check Cloud Status</button>
            </div>
            {cloudMessage && (
              <p className={`backup-message backup-message-${cloudMessageType}`}
                role={cloudMessageType === 'error' ? 'alert' : 'status'}>
                {cloudMessage}
              </p>
            )}
          </section>

          <section className="settings-card app-version-card" aria-labelledby="app-version-heading">
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
            <h3 id="changelog-heading">Changelog</h3>
            <div className="changelog-list">
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
          </section>

          <section className="settings-card" aria-labelledby="data-tools-heading">
            <h3 id="data-tools-heading">Data Backup</h3>
            <div className="data-tool-row">
              <div>
                <h4>Export Data</h4>
                <p>Export creates a backup JSON file containing your local app data.</p>
              </div>
              <button type="button" onClick={exportData}>Export Data</button>
            </div>
            <div className="data-tool-row">
              <div>
                <h4>Import Data</h4>
                <p>Import replaces current local app data with the selected backup.</p>
              </div>
              <button type="button" onClick={() => importInputRef.current?.click()}>Import Data</button>
              <input ref={importInputRef} className="visually-hidden" type="file"
                accept=".json,application/json" onChange={importData}
                aria-label="Choose a Plant Inventory backup file" />
            </div>
            {backupMessage && (
              <p className={`backup-message backup-message-${backupMessageType}`}
                role={backupMessageType === 'error' ? 'alert' : 'status'}>
                {backupMessage}
              </p>
            )}
          </section>

          <section className="settings-card" aria-labelledby="csv-export-heading">
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

          <section className="settings-card" aria-labelledby="app-info-heading">
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
          <p className="settings-version-footer">Grow With Gibre Plant Tracker {currentAppVersion.version}</p>
        </section>
        ) : (
        <>
        <div className="section-heading">
          <h2 className="section-title" id="plant-list-heading">Plant List</h2>
          <button className="add-plant-button" type="button" onClick={() => {
            setAddPlantMessage('');
            setNewPlant(emptyPlant);
            setPlantFormBaseline(JSON.stringify(emptyPlant));
            clearPlantImageSelection();
            setShowForm(true);
          }}
            aria-label="Add new plant" title="Add new plant">
            +
          </button>
        </div>
        <section className="quick-views" aria-labelledby="quick-views-heading">
          <h3 id="quick-views-heading">Quick Views</h3>
          <div className="quick-view-list">
            {quickViews.map((quickView) => (
              <button key={quickView.id} type="button"
                className={activeQuickView === quickView.id ? 'quick-view-active' : ''}
                aria-pressed={activeQuickView === quickView.id}
                onClick={() => applyQuickView(quickView)}>
                {quickView.label}
              </button>
            ))}
          </div>
        </section>
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
                setActiveQuickView('');
              }}>Clear</button>
            </div>
          )}
          {recentlyCheckedFilter && (
            <div className="applied-dashboard-filter" role="status">
              <span>Recently checked</span>
              <button type="button" onClick={() => {
                setRecentlyCheckedFilter(false);
                setActiveQuickView('');
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
                setActiveQuickView('');
              }}
            />
          </div>
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
            <label htmlFor="plant-page-size">Plants per page</label>
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
        <div className="plant-filter-panel" aria-label="Filter plants">
          <div className="filter-panel-heading">
            <h3>Filters</h3>
            <div className="filter-actions">
              <button className="more-filters-button" type="button"
                aria-expanded={areMoreFiltersVisible} aria-controls="advanced-plant-filters"
                onClick={() => setAreMoreFiltersVisible((isVisible) => !isVisible)}>
                {areMoreFiltersVisible ? 'Hide Filters' : 'More Filters'}
              </button>
              <button className="clear-filters-button" type="button" onClick={clearAllFilters}>
                Clear All Filters
              </button>
            </div>
          </div>
          <div className="plant-filter-dropdowns primary-filters">
            <div className="plant-filter">
              <label htmlFor="lifecycle-filter">Plant view</label>
              <select id="lifecycle-filter" value={lifecycleView}
                onChange={(event) => {
                  setLifecycleView(event.target.value);
                  setActiveQuickView('');
                }}>
                <option value="all">All Plants</option>
                <option value="active">Active Plants</option>
                <option value="archived">Archived Plants</option>
                <option value="graveyard">Graveyard Plants</option>
              </select>
            </div>
            {primaryFilterFields.map(([fieldName, label]) => (
              <FilterDropdown key={fieldName} fieldName={fieldName} label={label}
                value={plantFilters[fieldName]} options={getFilterOptions(fieldName)}
                onChange={(value) => {
                  setPlantFilters((currentFilters) => ({
                    ...currentFilters, [fieldName]: value,
                  }));
                  setActiveQuickView('');
                }} />
            ))}
          </div>
          {areMoreFiltersVisible && (
            <div className="plant-filter-dropdowns advanced-filters" id="advanced-plant-filters">
              {advancedFilterFields.map(([fieldName, label]) => (
                <FilterDropdown key={fieldName} fieldName={fieldName} label={label}
                  value={plantFilters[fieldName]} options={getFilterOptions(fieldName)}
                  onChange={(value) => {
                    setPlantFilters((currentFilters) => ({
                      ...currentFilters, [fieldName]: value,
                    }));
                    setActiveQuickView('');
                  }} />
              ))}
            </div>
          )}
        </div>
        <hr className="plant-list-divider" />
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
                <h2>{plant.name}</h2>
              </div>
              <p className="plant-type">{displayValue(plant.type)}</p>
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
    </main>
  );
}

export default App;
