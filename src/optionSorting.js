const labelOf = (option) => (
  typeof option === 'object' && option !== null ? option.label : option
);

export function sortOptionsAlphabetically(options, {
  fixedFirst = [],
  fixedLast = [],
} = {}) {
  const firstLabels = new Set(fixedFirst.map(String));
  const lastLabels = new Set(fixedLast.map(String));
  const indexed = options.map((option, index) => ({ option, index, label: String(labelOf(option) ?? '') }));
  const first = indexed.filter(({ label }) => firstLabels.has(label));
  const last = indexed.filter(({ label }) => lastLabels.has(label));
  const middle = indexed
    .filter(({ label }) => !firstLabels.has(label) && !lastLabels.has(label))
    .sort((a, b) => (
      a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }) || a.index - b.index
    ));

  return [...first, ...middle, ...last].map(({ option }) => option);
}

export function sortCategoricalOptions(options) {
  return sortOptionsAlphabetically(options, {
    fixedFirst: ['All', 'None', 'Unknown', 'Not specified', 'Not set', 'Not selected'],
    fixedLast: ['Other', 'Add new…', 'Custom / Other'],
  });
}

export const intentionallyOrderedOptionFields = new Set([
  'lifecycleStage', 'tcStage', 'cormPhase', 'lecaStatus', 'attention',
  'lecaStressLevel', 'priority', 'urgency',
]);

export function sortOptionsForField(fieldName, options) {
  return intentionallyOrderedOptionFields.has(fieldName) ? [...options] : sortCategoricalOptions(options);
}
