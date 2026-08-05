import assert from 'node:assert/strict';
import test from 'node:test';
import { threeWayMerge } from './mergeEngine.js';
import { isMetadataOnlyConflict } from './syncPayload.js';

test('three-way merge accepts local-only, remote-only, shared, null, and removed field changes', () => {
  const base = { local: 1, remote: 1, same: 1, nullable: null, removed: 'old' };
  const local = { local: 2, remote: 1, same: 2, nullable: 'value' };
  const remote = { local: 1, remote: 2, same: 2, nullable: null, removed: 'old' };
  const result = threeWayMerge(base, local, remote);
  assert.equal(result.clean, true);
  assert.deepEqual(result.merged, { local: 2, remote: 2, same: 2, nullable: 'value' });
});

test('three-way merge reports different same-field edits with base and path', () => {
  const result = threeWayMerge({ profile: { note: 'base' } }, { profile: { note: 'local' } }, { profile: { note: 'remote' } });
  assert.equal(result.clean, false); assert.equal(result.conflicts[0].fieldPath, 'profile.note'); assert.equal(result.conflicts[0].baseValue, 'base');
});

test('stable child arrays preserve distinct appends and conflict only on the same child field', () => {
  const base = { entries: [{ id: 'a', text: 'base' }] };
  const distinct = threeWayMerge(base, { entries: [...base.entries, { id: 'local', text: 'L' }] }, { entries: [...base.entries, { id: 'remote', text: 'R' }] });
  assert.equal(distinct.clean, true); assert.deepEqual(distinct.merged.entries.map((item) => item.id), ['a', 'local', 'remote']);
  const collision = threeWayMerge(base, { entries: [{ id: 'a', text: 'L' }] }, { entries: [{ id: 'a', text: 'R' }] });
  assert.equal(collision.clean, false); assert.equal(collision.conflicts[0].fieldPath, 'entries.[a].text');
});

test('arrays without stable child IDs are never index-merged', () => {
  const result = threeWayMerge({ values: ['a'] }, { values: ['a', 'b'] }, { values: ['a', 'c'] });
  assert.equal(result.clean, false); assert.equal(result.conflicts[0].fieldPath, 'values');
});

test('update/delete and delete/delete follow explicit three-way rules', () => {
  assert.equal(threeWayMerge({ value: 1 }, { value: 2 }, {}).clean, false);
  assert.deepEqual(threeWayMerge({ value: 1 }, {}, {}).merged, {});
});

test('transport metadata is excluded from merge payloads and conflicts', () => {
  const result = threeWayMerge(
    { id: 'p', type: 'Houseplant', sync: { baseVersion: 55 } },
    { id: 'p', type: 'Garden', sync: { baseVersion: 55 } },
    { id: 'p', type: 'Houseplant', sync: { baseVersion: 10144 }, __syncEntityType: 'plant' },
  );
  assert.equal(result.clean, true);
  assert.deepEqual(result.merged, { id: 'p', type: 'Garden' });
});

test('metadata-only whole-record conflicts are cleanable but genuine conflicts remain', () => {
  assert.equal(isMetadataOnlyConflict({ fieldPath: 'record', localValue: { id: 'p', sync: { baseVersion: 55 } }, remoteValue: { id: 'p', sync: { baseVersion: 10144 } } }), true);
  assert.equal(isMetadataOnlyConflict({ fieldPath: 'record', localValue: { id: 'p', name: 'A' }, remoteValue: { id: 'p', name: 'B' } }), false);
});
