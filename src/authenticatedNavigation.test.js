import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globalNavigationDestinations } from './globalNavigation.js';

test('authenticated wrapper never keys App to hydration, sync, or realtime revisions', () => {
  const source = readFileSync(new URL('./ConnectedApp.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /collectionRevision/);
  assert.doesNotMatch(source, /<App\s+key=/);
  assert.match(source, /\[userId, service, runtimeGeneration, realtimeEnabled\]/);
  assert.doesNotMatch(source, /\[userId, service, runtimeGeneration, realtimeEnabled, session/);
});

test('every main destination remains owned by the existing application navigator', () => {
  const app = readFileSync(new URL('./App.jsx', import.meta.url), 'utf8');
  const navigator = app.slice(app.indexOf('function handleGlobalNavigation'), app.indexOf('function navigateSettingsSection'));
  for (const destination of globalNavigationDestinations) {
    const id = destination.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(navigator, new RegExp(`["']?${id}["']?\\s*:`));
  }
});

test('auth layout stays a single panel with recovery, signup, passkey, and collapsed diagnostics', () => {
  const source = readFileSync(new URL('./ConnectedApp.jsx', import.meta.url), 'utf8');
  assert.equal((source.match(/className="auth-card"/g) || []).length, 3);
  for (const text of ['Create an account', 'Forgot password?', 'Sign in with Face ID or passkey', '<details className="auth-diagnostic">']) assert.ok(source.includes(text));
});

test('plant Details selection derives from the canonical collection by stable ID', () => {
  const source = readFileSync(new URL('./App.jsx', import.meta.url), 'utf8');
  assert.match(source, /const \[selectedPlantId, setSelectedPlantId\]/);
  assert.match(source, /const selectedPlant = recordById\(plants, selectedPlantId\)/);
  assert.doesNotMatch(source, /useState\(null\).*selectedPlant/);
  assert.match(source, /replaceRecordById\(plants, savedPlant\)/);
});

test('Plant Space writes update canonical state and request durable queue capture immediately', () => {
  const source = readFileSync(new URL('./App.jsx', import.meta.url), 'utf8');
  const saveSpace = source.slice(source.indexOf('function savePlantSpaces'), source.indexOf('async function submitWishlistItem'));
  assert.match(saveSpace, /setPlantSpaces\(nextSpaces\)/); assert.match(saveSpace, /queueMutation: true/);
});
