import test from 'node:test';
import assert from 'node:assert/strict';

class LocalStorageMock {
  constructor() {
    this.values = new Map();
    this.quota = Infinity;
  }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) {
    const next = new Map(this.values);
    next.set(String(key), String(value));
    const size = [...next].reduce((total, [storedKey, storedValue]) => (
      total + (storedKey.length + storedValue.length) * 2
    ), 0);
    if (size > this.quota) {
      const error = new Error('Storage quota exceeded');
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.values = next;
  }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

globalThis.localStorage = new LocalStorageMock();

const {
  applyBackupToLocalStorage,
  assembleBackup,
  getRestoreSafetySnapshot,
  normalizeBackup,
  storageKeys,
} = await import('./backupUtils.js');
const { migrateEmbeddedImagesInBackup } = await import('./imageAssetStore.js');

test('backup v4 round-trips quick notes and additive plant histories', () => {
  const plant = {
    id: 'plant-1',
    origin: 'Corm',
    startingStage: 'Corm',
    acquisitionMethod: 'Gift',
    lifecycleStage: 'Established Houseplant',
    lifecycleHistory: [{ id: 't1', previousStage: 'Corm', newStage: 'Established Houseplant' }],
    cormStage: 'Established',
    cormPhase: 'Established',
    cormGrowthMethod: 'Other',
    cormCustomGrowthMethod: 'Pon in a shallow tray',
    cormPhaseHistory: [{ id: 'phase-1', phase: 'Established', date: '2026-07-20' }],
    cormStartedDate: '2026-07-01',
    cormFirstLeafOpenedDate: '2026-07-15',
    cormProgressPhotos: [{ id: 'p1', photoUrl: 'https://example.com/photo.jpg' }],
  };
  const quickNotes = [
    { id: 'note-1', text: 'New root', status: 'unprocessed', plantId: '', photoUrl: '' },
    {
      id: 'note-2', text: 'Filed photo note', status: 'filed', plantId: 'plant-1',
      photoUrl: 'https://example.com/note.jpg', filedAs: 'activity',
    },
  ];
  const quickViews = [{
    id: 'view-1', name: 'Corms', state: { filters: { origin: ['Corm'] } },
    createdAt: '2026-07-26T12:00:00.000Z', updatedAt: '2026-07-26T12:00:00.000Z',
  }];
  const backup = assembleBackup({
    plants: [plant],
    dropdownOptions: {},
    wishlistItems: [],
    gardenBeds: [],
    plantSpaces: [],
    reminders: [],
    quickNotes,
    quickViews,
    appVersion: 'v0.21.0',
  });
  const normalized = normalizeBackup(JSON.parse(JSON.stringify(backup)));
  assert.equal(normalized.ok, true);
  assert.deepEqual(normalized.backup.data.plants[0], plant);
  assert.deepEqual(normalized.backup.data.quickNotes, quickNotes);
  assert.deepEqual(normalized.backup.data.quickViews, quickViews);

  applyBackupToLocalStorage(normalized.backup, { createSnapshot: false });
  assert.deepEqual(JSON.parse(localStorage.getItem(storageKeys.plants)), [plant]);
  assert.deepEqual(JSON.parse(localStorage.getItem(storageKeys.quickNotes)), quickNotes);
  assert.deepEqual(JSON.parse(localStorage.getItem(storageKeys.quickViews)), quickViews);
});

test('older backups receive an empty Quick Notes collection', () => {
  const normalized = normalizeBackup({
    app: 'plant-inventory',
    schemaVersion: 3,
    appVersion: 'v0.20.0',
    exportedAt: new Date().toISOString(),
    data: {
      plants: [], dropdownOptions: {}, wishlistItems: [], gardenBeds: [],
      plantSpaces: [], reminders: [], preferences: {}, extraLocalStorage: {},
    },
  });
  assert.equal(normalized.ok, true);
  assert.deepEqual(normalized.backup.data.quickNotes, []);
  assert.deepEqual(normalized.backup.data.quickViews, []);
});

test('restore safety snapshots retain Quick Views for undo', () => {
  const currentBackup = assembleBackup({
    plants: [], dropdownOptions: {}, wishlistItems: [], gardenBeds: [],
    plantSpaces: [], reminders: [], quickNotes: [],
    quickViews: [{
      id: 'view-before', name: 'Before restore', state: {},
      createdAt: 'created', updatedAt: 'updated',
    }],
    appVersion: 'v0.21.0',
  });
  const incomingBackup = assembleBackup({
    plants: [], dropdownOptions: {}, wishlistItems: [], gardenBeds: [],
    plantSpaces: [], reminders: [], quickNotes: [], quickViews: [],
    appVersion: 'v0.21.0',
  });
  applyBackupToLocalStorage(incomingBackup, { createSnapshot: true, currentBackup });
  const snapshot = getRestoreSafetySnapshot();
  assert.equal(snapshot.backup.data.quickViews[0].id, 'view-before');
});

test('quota failure during a restore preserves the exact original local state', () => {
  localStorage.clear();
  localStorage.quota = Infinity;
  const currentBackup = assembleBackup({
    plants: [{ id: 'original', notes: 'safe' }], dropdownOptions: {}, wishlistItems: [],
    gardenBeds: [], plantSpaces: [], reminders: [], quickNotes: [], quickViews: [],
    appVersion: 'v0.21.0',
  });
  applyBackupToLocalStorage(currentBackup, { createSnapshot: false });
  const before = new Map(localStorage.values);
  const incomingBackup = {
    ...currentBackup,
    exportedAt: new Date().toISOString(),
    data: {
      ...currentBackup.data,
      plants: [{ id: 'restored', notes: 'x'.repeat(10_000) }],
    },
  };
  localStorage.quota = 4_000;

  assert.throws(
    () => applyBackupToLocalStorage(incomingBackup, { createSnapshot: true, currentBackup }),
    (error) => (
      error.code === 'RESTORE_WRITE_QUOTA'
      && error.phase === 'write'
      && error.diagnostics.failingKey === storageKeys.plants
      && error.diagnostics.failingKeyCharacters > 10_000
      && error.diagnostics.totalRestoreCharacters > error.diagnostics.failingKeyCharacters
      && error.diagnostics.existingStorageCharacters > 0
    ),
  );
  assert.deepEqual(localStorage.values, before);
  localStorage.quota = Infinity;
});

test('restore avoids duplicating live data before creating its safety snapshot', () => {
  localStorage.clear();
  localStorage.quota = Infinity;
  const currentBackup = assembleBackup({
    plants: [{ id: 'original', notes: 'x'.repeat(3_000) }], dropdownOptions: {},
    wishlistItems: [], gardenBeds: [], plantSpaces: [], reminders: [], quickNotes: [],
    quickViews: [], appVersion: 'v0.21.0',
  });
  applyBackupToLocalStorage(currentBackup, { createSnapshot: false });
  const incomingBackup = {
    ...currentBackup,
    exportedAt: new Date().toISOString(),
    data: { ...currentBackup.data, plants: [{ id: 'restored' }] },
  };
  const originalBytes = [...localStorage.values].reduce((total, [key, value]) => (
    total + (key.length + value.length) * 2
  ), 0);
  localStorage.quota = Math.ceil(originalBytes * 1.6);

  const result = applyBackupToLocalStorage(incomingBackup, { createSnapshot: true, currentBackup });
  assert.equal(result.ok, true);
  assert.equal(JSON.parse(localStorage.getItem(storageKeys.plants))[0].id, 'restored');
  localStorage.quota = Infinity;
});

test('photo-heavy backup larger than localStorage quota restores after image extraction', async () => {
  localStorage.clear();
  localStorage.quota = Infinity;
  const currentBackup = assembleBackup({
    plants: [{ id: 'original' }], dropdownOptions: {}, wishlistItems: [],
    gardenBeds: [], plantSpaces: [], reminders: [], quickNotes: [], quickViews: [],
    appVersion: 'v0.21.2',
  });
  applyBackupToLocalStorage(currentBackup, { createSnapshot: false });
  const embeddedPhoto = `data:image/jpeg;base64,${'A'.repeat(3_000_000)}`;
  const incomingBackup = {
    ...currentBackup,
    exportedAt: new Date().toISOString(),
    data: {
      ...currentBackup.data,
      plants: [{ id: 'restored', imageUrl: embeddedPhoto }],
    },
  };
  const migrated = await migrateEmbeddedImagesInBackup(incomingBackup, async () => ({
    reference: 'plant-asset://large-photo',
    created: true,
  }));
  assert.ok(JSON.stringify(incomingBackup).length > 3_000_000);
  assert.ok(JSON.stringify(migrated.backup).length < 2_000);
  localStorage.quota = 20_000;

  const result = applyBackupToLocalStorage(migrated.backup, { createSnapshot: true, currentBackup });
  assert.equal(result.ok, true);
  assert.equal(
    JSON.parse(localStorage.getItem(storageKeys.plants))[0].imageUrl,
    'plant-asset://large-photo',
  );
  localStorage.quota = Infinity;
});
