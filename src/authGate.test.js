import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidSession, resolveAuthView } from './authGate.js';

const validSession = { access_token: 'browser-token', user: { id: 'user-a', email: 'a@example.test' } };

test('missing configuration shows configuration state', () => {
  assert.equal(resolveAuthView({ configured: false, restoring: false, session: null }), 'configuration');
});

test('configured unresolved session shows loading', () => {
  assert.equal(resolveAuthView({ configured: true, restoring: true, session: null }), 'loading');
});

test('configured null session and auth errors stay on authentication', () => {
  assert.equal(resolveAuthView({ configured: true, restoring: false, session: null }), 'authentication');
  assert.equal(resolveAuthView({ configured: true, restoring: false, session: validSession, error: 'refresh failed' }), 'authentication');
});

test('only a valid Supabase session shows the application', () => {
  assert.equal(resolveAuthView({ configured: true, restoring: false, session: validSession }), 'application');
  assert.equal(isValidSession({ user: { id: 'stale-local-user' } }), false);
  assert.equal(resolveAuthView({ configured: true, restoring: false, session: {} }), 'authentication');
});

test('sign-out returning a null session returns to authentication', () => {
  assert.equal(resolveAuthView({ configured: true, restoring: false, session: validSession }), 'application');
  assert.equal(resolveAuthView({ configured: true, restoring: false, session: null }), 'authentication');
});
