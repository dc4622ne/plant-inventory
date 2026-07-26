import {
  emptyPlantFilters,
  normalizePlantFilters,
} from './plantFilters.js';

export const quickViewsStorageKey = 'plant-inventory-quick-views';
export const quickViewsEditableMigrationKey = 'plant-inventory-quick-views-editable-migrated';

const validSorts = new Set([
  'name-asc', 'name-desc', 'acquired-desc', 'acquired-asc', 'added-desc',
  'attention-first', 'next-check', 'checked-desc', 'location', 'category', 'genus',
]);
const validViewModes = new Set(['cards', 'gallery', 'compact']);
const validPageSizes = new Set([12, 18, 25, 50, 'all']);
const validLifecycleViews = new Set(['all', 'active', 'archived', 'graveyard']);
const validQuarantineFilters = new Set(['', 'current', 'soon', 'new', 'pest']);

export const defaultPlantListState = {
  searchText: '',
  filters: { ...emptyPlantFilters },
  lifecycleView: 'active',
  quarantineFilter: '',
  recentlyCheckedFilter: false,
  recentlyAcquiredFilter: false,
  sort: 'name-asc',
  viewMode: 'cards',
};

const seededViewDefinitions = [
  { id: 'all-active', name: 'All active plants', lifecycleView: 'active' },
  { id: 'leca', name: 'LECA plants', filter: ['lecaStatus', '__leca__'] },
  { id: 'leca-transitioning', name: 'LECA transitioning', filter: ['lecaStatus', '__transitioning__'] },
  { id: 'leca-stable', name: 'Stable LECA', filter: ['lecaStatus', 'Stable'] },
  { id: 'leca-stress', name: 'LECA stress', filter: ['lecaStressLevel', '__stress__'] },
  { id: 'leca-recovering', name: 'Recovering LECA', filter: ['lecaStressLevel', 'Recovering'] },
  { id: 'tissue-cultures', name: 'Tissue cultures', filter: ['type', 'Tissue Culture'] },
  { id: 'tc-acclimating', name: 'TC acclimating', filter: ['tcStage', '__acclimating__'] },
  { id: 'tc-acclimated', name: 'Fully acclimated TC', filter: ['tcStage', 'Fully acclimated'] },
  { id: 'tc-failed', name: 'Failed/lost TC', filter: ['tcStage', 'Failed / lost'] },
  { id: 'new', name: 'New plants', recentlyAcquiredFilter: true },
  { id: 'quarantine', name: 'In quarantine', quarantineFilter: 'current' },
  { id: 'pest-quarantine', name: 'Pest quarantine', quarantineFilter: 'pest' },
  { id: 'attention', name: 'Needs attention', filter: ['attention', 'High'] },
  { id: 'watch-list', name: 'Watch list', filter: ['attention', 'Watch list'] },
  { id: 'rehab', name: 'Rehab plants', filter: ['careDifficulty', 'Rehab / watch closely'] },
  { id: 'fussy', name: 'Fussy plants', filter: ['careDifficulty', 'Fussy'] },
  { id: 'keep-moist', name: 'Keep moist plants', filter: ['wateringRhythm', 'Keep moist'] },
  { id: 'recently-checked', name: 'Recently checked', recentlyCheckedFilter: true },
  { id: 'archived', name: 'Archived plants', lifecycleView: 'archived' },
  { id: 'graveyard', name: 'Graveyard plants', lifecycleView: 'graveyard' },
];

export const seededQuickViews = seededViewDefinitions.map((definition) => {
  const filters = { ...emptyPlantFilters };
  if (definition.filter) filters[definition.filter[0]] = [definition.filter[1]];
  return {
    id: definition.id,
    name: definition.name,
    state: normalizePlantListState({
      ...defaultPlantListState,
      filters,
      lifecycleView: definition.lifecycleView || 'active',
      quarantineFilter: definition.quarantineFilter || '',
      recentlyCheckedFilter: Boolean(definition.recentlyCheckedFilter),
      recentlyAcquiredFilter: Boolean(definition.recentlyAcquiredFilter),
    }),
    createdAt: '2026-07-26T00:00:00.000Z',
    updatedAt: '2026-07-26T00:00:00.000Z',
  };
});

export function normalizePlantListState(value) {
  const state = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    searchText: typeof state.searchText === 'string' ? state.searchText : '',
    filters: normalizePlantFilters(state.filters),
    lifecycleView: validLifecycleViews.has(state.lifecycleView) ? state.lifecycleView : 'active',
    quarantineFilter: validQuarantineFilters.has(state.quarantineFilter) ? state.quarantineFilter : '',
    recentlyCheckedFilter: Boolean(state.recentlyCheckedFilter),
    recentlyAcquiredFilter: Boolean(state.recentlyAcquiredFilter),
    sort: validSorts.has(state.sort) ? state.sort : 'name-asc',
    viewMode: validViewModes.has(state.viewMode) ? state.viewMode : 'cards',
    ...(validPageSizes.has(state.pageSize) ? { pageSize: state.pageSize } : {}),
  };
}

export function normalizeQuickView(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = String(value.id || '').trim();
  const name = String(value.name || value.label || '').trim();
  if (!id || !name) return null;
  const createdAt = String(value.createdAt || new Date().toISOString());
  return {
    id,
    name,
    state: normalizePlantListState(value.state),
    createdAt,
    updatedAt: String(value.updatedAt || createdAt),
  };
}

export function normalizeQuickViews(values) {
  if (!Array.isArray(values)) return [];
  const ids = new Set();
  return values.map(normalizeQuickView).filter((view) => {
    if (!view || ids.has(view.id)) return false;
    ids.add(view.id);
    return true;
  });
}

export function loadQuickViews() {
  try {
    const savedViews = normalizeQuickViews(JSON.parse(localStorage.getItem(quickViewsStorageKey) || '[]'));
    if (localStorage.getItem(quickViewsEditableMigrationKey)) return savedViews;
    const savedIds = new Set(savedViews.map((view) => view.id));
    const migratedViews = normalizeQuickViews([
      ...savedViews,
      ...seededQuickViews.filter((view) => !savedIds.has(view.id)),
    ]);
    localStorage.setItem(quickViewsStorageKey, JSON.stringify(migratedViews));
    localStorage.setItem(quickViewsEditableMigrationKey, '1');
    return migratedViews;
  } catch {
    return [...seededQuickViews];
  }
}

export function saveQuickViews(views) {
  const normalized = normalizeQuickViews(views);
  localStorage.setItem(quickViewsStorageKey, JSON.stringify(normalized));
  return normalized;
}

export function uniqueQuickViewName(name, views, excludedId = '') {
  const requested = String(name || '').trim() || 'Untitled View';
  const names = new Set(views
    .filter((view) => view.id !== excludedId)
    .map((view) => view.name.toLocaleLowerCase()));
  if (!names.has(requested.toLocaleLowerCase())) return requested;
  let number = 2;
  let candidate = `${requested} Copy`;
  while (names.has(candidate.toLocaleLowerCase())) {
    candidate = `${requested} Copy ${number}`;
    number += 1;
  }
  return candidate;
}

export function duplicateQuickView(view, views, id, now = new Date().toISOString()) {
  return {
    ...normalizeQuickView(view),
    id,
    name: uniqueQuickViewName(view.name, views),
    createdAt: now,
    updatedAt: now,
  };
}

export function removeQuickView(views, id) {
  return normalizeQuickViews(views).filter((view) => view.id !== id);
}

export function quickViewMatchesState(view, state) {
  const saved = normalizePlantListState(view?.state);
  const current = normalizePlantListState(state);
  if (saved.pageSize === undefined) delete current.pageSize;
  return JSON.stringify(saved) === JSON.stringify(current);
}
