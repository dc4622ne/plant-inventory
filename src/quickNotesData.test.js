import test from 'node:test';
import assert from 'node:assert/strict';
import { loadQuickNotes, quickNotesStorageKey, updateQuickNote } from './quickNotesData.js';

test('loads existing Quick Notes records as compatible Plant Journal entries', () => {
  const original = [{
    id: 'quick-note-1',
    text: 'Legacy observation',
    createdAt: '2026-07-01T12:00:00.000Z',
    observedAt: '2026-07-01T12:00:00.000Z',
    plantId: 'plant-1',
    photoUrl: 'https://example.com/photo.jpg',
    status: 'filed',
    filedAt: '2026-07-02T12:00:00.000Z',
    filedAs: 'activity',
  }];
  globalThis.localStorage = {
    getItem: (key) => key === quickNotesStorageKey ? JSON.stringify(original) : null,
  };
  const loaded = loadQuickNotes();
  assert.equal(loaded[0].text, original[0].text);
  assert.equal(loaded[0].status, 'filed');
  assert.equal(loaded[0].photoUrl, original[0].photoUrl);
  assert.equal(loaded[0].plantId, original[0].plantId);
  assert.equal(loaded[0].observedAt, original[0].observedAt);
  assert.equal(loaded[0].editedAt, '');
});

test('updates a journal entry in place while preserving identity, creation, and conversion metadata', () => {
  const original = {
    id: 'quick-note-1', text: 'Before', createdAt: '2026-07-01T12:00:00.000Z',
    observedAt: '2026-07-01T12:00:00.000Z', plantId: 'plant-1', photoUrl: '',
    status: 'filed', filedAt: '2026-07-02T12:00:00.000Z', filedAs: 'activity',
    destinationId: 'activity-1',
  };
  const updated = updateQuickNote([original], original.id, {
    text: 'After', plantId: 'plant-2', photoUrl: 'plant-asset://photo',
  }, '2026-07-29T14:00:00.000Z');

  assert.equal(updated.length, 1);
  assert.equal(updated[0].id, original.id);
  assert.equal(updated[0].createdAt, original.createdAt);
  assert.equal(updated[0].observedAt, original.observedAt);
  assert.equal(updated[0].status, original.status);
  assert.equal(updated[0].filedAs, original.filedAs);
  assert.equal(updated[0].destinationId, original.destinationId);
  assert.equal(updated[0].editedAt, '2026-07-29T14:00:00.000Z');
  assert.equal(updated[0].text, 'After');
});

test('does not add an edited timestamp when submitted content is unchanged', () => {
  const note = { id: 'note-1', text: 'Same', plantId: '', photoUrl: '', createdAt: 'created' };
  const [updated] = updateQuickNote([note], note.id, { text: 'Same', plantId: '', photoUrl: '' }, 'edited');
  assert.equal(updated, note);
  assert.equal(updated.editedAt, undefined);
});
