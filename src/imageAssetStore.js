export const localImageAssetPrefix = 'plant-asset://';

const databaseName = 'plant-tracker-assets';
const databaseVersion = 1;
const storeName = 'images';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error('IndexedDB is unavailable.'));
      return;
    }
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB could not be opened.'));
  });
}

function dataUrlToBlob(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new Error('Embedded image data is malformed.');
  const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: match[1] });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Local image asset could not be read.'));
    reader.readAsDataURL(blob);
  });
}

async function imageAssetId(dataUrl) {
  const bytes = new TextEncoder().encode(dataUrl);
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
  }
  let hash = 2166136261;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
  return `fallback-${(hash >>> 0).toString(16)}-${dataUrl.length}`;
}

async function runRequest(mode, operation) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB image operation failed.'));
      transaction.onabort = () => reject(transaction.error || new Error('IndexedDB image transaction was aborted.'));
    });
  } finally {
    database.close();
  }
}

export async function putImageAsset(dataUrl) {
  const id = await imageAssetId(dataUrl);
  const existing = await runRequest('readonly', (store) => store.get(id));
  if (!existing) await runRequest('readwrite', (store) => store.put(dataUrlToBlob(dataUrl), id));
  return { reference: `${localImageAssetPrefix}${id}`, created: !existing };
}

export async function getImageAsset(reference) {
  if (!reference.startsWith(localImageAssetPrefix)) return null;
  return runRequest('readonly', (store) => store.get(reference.slice(localImageAssetPrefix.length)));
}

export async function deleteImageAsset(reference) {
  if (!reference.startsWith(localImageAssetPrefix)) return;
  await runRequest('readwrite', (store) => store.delete(reference.slice(localImageAssetPrefix.length)));
}

async function transformImageStrings(value, transform) {
  if (typeof value === 'string') return transform(value);
  if (Array.isArray(value)) return Promise.all(value.map((item) => transformImageStrings(item, transform)));
  if (!value || typeof value !== 'object') return value;
  const entries = await Promise.all(Object.entries(value).map(async ([key, item]) => (
    [key, await transformImageStrings(item, transform)]
  )));
  return Object.fromEntries(entries);
}

export async function migrateEmbeddedImagesInBackup(
  backup,
  putAsset = putImageAsset,
  removeAsset = deleteImageAsset,
) {
  const createdReferences = [];
  let migratedCount = 0;
  let migratedCharacters = 0;
  let transformedBackup;
  try {
    transformedBackup = await transformImageStrings(backup, async (value) => {
      if (!value.startsWith('data:image/')) return value;
      const result = await putAsset(value);
      migratedCount += 1;
      migratedCharacters += value.length;
      if (result.created) createdReferences.push(result.reference);
      return result.reference;
    });
  } catch (error) {
    await Promise.allSettled(createdReferences.map((reference) => removeAsset(reference)));
    throw error;
  }
  return {
    backup: transformedBackup,
    createdReferences,
    migratedCount,
    migratedCharacters,
    migratedApproximateBytes: migratedCharacters * 2,
  };
}

export async function materializeBackupImages(backup, getAsset = getImageAsset) {
  return transformImageStrings(backup, async (value) => {
    if (!value.startsWith(localImageAssetPrefix)) return value;
    const blob = await getAsset(value);
    if (!blob) throw new Error('A local photo asset is unavailable for backup.');
    return blobToDataUrl(blob);
  });
}
