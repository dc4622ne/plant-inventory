import { featureFlags } from '../config/featureFlags.js';
import { disabledServiceError, normalizeDataError } from '../data/errors.js';
import { applicationSchemaVersion } from '../data/schemaCompatibility.js';

export function createDatabaseService({ client, flags = featureFlags } = {}) {
  return Object.freeze({
    async testConnection() {
      if (!flags.databaseEnabled || !client) throw disabledServiceError('Database');
      const { data, error } = await client.rpc('get_application_schema_version');
      if (error) throw normalizeDataError(error, 'testConnection');
      return { connected: true, schemaVersion: Number(data), expectedSchemaVersion: applicationSchemaVersion };
    },
  });
}
