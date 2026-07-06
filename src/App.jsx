import { useState } from 'react';
import './App.css';

const initialPlants = [
  {
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
    name: 'Sweet Potato Slips',
    genus: 'Sweet Potato',
    image: '🍠',
    type: 'Garden',
    source: 'Garden start',
    location: 'South Window',
    status: 'Growing outdoors',
    attention: 'Low',
    lastWatered: '2026-07-03',
    repotDate: '2026-04-26',
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
  name: '', genus: '', type: '', source: '', location: '', status: '', attention: 'Medium',
  lastWatered: '', repotDate: '', watering: '', careNote: '', lightNeeds: '', medium: '',
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
    return Array.isArray(parsedPlants) ? parsedPlants : initialPlants;
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

  const normalizedSearch = searchText.trim().toLowerCase();
  const filterOptions = ['All', ...new Set(plants.map((plant) => plant.type).filter(Boolean))];
  const genusOptions = ['All Genus', ...new Set(plants.map((plant) => plant.genus).filter(Boolean))];
  const visiblePlants = plants.filter((plant) => {
    const matchesType = activeFilter === 'All' || plant.type === activeFilter;
    const matchesGenus = activeGenus === 'All Genus' || plant.genus === activeGenus;
    const matchesSearch = plant.name.toLowerCase().includes(normalizedSearch);

    return matchesType && matchesGenus && matchesSearch;
  });

  function handleSubmit(event) {
    event.preventDefault();

    setPlants((currentPlants) => {
      const updatedPlants = [
        ...currentPlants,
        {
          ...newPlant,
          image: getPlantImage(newPlant.name, newPlant.type),
        },
      ];

      localStorage.setItem(plantsStorageKey, JSON.stringify(updatedPlants));
      return updatedPlants;
    });
    setNewPlant(emptyPlant);
    setShowForm(false);
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
  }

  return (
    <main className="plant-inventory">
      <header className="brand-header">
        <p className="brand-name">Grow With Gibre</p>
        <h1>Plant Tracker</h1>
        <p className="brand-tagline">From the city to the soil</p>
      </header>

      <section className="plant-section">
        {showForm ? (
        <form className="plant-form" onSubmit={handleSubmit}>
          <h2>Add New Plant</h2>
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
              ['lastWatered', 'Last watered'], ['repotDate', 'Repotted'], ['acquiredDate', 'Acquired'],
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
            <button type="submit">Add plant</button>
            <button className="secondary-button" type="button" onClick={cancelForm}>Cancel</button>
          </div>
        </form>
        ) : (
        <>
        <div className="section-heading">
          <h2 className="section-title" id="plant-list-heading">My Plants</h2>
          <button className="add-plant-button" type="button" onClick={() => setShowForm(true)}>
            Add New Plant
          </button>
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
          {visiblePlants.length > 0 ? visiblePlants.map((plant) => (
            <article className="plant-card" key={plant.name}>
              <div className="plant-card-heading">
                <span className="plant-image" role="img" aria-label={`${plant.name} placeholder`}>
                  {plant.image}
                </span>
                <h2>{plant.name}</h2>
              </div>
              <p className="plant-type">{displayValue(plant.type)}</p>
              <section className="card-section">
                <h3>Care</h3>
                <dl className="plant-details">
                  <div><dt>Light</dt><dd>{displayValue(plant.lightNeeds)}</dd></div>
                  <div><dt>Medium</dt><dd>{displayValue(plant.medium)}</dd></div>
                  <div><dt>Pot size</dt><dd>{displayValue(plant.potSize)}</dd></div>
                  <div><dt>Watering</dt><dd>{displayValue(plant.watering)}</dd></div>
                  <div><dt>Last watered</dt><dd>{displayValue(plant.lastWatered)}</dd></div>
                  <div><dt>Repotted</dt><dd>{displayValue(plant.repotDate)}</dd></div>
                </dl>
              </section>
              <section className="card-section">
                <h3>Tracking</h3>
                <dl className="plant-details">
                  <div><dt>Source</dt><dd>{displayValue(plant.source)}</dd></div>
                  <div><dt>Genus</dt><dd>{displayValue(plant.genus)}</dd></div>
                  <div><dt>Location</dt><dd>{displayValue(plant.location)}</dd></div>
                  <div><dt>Status</dt><dd>{displayValue(plant.status)}</dd></div>
                  <div><dt>Collection</dt><dd>{displayValue(plant.wishlistStatus)}</dd></div>
                  <div><dt>Propagation</dt><dd>{displayValue(plant.propagationStatus)}</dd></div>
                  <div><dt>Acquired</dt><dd>{displayValue(plant.acquiredDate)}</dd></div>
                  <div><dt>Price</dt><dd>{displayValue(plant.purchasePrice)}</dd></div>
                  <div className="attention-detail"><dt>Attention</dt><dd>
                    <span className={`attention-badge attention-${plant.attention.toLowerCase()}`}>
                      {plant.attention}
                    </span>
                  </dd></div>
                </dl>
              </section>
              <section className="card-section notes-section">
                <h3>Notes</h3>
                <p><strong>Care:</strong> {displayValue(plant.careNote)}</p>
                <p><strong>Pests:</strong> {displayValue(plant.pestNotes)}</p>
                <p><strong>Growth:</strong> {displayValue(plant.growthNotes)}</p>
              </section>
            </article>
          )) : <p className="empty-message">No plants found.</p>}
        </div>
        </>
        )}
      </section>
    </main>
  );
}

export default App;
