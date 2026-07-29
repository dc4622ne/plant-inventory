import test from 'node:test';
import assert from 'node:assert/strict';
import { sortCategoricalOptions, sortOptionsAlphabetically, sortOptionsForField } from './optionSorting.js';

test('sorts visible labels case-insensitively without mutating the source array', () => {
  const source = ['zebra', 'Apple', 'banana'];
  const result = sortOptionsAlphabetically(source);
  assert.deepEqual(result, ['Apple', 'banana', 'zebra']);
  assert.deepEqual(source, ['zebra', 'Apple', 'banana']);
});

test('preserves fixed first and last options', () => {
  assert.deepEqual(
    sortCategoricalOptions(['Other', 'Zulu', 'Not specified', 'alpha']),
    ['Not specified', 'alpha', 'Zulu', 'Other'],
  );
});

test('sorts object options by label while preserving stored values', () => {
  const result = sortOptionsAlphabetically([
    { value: 'b-id', label: 'beta' },
    { value: 'a-id', label: 'Alpha' },
  ]);
  assert.deepEqual(result.map(({ value }) => value), ['a-id', 'b-id']);
});

test('keeps identical labels stable', () => {
  const result = sortOptionsAlphabetically([
    { value: 'first', label: 'Same' },
    { value: 'second', label: 'same' },
  ]);
  assert.deepEqual(result.map(({ value }) => value), ['first', 'second']);
});

test('intentionally ordered workflow arrays remain untouched unless explicitly sorted', () => {
  const lifecycle = ['Seed / Corm', 'Propagation', 'Juvenile Houseplant', 'Mature Houseplant'];
  const result = sortOptionsForField('lifecycleStage', lifecycle);
  assert.deepEqual(result, lifecycle);
  assert.notEqual(result, lifecycle);
});
