import test from 'node:test';
import assert from 'node:assert/strict';
import { readApplicationEnvironment } from './environment.js';

test('staging is explicit and production remains the safe default', () => {
  assert.deepEqual(readApplicationEnvironment(), { name: 'production', isStaging: false });
  assert.deepEqual(readApplicationEnvironment({ VITE_APP_ENV: 'staging' }), { name: 'staging', isStaging: true });
  assert.equal(readApplicationEnvironment({ VITE_APP_ENV: 'preview' }).isStaging, false);
});
