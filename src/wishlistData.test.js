import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlantFromWishlistItem,
  filterWishlistItemsByView,
  getWishlistDashboardModel,
  isConvertedWishlistItem,
} from './wishlistData.js';

const items = [
  { id: 'active', name: 'Very Long Active Wishlist Plant Name', desiredStatus: 'Wishlist', converted: false },
  { id: 'converted', name: 'Converted Plant', desiredStatus: 'Converted', converted: true },
  { id: 'legacy', name: 'Legacy Converted Plant', desiredStatus: 'Converted' },
];

test('active Wishlist is the default and converted records remain available', () => {
  assert.deepEqual(filterWishlistItemsByView(items).map(({ id }) => id), ['active']);
  assert.deepEqual(filterWishlistItemsByView(items, 'converted').map(({ id }) => id), ['converted', 'legacy']);
  assert.deepEqual(filterWishlistItemsByView(items, 'all'), items);
  assert.equal(isConvertedWishlistItem(items[2]), true);
});

test('Tissue Culture conversion retains the existing TC classification and lifecycle', () => {
  const plant = createPlantFromWishlistItem({
    id: 'tc', name: 'Venom TC', genus: 'Alocasia', type: 'Tissue Culture', source: 'Lab',
    expectedArrivalDate: '2026-09-01', imageUrl: 'photo', notes: 'Keep humid', price: '42',
  }, { lifecycleStage: 'Juvenile Houseplant', origin: 'Purchased plant', status: '' }, () => '🧪');
  assert.equal(plant.type, 'Tissue Culture');
  assert.equal(plant.origin, 'Tissue culture');
  assert.equal(plant.startingStage, 'Tissue Culture');
  assert.equal(plant.acquisitionMethod, 'Purchased');
  assert.equal(plant.lifecycleStage, 'Tissue Culture');
  assert.equal(plant.genus, 'Alocasia');
  assert.equal(plant.careNote, 'Keep humid');
});

test('non-TC conversion keeps the existing default lifecycle behavior', () => {
  const defaults = { lifecycleStage: 'Juvenile Houseplant', origin: 'Purchased plant' };
  const plant = createPlantFromWishlistItem({
    id: 'regular', name: 'Pothos', genus: 'Epipremnum', type: 'Houseplant', source: '',
    expectedArrivalDate: '', actualArrivalDate: '', imageUrl: '', notes: '', price: '',
  }, defaults, () => '🪴');
  assert.equal(plant.lifecycleStage, 'Juvenile Houseplant');
  assert.equal(plant.startingStage, 'Juvenile Houseplant');
  assert.equal(plant.acquisitionMethod, 'Purchased');
  assert.equal(plant.origin, 'Purchased plant');
  assert.equal(plant.type, 'Houseplant');
});

test('Corm conversion starts and remains in the existing Corm lifecycle', () => {
  const plant = createPlantFromWishlistItem({
    id: 'corm', name: 'Alocasia corm', genus: 'Alocasia', type: 'Corm', source: '',
    expectedArrivalDate: '', actualArrivalDate: '', imageUrl: '', notes: '', price: '',
  }, { lifecycleStage: 'Juvenile Houseplant', origin: 'Purchased plant' }, () => '🌱');
  assert.equal(plant.origin, 'Corm');
  assert.equal(plant.startingStage, 'Corm');
  assert.equal(plant.lifecycleStage, 'Corm');
  assert.equal(plant.acquisitionMethod, 'Purchased');
});

test('Wishlist Dashboard counts active items only and targets the active Wishlist view', () => {
  assert.deepEqual(getWishlistDashboardModel(items), {
    count: 1,
    previewNames: ['Very Long Active Wishlist Plant Name'],
    targetView: 'active',
  });
});
