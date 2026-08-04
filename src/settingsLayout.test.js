import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aboutGeneralItems,
  alwaysExpandedSettingsSections,
  settingsSections,
} from './settingsLayout.js';

test('Data & Sync is first and is the only always-expanded Settings section', () => {
  assert.deepEqual(settingsSections[0], ['cloud', 'Data & Sync']);
  assert.deepEqual(alwaysExpandedSettingsSections, ['cloud']);
});

test('General is absent from Settings and its informational content belongs to About', () => {
  assert.equal(settingsSections.some(([id]) => id === 'general'), false);
  assert.deepEqual(aboutGeneralItems, [
    ['App name', 'Grow With Gibre Plant Tracker'],
    ['Current storage type', 'Browser local storage'],
  ]);
});
