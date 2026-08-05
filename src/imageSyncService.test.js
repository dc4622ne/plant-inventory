import assert from 'node:assert/strict';
import test from 'node:test';
import { contentHash, pendingImagePrefix, privateImagePath, remoteImagePrefix } from './services/imageSyncService.js';

test('private image paths are account, parent, and photo scoped', () => {
  assert.equal(privateImagePath('user-a', 'plant-a', 'photo-a', 'image/png'), 'user-a/plant-a/photo-a/photo-a.png');
});

test('image content hashes deduplicate identical bytes', async () => {
  const first = await contentHash(new Blob(['same'], { type: 'image/jpeg' }));
  const second = await contentHash(new Blob(['same'], { type: 'image/jpeg' }));
  assert.equal(first, second);
});

test('photo identity uses stable storage paths rather than temporary signed URLs', () => {
  const path = privateImagePath('user-a', 'plant-a', 'photo-a', 'image/jpeg');
  assert.equal(`${remoteImagePrefix}${path}`, 'supabase-image://user-a/plant-a/photo-a/photo-a.jpg');
  assert.equal(`${pendingImagePrefix}user-a/photo-a`, 'pending-image://user-a/photo-a');
  assert.equal(path.includes('token='), false);
});
