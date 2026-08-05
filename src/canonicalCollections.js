export function recordById(records, id) {
  return (Array.isArray(records) ? records : []).find((record) => record?.id === id) || null;
}

export function replaceRecordById(records, replacement) {
  if (!replacement?.id) return Array.isArray(records) ? records : [];
  return (Array.isArray(records) ? records : []).map((record) => record?.id === replacement.id ? replacement : record);
}
