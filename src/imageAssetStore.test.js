import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localImageAssetPrefix,
  migrateEmbeddedImagesInBackup,
} from './imageAssetStore.js';

function backupWithPhoto(photoUrl = '') {
  return {
    app: 'plant-inventory',
    schemaVersion: 4,
    appVersion: 'v0.21.1',
    exportedAt: '2026-07-28T00:00:00.000Z',
    deviceId: 'test',
    data: {
      plants: [{
        id: 'plant-1',
        imageUrl: photoUrl,
        photoLog: [{ id: 'photo-1', photoUrl }],
      }],
      dropdownOptions: {},
      wishlistItems: [],
      gardenBeds: [],
      plantSpaces: [],
      reminders: [],
      quickNotes: [],
      quickViews: [],
      preferences: {},
      extraLocalStorage: {},
    },
  };
}

test('migrates photo-heavy v4 backups to small IndexedDB references without changing schema', async () => {
  const embeddedPhoto = `data:image/jpeg;base64,${'A'.repeat(3_000_000)}`;
  const stored = new Map();
  const migrated = await migrateEmbeddedImagesInBackup(backupWithPhoto(embeddedPhoto), async (value) => {
    const existingReference = [...stored].find(([, storedValue]) => storedValue === value)?.[0];
    if (existingReference) return { reference: existingReference, created: false };
    const reference = `${localImageAssetPrefix}asset-${stored.size + 1}`;
    stored.set(reference, value);
    return { reference, created: true };
  });

  assert.equal(migrated.backup.schemaVersion, 4);
  assert.equal(migrated.migratedCount, 2);
  assert.equal(stored.size, 1);
  assert.match(migrated.backup.data.plants[0].imageUrl, /^plant-asset:\/\//);
  assert.equal(migrated.backup.data.plants[0].photoLog[0].photoUrl, migrated.backup.data.plants[0].imageUrl);
  assert.ok(JSON.stringify(migrated.backup).length < 2_000);
});

test('leaves URL-only and photo-free v4 backups unchanged', async () => {
  const backup = backupWithPhoto('https://example.com/photo.jpg');
  const migrated = await migrateEmbeddedImagesInBackup(backup, async () => {
    throw new Error('Asset storage should not be called.');
  });
  assert.deepEqual(migrated.backup, backup);
  assert.equal(migrated.migratedCount, 0);
});
