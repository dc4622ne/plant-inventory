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
  name: '', genus: '', type: '', source: '', location: '', status: '', attention: 'Medium',
  lastWatered: '', repotDate: '', plantedDate: '', watering: '', careNote: '', lightNeeds: '', medium: '',
  potSize: '', acquiredDate: '', purchasePrice: '', wishlistStatus: 'Owned',
  propagationStatus: '', pestNotes: '', growthNotes: '',
};

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

  if (!savedPlants) return initialPlants;

  try {
    const parsedPlants = JSON.parse(savedPlants);
    if (!Array.isArray(parsedPlants)) return initialPlants;

    // Older garden plants used repotDate because plantedDate did not exist yet.
    return parsedPlants.map((plant) => {
      const hasOldGardenDate = plant.type === 'Garden'
        && !plant.plantedDate
        && dateInputValue(plant.repotDate);

      const migratedPlant = hasOldGardenDate ? { ...plant, plantedDate: plant.repotDate } : plant;
      return { ...migratedPlant, lifecycleStatus: migratedPlant.lifecycleStatus || 'active' };
    });
  } catch {
    return initialPlants;
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

function displayValue(value) {
  return value || 'Not set';
}

function lifecycleLabel(lifecycleStatus) {
  return lifecycleStatus === 'archived'
    ? 'Archived'
    : lifecycleStatus === 'graveyard' ? 'Graveyard' : 'Active';
}

function dateInputValue(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : '';
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
  const [showForm, setShowForm] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState(loadDropdownOptions);
  const [newOptionText, setNewOptionText] = useState({
    genus: '', type: '', status: '', location: '', lightNeeds: '',
  });
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeGenus, setActiveGenus] = useState('All Genus');
  const [searchText, setSearchText] = useState('');
  const [newPlant, setNewPlant] = useState(emptyPlant);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [lifecycleView, setLifecycleView] = useState('active');

  const normalizedSearch = searchText.trim().toLowerCase();
  const filterOptions = ['All', ...new Set(plants.map((plant) => plant.type).filter(Boolean))];
  const genusOptions = ['All Genus', ...new Set(plants.map((plant) => plant.genus).filter(Boolean))];
  const visiblePlants = plants
    .filter((plant) => {
      const matchesLifecycle = (plant.lifecycleStatus || 'active') === lifecycleView;
      const matchesType = activeFilter === 'All' || plant.type === activeFilter;
      const matchesGenus = activeGenus === 'All Genus' || plant.genus === activeGenus;
      const matchesSearch = plant.name.toLowerCase().includes(normalizedSearch);

      return matchesLifecycle && matchesType && matchesGenus && matchesSearch;
    })
    .sort((firstPlant, secondPlant) => (firstPlant.genus || '').localeCompare(secondPlant.genus || ''));

  function handleSubmit(event) {
    event.preventDefault();

    const savedPlant = {
      ...newPlant,
      image: getPlantImage(newPlant.name, newPlant.type),
    };

    // Keep older text values unless the user chooses a replacement date.
    if (isEditing) {
      ['lastWatered', 'repotDate', 'plantedDate', 'acquiredDate'].forEach((fieldName) => {
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
    setShowForm(false);
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
    setShowForm(false);
    setIsEditing(false);
  }

  function startEditing() {
    setNewPlant({
      ...emptyPlant,
      ...selectedPlant,
      lastWatered: dateInputValue(selectedPlant.lastWatered),
      repotDate: dateInputValue(selectedPlant.repotDate),
      plantedDate: dateInputValue(selectedPlant.plantedDate),
      acquiredDate: dateInputValue(selectedPlant.acquiredDate),
    });
    setNewOptionText({ genus: '', type: '', status: '', location: '', lightNeeds: '' });
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

  return (
    <main className="plant-inventory">
      <header className="brand-header">
        <p className="brand-name">Grow With Gibre</p>
        <h1>Plant Tracker</h1>
        <p className="brand-tagline">From the city to the soil</p>
      </header>

      <section className="plant-section">
        {selectedPlant && !isEditing ? (
        <article className="plant-detail" aria-labelledby="plant-detail-heading">
          <div className="detail-actions">
            <button className="back-button" type="button" onClick={() => setSelectedPlant(null)}>
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
            <span className="plant-image detail-image" role="img" aria-label={`${selectedPlant.name} placeholder`}>
              {selectedPlant.image || getPlantImage(selectedPlant.name, selectedPlant.type)}
            </span>
            <div>
              <p className="detail-eyebrow">Plant details</p>
              <h2 id="plant-detail-heading">{selectedPlant.name}</h2>
              <p>{displayValue(selectedPlant.genus)} · {displayValue(selectedPlant.type)}</p>
              <p className={`lifecycle-badge lifecycle-${selectedPlant.lifecycleStatus || 'active'}`}>
                {lifecycleLabel(selectedPlant.lifecycleStatus)}
              </p>
            </div>
          </div>
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
        </article>
        ) : showForm || isEditing ? (
        <form className="plant-form" onSubmit={handleSubmit}>
          <h2>{isEditing ? `Edit ${selectedPlant.name}` : 'Add New Plant'}</h2>
          <div className="form-grid">
            {[
              ['name', 'Plant name'], ['source', 'Source'],
              ['medium', 'Growing medium'], ['potSize', 'Pot size'],
              ['watering', 'Watering notes'], ['propagationStatus', 'Propagation'],
              ['purchasePrice', 'Purchase price'],
            ].map(([fieldName, label]) => (
              <div className="form-field" key={fieldName}>
                <label htmlFor={`plant-${fieldName}`}>{label}</label>
                <input id={`plant-${fieldName}`} name={fieldName} value={newPlant[fieldName]}
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
                <option>Low</option><option>Medium</option><option>High</option>
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
            <button type="submit">{isEditing ? 'Save changes' : 'Add plant'}</button>
            <button className="secondary-button" type="button" onClick={cancelForm}>Cancel</button>
          </div>
        </form>
        ) : (
        <>
        <div className="section-heading">
          <h2 className="section-title" id="plant-list-heading">My Plants</h2>
          <button className="add-plant-button" type="button" onClick={() => setShowForm(true)}
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
                setActiveFilter('All');
                setActiveGenus('All Genus');
              }}>
              {label}
            </button>
          ))}
        </div>
        <div className="plant-filters" aria-label="Filter plants by type">
          {filterOptions.map((filter) => (
            <button
              className={activeFilter === filter ? 'active' : ''}
              type="button"
              key={filter}
              aria-pressed={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="genus-filter">
          <label htmlFor="genus-filter">Filter by genus</label>
          <select
            id="genus-filter"
            value={activeGenus}
            onChange={(event) => setActiveGenus(event.target.value)}
          >
            {genusOptions.map((genus) => (
              <option key={genus} value={genus}>{genus}</option>
            ))}
          </select>
        </div>
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
        <div className="plant-list">
          {visiblePlants.length > 0 ? visiblePlants.map((plant, plantIndex) => (
            <button
              className="plant-card"
              type="button"
              key={`${plant.name}-${plantIndex}`}
              onClick={() => setSelectedPlant(plant)}
              aria-label={`View details for ${plant.name}`}
            >
              <div className="plant-card-heading">
                <span className="plant-image" role="img" aria-label={`${plant.name} placeholder`}>
                  {plant.image}
                </span>
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
          )) : <p className="empty-message">No {lifecycleLabel(lifecycleView).toLowerCase()} plants found.</p>}
        </div>
        </>
        )}
      </section>
    </main>
  );
}

export default App;
