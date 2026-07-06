import './App.css';

const plants = [
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
  return (
    <main className="plant-inventory">
      <h1>Welcome to Gibre’s Plant Tracker</h1>

      <section aria-labelledby="plant-list-heading">
        <h2 id="plant-list-heading">My Plants</h2>
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
