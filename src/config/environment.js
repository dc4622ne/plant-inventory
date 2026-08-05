export function readApplicationEnvironment(environment = {}) {
  const name = String(environment.VITE_APP_ENV || '').trim().toLowerCase();
  return Object.freeze({ name: name || 'production', isStaging: name === 'staging' });
}

export const applicationEnvironment = readApplicationEnvironment(import.meta.env || {});
