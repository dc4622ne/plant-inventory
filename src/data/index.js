import { featureFlags } from '../config/featureFlags.js';
import { storageKeys } from '../backupUtils.js';
import { dashboardPreferencesStorageKey } from '../dashboardPreferences.js';
import { createLocalStorageRepository } from './local/localStorageRepository.js';
import { createSupabaseRepository } from './supabase/supabaseRepository.js';
import { DataAccessError } from './errors.js';

const localKeys = {
  plants: storageKeys.plants, journalEntries: storageKeys.quickNotes, checkIns: storageKeys.reminders,
  quickViews: storageKeys.quickViews, dropdownOptions: storageKeys.dropdownOptions,
  dashboardPreferences: dashboardPreferencesStorageKey,
};

const tableNames = {
  plants: 'plants', photos: 'plant_photos', journalEntries: 'plant_journal_entries', checkIns: 'plant_check_ins',
  healthEvents: 'plant_health_events', activityEvents: 'plant_activity_events', cormEvents: 'plant_corm_events',
  tissueCultureEvents: 'plant_tc_events', lecaEvents: 'plant_leca_events', dashboardPreferences: 'dashboard_preferences',
  quickViews: 'quick_views', dropdownOptions: 'dropdown_options',
};

export function selectRepository(name, { flags = featureFlags, client = null, userId = '', storage = globalThis.localStorage } = {}) {
  if (flags.databaseEnabled === true) {
    if (!tableNames[name] || !client || !userId) {
      throw new DataAccessError({
        code: 'DATABASE_CONFIGURATION_ERROR',
        message: 'Database mode is enabled but is not completely configured.',
        operation: 'selectRepository',
      });
    }
    return createSupabaseRepository({ client, table: tableNames[name], userId });
  }
  return createLocalStorageRepository({ storage, storageKey: localKeys[name] || `plant-inventory-${name}` });
}
