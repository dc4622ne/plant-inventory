export const backupSchemaVersion = 4;
export const appStoragePrefix = 'plant-inventory-';

export const storageKeys = {
  plants: 'plant-inventory-plants',
  dropdownOptions: 'plant-inventory-dropdown-options',
  wishlistItems: 'plant-inventory-wishlist',
  reminders: 'plant-inventory-reminders',
  gardenBeds: 'plant-inventory-garden-beds',
  plantSpaces: 'plant-inventory-plant-spaces',
  quickNotes: 'plant-inventory-quick-notes',
  quickViews: 'plant-inventory-quick-views',
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
  { id: 'quickNotes', label: 'Plant Journal', storageKey: storageKeys.quickNotes, kind: 'array' },
  { id: 'quickViews', label: 'Quick Views', storageKey: storageKeys.quickViews, kind: 'array' },
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

function restoreLog(phase, status, details = {}) {
  console.info('[plant-tracker:restore]', {
    phase,
    status,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

export class RestoreError extends Error {
  constructor(code, phase, cause, diagnostics = {}) {
    super(`Restore failed during ${phase}.`);
    this.name = 'RestoreError';
    this.code = code;
    this.phase = phase;
    this.cause = cause;
    this.diagnostics = diagnostics;
  }
}

function restoreErrorCode(error, phase) {
  if (error?.name === 'QuotaExceededError' || error?.code === 22 || error?.code === 1014) {
    return `RESTORE_${phase}_QUOTA`;
  }
  return `RESTORE_${phase}_FAILED`;
}

function storageStringSize(value) {
  const characters = String(value ?? '').length;
  return { characters, approximateBytes: characters * 2 };
}

function serializedSize(value) {
  return storageStringSize(JSON.stringify(value));
}

function isEmbeddedImage(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}

function addImageSize(bucket, value) {
  if (!isEmbeddedImage(value)) return;
  const size = storageStringSize(value);
  bucket.count += 1;
  bucket.characters += size.characters;
  bucket.approximateBytes += size.approximateBytes;
}

export function analyzeBackupStorage(backup, restoreSnapshotValue = '') {
  const normalized = normalizeBackup(backup);
  if (!normalized.ok) return { ok: false, error: normalized.error };
  const data = normalized.backup.data;
  const embeddedImages = {
    plantPrimaryPhotos: { count: 0, characters: 0, approximateBytes: 0 },
    photoLogs: { count: 0, characters: 0, approximateBytes: 0 },
    handwrittenJournalImages: { count: 0, characters: 0, approximateBytes: 0 },
    timelineAndTrackerPhotos: { count: 0, characters: 0, approximateBytes: 0 },
    otherImages: { count: 0, characters: 0, approximateBytes: 0 },
  };
  const imageOccurrences = new Map();
  const registerImage = (bucket, value) => {
    addImageSize(bucket, value);
    if (isEmbeddedImage(value)) imageOccurrences.set(value, (imageOccurrences.get(value) || 0) + 1);
  };

  data.plants.forEach((plant) => {
    registerImage(embeddedImages.plantPrimaryPhotos, plant.imageUrl);
    arrayValue(plant.photoLog).forEach((entry) => registerImage(embeddedImages.photoLogs, entry.photoUrl));
    arrayValue(plant.timelineEntries).forEach((entry) => registerImage(embeddedImages.timelineAndTrackerPhotos, entry.photoUrl));
    arrayValue(plant.cormProgressPhotos).forEach((entry) => registerImage(embeddedImages.timelineAndTrackerPhotos, entry.photoUrl));
    arrayValue(plant.cormPhaseHistory).forEach((entry) => registerImage(embeddedImages.timelineAndTrackerPhotos, entry.photoUrl));
  });
  data.quickNotes.forEach((note) => registerImage(embeddedImages.handwrittenJournalImages, note.photoUrl));
  data.wishlistItems.forEach((item) => registerImage(embeddedImages.otherImages, item.imageUrl));
  data.gardenBeds.forEach((bed) => {
    registerImage(embeddedImages.otherImages, bed.imageUrl);
    arrayValue(bed.crops).forEach((crop) => registerImage(embeddedImages.otherImages, crop.imageUrl));
  });

  const contributions = {
    plantRecords: serializedSize(data.plants),
    settings: serializedSize(data.preferences),
    quickViews: serializedSize(data.quickViews),
    undoSnapshot: storageStringSize(restoreSnapshotValue),
    otherCollections: serializedSize({
      dropdownOptions: data.dropdownOptions,
      wishlistItems: data.wishlistItems,
      reminders: data.reminders,
      gardenBeds: data.gardenBeds,
      plantSpaces: data.plantSpaces,
      quickNotes: data.quickNotes,
      extraLocalStorage: data.extraLocalStorage,
    }),
  };
  const totalEmbedded = Object.values(embeddedImages).reduce((total, item) => ({
    count: total.count + item.count,
    characters: total.characters + item.characters,
    approximateBytes: total.approximateBytes + item.approximateBytes,
  }), { count: 0, characters: 0, approximateBytes: 0 });
  const duplicateEmbedded = [...imageOccurrences]
    .filter(([, count]) => count > 1)
    .reduce((total, [value, count]) => {
      total.uniqueImages += 1;
      total.extraOccurrences += count - 1;
      total.approximateDuplicateBytes += value.length * 2 * (count - 1);
      return total;
    }, { uniqueImages: 0, extraOccurrences: 0, approximateDuplicateBytes: 0 });

  return {
    ok: true,
    contributions,
    embeddedImages: { ...embeddedImages, total: totalEmbedded },
    duplicateEmbedded,
    cloudContainsUndoSnapshot: Object.hasOwn(data.extraLocalStorage, storageKeys.restoreSafetySnapshot),
    totalBackup: serializedSize(normalized.backup),
  };
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
    Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .filter(Boolean)
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
  quickNotes,
  quickViews,
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
      quickNotes: arrayValue(quickNotes),
      quickViews: arrayValue(quickViews),
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
      quickNotes: arrayValue(data.quickNotes),
      quickViews: arrayValue(data.quickViews),
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
      quickNotes: arrayValue(rawBackup.quickNotes),
      quickViews: arrayValue(rawBackup.quickViews),
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
  if (!Array.isArray(backup.data.quickNotes)) return 'The Plant Journal collection is malformed.';
  if (!Array.isArray(backup.data.quickViews)) return 'The Quick Views collection is malformed.';
  if (!isPlainObject(backup.data.preferences)) return 'The preferences collection is malformed.';
  if (!isPlainObject(backup.data.extraLocalStorage)) return 'The extra local storage collection is malformed.';

  const arraysAreObjects = [
    ['plants', backup.data.plants],
    ['wishlistItems', backup.data.wishlistItems],
    ['gardenBeds', backup.data.gardenBeds],
    ['plantSpaces', backup.data.plantSpaces],
    ['reminders', backup.data.reminders],
    ['quickNotes', backup.data.quickNotes],
    ['quickViews', backup.data.quickViews],
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
    'cormPhase', 'cormGrowthMethod', 'cormCustomGrowthMethod', 'cormStartedDate', 'cormRootEmergenceDate',
    'cormGrowthPointDate', 'cormFirstLeafEmergingDate', 'cormFirstLeafOpenedDate',
    'cormTransferDate', 'cormEstablishedDate', 'cormPhaseHistory', 'cormProgressNotes', 'cormProgressPhotos',
    'pestQuarantineStartDate', 'pestQuarantineEndDate', 'doNotTouchUntil', 'propagationStatus',
  ];

  return {
    plants: plants.length,
    wishlistItems: arrayValue(data.wishlistItems).length,
    reminders: arrayValue(data.reminders).length,
    quickNotes: arrayValue(data.quickNotes).length,
    quickViews: arrayValue(data.quickViews).length,
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
    `Plant Journal entries: ${summary.quickNotes}`,
    `Quick Views: ${summary.quickViews}`,
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
  const normalized = normalizeBackup(backup);
  if (!normalized.ok) {
    throw new RestoreError('RESTORE_VALIDATE_FAILED', 'validate', new Error(normalized.error));
  }
  const preparedBackup = normalized.backup;
  restoreLog('validate', 'complete', {
    schemaVersion: preparedBackup.schemaVersion,
    collectionCount: backupCollectionRegistry.length,
  });

  const baseKeysToReplace = [
    storageKeys.plants,
    storageKeys.dropdownOptions,
    storageKeys.wishlistItems,
    storageKeys.reminders,
    storageKeys.gardenBeds,
    storageKeys.plantSpaces,
    storageKeys.quickNotes,
    storageKeys.quickViews,
    storageKeys.plantViewMode,
    storageKeys.plantPageSizes,
  ];
  let phase = 'serialize';
  const writes = new Map();
  try {
    writes.set(storageKeys.plants, JSON.stringify(preparedBackup.data.plants));
    writes.set(storageKeys.dropdownOptions, JSON.stringify(preparedBackup.data.dropdownOptions));
    writes.set(storageKeys.wishlistItems, JSON.stringify(preparedBackup.data.wishlistItems));
    writes.set(storageKeys.reminders, JSON.stringify(preparedBackup.data.reminders));
    writes.set(storageKeys.gardenBeds, JSON.stringify(preparedBackup.data.gardenBeds));
    writes.set(storageKeys.plantSpaces, JSON.stringify(preparedBackup.data.plantSpaces));
    writes.set(storageKeys.quickNotes, JSON.stringify(preparedBackup.data.quickNotes));
    writes.set(storageKeys.quickViews, JSON.stringify(preparedBackup.data.quickViews));
    writes.set(storageKeys.plantViewMode, preparedBackup.data.preferences.plantViewMode || 'cards');
    writes.set(storageKeys.plantPageSizes, JSON.stringify(objectValue(preparedBackup.data.preferences.plantPageSizes)));
    Object.entries(preparedBackup.data.extraLocalStorage).forEach(([key, value]) => writes.set(key, value));
    restoreLog(phase, 'complete', {
      keyCount: writes.size,
      approximateBytes: [...writes].reduce((total, [key, value]) => total + (key.length + value.length) * 2, 0),
    });
  } catch (error) {
    restoreLog(phase, 'failed', { errorName: error?.name || 'Error' });
    throw new RestoreError(restoreErrorCode(error, phase.toUpperCase()), phase, error);
  }

  const keysToReplace = [...new Set([...baseKeysToReplace, ...writes.keys()])];
  const preparedSnapshotValue = createSnapshot && currentBackup
    ? JSON.stringify({ createdAt: new Date().toISOString(), backup: currentBackup })
    : '';
  const originals = new Map(keysToReplace.map((key) => [key, localStorage.getItem(key)]));
  const previousSnapshot = localStorage.getItem(storageKeys.restoreSafetySnapshot);
  const existingStorage = getAppStorageData();
  const existingStorageCharacters = Object.entries(existingStorage).reduce(
    (total, [key, value]) => total + key.length + String(value ?? '').length,
    0,
  );
  const totalRestoreCharacters = [...writes].reduce(
    (total, [key, value]) => total + key.length + value.length,
    0,
  );
  let mutationStarted = false;
  let failingKey = '';

  try {
    phase = 'prepare';
    restoreLog(phase, 'start', { keyCount: keysToReplace.length });
    keysToReplace.forEach((key) => localStorage.removeItem(key));
    mutationStarted = true;

    if (createSnapshot && currentBackup) {
      phase = 'snapshot';
      failingKey = storageKeys.restoreSafetySnapshot;
      localStorage.setItem(storageKeys.restoreSafetySnapshot, preparedSnapshotValue);
      failingKey = '';
      restoreLog(phase, 'complete');
    }

    phase = 'write';
    for (const [key, value] of writes) {
      failingKey = key;
      localStorage.setItem(key, value);
    }
    failingKey = '';
    restoreLog(phase, 'complete', { keyCount: writes.size });

    phase = 'verify';
    for (const [key, value] of writes) {
      if (localStorage.getItem(key) !== value) throw new Error(`Read-back mismatch for ${key}`);
    }
    restoreLog(phase, 'complete', { keyCount: writes.size });

    phase = 'finalize';
    markLocalDataChanged('restore');
    restoreLog(phase, 'complete');
    return { ok: true, code: 'RESTORE_OK', phase };
  } catch (error) {
    const code = restoreErrorCode(error, phase.toUpperCase());
    const failingValue = failingKey === storageKeys.restoreSafetySnapshot
      ? preparedSnapshotValue
      : failingKey ? writes.get(failingKey) || '' : '';
    const diagnostics = {
      failingKey: failingKey || (phase === 'snapshot' ? storageKeys.restoreSafetySnapshot : ''),
      failingKeyCharacters: failingValue.length,
      failingKeyApproximateBytes: failingValue.length * 2,
      totalRestoreCharacters,
      totalRestoreApproximateBytes: totalRestoreCharacters * 2,
      existingStorageCharacters,
      existingStorageApproximateBytes: existingStorageCharacters * 2,
    };
    restoreLog(phase, 'failed', { code, errorName: error?.name || 'Error', ...diagnostics });
    if (mutationStarted) {
      try {
        restoreLog('rollback', 'start', { keyCount: originals.size });
        keysToReplace.forEach((key) => localStorage.removeItem(key));
        localStorage.removeItem(storageKeys.restoreSafetySnapshot);
        for (const [key, value] of originals) {
          if (value !== null) localStorage.setItem(key, value);
        }
        if (previousSnapshot !== null) {
          localStorage.setItem(storageKeys.restoreSafetySnapshot, previousSnapshot);
        }
        for (const [key, value] of originals) {
          if (localStorage.getItem(key) !== value) throw new Error(`Rollback mismatch for ${key}`);
        }
        restoreLog('rollback', 'complete');
      } catch (rollbackError) {
        restoreLog('rollback', 'failed', { errorName: rollbackError?.name || 'Error' });
        throw new RestoreError('RESTORE_ROLLBACK_FAILED', 'rollback', rollbackError);
      }
    }
    throw new RestoreError(code, phase, error, diagnostics);
  }
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
