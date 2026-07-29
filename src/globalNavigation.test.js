import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeNavigationDestination,
  globalNavigationDestinations,
  globalNavigationGroups,
  globalNavigationItems,
  hasDuplicateNavigationDestinations,
} from './globalNavigation.js';

test('global navigation configuration contains every reusable core destination exactly once', () => {
  const ids = globalNavigationItems().map(({ id }) => id);
  assert.deepEqual(ids.filter((id) => [
    'dashboard', 'plant-list', 'add-plant', 'plant-journal', 'check-ins',
    'plant-health', 'plant-spaces', 'wishlist', 'settings', 'about',
  ].includes(id)).sort(), [
    'about', 'add-plant', 'check-ins', 'dashboard', 'plant-health',
    'plant-journal', 'plant-list', 'plant-spaces', 'settings', 'wishlist',
  ]);
  assert.equal(hasDuplicateNavigationDestinations(), false);
  assert.equal(globalNavigationGroups.length, 3);
});

test('global navigation uses the compact requested destination order', () => {
  assert.deepEqual(globalNavigationDestinations.map(({ label }) => label), [
    'Dashboard', 'Plant List', 'Add Plant', 'Plant Journal', 'Check-ins', 'Plant Health',
    'Plant Spaces', 'Wishlist', 'Garden Beds', 'Resources', 'Settings', 'About',
  ]);
});

test('active destination follows primary routes and Add Plant state', () => {
  assert.equal(activeNavigationDestination({ appView: 'dashboard' }), 'dashboard');
  assert.equal(activeNavigationDestination({ appView: 'quick-notes' }), 'plant-journal');
  assert.equal(activeNavigationDestination({ appView: 'plants', isAddingPlant: true }), 'add-plant');
  assert.equal(activeNavigationDestination({ appView: 'plants', isEditingPlant: true }), 'plant-list');
});
