export function isPasskeySupported(scope = globalThis) {
  return Boolean(
    scope?.isSecureContext
    && scope?.navigator?.credentials
    && typeof scope.PublicKeyCredential === 'function',
  );
}

export function isPasskeyCancellation(error) {
  return error?.name === 'NotAllowedError' || error?.code === 'webauthn_ceremony_cancelled';
}
