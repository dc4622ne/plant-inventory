import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { syncDatabaseVersion, syncStoreNames } from './indexedDbStore.js';

test('IndexedDB v1 declares all sync-critical stores and compound user keys', () => {
  assert.equal(syncDatabaseVersion, 1);
  assert.deepEqual(syncStoreNames, ['records','mutations','conflicts','migrationRuns','syncMetadata','imageBlobs','imageUploadQueue']);
  const source = readFileSync(new URL('./indexedDbStore.js', import.meta.url), 'utf8');
  for (const key of ["['userId', 'entityType', 'entityId']", "['userId', 'id']", "['userId', 'version']", "['userId', 'key']"]) assert.ok(source.includes(key));
  assert.match(source, /byUserState/); assert.match(source, /byUserEntity/); assert.match(source, /onupgradeneeded/);
});
