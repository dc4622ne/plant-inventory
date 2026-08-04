import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeatureFlags, parseFeatureFlag } from './featureFlags.js';

test('feature flags require the exact string true', () => {
  assert.equal(parseFeatureFlag('true'), true);
  for (const value of ['false', 'TRUE', '1', true, undefined, null, ' true ']) assert.equal(parseFeatureFlag(value), false);
});

test('database features default to disabled and parse independently', () => {
  assert.deepEqual(createFeatureFlags(), { databaseEnabled: false, authEnabled: false, realtimeEnabled: false });
  assert.deepEqual(createFeatureFlags({ VITE_DATABASE_ENABLED: 'true' }), {
    databaseEnabled: true, authEnabled: false, realtimeEnabled: false,
  });
});
