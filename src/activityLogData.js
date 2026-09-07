export function createActivityLogEntry({
  activityType,
  date,
  notes = '',
  id = `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  createdAt = new Date().toISOString(),
}) {
  return {
    activityType,
    date,
    notes: notes.trim(),
    id,
    createdAt,
  };
}
