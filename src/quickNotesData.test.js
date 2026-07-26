import test from 'node:test';
import assert from 'node:assert/strict';
import { loadQuickNotes, quickNotesStorageKey } from './quickNotesData.js';

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
});
