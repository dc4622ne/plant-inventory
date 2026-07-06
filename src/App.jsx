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

const filterOptions = ['All', ...new Set(initialPlants.map((plant) => plant.type))];

function getPlantImage(name, type) {
  const plantDetails = `${name} ${type}`.toLowerCase();

  if (plantDetails.includes('tissue culture') || plantDetails.includes(' tc')) return '🧪';
  if (plantDetails.includes('propagation') || plantDetails.includes('cutting')) return '🌱';
  if (plantDetails.includes('sweet potato') || plantDetails.includes('garden')) return '🍠';
  return '🪴';
}

function App() {
  const [plants, setPlants] = useState(initialPlants);
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeGenus, setActiveGenus] = useState('All Genus');
  const [searchText, setSearchText] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('Plant Wall');
  const [note, setNote] = useState('');

  const normalizedSearch = searchText.trim().toLowerCase();
  const genusOptions = ['All Genus', ...new Set(plants.map((plant) => plant.genus))];
  const visiblePlants = plants.filter((plant) => {
    const matchesType = activeFilter === 'All' || plant.type === activeFilter;
    const matchesGenus = activeGenus === 'All Genus' || plant.genus === activeGenus;
    const matchesSearch = plant.name.toLowerCase().includes(normalizedSearch);

    return matchesType && matchesGenus && matchesSearch;
  });

  function handleSubmit(event) {
    event.preventDefault();

    setPlants((currentPlants) => [
      ...currentPlants,
      {
        name,
        genus: 'Unknown',
        image: getPlantImage(name, type),
        type,
        source: 'Personal collection',
        location,
        status: 'New',
        attention: 'Medium',
        lastWatered: new Date().toISOString().slice(0, 10),
        repotDate: 'Not yet repotted',
        watering: 'Check the growing medium and water when the plant needs it.',
        careNote: note,
        lightNeeds: 'Bright indirect light',
        medium: 'Soil',
        potSize: '4 inch',
        acquiredDate: new Date().toISOString().slice(0, 10),
        purchasePrice: 'Unknown',
        wishlistStatus: 'Owned',
        propagationStatus: 'Not propagating',
        pestNotes: 'No pests observed.',
        growthNotes: 'New addition; watch for signs of settling in.',
      },
    ]);
    setName('');
    setType('');
    setLocation('Plant Wall');
    setNote('');
  }

  return (
    <main className="plant-inventory">
      <header className="brand-header">
        <p className="brand-name">Grow With Gibre</p>
        <h1>Plant Tracker</h1>
        <p className="brand-tagline">From the city to the soil</p>
      </header>

      <section className="plant-section" aria-labelledby="plant-list-heading">
        <h2 className="section-title" id="plant-list-heading">My Plants</h2>
        <form className="plant-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="plant-name">Plant name</label>
            <input
              id="plant-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="plant-type">Type</label>
            <input
              id="plant-type"
              type="text"
              value={type}
              onChange={(event) => setType(event.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="plant-location">Location</label>
            <select
              id="plant-location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            >
              <option>Plant Wall</option>
              <option>South Window</option>
              <option>Kitchen</option>
              <option>Basement Grow Light</option>
              <option>TC / Acclimation Area</option>
              <option>Propagation Area</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="plant-note">Note</label>
            <input
              id="plant-note"
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              required
            />
          </div>

          <button type="submit">Add plant</button>
        </form>
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
              <p className="plant-type">{plant.type}</p>
              <section className="card-section">
                <h3>Care</h3>
                <dl className="plant-details">
                  <div><dt>Light</dt><dd>{plant.lightNeeds}</dd></div>
                  <div><dt>Medium</dt><dd>{plant.medium}</dd></div>
                  <div><dt>Pot size</dt><dd>{plant.potSize}</dd></div>
                  <div><dt>Watering</dt><dd>{plant.watering}</dd></div>
                  <div><dt>Last watered</dt><dd>{plant.lastWatered}</dd></div>
                  <div><dt>Repotted</dt><dd>{plant.repotDate}</dd></div>
                </dl>
              </section>
              <section className="card-section">
                <h3>Tracking</h3>
                <dl className="plant-details">
                  <div><dt>Source</dt><dd>{plant.source}</dd></div>
                  <div><dt>Genus</dt><dd>{plant.genus}</dd></div>
                  <div><dt>Location</dt><dd>{plant.location}</dd></div>
                  <div><dt>Status</dt><dd>{plant.status}</dd></div>
                  <div><dt>Collection</dt><dd>{plant.wishlistStatus}</dd></div>
                  <div><dt>Propagation</dt><dd>{plant.propagationStatus}</dd></div>
                  <div><dt>Acquired</dt><dd>{plant.acquiredDate}</dd></div>
                  <div><dt>Price</dt><dd>{plant.purchasePrice}</dd></div>
                  <div className="attention-detail"><dt>Attention</dt><dd>
                    <span className={`attention-badge attention-${plant.attention.toLowerCase()}`}>
                      {plant.attention}
                    </span>
                  </dd></div>
                </dl>
              </section>
              <section className="card-section notes-section">
                <h3>Notes</h3>
                <p><strong>Care:</strong> {plant.careNote}</p>
                <p><strong>Pests:</strong> {plant.pestNotes}</p>
                <p><strong>Growth:</strong> {plant.growthNotes}</p>
              </section>
            </article>
          )) : <p className="empty-message">No plants found.</p>}
        </div>
      </section>
    </main>
  );
}

export default App;
