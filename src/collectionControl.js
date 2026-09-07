const text = (value) => String(value ?? '').trim();

export function parseRecordedPrice(value) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  const raw = text(value);
  if (!raw) return null;
  if (!/^\s*\$?\s*\d+(?:,\d{3})*(?:\.\d+)?\s*$/.test(raw)) return null;
  const parsed = Number(raw.replaceAll(',', '').replace('$', '').trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function hasRecordedPurchasePrice(plant) {
  return parseRecordedPrice(plant?.purchasePrice) !== null;
}

export function getPlantsMissingPurchasePrice(plants) {
  return (Array.isArray(plants) ? plants : []).filter((plant) => !hasRecordedPurchasePrice(plant));
}

export function getMissingPurchasePricePlantListTarget() {
  return { lifecycle: 'all', missingPurchasePrice: true };
}

export function matchesPlantSearchText(values, searchText) {
  const query = text(searchText).toLocaleLowerCase();
  if (!query) return true;
  return (Array.isArray(values) ? values : []).some((value) => (
    String(value ?? '').toLocaleLowerCase().includes(query)
  ));
}

export function validatePurchasePrice(value) {
  const original = String(value ?? '').trim();
  if (!original) return { valid: true, value: '', error: '' };
  if (!/^\d+(?:\.\d{0,2})?$/.test(original)) {
    return { valid: false, value: original, error: 'Enter a nonnegative amount with no more than 2 decimal places.' };
  }
  const amount = Number(original);
  if (!Number.isFinite(amount)) {
    return { valid: false, value: original, error: 'Enter a valid purchase price.' };
  }
  return { valid: true, value: amount.toFixed(2), error: '' };
}

export function getSpendingSummary(plants) {
  const seen = new Set();
  let total = 0;
  let withPrice = 0;
  let withoutPrice = 0;
  (Array.isArray(plants) ? plants : []).forEach((plant, index) => {
    const identity = plant?.id || `record-${index}`;
    if (seen.has(identity)) return;
    seen.add(identity);
    const price = parseRecordedPrice(plant?.purchasePrice);
    if (price === null) withoutPrice += 1;
    else {
      total += price;
      withPrice += 1;
    }
  });
  return { total, withPrice, withoutPrice };
}

export function normalizeCustomOptions(options, builtInOptions = {}) {
  return Object.fromEntries(Object.entries(options || {}).map(([field, values]) => {
    const builtIns = new Set((builtInOptions[field] || []).map((value) => text(value).toLocaleLowerCase()));
    const seen = new Set();
    const custom = (Array.isArray(values) ? values : []).map(text).filter((value) => {
      const key = value.toLocaleLowerCase();
      if (!value || seen.has(key) || builtIns.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return [field, custom];
  }));
}

export function addCustomOption(options, field, value, builtInOptions = {}) {
  const trimmed = text(value);
  if (!trimmed) return options;
  const all = [...(options?.[field] || []), ...(builtInOptions[field] || [])];
  if (all.some((item) => text(item).toLocaleLowerCase() === trimmed.toLocaleLowerCase())) return options;
  return { ...(options || {}), [field]: [...(options?.[field] || []), trimmed]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })) };
}

export function discoverPlantFieldOptions(options, plants, fields) {
  return (fields || []).reduce((nextOptions, field) => (
    (plants || []).reduce((fieldOptions, plant) => (
      addCustomOption(fieldOptions, field, plant?.[field])
    ), nextOptions)
  ), options || {});
}

export function countOptionUsage(plants, field, value) {
  const key = text(value).toLocaleLowerCase();
  if (field === 'activityType') {
    return (plants || []).reduce((count, plant) => count + (plant?.activityLog || []).filter((entry) => (
      text(entry?.activityType).toLocaleLowerCase() === key
    )).length, 0);
  }
  return (plants || []).filter((plant) => text(plant?.[field]).toLocaleLowerCase() === key).length;
}

export function countQuickViewOptionUsage(quickViews, field, value) {
  const target = text(value).toLocaleLowerCase();
  return (Array.isArray(quickViews) ? quickViews : []).filter((quickView) => (
    (quickView?.criteria || []).some((criterion) => (
      criterion?.field === field && text(criterion?.value).toLocaleLowerCase() === target
    )) || (quickView?.state?.filters?.[field] || []).some((filterValue) => (
      text(filterValue).toLocaleLowerCase() === target
    ))
  )).length;
}

export function removeCustomOption({ options, builtInOptions = {}, plants, quickViews, field, value, replacement = '' }) {
  const key = text(value).toLocaleLowerCase();
  if ((builtInOptions[field] || []).some((item) => text(item).toLocaleLowerCase() === key)) {
    throw new Error('Built-in options cannot be deleted.');
  }
  const nextOptions = {
    ...(options || {}),
    [field]: (options?.[field] || []).filter((item) => text(item).toLocaleLowerCase() !== key),
  };
  const nextPlants = (plants || []).map((plant) => {
    if (field === 'activityType') {
      return {
        ...plant,
        activityLog: (plant?.activityLog || []).map((entry) => (
          text(entry?.activityType).toLocaleLowerCase() === key
            ? { ...entry, activityType: replacement }
            : entry
        )),
      };
    }
    return text(plant?.[field]).toLocaleLowerCase() === key ? { ...plant, [field]: replacement } : plant;
  });
  const nextQuickViews = (quickViews || []).map((view) => {
    const filters = view?.state?.filters;
    if (!filters || !Array.isArray(filters[field])) return view;
    const values = filters[field].filter((item) => text(item).toLocaleLowerCase() !== key);
    if (replacement && !values.some((item) => text(item).toLocaleLowerCase() === text(replacement).toLocaleLowerCase())) {
      values.push(replacement);
    }
    return { ...view, state: { ...view.state, filters: { ...filters, [field]: values } } };
  });
  return { options: nextOptions, plants: nextPlants, quickViews: nextQuickViews };
}
