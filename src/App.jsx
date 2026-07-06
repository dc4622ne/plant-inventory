import { useState } from 'react';
import './App.css';

const initialPlants = [
  {
    lifecycleStatus: 'active',
    name: 'Monstera Albo',
    genus: 'Monstera',
    image: '🪴',
    type: 'Houseplant',
    source: 'Personal collection',
    location: 'Plant Wall',
    status: 'Watching for new growth',
    attention: 'Medium',
    lastWatered: '2026-07-04',
    repotDate: '2026-05-18',
    watering: 'Keep the LECA reservoir topped up without submerging the roots.',
    careNote: 'Keep in bright indirect light and monitor LECA roots.',
    lightNeeds: 'Bright indirect light',
    medium: 'LECA',
    potSize: '6 inch',
    acquiredDate: '2025-09-14',
    purchasePrice: '$25',
    wishlistStatus: 'Owned',
    propagationStatus: 'Established',
    pestNotes: 'Monitor for spider mites.',
    growthNotes: 'Watching the newest node for an unfurling leaf.',
  },
  {
    lifecycleStatus: 'active',
    name: 'Venom TC',
    genus: 'Alocasia',
    image: '🧪',
    type: 'Tissue Culture',
    source: 'Palmstreet',
    location: 'TC / Acclimation Area',
    status: 'Acclimating',
    attention: 'High',
    lastWatered: '2026-07-05',
    repotDate: 'Not yet repotted',
    watering: 'Keep the growing medium lightly moist, but never waterlogged.',
    careNote: 'Keep humidity high and avoid disturbing the roots.',
    lightNeeds: 'Grow light',
    medium: 'Tissue culture agar',
    potSize: 'N/A',
    acquiredDate: '2026-06-28',
    purchasePrice: '$25',
    wishlistStatus: 'Owned',
    propagationStatus: 'Tissue culture',
    pestNotes: 'No pests observed; keep the acclimation area clean.',
    growthNotes: 'Watch for firm new roots before lowering humidity.',
  },
  {
    lifecycleStatus: 'active',
    name: 'Sweet Potato Slips',
    genus: 'Sweet Potato',
    image: '🍠',
    type: 'Garden',
    source: 'Garden start',
    location: 'South Window',
    status: 'Growing outdoors',
    attention: 'Low',
    lastWatered: '2026-07-03',
    plantedDate: '2026-04-26',
    watering: 'Water deeply whenever the top inch of soil begins to dry.',
    careNote: 'Keep evenly watered while vines establish.',
    lightNeeds: 'Outdoor sun',
    medium: 'Garden bed',
    potSize: 'N/A',
    acquiredDate: '2026-04-12',
    purchasePrice: '$12',
    wishlistStatus: 'Owned',
    propagationStatus: 'Established',
    pestNotes: 'Watch for flea beetles and chewed leaves.',
    growthNotes: 'Vines are filling in; mound soil as they spread.',
  },
  {
    lifecycleStatus: 'active',
    name: 'Pothos Cuttings',
    genus: 'Epipremnum',
    image: '🌱',
    type: 'Propagation',
    source: 'Propagation',
    location: 'Propagation Area',
    status: 'Rooting',
    attention: 'Medium',
    lastWatered: '2026-07-06',
    repotDate: 'Not yet repotted',
    watering: 'Keep the nodes submerged and refresh the water regularly.',
    careNote: 'Change water regularly and pot up once roots are strong.',
    lightNeeds: 'Bright indirect light',
    medium: 'Water',
    potSize: 'N/A',
    acquiredDate: '2026-06-20',
    purchasePrice: '$0',
    wishlistStatus: 'Propagating',
    propagationStatus: 'Water rooting',
    pestNotes: 'No pests observed; inspect leaves during water changes.',
    growthNotes: 'Several roots are forming; pot up when they reach 2–3 inches.',
  },
];

const emptyPlant = {
  lifecycleStatus: 'active',
  name: '', genus: '', imageUrl: '', type: '', source: '', location: '', status: '', attention: 'Medium',
  lastWatered: '', repotDate: '', plantedDate: '', watering: '', careNote: '', lightNeeds: '', medium: '',
  potSize: '', acquiredDate: '', purchasePrice: '', wishlistStatus: 'Owned',
  propagationStatus: '', pestQuarantineStartDate: '', pestQuarantineEndDate: '',
  pestNotes: '', growthNotes: '', activityLog: [], photoLog: [],
};

const activityTypes = [
  'Watered', 'Fertilized', 'Repotted', 'Planted', 'Pruned', 'Propagated',
  'Pest treatment', 'Changed location', 'Changed pot size', 'Health check', 'General note',
];

const photoTypes = [
  'Growth update', 'New leaf', 'Repot progress', 'Pest issue',
  'Damage', 'Before/after', 'General photo',
];

const attentionOptions = ['Low', 'Medium', 'High'];

const summaryFieldByActivity = {
  Watered: 'lastWatered',
  Repotted: 'repotDate',
  Planted: 'plantedDate',
};

function todayDate() {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function emptyLogEntry() {
  return { activityType: 'Watered', date: todayDate(), notes: '' };
}

function emptyPhotoEntry() {
  return { photoUrl: '', date: todayDate(), caption: '', photoType: 'General photo' };
}

function getActivitySummaryUpdates(activityLog, activityTypesToUpdate) {
  const summaryUpdates = {};

  [...new Set(activityTypesToUpdate)].forEach((activityType) => {
    const summaryField = summaryFieldByActivity[activityType];
    if (!summaryField) return;

    const matchingDates = activityLog
      .filter((entry) => entry.activityType === activityType)
      .map((entry) => dateInputValue(entry.date))
      .filter(Boolean)
      .sort();

    summaryUpdates[summaryField] = matchingDates.at(-1) || '';
  });

  return summaryUpdates;
}

const initialDropdownOptions = {
  genus: ['Alocasia', 'Epipremnum', 'Monstera', 'Sweet Potato'],
  type: ['Garden', 'Houseplant', 'Propagation', 'Tissue Culture'],
  status: ['Acclimating', 'Growing outdoors', 'New', 'Rooting', 'Watching for new growth'],
  location: ['Plant Wall', 'South Window', 'Kitchen', 'Basement Grow Light', 'TC / Acclimation Area', 'Propagation Area'],
  lightNeeds: ['Bright indirect light', 'Direct light', 'Grow light', 'Low light', 'Outdoor sun'],
};

const plantsStorageKey = 'plant-inventory-plants';
const dropdownOptionsStorageKey = 'plant-inventory-dropdown-options';

function loadPlants() {
  const savedPlants = localStorage.getItem(plantsStorageKey);
  const plantsWithLogs = initialPlants.map((plant) => ({
    ...plant, activityLog: [], photoLog: [],
  }));

  if (!savedPlants) return plantsWithLogs;

  try {
    const parsedPlants = JSON.parse(savedPlants);
    if (!Array.isArray(parsedPlants)) return plantsWithLogs;

    // Older garden plants used repotDate because plantedDate did not exist yet.
    return parsedPlants.map((plant) => {
      const hasOldGardenDate = plant.type === 'Garden'
        && !plant.plantedDate
        && dateInputValue(plant.repotDate);

      const migratedPlant = hasOldGardenDate ? { ...plant, plantedDate: plant.repotDate } : plant;
      return {
        ...migratedPlant,
        lifecycleStatus: migratedPlant.lifecycleStatus || 'active',
        activityLog: Array.isArray(migratedPlant.activityLog) ? migratedPlant.activityLog : [],
        photoLog: Array.isArray(migratedPlant.photoLog) ? migratedPlant.photoLog : [],
      };
    });
  } catch {
    return plantsWithLogs;
  }
}

function loadDropdownOptions() {
  const savedOptions = localStorage.getItem(dropdownOptionsStorageKey);

  if (!savedOptions) return initialDropdownOptions;

  try {
    const parsedOptions = JSON.parse(savedOptions);
    return parsedOptions && typeof parsedOptions === 'object'
      ? parsedOptions
      : initialDropdownOptions;
  } catch {
    return initialDropdownOptions;
  }
}

function getPlantImage(name, type) {
  const plantDetails = `${name} ${type}`.toLowerCase();

  if (plantDetails.includes('tissue culture') || plantDetails.includes(' tc')) return '🧪';
  if (plantDetails.includes('propagation') || plantDetails.includes('cutting')) return '🌱';
  if (plantDetails.includes('sweet potato') || plantDetails.includes('garden')) return '🍠';
  return '🪴';
}

function PlantImage({ plant, detail = false }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = plant.imageUrl?.trim();
  const className = `plant-image${detail ? ' detail-image' : ''}`;

  if (imageUrl && !imageFailed) {
    return (
      <span className={className}>
        <img
          src={imageUrl}
          alt={`${plant.name} plant`}
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={className} role="img" aria-label={`${plant.name} placeholder`}>
      {plant.image || getPlantImage(plant.name, plant.type)}
    </span>
  );
}

function PhotoLogImage({ entry, plantName }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className="photo-log-image">
      {!imageFailed ? (
        <img src={entry.photoUrl} alt={`${plantName}: ${entry.photoType}`}
          onError={() => setImageFailed(true)} />
      ) : (
        <span role="img" aria-label="Photo unavailable">🌿</span>
      )}
    </div>
  );
}

function displayValue(value) {
  return value || 'Not set';
}

const missingFilterValue = '__missing__';
const emptyPlantFilters = {
  genus: '', type: '', status: '', location: '',
  medium: '', potSize: '', attention: '',
};

function normalizedFilterValue(value) {
  return String(value ?? '').trim();
}

function lifecycleLabel(lifecycleStatus) {
  return lifecycleStatus === 'archived'
    ? 'Archived'
    : lifecycleStatus === 'graveyard' ? 'Graveyard' : 'Active';
}

function dateInputValue(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : '';
}

function addDaysToDate(dateValue, numberOfDays) {
  if (!dateInputValue(dateValue)) return '';

  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + numberOfDays);
  return date.toISOString().slice(0, 10);
}

function getQuarantineStatus(plant, today = todayDate()) {
  const acquiredDate = dateInputValue(plant.acquiredDate);
  const newPlantQuarantineEnd = addDaysToDate(acquiredDate, 14);
  const pestQuarantineStart = dateInputValue(plant.pestQuarantineStartDate);
  const pestQuarantineEnd = dateInputValue(plant.pestQuarantineEndDate);
  const sevenDaysFromToday = addDaysToDate(today, 7);

  const isInNewPlantQuarantine = Boolean(acquiredDate)
    && acquiredDate <= today
    && newPlantQuarantineEnd >= today;
  const isInPestQuarantine = Boolean(pestQuarantineStart)
    && pestQuarantineStart <= today
    && (!pestQuarantineEnd || pestQuarantineEnd >= today);
  const isNewPlantQuarantineEndingSoon = Boolean(newPlantQuarantineEnd)
    && newPlantQuarantineEnd >= today
    && newPlantQuarantineEnd <= sevenDaysFromToday;
  const isPestQuarantineEndingSoon = Boolean(pestQuarantineStart)
    && pestQuarantineStart <= today
    && pestQuarantineEnd >= today
    && pestQuarantineEnd <= sevenDaysFromToday;

  return {
    isInNewPlantQuarantine,
    isInPestQuarantine,
    isInAnyQuarantine: isInNewPlantQuarantine || isInPestQuarantine,
    isAnyQuarantineEndingSoon: isNewPlantQuarantineEndingSoon || isPestQuarantineEndingSoon,
    newPlantQuarantineEnd,
    pestQuarantineEnd,
  };
}

const detailSections = [
  {
    title: 'Plant information',
    fields: [
      ['genus', 'Genus'], ['type', 'Type / category'], ['source', 'Source'],
      ['location', 'Location'], ['status', 'Status'], ['attention', 'Attention'],
    ],
  },
  {
    title: 'Care details',
    fields: [
      ['lightNeeds', 'Lighting'], ['medium', 'Growing medium'], ['potSize', 'Pot size'],
      ['watering', 'Watering notes'], ['lastWatered', 'Last watered'],
    ],
  },
  {
    title: 'Collection details',
    fields: [
      ['acquiredDate', 'Acquired'], ['purchasePrice', 'Purchase price'],
      ['wishlistStatus', 'Collection'], ['propagationStatus', 'Propagation'],
      ['pestQuarantineStartDate', 'Pest quarantine start'],
      ['pestQuarantineEndDate', 'Pest quarantine end'],
    ],
  },
  {
    title: 'Notes',
    fields: [
      ['careNote', 'Care notes'], ['pestNotes', 'Pest notes'], ['growthNotes', 'Growth notes'],
    ],
  },
];

function getDetailSections(plant) {
  const dateField = plant.type === 'Garden'
    ? ['plantedDate', 'Planted date']
    : ['repotDate', 'Repotted date'];

  return detailSections.map((section) => {
    if (section.title !== 'Care details' || !plant[dateField[0]]) return section;

    return { ...section, fields: [...section.fields, dateField] };
  });
}

function App() {
  const [plants, setPlants] = useState(loadPlants);
  const [appView, setAppView] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState(loadDropdownOptions);
  const [newOptionText, setNewOptionText] = useState({
    genus: '', type: '', status: '', location: '', lightNeeds: '',
  });
  const [plantFilters, setPlantFilters] = useState(emptyPlantFilters);
  const [searchText, setSearchText] = useState('');
  const [newPlant, setNewPlant] = useState(emptyPlant);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [lifecycleView, setLifecycleView] = useState('active');
  const [quarantineFilter, setQuarantineFilter] = useState('');
  const [addPlantMessage, setAddPlantMessage] = useState('');
  const [newLogEntry, setNewLogEntry] = useState(emptyLogEntry);
  const [editingLogEntry, setEditingLogEntry] = useState(null);
  const [logEntryDraft, setLogEntryDraft] = useState(emptyLogEntry);
  const [newPhotoEntry, setNewPhotoEntry] = useState(emptyPhotoEntry);
  const [editingPhotoEntry, setEditingPhotoEntry] = useState(null);
  const [photoEntryDraft, setPhotoEntryDraft] = useState(emptyPhotoEntry);

  const normalizedSearch = searchText.trim().toLowerCase();
  const searchableFields = [
    'name', 'genus', 'type', 'status', 'location', 'lightNeeds',
    'careNote', 'watering', 'pestNotes', 'growthNotes',
  ];
  const filterFields = [
    ['genus', 'Genus'], ['type', 'Type / category'],
    ['status', 'Status'], ['location', 'Location'],
    ['medium', 'Growing medium'], ['potSize', 'Pot size'],
    ['attention', 'Attention'],
  ];
  const getFilterOptions = (fieldName) => [
    ...new Set([
      ...(dropdownOptions[fieldName] || []),
      ...(fieldName === 'attention' ? attentionOptions : []),
      ...plants.map((plant) => plant[fieldName]),
    ].map(normalizedFilterValue).filter(Boolean)),
  ].sort((firstOption, secondOption) => firstOption.localeCompare(secondOption));
  const visiblePlants = plants
    .filter((plant) => {
      const matchesLifecycle = (plant.lifecycleStatus || 'active') === lifecycleView;
      const matchesFilters = filterFields.every(([fieldName]) => {
        const selectedFilter = plantFilters[fieldName];
        const plantValue = normalizedFilterValue(plant[fieldName]);

        if (!selectedFilter) return true;
        if (selectedFilter === missingFilterValue) return !plantValue;
        return plantValue === selectedFilter;
      });
      const matchesSearch = !normalizedSearch || searchableFields.some((fieldName) => (
        String(plant[fieldName] || '').toLowerCase().includes(normalizedSearch)
      ));
      const quarantineStatus = getQuarantineStatus(plant);
      const matchesQuarantine = !quarantineFilter
        || (quarantineFilter === 'current'
          ? quarantineStatus.isInAnyQuarantine
          : quarantineStatus.isAnyQuarantineEndingSoon);

      return matchesLifecycle && matchesFilters && matchesSearch && matchesQuarantine;
    })
    .sort((firstPlant, secondPlant) => (firstPlant.genus || '').localeCompare(secondPlant.genus || ''));

  const countPlants = (matchesPlant) => plants.filter(matchesPlant).length;
  const lifecycleCounts = {
    active: countPlants((plant) => (plant.lifecycleStatus || 'active') === 'active'),
    archived: countPlants((plant) => plant.lifecycleStatus === 'archived'),
    graveyard: countPlants((plant) => plant.lifecycleStatus === 'graveyard'),
  };
  const activePlants = plants.filter((plant) => (plant.lifecycleStatus || 'active') === 'active');
  const isPlantInQuarantine = (plant) => getQuarantineStatus(plant).isInAnyQuarantine;
  const isPlantLeavingQuarantineSoon = (plant) => (
    getQuarantineStatus(plant).isAnyQuarantineEndingSoon
  );
  const selectedPlantQuarantine = selectedPlant ? getQuarantineStatus(selectedPlant) : null;
  const dashboardMetrics = [
    { label: 'Total active plants', count: activePlants.length, lifecycle: 'active' },
    { label: 'Plants in LECA', count: activePlants.filter((plant) => normalizedFilterValue(plant.medium).toLowerCase() === 'leca').length, lifecycle: 'active', filter: ['medium', 'LECA'] },
    { label: 'Tissue cultures', count: activePlants.filter((plant) => normalizedFilterValue(plant.type).toLowerCase() === 'tissue culture').length, lifecycle: 'active', filter: ['type', 'Tissue Culture'] },
    { label: 'Plants in quarantine', count: activePlants.filter(isPlantInQuarantine).length, lifecycle: 'active', quarantine: 'current' },
    { label: 'Coming out of quarantine soon', count: activePlants.filter(isPlantLeavingQuarantineSoon).length, lifecycle: 'active', quarantine: 'soon' },
    { label: 'Plants needing attention', count: activePlants.filter((plant) => normalizedFilterValue(plant.attention).toLowerCase() === 'high').length, lifecycle: 'active', filter: ['attention', 'High'] },
    { label: 'Archived plants', count: lifecycleCounts.archived, lifecycle: 'archived' },
    { label: 'Graveyard plants', count: lifecycleCounts.graveyard, lifecycle: 'graveyard' },
  ];

  function openPlantList(metric = {}) {
    const nextFilters = { ...emptyPlantFilters };
    if (metric.filter) nextFilters[metric.filter[0]] = metric.filter[1];

    setPlantFilters(nextFilters);
    setSearchText('');
    setQuarantineFilter(metric.quarantine || '');
    setLifecycleView(metric.lifecycle || 'active');
    setSelectedPlant(null);
    setAppView('plants');
  }

  function openDashboard() {
    setSelectedPlant(null);
    setShowForm(false);
    setIsEditing(false);
    setAddPlantMessage('');
    setAppView('dashboard');
  }

  function clearAllFilters() {
    setSearchText('');
    setPlantFilters({ ...emptyPlantFilters });
    setQuarantineFilter('');
  }

  function handleSubmit(event) {
    event.preventDefault();
    const shouldAddAnother = !isEditing
      && event.nativeEvent.submitter?.value === 'add-another';

    const savedPlant = {
      ...newPlant,
      image: getPlantImage(newPlant.name, newPlant.type),
    };

    // Keep older text values unless the user chooses a replacement date.
    if (isEditing) {
      ['lastWatered', 'repotDate', 'plantedDate', 'acquiredDate', 'pestQuarantineStartDate', 'pestQuarantineEndDate'].forEach((fieldName) => {
        const previousValue = selectedPlant[fieldName];
        const isLegacyText = previousValue && !dateInputValue(previousValue);

        if (!newPlant[fieldName] && isLegacyText) savedPlant[fieldName] = previousValue;
      });
    }
    const updatedPlants = isEditing
      ? plants.map((plant) => plant === selectedPlant ? savedPlant : plant)
      : [...plants, savedPlant];

    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    setPlants(updatedPlants);

    if (isEditing) setSelectedPlant(savedPlant);
    setNewPlant(emptyPlant);
    setNewOptionText({ genus: '', type: '', status: '', location: '', lightNeeds: '' });
    setShowForm(shouldAddAnother);
    setAddPlantMessage(shouldAddAnother ? 'Plant added. Ready for the next one.' : '');
    setIsEditing(false);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;
    setNewPlant((currentPlant) => ({ ...currentPlant, [name]: value }));
  }

  function addDropdownOption(fieldName) {
    const option = newOptionText[fieldName].trim();
    if (!option) return;

    setDropdownOptions((currentOptions) => {
      const updatedOptions = {
        ...currentOptions,
        [fieldName]: currentOptions[fieldName].includes(option)
          ? currentOptions[fieldName]
          : [...currentOptions[fieldName], option],
      };

      localStorage.setItem(dropdownOptionsStorageKey, JSON.stringify(updatedOptions));
      return updatedOptions;
    });
    setNewPlant((currentPlant) => ({ ...currentPlant, [fieldName]: option }));
    setNewOptionText((currentText) => ({ ...currentText, [fieldName]: '' }));
  }

  function cancelForm() {
    setNewPlant(emptyPlant);
    setNewOptionText({ genus: '', type: '', status: '', location: '', lightNeeds: '' });
    setAddPlantMessage('');
    setShowForm(false);
    setIsEditing(false);
  }

  function startEditing() {
    cancelEditingLogEntry();
    cancelEditingPhotoEntry();
    setNewPlant({
      ...emptyPlant,
      ...selectedPlant,
      lastWatered: dateInputValue(selectedPlant.lastWatered),
      repotDate: dateInputValue(selectedPlant.repotDate),
      plantedDate: dateInputValue(selectedPlant.plantedDate),
      acquiredDate: dateInputValue(selectedPlant.acquiredDate),
      pestQuarantineStartDate: dateInputValue(selectedPlant.pestQuarantineStartDate),
      pestQuarantineEndDate: dateInputValue(selectedPlant.pestQuarantineEndDate),
    });
    setNewOptionText({ genus: '', type: '', status: '', location: '', lightNeeds: '' });
    setAddPlantMessage('');
    setIsEditing(true);
  }

  function deleteSelectedPlant() {
    const shouldDelete = window.confirm(
      `Permanently delete ${selectedPlant.name}? This cannot be undone.`,
    );

    if (!shouldDelete) return;

    const updatedPlants = plants.filter((plant) => plant !== selectedPlant);
    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    setPlants(updatedPlants);
    setSelectedPlant(null);
  }

  function changeSelectedPlantLifecycle(nextStatus) {
    const action = nextStatus === 'active'
      ? 'restore'
      : nextStatus === 'archived' ? 'archive' : 'move to the graveyard';
    const shouldChange = window.confirm(
      `Are you sure you want to ${action} ${selectedPlant.name}?`,
    );

    if (!shouldChange) return;

    const updatedPlant = { ...selectedPlant, lifecycleStatus: nextStatus };
    const updatedPlants = plants.map((plant) => plant === selectedPlant ? updatedPlant : plant);
    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    setPlants(updatedPlants);
    setSelectedPlant(nextStatus === 'active' ? updatedPlant : null);
    setLifecycleView(nextStatus);
  }

  function addLogEntry(event) {
    event.preventDefault();

    const logEntry = {
      ...newLogEntry,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      notes: newLogEntry.notes.trim(),
    };
    const updatedActivityLog = [...(selectedPlant.activityLog || []), logEntry];

    const updatedPlant = {
      ...selectedPlant,
      ...getActivitySummaryUpdates(updatedActivityLog, [logEntry.activityType]),
      activityLog: updatedActivityLog,
    };
    const updatedPlants = plants.map((plant) => plant === selectedPlant ? updatedPlant : plant);

    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    setPlants(updatedPlants);
    setSelectedPlant(updatedPlant);
    setNewLogEntry(emptyLogEntry());
  }

  function startEditingLogEntry(entry) {
    setEditingLogEntry(entry);
    setLogEntryDraft({
      activityType: entry.activityType,
      date: dateInputValue(entry.date),
      notes: entry.notes || '',
    });
  }

  function cancelEditingLogEntry() {
    setEditingLogEntry(null);
    setLogEntryDraft(emptyLogEntry());
  }

  function saveEditedLogEntry(event) {
    event.preventDefault();

    const updatedEntry = {
      ...editingLogEntry,
      ...logEntryDraft,
      notes: logEntryDraft.notes.trim(),
    };
    const updatedActivityLog = selectedPlant.activityLog.map((entry) => (
      entry === editingLogEntry ? updatedEntry : entry
    ));
    const affectedActivityTypes = [editingLogEntry.activityType, updatedEntry.activityType];
    const updatedPlant = {
      ...selectedPlant,
      ...getActivitySummaryUpdates(updatedActivityLog, affectedActivityTypes),
      activityLog: updatedActivityLog,
    };
    const updatedPlants = plants.map((plant) => plant === selectedPlant ? updatedPlant : plant);

    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    setPlants(updatedPlants);
    setSelectedPlant(updatedPlant);
    cancelEditingLogEntry();
  }

  function deleteLogEntry(entryToDelete) {
    const shouldDelete = window.confirm(
      `Delete this ${entryToDelete.activityType.toLowerCase()} log entry?`,
    );
    if (!shouldDelete) return;

    const updatedActivityLog = selectedPlant.activityLog.filter((entry) => entry !== entryToDelete);
    const updatedPlant = {
      ...selectedPlant,
      ...getActivitySummaryUpdates(updatedActivityLog, [entryToDelete.activityType]),
      activityLog: updatedActivityLog,
    };
    const updatedPlants = plants.map((plant) => plant === selectedPlant ? updatedPlant : plant);

    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    setPlants(updatedPlants);
    setSelectedPlant(updatedPlant);
    if (editingLogEntry === entryToDelete) cancelEditingLogEntry();
  }

  function savePhotoLog(photoLog) {
    const updatedPlant = { ...selectedPlant, photoLog };
    const updatedPlants = plants.map((plant) => plant === selectedPlant ? updatedPlant : plant);

    localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
    setPlants(updatedPlants);
    setSelectedPlant(updatedPlant);
  }

  function addPhotoEntry(event) {
    event.preventDefault();
    const photoEntry = {
      ...newPhotoEntry,
      photoUrl: newPhotoEntry.photoUrl.trim(),
      caption: newPhotoEntry.caption.trim(),
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
    };

    savePhotoLog([...(selectedPlant.photoLog || []), photoEntry]);
    setNewPhotoEntry(emptyPhotoEntry());
  }

  function startEditingPhotoEntry(entry) {
    setEditingPhotoEntry(entry);
    setPhotoEntryDraft({
      photoUrl: entry.photoUrl || '',
      date: dateInputValue(entry.date),
      caption: entry.caption || '',
      photoType: entry.photoType || 'General photo',
    });
  }

  function cancelEditingPhotoEntry() {
    setEditingPhotoEntry(null);
    setPhotoEntryDraft(emptyPhotoEntry());
  }

  function saveEditedPhotoEntry(event) {
    event.preventDefault();
    const updatedEntry = {
      ...editingPhotoEntry,
      ...photoEntryDraft,
      photoUrl: photoEntryDraft.photoUrl.trim(),
      caption: photoEntryDraft.caption.trim(),
    };
    const updatedPhotoLog = (selectedPlant.photoLog || []).map((entry) => (
      entry === editingPhotoEntry ? updatedEntry : entry
    ));

    savePhotoLog(updatedPhotoLog);
    cancelEditingPhotoEntry();
  }

  function deletePhotoEntry(entryToDelete) {
    if (!window.confirm('Delete this photo log entry?')) return;

    savePhotoLog((selectedPlant.photoLog || []).filter((entry) => entry !== entryToDelete));
    if (editingPhotoEntry === entryToDelete) cancelEditingPhotoEntry();
  }

  return (
    <main className="plant-inventory">
      <header className="brand-header">
        <p className="brand-name">Grow With Gibre</p>
        <h1>Plant Tracker</h1>
        <p className="brand-tagline">From the city to the soil</p>
      </header>

      <nav className="app-navigation" aria-label="Main navigation">
        <button type="button" className={appView === 'dashboard' ? 'active' : ''}
          aria-current={appView === 'dashboard' ? 'page' : undefined} onClick={openDashboard}>
          Dashboard
        </button>
        <button type="button" className={appView === 'plants' ? 'active' : ''}
          aria-current={appView === 'plants' ? 'page' : undefined} onClick={() => openPlantList()}>
          Plant List
        </button>
      </nav>

      <section className="plant-section">
        {selectedPlant && !isEditing ? (
        <article className="plant-detail" aria-labelledby="plant-detail-heading">
          <div className="detail-actions">
            <button className="back-button" type="button" onClick={() => {
              setSelectedPlant(null);
              setNewLogEntry(emptyLogEntry());
              setNewPhotoEntry(emptyPhotoEntry());
              cancelEditingLogEntry();
              cancelEditingPhotoEntry();
            }}>
              ← Back to Plant List
            </button>
            <div className="plant-change-actions">
              <button className="edit-plant-button" type="button" onClick={startEditing}
                aria-label="Edit plant" title="Edit plant">
                ✏️
              </button>
              {(selectedPlant.lifecycleStatus || 'active') === 'active' ? (
                <>
                  <button className="archive-plant-button" type="button"
                    aria-label="Archive plant" title="Archive plant"
                    onClick={() => changeSelectedPlantLifecycle('archived')}>
                    🗄️
                  </button>
                  <button className="graveyard-plant-button" type="button"
                    aria-label="Move plant to graveyard" title="Move plant to graveyard"
                    onClick={() => changeSelectedPlantLifecycle('graveyard')}>
                    🪦
                  </button>
                </>
              ) : (
                <button className="restore-plant-button" type="button"
                  aria-label="Restore plant" title="Restore plant"
                  onClick={() => changeSelectedPlantLifecycle('active')}>
                  ↩️
                </button>
              )}
              <button className="delete-plant-button" type="button" onClick={deleteSelectedPlant}
                aria-label="Permanently delete plant" title="Permanently delete plant">
                🗑️
              </button>
            </div>
          </div>
          <div className="detail-heading">
            <PlantImage key={selectedPlant.imageUrl || 'placeholder'} plant={selectedPlant} detail />
            <div>
              <p className="detail-eyebrow">Plant details</p>
              <h2 id="plant-detail-heading">{selectedPlant.name}</h2>
              <p>{displayValue(selectedPlant.genus)} · {displayValue(selectedPlant.type)}</p>
              <p className={`lifecycle-badge lifecycle-${selectedPlant.lifecycleStatus || 'active'}`}>
                {lifecycleLabel(selectedPlant.lifecycleStatus)}
              </p>
            </div>
          </div>
          {selectedPlantQuarantine?.isInAnyQuarantine && (
            <aside className="quarantine-status" aria-label="Current quarantine status">
              <strong>Currently in quarantine</strong>
              <div>
                {selectedPlantQuarantine.isInNewPlantQuarantine && (
                  <span>New plant quarantine through {selectedPlantQuarantine.newPlantQuarantineEnd}</span>
                )}
                {selectedPlantQuarantine.isInPestQuarantine && (
                  <span>
                    Pest quarantine
                    {selectedPlantQuarantine.pestQuarantineEnd
                      ? ` through ${selectedPlantQuarantine.pestQuarantineEnd}`
                      : ' — no end date set'}
                  </span>
                )}
              </div>
            </aside>
          )}
          <div className="detail-sections">
            {getDetailSections(selectedPlant).map((section) => (
              <section className="detail-section" key={section.title}>
                <h3>{section.title}</h3>
                <dl className="detail-list">
                  {section.fields.map(([fieldName, label]) => (
                    <div key={fieldName}>
                      <dt>{label}</dt>
                      <dd>{displayValue(selectedPlant[fieldName])}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
          <section className="photo-log" aria-labelledby="photo-log-heading">
            <h3 id="photo-log-heading">Photo Log</h3>
            <form className="photo-form" onSubmit={addPhotoEntry}>
              <div className="form-field photo-url-field">
                <label htmlFor="photo-url">Photo URL</label>
                <input id="photo-url" type="url" required value={newPhotoEntry.photoUrl}
                  placeholder="https://example.com/plant-photo.jpg"
                  onChange={(event) => setNewPhotoEntry((entry) => ({
                    ...entry, photoUrl: event.target.value,
                  }))} />
              </div>
              <div className="form-field">
                <label htmlFor="photo-date">Date</label>
                <input id="photo-date" type="date" required value={newPhotoEntry.date}
                  onChange={(event) => setNewPhotoEntry((entry) => ({
                    ...entry, date: event.target.value,
                  }))} />
              </div>
              <div className="form-field">
                <label htmlFor="photo-type">Photo type</label>
                <select id="photo-type" value={newPhotoEntry.photoType}
                  onChange={(event) => setNewPhotoEntry((entry) => ({
                    ...entry, photoType: event.target.value,
                  }))}>
                  {photoTypes.map((photoType) => <option key={photoType}>{photoType}</option>)}
                </select>
              </div>
              <div className="form-field photo-caption-field">
                <label htmlFor="photo-caption">Caption or notes (optional)</label>
                <textarea id="photo-caption" rows="3" value={newPhotoEntry.caption}
                  placeholder="What changed since the last photo?"
                  onChange={(event) => setNewPhotoEntry((entry) => ({
                    ...entry, caption: event.target.value,
                  }))} />
              </div>
              <button type="submit">Add photo</button>
            </form>
            {(selectedPlant.photoLog || []).length > 0 ? (
              <ol className="photo-list">
                {[...(selectedPlant.photoLog || [])]
                  .sort((firstEntry, secondEntry) => (
                    secondEntry.date.localeCompare(firstEntry.date)
                    || (secondEntry.createdAt || '').localeCompare(firstEntry.createdAt || '')
                  ))
                  .map((entry, entryIndex) => (
                    <li key={entry.id || `${entry.date}-${entry.photoUrl}-${entryIndex}`}>
                      {editingPhotoEntry === entry ? (
                        <form className="photo-edit-form" onSubmit={saveEditedPhotoEntry}>
                          <div className="form-field photo-url-field">
                            <label htmlFor="edit-photo-url">Photo URL</label>
                            <input id="edit-photo-url" type="url" required
                              value={photoEntryDraft.photoUrl}
                              onChange={(event) => setPhotoEntryDraft((draft) => ({
                                ...draft, photoUrl: event.target.value,
                              }))} />
                          </div>
                          <div className="form-field">
                            <label htmlFor="edit-photo-date">Date</label>
                            <input id="edit-photo-date" type="date" required
                              value={photoEntryDraft.date}
                              onChange={(event) => setPhotoEntryDraft((draft) => ({
                                ...draft, date: event.target.value,
                              }))} />
                          </div>
                          <div className="form-field">
                            <label htmlFor="edit-photo-type">Photo type</label>
                            <select id="edit-photo-type" value={photoEntryDraft.photoType}
                              onChange={(event) => setPhotoEntryDraft((draft) => ({
                                ...draft, photoType: event.target.value,
                              }))}>
                              {photoTypes.map((photoType) => <option key={photoType}>{photoType}</option>)}
                            </select>
                          </div>
                          <div className="form-field photo-caption-field">
                            <label htmlFor="edit-photo-caption">Caption or notes (optional)</label>
                            <textarea id="edit-photo-caption" rows="3"
                              value={photoEntryDraft.caption}
                              onChange={(event) => setPhotoEntryDraft((draft) => ({
                                ...draft, caption: event.target.value,
                              }))} />
                          </div>
                          <div className="photo-entry-actions">
                            <button type="submit">Save changes</button>
                            <button type="button" onClick={cancelEditingPhotoEntry}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <PhotoLogImage key={entry.photoUrl} entry={entry}
                            plantName={selectedPlant.name} />
                          <div className="photo-entry-content">
                            <div className="photo-entry-heading">
                              <strong>{entry.photoType}</strong>
                              <time dateTime={entry.date}>{entry.date}</time>
                            </div>
                            {entry.caption && <p>{entry.caption}</p>}
                            <div className="photo-entry-actions">
                              <button type="button" onClick={() => startEditingPhotoEntry(entry)}>
                                ✏️ Edit
                              </button>
                              <button className="photo-delete-button" type="button"
                                onClick={() => deletePhotoEntry(entry)}>
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="activity-empty-message">No photos logged yet.</p>
            )}
          </section>
          <section className="activity-log" aria-labelledby="activity-log-heading">
            <h3 id="activity-log-heading">Activity Log</h3>
            <form className="activity-form" onSubmit={addLogEntry}>
              <div className="form-field">
                <label htmlFor="activity-type">Activity type</label>
                <select id="activity-type" value={newLogEntry.activityType}
                  onChange={(event) => setNewLogEntry((entry) => ({
                    ...entry, activityType: event.target.value,
                  }))}>
                  {activityTypes.map((activityType) => (
                    <option key={activityType}>{activityType}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="activity-date">Date</label>
                <input id="activity-date" type="date" required value={newLogEntry.date}
                  onChange={(event) => setNewLogEntry((entry) => ({
                    ...entry, date: event.target.value,
                  }))} />
              </div>
              <div className="form-field activity-notes-field">
                <label htmlFor="activity-notes">Notes (optional)</label>
                <textarea id="activity-notes" rows="3" value={newLogEntry.notes}
                  placeholder="Add details such as soil mix, treatment used, or a new location."
                  onChange={(event) => setNewLogEntry((entry) => ({
                    ...entry, notes: event.target.value,
                  }))} />
              </div>
              <button type="submit">Add log entry</button>
            </form>
            {(selectedPlant.activityLog || []).length > 0 ? (
              <ol className="activity-list">
                {[...(selectedPlant.activityLog || [])]
                  .sort((firstEntry, secondEntry) => (
                    secondEntry.date.localeCompare(firstEntry.date)
                    || (secondEntry.createdAt || '').localeCompare(firstEntry.createdAt || '')
                  ))
                  .map((entry, entryIndex) => (
                    <li key={entry.id || `${entry.date}-${entry.activityType}-${entryIndex}`}>
                      {editingLogEntry === entry ? (
                        <form className="activity-edit-form" onSubmit={saveEditedLogEntry}>
                          <div className="form-field">
                            <label htmlFor="edit-activity-type">Activity type</label>
                            <select id="edit-activity-type" value={logEntryDraft.activityType}
                              onChange={(event) => setLogEntryDraft((draft) => ({
                                ...draft, activityType: event.target.value,
                              }))}>
                              {activityTypes.map((activityType) => (
                                <option key={activityType}>{activityType}</option>
                              ))}
                            </select>
                          </div>
                          <div className="form-field">
                            <label htmlFor="edit-activity-date">Date</label>
                            <input id="edit-activity-date" type="date" required
                              value={logEntryDraft.date}
                              onChange={(event) => setLogEntryDraft((draft) => ({
                                ...draft, date: event.target.value,
                              }))} />
                          </div>
                          <div className="form-field activity-notes-field">
                            <label htmlFor="edit-activity-notes">Notes (optional)</label>
                            <textarea id="edit-activity-notes" rows="3"
                              value={logEntryDraft.notes}
                              onChange={(event) => setLogEntryDraft((draft) => ({
                                ...draft, notes: event.target.value,
                              }))} />
                          </div>
                          <div className="activity-edit-actions">
                            <button type="submit">Save changes</button>
                            <button className="activity-cancel-button" type="button"
                              onClick={cancelEditingLogEntry}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="activity-entry-heading">
                            <strong>{entry.activityType}</strong>
                            <time dateTime={entry.date}>{entry.date}</time>
                          </div>
                          {entry.notes && <p>{entry.notes}</p>}
                          <div className="activity-entry-actions">
                            <button type="button" onClick={() => startEditingLogEntry(entry)}>
                              ✏️ Edit
                            </button>
                            <button className="activity-delete-button" type="button"
                              onClick={() => deleteLogEntry(entry)}>
                              🗑️ Delete
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
              </ol>
            ) : (
              <p className="activity-empty-message">No activity logged yet.</p>
            )}
          </section>
        </article>
        ) : showForm || isEditing ? (
        <form className="plant-form" onSubmit={handleSubmit}>
          <h2>{isEditing ? `Edit ${selectedPlant.name}` : 'Add New Plant'}</h2>
          {!isEditing && addPlantMessage && (
            <p className="form-success-message" role="status">{addPlantMessage}</p>
          )}
          <div className="form-grid">
            {[
              ['name', 'Plant name'], ['imageUrl', 'Image URL (optional)'], ['source', 'Source'],
              ['medium', 'Growing medium'], ['potSize', 'Pot size'],
              ['watering', 'Watering notes'], ['propagationStatus', 'Propagation'],
              ['purchasePrice', 'Purchase price'],
            ].map(([fieldName, label]) => (
              <div className="form-field" key={fieldName}>
                <label htmlFor={`plant-${fieldName}`}>{label}</label>
                <input id={`plant-${fieldName}`} name={fieldName} value={newPlant[fieldName]}
                  type={fieldName === 'imageUrl' ? 'url' : 'text'}
                  placeholder={fieldName === 'imageUrl' ? 'https://example.com/plant.jpg' : undefined}
                  onChange={handleInputChange} required={fieldName === 'name'} />
              </div>
            ))}

            {[
              ['genus', 'Genus'], ['type', 'Type / category'], ['status', 'Status'],
              ['location', 'Location'], ['lightNeeds', 'Light level'],
            ].map(([fieldName, label]) => (
              <div className="form-field" key={fieldName}>
                <label htmlFor={`plant-${fieldName}`}>{label}</label>
                <select id={`plant-${fieldName}`} name={fieldName} value={newPlant[fieldName]}
                  onChange={handleInputChange}>
                  <option value="">Select {label.toLowerCase()}</option>
                  {dropdownOptions[fieldName].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <div className="new-option-row">
                  <input
                    type="text"
                    aria-label={`New ${label.toLowerCase()} option`}
                    placeholder="Add new option"
                    value={newOptionText[fieldName]}
                    onChange={(event) => setNewOptionText((currentText) => ({
                      ...currentText,
                      [fieldName]: event.target.value,
                    }))}
                  />
                  <button type="button" onClick={() => addDropdownOption(fieldName)}>Add option</button>
                </div>
              </div>
            ))}

            <div className="form-field">
              <label htmlFor="plant-attention">Attention</label>
              <select id="plant-attention" name="attention" value={newPlant.attention} onChange={handleInputChange}>
                {attentionOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="plant-wishlistStatus">Collection</label>
              <input id="plant-wishlistStatus" name="wishlistStatus" value={newPlant.wishlistStatus}
                onChange={handleInputChange} />
            </div>
            {[
              ['lastWatered', 'Last watered date'],
              newPlant.type === 'Garden'
                ? ['plantedDate', 'Planted date']
                : ['repotDate', 'Repotted date'],
              ['acquiredDate', 'Acquired date'],
              ['pestQuarantineStartDate', 'Pest quarantine start date'],
              ['pestQuarantineEndDate', 'Pest quarantine end date'],
            ].map(([fieldName, label]) => (
              <div className="form-field" key={fieldName}>
                <label htmlFor={`plant-${fieldName}`}>{label}</label>
                <input id={`plant-${fieldName}`} name={fieldName} type="date" value={newPlant[fieldName]}
                  onChange={handleInputChange} />
              </div>
            ))}
            {[
              ['careNote', 'Care notes'], ['pestNotes', 'Pest notes'], ['growthNotes', 'Growth notes'],
            ].map(([fieldName, label]) => (
              <div className="form-field form-field-wide" key={fieldName}>
                <label htmlFor={`plant-${fieldName}`}>{label}</label>
                <textarea id={`plant-${fieldName}`} name={fieldName} value={newPlant[fieldName]}
                  onChange={handleInputChange} rows="3" />
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button type="submit">{isEditing ? 'Save changes' : 'Add Plant & Close'}</button>
            {!isEditing && (
              <button className="add-another-button" type="submit" value="add-another">
                Save &amp; Add Another
              </button>
            )}
            <button className="secondary-button" type="button" onClick={cancelForm}>Cancel</button>
          </div>
        </form>
        ) : (
        appView === 'dashboard' ? (
        <section className="dashboard-home" aria-labelledby="dashboard-heading">
          <div className="dashboard-heading">
            <div>
              <p className="detail-eyebrow">Collection overview</p>
              <h2 id="dashboard-heading">Dashboard</h2>
              <p>Choose a metric to open the matching plants.</p>
            </div>
            <button className="dashboard-add-button" type="button" onClick={() => {
              setAddPlantMessage('');
              setShowForm(true);
            }}>
              + Add New Plant
            </button>
          </div>
          <div className="dashboard-metrics">
            {dashboardMetrics.map((metric) => (
              <button className="dashboard-metric-card" type="button" key={metric.label}
                onClick={() => openPlantList(metric)}>
                <strong>{metric.count}</strong>
                <span>{metric.label}</span>
                <small>View plants →</small>
              </button>
            ))}
          </div>
        </section>
        ) : (
        <>
        <div className="section-heading">
          <h2 className="section-title" id="plant-list-heading">Plant List</h2>
          <button className="add-plant-button" type="button" onClick={() => {
            setAddPlantMessage('');
            setShowForm(true);
          }}
            aria-label="Add new plant" title="Add new plant">
            +
          </button>
        </div>
        <div className="lifecycle-tabs" aria-label="View plants by lifecycle status">
          {[
            ['active', 'Active Plants'], ['archived', 'Archived Plants'], ['graveyard', 'Graveyard Plants'],
          ].map(([value, label]) => (
            <button key={value} type="button" className={lifecycleView === value ? 'active' : ''}
              aria-pressed={lifecycleView === value} onClick={() => {
                setLifecycleView(value);
              }}>
              {label}
            </button>
          ))}
        </div>
        <div className="plant-search-tools">
          {quarantineFilter && (
            <div className="applied-dashboard-filter" role="status">
              <span>{quarantineFilter === 'current' ? 'Plants in quarantine' : 'Coming out of quarantine soon'}</span>
              <button type="button" onClick={() => setQuarantineFilter('')}>Clear</button>
            </div>
          )}
          <div className="plant-search">
            <label htmlFor="plant-search">Search plants</label>
            <input
              id="plant-search"
              type="search"
              placeholder="Search plants..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </div>
          <div className="plant-filter-dropdowns" aria-label="Filter plants">
            {filterFields.map(([fieldName, label]) => (
              <div className="plant-filter" key={fieldName}>
                <label htmlFor={`${fieldName}-filter`}>{label}</label>
                <select id={`${fieldName}-filter`} value={plantFilters[fieldName]}
                  onChange={(event) => setPlantFilters((currentFilters) => ({
                    ...currentFilters, [fieldName]: event.target.value,
                  }))}>
                  <option value="">All</option>
                  {getFilterOptions(fieldName).map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option value={missingFilterValue}>Not set</option>
                </select>
              </div>
            ))}
            <button className="clear-filters-button" type="button" onClick={clearAllFilters}>
              Clear All Filters
            </button>
          </div>
        </div>
        <hr className="plant-list-divider" />
        <div className="plant-list">
          {visiblePlants.length > 0 ? visiblePlants.map((plant, plantIndex) => (
            <button
              className="plant-card"
              type="button"
              key={`${plant.name}-${plantIndex}`}
              onClick={() => {
                setSelectedPlant(plant);
                setNewLogEntry(emptyLogEntry());
                cancelEditingLogEntry();
              }}
              aria-label={`View details for ${plant.name}`}
            >
              <div className="plant-card-heading">
                <PlantImage key={plant.imageUrl || 'placeholder'} plant={plant} />
                <h2>{plant.name}</h2>
              </div>
              <p className="plant-type">{displayValue(plant.type)}</p>
              <section className="card-section">
                <dl className="plant-details">
                  <div><dt>Genus</dt><dd>{displayValue(plant.genus)}</dd></div>
                  <div><dt>Location</dt><dd>{displayValue(plant.location)}</dd></div>
                  <div><dt>Status</dt><dd>{displayValue(plant.status)}</dd></div>
                </dl>
              </section>
              <span className="view-details">View details →</span>
            </button>
          )) : <p className="empty-message">No plants found.</p>}
        </div>
        </>
        )
        )}
      </section>
    </main>
  );
}

export default App;
