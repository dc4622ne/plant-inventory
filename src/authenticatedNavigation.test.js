import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { globalNavigationDestinations } from './globalNavigation.js';

test('authenticated wrapper never keys App to hydration, sync, or realtime revisions', () => {
  const source = readFileSync(new URL('./ConnectedApp.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /collectionRevision/);
  assert.doesNotMatch(source, /<App\s+key=/);
  assert.match(source, /\[userId, service\]/);
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
  assert.equal((source.match(/className="auth-card"/g) || []).length, 2);
  for (const text of ['Create an account', 'Forgot password?', 'Sign in with Face ID or passkey', '<details className="auth-diagnostic">']) assert.ok(source.includes(text));
});
