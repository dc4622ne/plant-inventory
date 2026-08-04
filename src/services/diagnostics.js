import { featureFlags } from '../config/featureFlags.js';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';
import { applicationSchemaVersion } from '../data/schemaCompatibility.js';
import { normalizeDataError } from '../data/errors.js';

export async function getDatabaseDiagnostics({ client, flags = featureFlags, configured = isSupabaseConfigured } = {}) {
  const diagnostics = {
    configured, databaseEnabled: flags.databaseEnabled, authEnabled: flags.authEnabled,
    realtimeEnabled: flags.realtimeEnabled, connected: false, authenticatedUserId: null,
    schemaVersion: applicationSchemaVersion, lastConnectionError: null,
  };
  if (!configured || !flags.databaseEnabled || !client) return diagnostics;
  try {
    const [{ data: version, error }, { data: authData }] = await Promise.all([
      client.rpc('get_application_schema_version'),
      client.auth.getUser(),
    ]);
    if (error) throw error;
    diagnostics.connected = true;
    diagnostics.remoteSchemaVersion = Number(version);
    diagnostics.authenticatedUserId = authData?.user?.id || null;
  } catch (error) {
    const normalized = normalizeDataError(error, 'diagnostics');
    diagnostics.lastConnectionError = { code: normalized.code, message: normalized.message };
  }
  return diagnostics;
}
