export const dashboardPreferencesStorageKey = 'plant-tracker-dashboard-preferences';
export const dashboardPreferencesVersion = 2;

export const dashboardCards = [
  { id: 'needs-attention', title: 'Needs Attention', visible: true, size: 'wide' },
  { id: 'check-ins', title: 'Check-ins', visible: true, size: 'standard' },
  { id: 'quarantine', title: 'Quarantine', visible: true, size: 'standard' },
  { id: 'recently-added', title: 'Recently Added', visible: true, size: 'standard' },
  { id: 'watch-list', title: 'Watch List', visible: true, size: 'standard' },
  { id: 'tissue-culture', title: 'Tissue Culture', visible: true, size: 'standard' },
  { id: 'leca', title: 'LECA Conversions', visible: true, size: 'standard' },
  { id: 'corms', title: 'Corm Progress', visible: true, size: 'standard' },
  { id: 'recent-activity', title: 'Recent Activity', visible: true, size: 'wide' },
  { id: 'journal', title: 'Plant Journal', visible: true, size: 'standard' },
  { id: 'plant-insights', title: 'Plant Insights', visible: true, size: 'full' },
  { id: 'statistics', title: 'Quick Statistics', visible: true, size: 'wide' },
];

export function defaultDashboardPreferences() {
  return {
    version: dashboardPreferencesVersion,
    cards: dashboardCards.map(({ id, visible }) => ({ id, visible })),
  };
}

export function normalizeDashboardPreferences(value) {
  const defaults = defaultDashboardPreferences();
  if (!value || typeof value !== 'object' || !Array.isArray(value.cards)) return defaults;

  const knownIds = new Set(dashboardCards.map(({ id }) => id));
  const seen = new Set();
  const cards = [];
  value.cards.forEach((card) => {
    if (!card || !knownIds.has(card.id) || seen.has(card.id)) return;
    seen.add(card.id);
    cards.push({ id: card.id, visible: card.visible !== false });
  });
  defaults.cards.forEach((card, defaultIndex) => {
    if (seen.has(card.id)) return;
    const laterDefaultIds = defaults.cards.slice(defaultIndex + 1).map(({ id }) => id);
    const insertionIndex = cards.findIndex((savedCard) => laterDefaultIds.includes(savedCard.id));
    if (insertionIndex === -1) cards.push(card);
    else cards.splice(insertionIndex, 0, card);
  });
  return { version: dashboardPreferencesVersion, cards };
}

export function loadDashboardPreferences(storage = globalThis.localStorage) {
  try {
    return normalizeDashboardPreferences(JSON.parse(storage?.getItem(dashboardPreferencesStorageKey) || 'null'));
  } catch {
    return defaultDashboardPreferences();
  }
}

export function saveDashboardPreferences(preferences, storage = globalThis.localStorage) {
  const normalized = normalizeDashboardPreferences(preferences);
  storage?.setItem(dashboardPreferencesStorageKey, JSON.stringify(normalized));
  return normalized;
}
