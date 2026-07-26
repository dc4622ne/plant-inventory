export const missingFilterValue = '__missing__';

export const categoricalPlantFilterFields = [
  'medium', 'type', 'location', 'genus', 'status', 'potSize', 'attention',
  'thirstLevel', 'soilMix', 'wateringRhythm', 'moisturePreference',
  'careDifficulty', 'tcStage', 'lecaStatus', 'lecaStressLevel',
  'origin', 'lifecycleStage',
];

export const emptyPlantFilters = Object.fromEntries(
  categoricalPlantFilterFields.map((fieldName) => [fieldName, []]),
);

export function normalizeFilterSelections(value) {
  const selections = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(selections
    .filter((selection) => typeof selection === 'string')
    .map((selection) => selection.trim())
    .filter(Boolean))];
}

export function normalizePlantFilters(filters) {
  const source = filters && typeof filters === 'object' && !Array.isArray(filters) ? filters : {};
  return Object.fromEntries(categoricalPlantFilterFields.map((fieldName) => (
    [fieldName, normalizeFilterSelections(source[fieldName])]
  )));
}

export function activeFilterValueCount(filters) {
  return Object.values(filters || {}).reduce((count, value) => (
    count + normalizeFilterSelections(value).length
  ), 0);
}

export function matchesFilterValue(value, selected) {
  const selections = Array.isArray(selected) ? selected : selected ? [selected] : [];
  if (!selections.length) return true;
  const normalized = String(value ?? '').trim();
  return selections.some((selection) => (
    selection === missingFilterValue ? !normalized : normalized === selection
  ));
}

export function matchesOriginLifecycleFilters(plant, filters) {
  return matchesFilterValue(plant.origin, filters.origin)
    && matchesFilterValue(plant.lifecycleStage, filters.lifecycleStage);
}

export function clearFilterGroup(filters, fieldName) {
  return { ...normalizePlantFilters(filters), [fieldName]: [] };
}

export function clearAllPlantFilters() {
  return { ...emptyPlantFilters };
}
