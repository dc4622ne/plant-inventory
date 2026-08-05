import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from './services/authService.js';

function passkeyClient() {
  const calls = [];
  const client = { auth: {
    registerPasskey: async () => { calls.push(['register']); return { data: { id: 'passkey-a' }, error: null }; },
    signInWithPasskey: async () => { calls.push(['signin']); return { data: { session: { user: { id: 'user-a' } } }, error: null }; },
    passkey: {
      list: async () => { calls.push(['list']); return { data: [{ id: 'passkey-a' }], error: null }; },
      update: async (value) => { calls.push(['update', value]); return { data: value, error: null }; },
      delete: async (value) => { calls.push(['delete', value]); return { data: value, error: null }; },
    },
  } };
  return { client, calls };
}

test('auth service isolates passkey registration, sign-in, listing, rename, and removal', async () => {
  const { client, calls } = passkeyClient(); const service = createAuthService({ client });
  await service.registerPasskey(); await service.signInWithPasskey(); await service.listPasskeys();
  await service.renamePasskey('passkey-a', 'iPhone'); await service.removePasskey('passkey-a');
  assert.deepEqual(calls, [
    ['register'], ['signin'], ['list'],
    ['update', { passkeyId: 'passkey-a', friendlyName: 'iPhone' }],
    ['delete', { passkeyId: 'passkey-a' }],
  ]);
});

test('passkey cancellation or unavailability does not remove password fallback', async () => {
  let passwordCalled = false;
  const client = { auth: {
    signInWithPasskey: async () => ({ data: null, error: { name: 'NotAllowedError', message: 'cancelled' } }),
    signInWithPassword: async () => { passwordCalled = true; return { data: { session: {} }, error: null }; },
  } };
  const service = createAuthService({ client });
  await assert.rejects(service.signInWithPasskey());
  await service.signInWithPassword('owner@example.test', 'recovery-password');
  assert.equal(passwordCalled, true);
});
