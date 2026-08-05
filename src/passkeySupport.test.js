import test from 'node:test';
import assert from 'node:assert/strict';
import { isPasskeyCancellation, isPasskeySupported } from './passkeySupport.js';

test('passkey capability requires a secure WebAuthn browser', () => {
  const supported = { isSecureContext: true, navigator: { credentials: {} }, PublicKeyCredential() {} };
  assert.equal(isPasskeySupported(supported), true);
  assert.equal(isPasskeySupported({ ...supported, isSecureContext: false }), false);
  assert.equal(isPasskeySupported({ isSecureContext: true, navigator: {} }), false);
});

test('cancelled biometric prompts are recognized without disabling password fallback', () => {
  assert.equal(isPasskeyCancellation({ name: 'NotAllowedError' }), true);
  assert.equal(isPasskeyCancellation({ code: 'webauthn_ceremony_cancelled' }), true);
  assert.equal(isPasskeyCancellation({ name: 'NetworkError' }), false);
});
