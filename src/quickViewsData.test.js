import test from 'node:test';
import assert from 'node:assert/strict';
import {
  duplicateQuickView,
  loadQuickViews,
  normalizePlantListState,
  normalizeQuickViews,
  quickViewMatchesState,
  quickViewsEditableMigrationKey,
  quickViewsStorageKey,
  removeQuickView,
  saveQuickViews,
  uniqueQuickViewName,
} from './quickViewsData.js';

class LocalStorageMock {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
  clear() { this.values.clear(); }
}
globalThis.localStorage = new LocalStorageMock();

const baseState = normalizePlantListState({
  filters: { type: ['Monstera', 'Philodendron'], location: 'Office' },
  sort: 'location',
  viewMode: 'compact',
  pageSize: 25,
});

test('creates, reloads, and safely normalizes Quick Views', () => {
  const view = {
    id: 'view-1', name: 'Office plants', state: baseState,
    createdAt: '2026-07-26T12:00:00.000Z', updatedAt: '2026-07-26T12:00:00.000Z',
  };
  localStorage.setItem(quickViewsEditableMigrationKey, '1');
  saveQuickViews([view]);
  assert.deepEqual(loadQuickViews(), [view]);
  assert.equal(JSON.parse(localStorage.getItem(quickViewsStorageKey)).length, 1);
  assert.deepEqual(normalizeQuickViews([null, {}, { id: 'bad', name: 'Bad', state: { filters: 'oops' } }])[0]
    .state.filters.type, []);
});

test('renames without changing ID and duplicates with a distinct ID and name', () => {
  const view = { id: 'view-1', name: 'Office plants', state: baseState };
  const renamed = { ...view, name: 'Upstairs plants', updatedAt: 'later' };
  assert.equal(renamed.id, view.id);
  const duplicate = duplicateQuickView(view, [view], 'view-2', '2026-07-26T13:00:00.000Z');
  assert.equal(duplicate.id, 'view-2');
  assert.equal(duplicate.name, 'Office plants Copy');
  assert.deepEqual(duplicate.state, view.state);
  assert.equal(uniqueQuickViewName('Office plants', [view]), 'Office plants Copy');
});

test('detects modified state and reapplication restores saved criteria', () => {
  const view = { id: 'view-1', name: 'Office plants', state: baseState };
  assert.equal(quickViewMatchesState(view, baseState), true);
  assert.equal(quickViewMatchesState(view, { ...baseState, sort: 'name-asc' }), false);
  assert.equal(quickViewMatchesState(view, normalizePlantListState(view.state)), true);
});

test('legacy Quick Views retain existing filters and gain empty Source and Water Mix groups', () => {
  const normalized = normalizePlantListState({
    filters: { type: ['Houseplant'], genus: ['Monstera'], location: ['Office'] },
    sort: 'name-asc',
    viewMode: 'cards',
  });
  assert.deepEqual(normalized.filters.type, ['Houseplant']);
  assert.deepEqual(normalized.filters.genus, ['Monstera']);
  assert.deepEqual(normalized.filters.location, ['Office']);
  assert.deepEqual(normalized.filters.source, []);
  assert.deepEqual(normalized.filters.watering, []);
  assert.equal(quickViewMatchesState({ id: 'legacy', name: 'Legacy', state: normalized }, normalized), true);
});

test('deletion returns a new collection without mutating the saved view', () => {
  const view = {
    id: 'view-1', name: 'Office plants', state: baseState,
    createdAt: 'created', updatedAt: 'updated', system: false,
  };
  const original = [view];
  assert.deepEqual(removeQuickView(original, view.id), []);
  assert.equal(original.length, 1);
  assert.equal(original[0].updatedAt, 'updated');
  assert.deepEqual(original[0].state, baseState);
});

test('migrates seeded and formerly system views into ordinary editable records once', () => {
  localStorage.clear();
  localStorage.setItem(quickViewsStorageKey, JSON.stringify([{
    id: 'all-active', name: 'My renamed default', state: baseState,
    createdAt: 'created', updatedAt: 'updated', system: true,
  }, {
    id: 'legacy-built-in', name: 'Legacy built-in', state: baseState,
    createdAt: 'created', updatedAt: 'updated', builtIn: true,
  }]));
  const migrated = loadQuickViews();
  assert.equal(migrated.filter((view) => view.id === 'all-active').length, 1);
  assert.equal(migrated.find((view) => view.id === 'all-active').name, 'My renamed default');
  assert.equal(migrated.some((view) => view.id === 'legacy-built-in'), true);
  assert.equal(migrated.every((view) => !('system' in view) && !('builtIn' in view)), true);

  saveQuickViews(removeQuickView(migrated, 'all-active'));
  assert.equal(loadQuickViews().some((view) => view.id === 'all-active'), false);
});
