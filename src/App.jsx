import './App.css';

const plants = [
  { name: 'Monstera Albo', type: 'Houseplant' },
  { name: 'Venom TC', type: 'Tissue Culture' },
  { name: 'Sweet Potato Slips', type: 'Garden' },
  { name: 'Pothos Cuttings', type: 'Propagation' },
];

function App() {
  return (
    <main className="plant-inventory">
      <h1>Welcome to Gibre’s Plant Tracker</h1>
      <p style={{ fontSize: '24px', fontWeight: 'bold' }}>TEST: This is the current App.jsx file.</p>

      <section aria-labelledby="plant-list-heading">
        <h2 id="plant-list-heading">My Plants</h2>
        <ul className="plant-list">
          {plants.map((plant) => (
            <li className="plant-card" key={plant.name}>
              <h3>{plant.name}</h3>
              <p>Plant type: {plant.type}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default App;
