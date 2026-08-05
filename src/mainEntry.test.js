import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('main entry mounts the authenticated shell and protects development from stale service workers', () => {
  const source = readFileSync(new URL('./main.jsx', import.meta.url), 'utf8');
  assert.match(source, /import\('\.\/ConnectedApp\.jsx'\)/);
  assert.doesNotMatch(source, /import App from/);
  assert.match(source, /import\.meta\.env\.DEV/);
  assert.match(source, /registration\.unregister\(\)/);
});
