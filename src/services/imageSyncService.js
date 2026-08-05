import { supabase } from '../lib/supabaseClient.js';
import { createIndexedDbStore } from '../sync/indexedDbStore.js';
import { synchronizedCollections } from '../sync/entityRegistry.js';
import { getImageAsset, localImageAssetPrefix } from '../imageAssetStore.js';

export const remoteImagePrefix = 'supabase-image://';
export const pendingImagePrefix = 'pending-image://';
export const plantPhotoBucket = 'plant-photos';
const store = createIndexedDbStore();
const signedUrlCache = new Map();
const signedUrlLifetimeSeconds = 3600;
const signedUrlRefreshMarginMs = 60_000;
const uuid = () => crypto.randomUUID?.() || `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export async function contentHash(blob) {
  const bytes = await blob.arrayBuffer();
  if (crypto.subtle) return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((v) => v.toString(16).padStart(2, '0')).join('');
  return `${blob.size}-${blob.type}`;
}

const extension = (type) => ({ 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' }[type] || 'jpg');
export function privateImagePath(userId, plantId, photoId, contentType) {
  return `${userId}/${plantId || 'unassigned'}/${photoId}/${photoId}.${extension(contentType)}`;
}

async function currentUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) throw new Error('Sign in before adding a synchronized photo.');
  return data.session.user;
}

export async function enqueueImageUpload(blob, { folder = 'unassigned', filename = '', user, entityType = '', entityId = '' } = {}) {
  const owner = user || await currentUser(); const id = uuid(); const hash = await contentHash(blob);
  const duplicate = (await store.forUser('imageUploadQueue', owner.id)).find((item) => item.contentHash === hash
    && item.plantId === folder && item.state !== 'failed_permanent');
  if (duplicate) return duplicate.state === 'complete'
    ? `${remoteImagePrefix}${duplicate.storagePath}` : `${pendingImagePrefix}${owner.id}/${duplicate.id}`;
  const storagePath = privateImagePath(owner.id, folder, id, blob.type);
  await store.put('imageBlobs', { userId: owner.id, id, blob, contentHash: hash, createdAt: new Date().toISOString() });
  await store.put('imageUploadQueue', { userId: owner.id, id, plantId: folder, entityType, entityId, storagePath, originalFilename: filename,
    contentType: blob.type, byteSize: blob.size, contentHash: hash, state: 'pending', attempts: 0, createdAt: new Date().toISOString() });
  if (navigator.onLine !== false) await processImageUploads(owner.id);
  const completed = await store.get('imageUploadQueue', [owner.id, id]);
  return completed?.state === 'complete' ? `${remoteImagePrefix}${storagePath}` : `${pendingImagePrefix}${owner.id}/${id}`;
}

function replacePendingReference(reference, replacement) {
  synchronizedCollections.forEach(({ storageKey }) => {
    const value = localStorage.getItem(storageKey); if (!value?.includes(reference)) return;
    localStorage.setItem(storageKey, value.split(reference).join(replacement));
  });
  dispatchEvent(new Event('plant-all-collections-change'));
  dispatchEvent(new Event('plant-collection-change'));
}

export async function processImageUploads(userId) {
  const queue = (await store.forUser('imageUploadQueue', userId)).filter((item) => ['pending', 'retryable', 'processing'].includes(item.state));
  for (const item of queue) {
    if (item.state === 'processing' && Date.parse(item.leaseUntil || 0) > Date.now()) continue;
    const blobRecord = await store.get('imageBlobs', [userId, item.id]); if (!blobRecord?.blob) continue;
    await store.put('imageUploadQueue', { ...item, state: 'processing', leaseUntil: new Date(Date.now() + 30_000).toISOString() });
    const { error } = await supabase.storage.from(plantPhotoBucket).upload(item.storagePath, blobRecord.blob, {
      cacheControl: '3600', contentType: item.contentType, upsert: false,
    });
    if (error && error.statusCode !== '409' && error.status !== 409) {
      await store.put('imageUploadQueue', { ...item, state: 'retryable', attempts: item.attempts + 1, errorCode: error.statusCode || error.name || 'UPLOAD_FAILED', leaseUntil: null });
      continue;
    }
    const { error: verifyError } = await supabase.storage.from(plantPhotoBucket).createSignedUrl(item.storagePath, 60);
    if (verifyError) {
      await store.put('imageUploadQueue', { ...item, state: 'retryable', attempts: item.attempts + 1, errorCode: 'VERIFY_FAILED', leaseUntil: null });
      continue;
    }
    const { error: metadataError } = await supabase.from('plant_photos').upsert({
      id: item.id, user_id: userId, plant_id: null, storage_path: item.storagePath,
      original_filename: item.originalFilename || null, content_type: item.contentType,
      byte_size: item.byteSize, content_hash: item.contentHash, migration_state: 'complete',
      legacy_metadata: { source_domain: item.entityType || item.plantId, entity_id: item.entityId || null }, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,storage_path' });
    if (metadataError) {
      await store.put('imageUploadQueue', { ...item, state: 'retryable', attempts: item.attempts + 1, errorCode: 'METADATA_FAILED', leaseUntil: null });
      continue;
    }
    await store.put('imageUploadQueue', { ...item, state: 'complete', completedAt: new Date().toISOString(), leaseUntil: null });
    replacePendingReference(`${pendingImagePrefix}${userId}/${item.id}`, `${remoteImagePrefix}${item.storagePath}`);
  }
}

export async function resolvePrivateImage(source, { force = false, expiresIn = signedUrlLifetimeSeconds } = {}) {
  if (!source?.startsWith(remoteImagePrefix)) return source;
  const path = source.slice(remoteImagePrefix.length);
  const user = await currentUser();
  if (!path.startsWith(`${user.id}/`)) throw new Error('This photo belongs to another account.');
  const cacheKey = `${user.id}:${path}`;
  const cached = signedUrlCache.get(cacheKey);
  if (!force && cached && cached.expiresAt - signedUrlRefreshMarginMs > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from(plantPhotoBucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  signedUrlCache.set(cacheKey, { url: data.signedUrl, expiresAt: Date.now() + expiresIn * 1000 });
  return data.signedUrl;
}

export function clearUserPhotoCache(userId = '') {
  for (const key of signedUrlCache.keys()) if (!userId || key.startsWith(`${userId}:`)) signedUrlCache.delete(key);
}

export async function retryImageUpload(source) {
  if (!source?.startsWith(pendingImagePrefix)) return false;
  const [userId, id] = source.slice(pendingImagePrefix.length).split('/');
  const item = await store.get('imageUploadQueue', [userId, id]);
  if (!item) return false;
  await store.put('imageUploadQueue', { ...item, state: 'retryable', leaseUntil: null, errorCode: null });
  await processImageUploads(userId);
  return true;
}

export async function getPendingImageBlob(source) {
  if (!source?.startsWith(pendingImagePrefix)) return null;
  const [userId, id] = source.slice(pendingImagePrefix.length).split('/');
  return (await store.get('imageBlobs', [userId, id]))?.blob || null;
}

function dataUrlBlob(value) {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(value);
  if (!match) return null;
  return new Blob([Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0))], { type: match[1] });
}

async function migrateValue(value, context) {
  if (typeof value === 'string' && value.startsWith('data:image/')) {
    const blob = dataUrlBlob(value); return blob ? enqueueImageUpload(blob, context) : value;
  }
  if (typeof value === 'string' && value.startsWith(localImageAssetPrefix)) {
    const blob = await getImageAsset(value); return blob ? enqueueImageUpload(blob, context) : value;
  }
  if (Array.isArray(value)) return Promise.all(value.map((item) => migrateValue(item, context)));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await migrateValue(item, context)])));
}

export async function migrateLegacyImages(userId) {
  const user = { id: userId }; let changed = 0;
  for (const { storageKey, entityType } of synchronizedCollections) {
    const serialized = localStorage.getItem(storageKey); if (!serialized || (!serialized.includes('data:image/') && !serialized.includes(localImageAssetPrefix))) continue;
    const value = JSON.parse(serialized); const migrated = await migrateValue(value, { folder: entityType, user });
    const next = JSON.stringify(migrated);
    if (next !== serialized) { localStorage.setItem(storageKey, next); changed += 1; }
  }
  if (changed) { dispatchEvent(new Event('plant-all-collections-change')); dispatchEvent(new Event('plant-collection-change')); }
  return changed;
}
