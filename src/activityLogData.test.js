import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivityLogEntry } from './activityLogData.js';

test('quick Watered activity uses the existing activity-log record shape', () => {
  assert.deepEqual(createActivityLogEntry({
    activityType: 'Watered',
    date: '2026-09-06',
    id: 'watered-1',
    createdAt: '2026-09-06T14:30:00.000Z',
  }), {
    activityType: 'Watered',
    date: '2026-09-06',
    notes: '',
    id: 'watered-1',
    createdAt: '2026-09-06T14:30:00.000Z',
  });
});

test('activity-log entry creation trims notes without changing custom activity types', () => {
  const entry = createActivityLogEntry({
    activityType: 'Misted',
    date: '2026-09-05',
    notes: '  underside of leaves  ',
    id: 'mist-1',
    createdAt: '2026-09-05T10:00:00.000Z',
  });
  assert.equal(entry.activityType, 'Misted');
  assert.equal(entry.notes, 'underside of leaves');
});
