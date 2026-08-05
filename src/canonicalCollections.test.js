import assert from 'node:assert/strict';
import test from 'node:test';
import { recordById, replaceRecordById } from './canonicalCollections.js';

test('canonical replacement and selection use stable record IDs', () => {
  const original = [{ id:'p', type:'Old' }, { id:'q', type:'Other' }];
  const updated = { ...original[0], type:'New' }; const records = replaceRecordById(original, updated);
  assert.equal(recordById(records, 'p'), updated); assert.equal(recordById(records, 'p').type, 'New');
  assert.equal(records[1], original[1]);
});

test('selected lookup always follows the newest canonical collection', () => {
  const id = 'p'; const before = [{ id, type:'Old' }]; const after = replaceRecordById(before, { id, type:'New' });
  assert.equal(recordById(before, id).type, 'Old'); assert.equal(recordById(after, id).type, 'New');
});
