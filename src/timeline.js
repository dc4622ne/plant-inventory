export const timelineTypes = {
  photo: { label: 'Photo', icon: '🖼️', filter: 'photos' },
  observation: { label: 'Observation', icon: '👁️', filter: 'observations' },
  watered: { label: 'Watered', icon: '💧', filter: 'care' },
  fertilized: { label: 'Fertilized', icon: '🌿', filter: 'care' },
  repotted: { label: 'Repotted', icon: '🪴', filter: 'care' },
  statusChange: { label: 'Status change', icon: '🔄', filter: 'status' },
  locationChange: { label: 'Location change', icon: '📍', filter: 'status' },
  growingMediumChange: { label: 'Growing medium change', icon: '🧱', filter: 'status' },
  soilMixChange: { label: 'Soil mix change', icon: '🥣', filter: 'status' },
  quarantine: { label: 'Quarantine', icon: '🛡️', filter: 'status' },
  pestTreatment: { label: 'Pest treatment', icon: '🧴', filter: 'care' },
  tcStage: { label: 'TC stage', icon: '🧪', filter: 'status' },
  lecaTransition: { label: 'LECA transition', icon: '⚗️', filter: 'status' },
  rehabUpdate: { label: 'Rehab update', icon: '🩹', filter: 'observations' },
  cormProgress: { label: 'Corm progress', icon: '🌰', filter: 'observations' },
  propagationProgress: { label: 'Propagation progress', icon: '🌱', filter: 'observations' },
  rootGrowth: { label: 'Root growth', icon: '〰️', filter: 'observations' },
  newLeaf: { label: 'New leaf', icon: '🍃', filter: 'observations' },
  leafLoss: { label: 'Leaf loss', icon: '🍂', filter: 'observations' },
  reminder: { label: 'Reminder/check-in', icon: '✅', filter: 'checkins' },
  generalNote: { label: 'General note', icon: '📝', filter: 'observations' },
};

export const timelineTypeOptions = Object.entries(timelineTypes).map(([value, config]) => ({
  value,
  label: config.label,
}));

export const timelineFilters = [
  { value: 'all', label: 'All' },
  { value: 'photos', label: 'Photos' },
  { value: 'care', label: 'Care activity' },
  { value: 'status', label: 'Status/stage changes' },
  { value: 'checkins', label: 'Check-ins' },
  { value: 'observations', label: 'Observations' },
];

export const timelineSourceLabels = {
  manual: 'Manual timeline entry',
  activityLog: 'Activity Log',
  photoLog: 'Photo Log',
  reminder: 'Check-ins',
  plantFields: 'Plant details',
};

const activityTypeMap = {
  Watered: 'watered',
  Fertilized: 'fertilized',
  Repotted: 'repotted',
  'Pest treatment': 'pestTreatment',
  'Changed location': 'locationChange',
  'Changed pot size': 'repotted',
  'Health check': 'observation',
  'Quick check-in': 'reminder',
  'LECA conversion': 'lecaTransition',
  'Root check': 'rootGrowth',
  'General note': 'generalNote',
};

const photoTypeMap = {
  'New leaf': 'newLeaf',
  'Pest issue': 'pestTreatment',
  Damage: 'leafLoss',
};

function cleanText(value) {
  return String(value ?? '').trim();
}

function dateOnly(value) {
  const text = cleanText(value);
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
}

function normalizeType(type) {
  return timelineTypes[type] ? type : 'generalNote';
}

function makeEntry(entry) {
  const type = normalizeType(entry.type);
  return {
    id: entry.id,
    plantId: entry.plantId,
    date: dateOnly(entry.date),
    type,
    title: cleanText(entry.title) || timelineTypes[type].label,
    note: cleanText(entry.note),
    photoUrl: cleanText(entry.photoUrl),
    source: entry.source,
    sourceId: cleanText(entry.sourceId),
    createdAt: entry.createdAt || '',
    updatedAt: entry.updatedAt || '',
    metadata: entry.metadata || {},
  };
}

function eventKey(entry) {
  if (entry.source && entry.sourceId) return `${entry.source}:${entry.sourceId}`;
  return [
    entry.plantId,
    entry.date,
    entry.type,
    entry.title.toLowerCase(),
    entry.note.toLowerCase(),
    entry.photoUrl,
  ].join('|');
}

function addUnique(entriesByKey, entry) {
  if (!entry.date) return;
  const normalizedEntry = makeEntry(entry);
  const key = eventKey(normalizedEntry);
  if (!entriesByKey.has(key)) entriesByKey.set(key, normalizedEntry);
}

function inferActivityTimelineType(entry) {
  const activityType = cleanText(entry.activityType);
  if (activityTypeMap[activityType]) return activityTypeMap[activityType];

  const text = `${activityType} ${entry.notes || ''}`.toLowerCase();
  if (text.includes('new leaf')) return 'newLeaf';
  if (text.includes('leaf loss') || text.includes('leaf drop')) return 'leafLoss';
  if (text.includes('root')) return 'rootGrowth';
  if (text.includes('corm')) return 'cormProgress';
  if (text.includes('propagat')) return 'propagationProgress';
  if (text.includes('rehab')) return 'rehabUpdate';
  if (text.includes('quarantine')) return 'quarantine';
  if (text.includes('soil mix')) return 'soilMixChange';
  if (text.includes('medium')) return 'growingMediumChange';
  if (text.includes('status') || text.includes('stage')) return 'statusChange';
  return 'observation';
}

function inferPhotoTimelineType(entry) {
  return photoTypeMap[cleanText(entry.photoType)] || 'photo';
}

function addPlantFieldEntry(entriesByKey, plant, fieldName, date, type, title, note = '') {
  addUnique(entriesByKey, {
    id: `${plant.id}-${fieldName}-${dateOnly(date)}`,
    plantId: plant.id,
    date,
    type,
    title,
    note,
    source: 'plantFields',
    sourceId: `${fieldName}:${dateOnly(date)}`,
  });
}

export function buildPlantTimelineEntries(plant, reminders = []) {
  if (!plant?.id) return [];

  const entriesByKey = new Map();
  const hasActivityOnDate = (activityType, date) => (plant.activityLog || []).some((entry) => (
    cleanText(entry.activityType) === activityType && dateOnly(entry.date) === dateOnly(date)
  ));

  (plant.timelineEntries || []).forEach((entry) => {
    addUnique(entriesByKey, {
      ...entry,
      plantId: plant.id,
      source: 'manual',
      sourceId: entry.id,
    });
  });

  (plant.activityLog || []).forEach((entry, index) => {
    const sourceId = entry.id || `${dateOnly(entry.date)}-${cleanText(entry.activityType)}-${index}`;
    addUnique(entriesByKey, {
      id: `activity-${sourceId}`,
      plantId: plant.id,
      date: entry.date,
      type: inferActivityTimelineType(entry),
      title: cleanText(entry.activityType) || 'Activity',
      note: entry.notes || '',
      source: 'activityLog',
      sourceId,
      createdAt: entry.createdAt || '',
      updatedAt: entry.updatedAt || '',
    });
  });

  (plant.photoLog || []).forEach((entry, index) => {
    const sourceId = entry.id || `${dateOnly(entry.date)}-${cleanText(entry.photoUrl)}-${index}`;
    addUnique(entriesByKey, {
      id: `photo-${sourceId}`,
      plantId: plant.id,
      date: entry.date,
      type: inferPhotoTimelineType(entry),
      title: cleanText(entry.photoType) || 'Photo',
      note: entry.caption || '',
      photoUrl: entry.photoUrl || '',
      source: 'photoLog',
      sourceId,
      createdAt: entry.createdAt || '',
      updatedAt: entry.updatedAt || '',
    });
  });

  reminders
    .filter((reminder) => reminder.plantId === plant.id)
    .forEach((reminder) => {
      if (reminder.status === 'completed') {
        addUnique(entriesByKey, {
          id: `reminder-completed-${reminder.id}`,
          plantId: plant.id,
          date: dateOnly(reminder.completedAt) || reminder.dueDate,
          type: 'reminder',
          title: reminder.title || 'Completed check-in',
          note: reminder.note || '',
          source: 'reminder',
          sourceId: `completed:${reminder.id}`,
          createdAt: reminder.createdAt || '',
          updatedAt: reminder.completedAt || '',
          metadata: { status: reminder.status, linkedTracker: reminder.linkedTracker },
        });
      } else if (reminder.status === 'active' && cleanText(reminder.note)) {
        addUnique(entriesByKey, {
          id: `reminder-note-${reminder.id}`,
          plantId: plant.id,
          date: reminder.dueDate || reminder.createdAt,
          type: 'reminder',
          title: reminder.title || 'Check-in note',
          note: reminder.note,
          source: 'reminder',
          sourceId: `active-note:${reminder.id}`,
          createdAt: reminder.createdAt || '',
          metadata: { status: reminder.status, linkedTracker: reminder.linkedTracker },
        });
      }
    });

  addPlantFieldEntry(entriesByKey, plant, 'acquiredDate', plant.acquiredDate, 'quarantine', 'Plant acquired', plant.source);
  if (!hasActivityOnDate('Repotted', plant.repotDate)) {
    addPlantFieldEntry(entriesByKey, plant, 'repotDate', plant.repotDate, 'repotted', 'Last recorded repot', plant.potSize);
  }
  if (!hasActivityOnDate('Watered', plant.lastWatered)) {
    addPlantFieldEntry(entriesByKey, plant, 'lastWatered', plant.lastWatered, 'watered', 'Last recorded watering');
  }
  addPlantFieldEntry(entriesByKey, plant, 'pestQuarantineStartDate', plant.pestQuarantineStartDate, 'quarantine', 'Pest quarantine started', plant.pestNotes);
  addPlantFieldEntry(entriesByKey, plant, 'pestQuarantineEndDate', plant.pestQuarantineEndDate, 'quarantine', 'Pest quarantine ended');
  addPlantFieldEntry(entriesByKey, plant, 'tcDeflaskDate', plant.tcDeflaskDate, 'tcStage', 'TC deflasked', plant.tcNotes);
  addPlantFieldEntry(entriesByKey, plant, 'tcAcclimationStartDate', plant.tcAcclimationStartDate, 'tcStage', 'TC acclimation started', plant.tcStage);
  addPlantFieldEntry(entriesByKey, plant, 'tcAcclimationEndDate', plant.tcAcclimationEndDate, 'tcStage', 'TC acclimation ended', plant.tcStage);
  addPlantFieldEntry(entriesByKey, plant, 'lecaConversionStartDate', plant.lecaConversionStartDate, 'lecaTransition', 'LECA transition started', plant.lecaNotes);

  return [...entriesByKey.values()];
}

export function filterTimelineEntries(entries, filterValue, searchText) {
  const search = cleanText(searchText).toLowerCase();
  return entries.filter((entry) => {
    const config = timelineTypes[entry.type] || timelineTypes.generalNote;
    const matchesFilter = filterValue === 'all' || config.filter === filterValue;
    if (!matchesFilter) return false;
    if (!search) return true;
    return [
      entry.title,
      entry.note,
      config.label,
      timelineSourceLabels[entry.source],
    ].some((value) => cleanText(value).toLowerCase().includes(search));
  });
}

export function sortTimelineEntries(entries, sortOrder) {
  const direction = sortOrder === 'oldest' ? 1 : -1;
  return [...entries].sort((firstEntry, secondEntry) => (
    direction * (
      firstEntry.date.localeCompare(secondEntry.date)
      || (firstEntry.createdAt || '').localeCompare(secondEntry.createdAt || '')
      || firstEntry.title.localeCompare(secondEntry.title)
    )
  ));
}

export function groupTimelineEntriesByMonth(entries) {
  return entries.reduce((groups, entry) => {
    const monthKey = entry.date?.slice(0, 7);
    if (!monthKey) return groups;
    if (!groups.has(monthKey)) groups.set(monthKey, []);
    groups.get(monthKey).push(entry);
    return groups;
  }, new Map());
}

export function formatTimelineMonth(monthKey) {
  const date = new Date(`${monthKey}-01T12:00:00`);
  if (Number.isNaN(date.getTime())) return monthKey;
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
