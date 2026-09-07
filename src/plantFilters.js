export const missingFilterValue = '__missing__';

export const categoricalPlantFilterFields = [
  'type', 'genus', 'location', 'source', 'medium', 'soilMix', 'potSize', 'watering',
  'wateringRhythm', 'moisturePreference', 'careDifficulty', 'status', 'attention', 'thirstLevel',
  'tcStage', 'lecaStatus', 'lecaStressLevel',
  'origin', 'startingStage', 'acquisitionMethod', 'lifecycleStage',
];

export const primaryPlantFilterFields = [
  ['type', 'Type / category'], ['genus', 'Genus'], ['location', 'Location'],
];

export const advancedPlantFilterFields = [
  ['source', 'Source'], ['medium', 'Growing medium'],
  ['soilMix', 'Soil mix / substrate mix'], ['potSize', 'Pot size'], ['watering', 'Water Mix'],
  ['wateringRhythm', 'Watering rhythm'], ['moisturePreference', 'Moisture preference'],
  ['careDifficulty', 'Care difficulty'], ['status', 'Status'], ['attention', 'Attention'],
  ['thirstLevel', 'Thirst level'], ['tcStage', 'TC stage'],
  ['lecaStatus', 'LECA conversion status'], ['lecaStressLevel', 'LECA stress level'],
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
    && matchesFilterValue(plant.startingStage, filters.startingStage)
    && matchesFilterValue(plant.acquisitionMethod, filters.acquisitionMethod)
    && matchesFilterValue(plant.lifecycleStage, filters.lifecycleStage);
}

export function clearFilterGroup(filters, fieldName) {
  return { ...normalizePlantFilters(filters), [fieldName]: [] };
}

export function clearAllPlantFilters() {
  return { ...emptyPlantFilters };
}
