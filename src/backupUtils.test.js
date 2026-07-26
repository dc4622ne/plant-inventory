import test from 'node:test';
import assert from 'node:assert/strict';

class LocalStorageMock {
  constructor() { this.values = new Map(); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
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

test('backup v4 round-trips quick notes and additive plant histories', () => {
  const plant = {
    id: 'plant-1',
    origin: 'Corm',
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
