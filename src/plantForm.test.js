import test from 'node:test';
import assert from 'node:assert/strict';
import { addCustomOption, discoverPlantFieldOptions } from './collectionControl.js';
import { getSoilMixByValue, soilMixSelectOptions } from './resources/index.js';

test('soil mixes use reusable custom options, trim additions, ignore blanks and duplicates', () => {
  const original = { soilMix: ['Other', 'base-mix'] };
  const added = addCustomOption(original, 'soilMix', '  Bark and pumice  ');
  assert.deepEqual(original.soilMix, ['Other', 'base-mix']);
  assert.equal(addCustomOption(added, 'soilMix', ' '), added);
  assert.equal(addCustomOption(added, 'soilMix', 'bark AND pumice'), added);
  const restored = JSON.parse(JSON.stringify(added));
  assert.deepEqual(soilMixSelectOptions(restored.soilMix).map(({ label }) => label),
    ['Bark and pumice', 'Base Mix', 'Other']);
});

test('saved soil values, Other, and undiscovered draft values stay selectable without mutation', () => {
  const plants = ['Other', 'Legacy bark blend', 'Semi-Hydro / LECA', 'base-mix', '  older blend  ']
    .map((soilMix, id) => ({ id, soilMix, imageUrl: 'unchanged-image' }));
  const before = JSON.stringify(plants);
  const discovered = discoverPlantFieldOptions({ soilMix: [] }, plants, ['soilMix']);
  for (const plant of plants) {
    const options = soilMixSelectOptions(discovered.soilMix, plant.soilMix);
    const selected = getSoilMixByValue(plant.soilMix)?.id || plant.soilMix;
    assert.ok(options.some(({ value }) => value === selected));
  }
  assert.deepEqual(soilMixSelectOptions([], 'Other'), [{ value: 'Other', label: 'Other' }]);
  assert.deepEqual(soilMixSelectOptions([], 'Unsaved legacy value'),
    [{ value: 'Unsaved legacy value', label: 'Unsaved legacy value' }]);
  assert.equal(JSON.stringify(plants), before);
});

test('soil recipe aliases collapse to one labelled choice and options follow categorical sorting', () => {
  const values = ['Other', 'z mix', 'semi-hydro', 'Semi-Hydro / LECA', 'Base Mix', 'base-mix', 'a mix'];
  const before = [...values];
  assert.deepEqual(soilMixSelectOptions(values).map(({ label }) => label),
    ['a mix', 'Base Mix', 'Semi-Hydro', 'z mix', 'Other']);
  assert.deepEqual(values, before);
  assert.deepEqual(soilMixSelectOptions(), []);
});
