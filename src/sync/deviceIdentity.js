export const deviceIdentityKeys = {
  id: 'plant-inventory-device-id',
  name: 'plant-inventory-device-name',
};

function storageOrDefault(storage) {
  return storage || globalThis.localStorage;
}

export function detectDeviceName(userAgent = globalThis.navigator?.userAgent || '') {
  if (/iPad/i.test(userAgent) || (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent))) return 'iPad';
  if (/iPhone/i.test(userAgent)) return 'iPhone';
  if (/Android/i.test(userAgent)) return 'Android device';
  if (/Windows/i.test(userAgent)) return 'Windows PC';
  if (/Macintosh|Mac OS/i.test(userAgent)) return 'Mac';
  return 'Web browser';
}

export function createDeviceId() {
  return globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getDeviceId(storage) {
  const target = storageOrDefault(storage);
  const saved = target.getItem(deviceIdentityKeys.id);
  if (saved?.trim()) return saved;
  const id = createDeviceId();
  target.setItem(deviceIdentityKeys.id, id);
  return id;
}

export function getDeviceIdentity(storage, userAgent) {
  const target = storageOrDefault(storage);
  const detectedName = detectDeviceName(userAgent);
  return { id: getDeviceId(target), name: target.getItem(deviceIdentityKeys.name)?.trim() || detectedName, detectedName };
}

export function setDeviceName(name, storage) {
  const value = String(name || '').trim();
  if (!value) throw new Error('Device name cannot be blank.');
  storageOrDefault(storage).setItem(deviceIdentityKeys.name, value);
  return value;
}
