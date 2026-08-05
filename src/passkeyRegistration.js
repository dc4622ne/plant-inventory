import { isPasskeyCancellation } from './passkeySupport.js';

export async function registerPasskeyAndRefresh(service) {
  await service.registerPasskey();
  const passkeys = await service.listPasskeys();
  return Array.isArray(passkeys) ? passkeys : [];
}

export function passkeyActionMessage(error) {
  if (isPasskeyCancellation(error) || isPasskeyCancellation(error?.cause)) {
    return { kind: 'cancelled', text: 'Passkey setup was cancelled. Your password still works.' };
  }
  const detail = error?.message || error?.cause?.message || 'That passkey action could not be completed.';
  const code = error?.code || error?.cause?.code;
  return { kind: 'error', text: code && !detail.includes(code) ? `${detail} (${code})` : detail };
}

export function passkeyOriginDetails(location = globalThis.location) {
  const origin = location?.origin || '';
  let relyingPartyId = '';
  try { relyingPartyId = new URL(origin).hostname; } catch { /* surfaced as unavailable */ }
  return { origin, relyingPartyId };
}
