import assert from 'node:assert/strict';
import test from 'node:test';
import { passkeyActionMessage, passkeyOriginDetails, registerPasskeyAndRefresh } from './passkeyRegistration.js';

test('Add Passkey invokes registration and successful registration refreshes the list', async () => {
  const calls = [];
  const passkeys = await registerPasskeyAndRefresh({
    async registerPasskey() { calls.push('register'); return { id: 'new' }; },
    async listPasskeys() { calls.push('list'); return [{ id: 'new' }]; },
  });
  assert.deepEqual(calls, ['register', 'list']);
  assert.deepEqual(passkeys, [{ id: 'new' }]);
});

test('an empty list is a post-registration refresh, never the registration result', async () => {
  const registrationResult = { id: 'credential-result' };
  const result = await registerPasskeyAndRefresh({ async registerPasskey() { return registrationResult; }, async listPasskeys() { return []; } });
  assert.deepEqual(result, []);
  assert.notEqual(result, registrationResult);
});

test('cancellation is non-destructive while configuration and origin errors retain their details', () => {
  assert.deepEqual(passkeyActionMessage({ name: 'NotAllowedError', message: 'cancelled' }), { kind: 'cancelled', text: 'Passkey setup was cancelled. Your password still works.' });
  assert.deepEqual(passkeyActionMessage({ code: 'WEBAUTHN_ORIGIN_MISMATCH', message: 'Origin is not allowed for this relying party' }), { kind: 'error', text: 'Origin is not allowed for this relying party (WEBAUTHN_ORIGIN_MISMATCH)' });
});

test('staging passkey diagnostics derive the exact preview hostname and origin', () => {
  assert.deepEqual(passkeyOriginDetails({ origin: 'https://plant-staging.example.com' }), { origin: 'https://plant-staging.example.com', relyingPartyId: 'plant-staging.example.com' });
});
