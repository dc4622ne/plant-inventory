import { useState } from 'react';
import './App.css';

const initialPlants = [
  {
    name: 'Monstera Albo',
    type: 'Houseplant',
    status: 'In LECA',
    careNote: 'Keep in bright, indirect light and refresh the water regularly.',
  },
  {
    name: 'Venom TC',
    type: 'Tissue Culture',
    status: 'Acclimating',
    careNote: 'Maintain high humidity while slowly introducing fresh air.',
  },
  {
    name: 'Sweet Potato Slips',
    type: 'Garden',
    status: 'Outdoors',
    careNote: 'Water consistently and keep them in a sunny location.',
  },
  {
    name: 'Pothos Cuttings',
    type: 'Propagation',
    status: 'Propagating',
    careNote: 'Change the water weekly and watch for new roots.',
  },
];

function App() {
  const [plants, setPlants] = useState(initialPlants);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    setPlants((currentPlants) => [
      ...currentPlants,
      { name, type, status, careNote: 'No care note added.' },
    ]);
    setName('');
    setType('');
    setStatus('');
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

          <label htmlFor="plant-status">Status</label>
          <input
            id="plant-status"
            type="text"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            required
          />

          <button type="submit">Add plant</button>
        </form>
        <ul className="plant-list">
          {plants.map((plant) => (
            <li className="plant-card" key={plant.name}>
              <h3>{plant.name}</h3>
              <p>Plant type: {plant.type}</p>
              <p>Status: {plant.status}</p>
              <p>Care note: {plant.careNote}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
