import { useState } from 'react';
import './App.css';

const initialPlants = [
  {
    name: 'Monstera Albo',
    type: 'Houseplant',
    status: 'Watching for new growth',
    careNote: 'Keep in bright indirect light and monitor LECA roots.',
  },
  {
    name: 'Venom TC',
    type: 'Tissue Culture',
    status: 'Acclimating',
    careNote: 'Keep humidity high and avoid disturbing the roots.',
  },
  {
    name: 'Sweet Potato Slips',
    type: 'Garden',
    status: 'Growing outdoors',
    careNote: 'Keep evenly watered while vines establish.',
  },
  {
    name: 'Pothos Cuttings',
    type: 'Propagation',
    status: 'Rooting',
    careNote: 'Change water regularly and pot up once roots are strong.',
  },
];

function App() {
  const [plants, setPlants] = useState(initialPlants);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [note, setNote] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    setPlants((currentPlants) => [
      ...currentPlants,
      {
        name,
        type,
        status: 'New',
        careNote: note,
      },
    ]);
    setName('');
    setType('');
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
        <div className="plant-list">
          {plants.map((plant) => (
            <article className="plant-card" key={plant.name}>
              <h2>{plant.name}</h2>
              <p className="plant-type">{plant.type}</p>
              <p className="plant-status"><strong>Status:</strong> {plant.status}</p>
              <p className="plant-note">{plant.careNote}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
