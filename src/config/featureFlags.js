/** Only the exact string "true" enables an experimental feature. */
export function parseFeatureFlag(value) {
  return value === 'true';
}

export function createFeatureFlags(environment = {}) {
  return Object.freeze({
    databaseEnabled: parseFeatureFlag(environment.VITE_DATABASE_ENABLED),
    authEnabled: parseFeatureFlag(environment.VITE_AUTH_ENABLED),
    realtimeEnabled: parseFeatureFlag(environment.VITE_REALTIME_ENABLED),
  });
}

export const featureFlags = createFeatureFlags(import.meta.env || {});
