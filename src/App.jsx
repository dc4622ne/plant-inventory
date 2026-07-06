import './App.css';

const plants = [
  { name: 'Monstera Albo', type: 'Houseplant', status: 'In LECA' },
  { name: 'Venom TC', type: 'Tissue Culture', status: 'Acclimating' },
  { name: 'Sweet Potato Slips', type: 'Garden', status: 'Outdoors' },
  { name: 'Pothos Cuttings', type: 'Propagation', status: 'Propagating' },
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
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
