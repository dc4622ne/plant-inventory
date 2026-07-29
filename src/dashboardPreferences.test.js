import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dashboardCards,
  dashboardPreferencesVersion,
  defaultDashboardPreferences,
  loadDashboardPreferences,
  normalizeDashboardPreferences,
} from './dashboardPreferences.js';

test('defaults include every supported card in application order', () => {
  assert.deepEqual(
    defaultDashboardPreferences().cards.map(({ id }) => id),
    dashboardCards.map(({ id }) => id),
  );
});

test('defaults include restored home sections and Plant Insights', () => {
  assert.deepEqual(defaultDashboardPreferences().cards.map(({ id }) => id), [
    'needs-attention', 'check-ins', 'quarantine', 'recently-added', 'watch-list',
    'tissue-culture', 'leca', 'corms', 'recent-activity', 'journal',
    'plant-insights', 'statistics',
  ]);
  assert.equal(defaultDashboardPreferences().cards.every(({ visible }) => visible), true);
});

test('normalization preserves order and visibility while adding new cards', () => {
  const result = normalizeDashboardPreferences({
    version: 0,
    cards: [
      { id: 'journal', visible: false },
      { id: 'needs-attention', visible: true },
    ],
  });
  assert.equal(result.version, dashboardPreferencesVersion);
  assert.deepEqual(
    result.cards.filter(({ id }) => ['journal', 'needs-attention'].includes(id)),
    [
      { id: 'journal', visible: false },
      { id: 'needs-attention', visible: true },
    ],
  );
  assert.equal(result.cards.length, dashboardCards.length);
  assert.ok(result.cards.some(({ id }) => id === 'check-ins'));
  assert.ok(result.cards.some(({ id }) => id === 'quarantine'));
  assert.ok(result.cards.some(({ id }) => id === 'plant-insights'));
});

test('migration inserts restored cards without changing saved card order or visibility', () => {
  const result = normalizeDashboardPreferences({
    version: 1,
    cards: [
      { id: 'journal', visible: false },
      { id: 'watch-list', visible: true },
      { id: 'needs-attention', visible: false },
    ],
  });
  const savedIds = result.cards
    .filter(({ id }) => ['journal', 'watch-list', 'needs-attention'].includes(id))
    .map(({ id }) => id);
  assert.deepEqual(savedIds, ['journal', 'watch-list', 'needs-attention']);
  assert.equal(result.cards.find(({ id }) => id === 'journal').visible, false);
  assert.ok(result.cards.some(({ id }) => id === 'plant-insights'));
});

test('normalization removes invalid and duplicate card IDs', () => {
  const result = normalizeDashboardPreferences({
    cards: [
      { id: 'unknown', visible: true },
      { id: 'journal', visible: false },
      { id: 'journal', visible: true },
    ],
  });
  assert.equal(result.cards.filter(({ id }) => id === 'journal').length, 1);
  assert.equal(result.cards.find(({ id }) => id === 'journal').visible, false);
  assert.equal(result.cards.some(({ id }) => id === 'unknown'), false);
});

test('load safely recovers from malformed storage', () => {
  const storage = { getItem: () => '{not json' };
  assert.deepEqual(loadDashboardPreferences(storage), defaultDashboardPreferences());
});
