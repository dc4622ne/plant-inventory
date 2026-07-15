export const backupSchemaVersion = 3;
export const appStoragePrefix = 'plant-inventory-';

export const storageKeys = {
  plants: 'plant-inventory-plants',
  dropdownOptions: 'plant-inventory-dropdown-options',
  wishlistItems: 'plant-inventory-wishlist',
  reminders: 'plant-inventory-reminders',
  gardenBeds: 'plant-inventory-garden-beds',
  plantSpaces: 'plant-inventory-plant-spaces',
  plantViewMode: 'plant-inventory-view-mode',
  plantPageSizes: 'plant-inventory-page-sizes',
  localMeta: 'plant-inventory-local-meta',
  restoreSafetySnapshot: 'plant-inventory-restore-safety-snapshot',
  clientId: 'plant-inventory-client-id',
};

export const backupCollectionRegistry = [
  { id: 'plants', label: 'Plants', storageKey: storageKeys.plants, kind: 'array' },
  { id: 'dropdownOptions', label: 'Custom dropdown values', storageKey: storageKeys.dropdownOptions, kind: 'object' },
  { id: 'wishlistItems', label: 'Wishlist', storageKey: storageKeys.wishlistItems, kind: 'array' },
  { id: 'reminders', label: 'Reminders and completed check-ins', storageKey: storageKeys.reminders, kind: 'array' },
  { id: 'gardenBeds', label: 'Garden beds, crops, activity, and harvests', storageKey: storageKeys.gardenBeds, kind: 'array' },
  { id: 'plantSpaces', label: 'Plant spaces and visual placements', storageKey: storageKeys.plantSpaces, kind: 'array' },
  { id: 'preferences', label: 'Settings and user preferences', storageKey: null, kind: 'object' },
];

const registeredStorageKeys = new Set([
  ...Object.values(storageKeys),
]);

function safeParseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function objectValue(value) {
  return isPlainObject(value) ? value : {};
}

function normalizeStorageString(value) {
  return typeof value === 'string' ? value : JSON.stringify(value ?? '');
}

export function getClientId() {
  const savedClientId = localStorage.getItem(storageKeys.clientId);
  if (savedClientId) return savedClientId;
  const generatedClientId = `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(storageKeys.clientId, generatedClientId);
  return generatedClientId;
}

export function markLocalDataChanged(reason = 'local-change') {
  localStorage.setItem(storageKeys.localMeta, JSON.stringify({
    lastModifiedAt: new Date().toISOString(),
    reason,
    clientId: getClientId(),
  }));
}

export function getLocalMetadata() {
  return {
    lastModifiedAt: '',
    reason: '',
    clientId: getClientId(),
    ...objectValue(safeParseJson(localStorage.getItem(storageKeys.localMeta), {})),
  };
}

export function getAppStorageData() {
  return Object.fromEntries(
    Object.keys(localStorage)
      .filter((key) => key.startsWith(appStoragePrefix))
      .map((key) => [key, localStorage.getItem(key)]),
  );
}

function getExtraLocalStorage() {
  return Object.fromEntries(
    Object.entries(getAppStorageData())
      .filter(([key]) => !registeredStorageKeys.has(key))
      .map(([key, value]) => [key, value ?? '']),
  );
}

export function assembleBackup({
  plants,
  dropdownOptions,
  wishlistItems,
  gardenBeds,
  plantSpaces,
  reminders,
  appVersion,
}) {
  const exportedAt = new Date().toISOString();
  return {
    app: 'plant-inventory',
    schemaVersion: backupSchemaVersion,
    appVersion,
    exportedAt,
    deviceId: getClientId(),
    data: {
      plants: arrayValue(plants),
      dropdownOptions: objectValue(dropdownOptions),
      wishlistItems: arrayValue(wishlistItems),
      gardenBeds: arrayValue(gardenBeds),
      plantSpaces: arrayValue(plantSpaces),
      reminders: arrayValue(reminders),
      preferences: {
        plantViewMode: localStorage.getItem(storageKeys.plantViewMode) || 'cards',
        plantPageSizes: objectValue(safeParseJson(localStorage.getItem(storageKeys.plantPageSizes), {})),
      },
      extraLocalStorage: getExtraLocalStorage(),
    },
  };
}

function normalizeNewBackup(rawBackup) {
  const data = objectValue(rawBackup.data);
  return {
    app: rawBackup.app,
    schemaVersion: Number(rawBackup.schemaVersion) || backupSchemaVersion,
    appVersion: String(rawBackup.appVersion || 'unknown'),
    exportedAt: String(rawBackup.exportedAt || ''),
    deviceId: String(rawBackup.deviceId || ''),
    data: {
      ...data,
      plants: arrayValue(data.plants),
      dropdownOptions: objectValue(data.dropdownOptions),
      wishlistItems: arrayValue(data.wishlistItems),
      gardenBeds: arrayValue(data.gardenBeds),
      plantSpaces: arrayValue(data.plantSpaces),
      reminders: arrayValue(data.reminders),
      preferences: {
        ...objectValue(data.preferences),
        plantPageSizes: objectValue(data.preferences?.plantPageSizes),
      },
      extraLocalStorage: objectValue(data.extraLocalStorage),
    },
  };
}

function normalizeLegacyBackup(rawBackup) {
  const storage = objectValue(rawBackup.storage);
  const preferences = {
    plantViewMode: storage[storageKeys.plantViewMode] || 'cards',
    plantPageSizes: objectValue(safeParseJson(storage[storageKeys.plantPageSizes], {})),
  };

  const extraLocalStorage = Object.fromEntries(
    Object.entries(storage)
      .filter(([key]) => key.startsWith(appStoragePrefix) && !registeredStorageKeys.has(key))
      .map(([key, value]) => [key, normalizeStorageString(value)]),
  );

  return {
    app: rawBackup.app,
    schemaVersion: 1,
    appVersion: `legacy-v${rawBackup.version || 'unknown'}`,
    exportedAt: String(rawBackup.exportedAt || ''),
    deviceId: '',
    data: {
      plants: arrayValue(rawBackup.plants),
      dropdownOptions: objectValue(rawBackup.dropdownOptions),
      wishlistItems: arrayValue(rawBackup.wishlistItems),
      gardenBeds: arrayValue(rawBackup.gardenBeds),
      plantSpaces: arrayValue(rawBackup.plantSpaces),
      reminders: arrayValue(rawBackup.reminders),
      preferences,
      extraLocalStorage,
    },
  };
}

function validateNormalizedBackup(backup) {
  if (backup.app !== 'plant-inventory') return 'This is not a Plant Tracker backup.';
  if (!backup.exportedAt || Number.isNaN(Date.parse(backup.exportedAt))) {
    return 'This backup is missing a valid creation date.';
  }
  if (!Array.isArray(backup.data.plants)) return 'The plants collection is malformed.';
  if (!isPlainObject(backup.data.dropdownOptions)) return 'The dropdown values collection is malformed.';
  if (!Array.isArray(backup.data.wishlistItems)) return 'The wishlist collection is malformed.';
  if (!Array.isArray(backup.data.gardenBeds)) return 'The garden collection is malformed.';
  if (!Array.isArray(backup.data.plantSpaces)) return 'The plant spaces collection is malformed.';
  if (!Array.isArray(backup.data.reminders)) return 'The reminders collection is malformed.';
  if (!isPlainObject(backup.data.preferences)) return 'The preferences collection is malformed.';
  if (!isPlainObject(backup.data.extraLocalStorage)) return 'The extra local storage collection is malformed.';

  const arraysAreObjects = [
    ['plants', backup.data.plants],
    ['wishlistItems', backup.data.wishlistItems],
    ['gardenBeds', backup.data.gardenBeds],
    ['plantSpaces', backup.data.plantSpaces],
    ['reminders', backup.data.reminders],
  ].every(([, items]) => items.every((item) => isPlainObject(item)));
  if (!arraysAreObjects) return 'One or more backup records is malformed.';

  const dropdownsValid = Object.values(backup.data.dropdownOptions).every((options) => (
    Array.isArray(options) && options.every((option) => typeof option === 'string')
  ));
  if (!dropdownsValid) return 'The dropdown values collection is malformed.';

  const extraStorageValid = Object.entries(backup.data.extraLocalStorage).every(([key, value]) => (
    key.startsWith(appStoragePrefix) && !registeredStorageKeys.has(key) && typeof value === 'string'
  ));
  if (!extraStorageValid) return 'The extra local storage collection is malformed.';

  return '';
}

export function normalizeBackup(rawBackup) {
  const backup = rawBackup?.schemaVersion
    ? normalizeNewBackup(rawBackup)
    : normalizeLegacyBackup(rawBackup || {});
  const error = validateNormalizedBackup(backup);
  if (error) return { ok: false, error };
  return { ok: true, backup, summary: getBackupSummary(backup) };
}

export function getBackupSummary(backup) {
  const data = backup.data || {};
  const plants = arrayValue(data.plants);
  const gardenBeds = arrayValue(data.gardenBeds);
  const plantSpaces = arrayValue(data.plantSpaces);
  const trackerFields = [
    'tcStage', 'tcDeflaskDate', 'tcAcclimationStartDate', 'tcAcclimationEndDate', 'tcSetup', 'tcHumidityLevel', 'tcNotes',
    'lecaStatus', 'lecaConversionStartDate', 'lecaRootStatus', 'lecaReservoirSetup', 'lecaNutrientStatus', 'lecaFlushRhythm', 'lecaStressLevel', 'lecaNotes',
    'pestQuarantineStartDate', 'pestQuarantineEndDate', 'doNotTouchUntil', 'propagationStatus',
  ];

  return {
    plants: plants.length,
    wishlistItems: arrayValue(data.wishlistItems).length,
    reminders: arrayValue(data.reminders).length,
    timelineEntries: plants.reduce((count, plant) => count + arrayValue(plant.timelineEntries).length, 0),
    photoLogEntries: plants.reduce((count, plant) => count + arrayValue(plant.photoLog).length, 0),
    gardenBeds: gardenBeds.length,
    gardenCrops: gardenBeds.reduce((count, bed) => count + arrayValue(bed.crops).length, 0),
    plantSpaces: plantSpaces.length,
    plantSpacePlacements: plantSpaces.reduce((count, space) => count + arrayValue(space.placements).length, 0),
    trackerRecords: plants.filter((plant) => trackerFields.some((fieldName) => {
      const value = plant[fieldName];
      return Array.isArray(value) ? value.length : Boolean(String(value ?? '').trim());
    })).length,
    createdAt: backup.exportedAt,
    appVersion: backup.appVersion,
    schemaVersion: backup.schemaVersion,
    deviceId: backup.deviceId || 'Unknown device',
  };
}

export function formatBackupSummary(summary) {
  return [
    `Plants: ${summary.plants}`,
    `Wishlist: ${summary.wishlistItems}`,
    `Reminders: ${summary.reminders}`,
    `Timeline entries: ${summary.timelineEntries}`,
    `Photo Log entries: ${summary.photoLogEntries}`,
    `Garden beds: ${summary.gardenBeds}`,
    `Garden crops: ${summary.gardenCrops}`,
    `Plant spaces: ${summary.plantSpaces}`,
    `Plant placements: ${summary.plantSpacePlacements}`,
    `Tracker records: ${summary.trackerRecords}`,
  ].join('\n');
}

export function describeBackup(backup) {
  const summary = getBackupSummary(backup);
  return [
    `Backup created: ${new Date(summary.createdAt).toLocaleString()}`,
    `App version: ${summary.appVersion}`,
    `Schema version: ${summary.schemaVersion}`,
    formatBackupSummary(summary),
  ].join('\n');
}

export function backupHasZeroPlantsWarning(backup, currentPlantCount) {
  return currentPlantCount > 0 && getBackupSummary(backup).plants === 0
    ? 'Warning: this backup contains zero plants, but your current app has plants.'
    : '';
}

export function createRestoreSafetySnapshot(currentBackup) {
  localStorage.setItem(storageKeys.restoreSafetySnapshot, JSON.stringify({
    createdAt: new Date().toISOString(),
    backup: currentBackup,
  }));
}

export function getRestoreSafetySnapshot() {
  const snapshot = objectValue(safeParseJson(localStorage.getItem(storageKeys.restoreSafetySnapshot), {}));
  const normalized = normalizeBackup(snapshot.backup);
  return normalized.ok ? { createdAt: snapshot.createdAt || normalized.backup.exportedAt, backup: normalized.backup } : null;
}

export function applyBackupToLocalStorage(backup, { createSnapshot = true, currentBackup = null } = {}) {
  if (createSnapshot && currentBackup) createRestoreSafetySnapshot(currentBackup);

  const keysToReplace = [
    storageKeys.plants,
    storageKeys.dropdownOptions,
    storageKeys.wishlistItems,
    storageKeys.reminders,
    storageKeys.gardenBeds,
    storageKeys.plantSpaces,
    storageKeys.plantViewMode,
    storageKeys.plantPageSizes,
  ];

  keysToReplace.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem(storageKeys.plants, JSON.stringify(backup.data.plants));
  localStorage.setItem(storageKeys.dropdownOptions, JSON.stringify(backup.data.dropdownOptions));
  localStorage.setItem(storageKeys.wishlistItems, JSON.stringify(backup.data.wishlistItems));
  localStorage.setItem(storageKeys.reminders, JSON.stringify(backup.data.reminders));
  localStorage.setItem(storageKeys.gardenBeds, JSON.stringify(backup.data.gardenBeds));
  localStorage.setItem(storageKeys.plantSpaces, JSON.stringify(backup.data.plantSpaces));
  localStorage.setItem(storageKeys.plantViewMode, backup.data.preferences.plantViewMode || 'cards');
  localStorage.setItem(storageKeys.plantPageSizes, JSON.stringify(objectValue(backup.data.preferences.plantPageSizes)));

  Object.entries(backup.data.extraLocalStorage).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });

  markLocalDataChanged('restore');
}

export function auditBackupCoverage() {
  const missing = backupCollectionRegistry
    .filter((collection) => collection.id !== 'preferences')
    .filter((collection) => !collection.storageKey)
    .map((collection) => collection.id);

  return {
    ok: missing.length === 0,
    registeredCollections: backupCollectionRegistry.map((collection) => collection.id),
    missing,
  };
}
