import { useState } from 'react';
import './App.css';

const initialPlants = [
  {
    name: 'Monstera Albo',
    type: 'Houseplant',
    light: 'Bright indirect light',
    water: 'Let LECA reservoir get low before refilling',
    note: 'Recently converted to LECA',
  },
  {
    name: 'Venom TC',
    type: 'Tissue Culture',
    light: 'Bright filtered light',
    water: 'High humidity, carefully acclimating',
    note: 'Watch for steady new growth',
  },
  {
    name: 'Sweet Potato Slips',
    type: 'Garden',
    light: 'Full sun',
    water: 'Keep evenly watered outdoors',
    note: 'Planted in the garden bed',
  },
  {
    name: 'Pothos Cuttings',
    type: 'Propagation',
    light: 'Low to bright indirect light',
    water: 'Keep roots moist while establishing',
    note: 'Rooted cuttings from propagation',
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
        light: 'Not specified',
        water: 'Not specified',
        note,
      },
    ]);
    setName('');
    setType('');
    setNote('');
  }

  return (
    <main className="plant-inventory">
      <h1>Welcome to Gibre’s Plant Tracker</h1>

      <section aria-labelledby="plant-list-heading">
        <h2 id="plant-list-heading">My Plants</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="plant-name">Plant name</label>
          <input
            id="plant-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

          <label htmlFor="plant-type">Type</label>
          <input
            id="plant-type"
            type="text"
            value={type}
            onChange={(event) => setType(event.target.value)}
            required
          />

          <label htmlFor="plant-note">Note</label>
          <input
            id="plant-note"
            type="text"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            required
          />

          <button type="submit">Add plant</button>
        </form>
        <div className="plant-list">
          {plants.map((plant) => (
            <article className="plant-card" key={plant.name}>
              <h2>{plant.name}</h2>
              <p>{plant.type}</p>
              <p><strong>Light:</strong> {plant.light}</p>
              <p><strong>Water:</strong> {plant.water}</p>
              <p><strong>Note:</strong> {plant.note}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
