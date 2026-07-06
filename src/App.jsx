import { useState } from 'react';
import './App.css';

const initialPlants = [
  {
    name: 'Monstera Albo',
    image: '🪴',
    type: 'Houseplant',
    location: 'Plant Wall',
    status: 'Watching for new growth',
    lastWatered: '2026-07-04',
    watering: 'Keep the LECA reservoir topped up without submerging the roots.',
    careNote: 'Keep in bright indirect light and monitor LECA roots.',
  },
  {
    name: 'Venom TC',
    image: '🧪',
    type: 'Tissue Culture',
    location: 'TC / Acclimation Area',
    status: 'Acclimating',
    lastWatered: '2026-07-05',
    watering: 'Keep the growing medium lightly moist, but never waterlogged.',
    careNote: 'Keep humidity high and avoid disturbing the roots.',
  },
  {
    name: 'Sweet Potato Slips',
    image: '🍠',
    type: 'Garden',
    location: 'South Window',
    status: 'Growing outdoors',
    lastWatered: '2026-07-03',
    watering: 'Water deeply whenever the top inch of soil begins to dry.',
    careNote: 'Keep evenly watered while vines establish.',
  },
  {
    name: 'Pothos Cuttings',
    image: '🌱',
    type: 'Propagation',
    location: 'Propagation Area',
    status: 'Rooting',
    lastWatered: '2026-07-06',
    watering: 'Keep the nodes submerged and refresh the water regularly.',
    careNote: 'Change water regularly and pot up once roots are strong.',
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
  const [searchText, setSearchText] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('Plant Wall');
  const [note, setNote] = useState('');

  const normalizedSearch = searchText.trim().toLowerCase();
  const visiblePlants = plants.filter((plant) => {
    const matchesType = activeFilter === 'All' || plant.type === activeFilter;
    const matchesSearch = plant.name.toLowerCase().includes(normalizedSearch);

    return matchesType && matchesSearch;
  });

  function handleSubmit(event) {
    event.preventDefault();

    setPlants((currentPlants) => [
      ...currentPlants,
      {
        name,
        image: getPlantImage(name, type),
        type,
        location,
        status: 'New',
        lastWatered: new Date().toISOString().slice(0, 10),
        watering: 'Check the growing medium and water when the plant needs it.',
        careNote: note,
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
              <p className="plant-status"><strong>Location:</strong> {plant.location}</p>
              <p className="plant-status"><strong>Status:</strong> {plant.status}</p>
              <p className="plant-status"><strong>Last watered:</strong> {plant.lastWatered}</p>
              <p className="plant-status"><strong>Watering:</strong> {plant.watering}</p>
              <p className="plant-note">{plant.careNote}</p>
            </article>
          )) : <p className="empty-message">No plants found.</p>}
        </div>
      </section>
    </main>
  );
}

export default App;
