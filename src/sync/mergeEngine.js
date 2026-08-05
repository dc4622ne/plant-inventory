const missing = Symbol('missing');
const equal = (a, b) => JSON.stringify(a === missing ? ['missing'] : a) === JSON.stringify(b === missing ? ['missing'] : b);
const plain = (value) => value && typeof value === 'object' && !Array.isArray(value);
const childId = (item) => plain(item) ? String(item.id || item.entryId || item.photoId || item.createdAt || item.date || '') : '';

function mergeArray(base, local, remote, path, conflicts) {
  const values = [base, local, remote];
  if (!values.every(Array.isArray)) {
    conflicts.push({ fieldPath: path.join('.'), pathSegments: path, baseValue: base === missing ? undefined : base, localValue: local === missing ? undefined : local, remoteValue: remote === missing ? undefined : remote });
    return local;
  }
  const identifiers = values.flat().map(childId);
  if (identifiers.some((id) => !id)) {
    if (equal(local, remote)) return local;
    if (equal(local, base)) return remote;
    if (equal(remote, base)) return local;
    conflicts.push({ fieldPath: path.join('.'), pathSegments: path, baseValue: base, localValue: local, remoteValue: remote });
    return local;
  }
  const maps = values.map((items) => new Map(items.map((item) => [childId(item), item])));
  return [...new Set(identifiers)].map((id) => mergeValue(
    maps[0].has(id) ? maps[0].get(id) : missing,
    maps[1].has(id) ? maps[1].get(id) : missing,
    maps[2].has(id) ? maps[2].get(id) : missing,
    [...path, `[${id}]`], conflicts,
  )).filter((value) => value !== missing);
}

function mergeValue(base, local, remote, path, conflicts) {
  if (equal(local, remote)) return local;
  if (equal(local, base)) return remote;
  if (equal(remote, base)) return local;
  if (plain(local) && plain(remote) && (plain(base) || base === missing)) {
    const result = {};
    const keys = new Set([...Object.keys(base === missing ? {} : base), ...Object.keys(local), ...Object.keys(remote)]);
    keys.forEach((key) => {
      const value = mergeValue(
        Object.hasOwn(base === missing ? {} : base, key) ? base[key] : missing,
        Object.hasOwn(local, key) ? local[key] : missing,
        Object.hasOwn(remote, key) ? remote[key] : missing,
        [...path, key], conflicts,
      );
      if (value !== missing) result[key] = value;
    });
    return result;
  }
  if (Array.isArray(local) || Array.isArray(remote) || Array.isArray(base)) return mergeArray(base, local, remote, path, conflicts);
  conflicts.push({ fieldPath: path.join('.'), pathSegments: path, baseValue: base === missing ? undefined : base, localValue: local === missing ? undefined : local, remoteValue: remote === missing ? undefined : remote });
  return local;
}

export function threeWayMerge(base = {}, local = {}, remote = {}) {
  const conflicts = [];
  const merged = mergeValue(base, local, remote, [], conflicts);
  return { merged, conflicts, clean: conflicts.length === 0 };
}
