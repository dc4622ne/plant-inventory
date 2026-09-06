import { createClient } from '@supabase/supabase-js';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function readSupabaseConfiguration(environment = {}) {
  const url = clean(environment.VITE_SUPABASE_URL);
  const anonKey = clean(environment.VITE_SUPABASE_ANON_KEY);
  let projectHost = '';
  let configurationError = '';
  if (!url || !anonKey) configurationError = 'Both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.';
  else {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || !parsed.hostname) throw new Error('invalid URL');
      projectHost = parsed.hostname;
    } catch {
      configurationError = 'VITE_SUPABASE_URL must be a valid HTTPS URL.';
    }
  }
  return Object.freeze({ url, anonKey, projectHost, configurationError, configured: !configurationError });
}

/** Testable constructor helper; production uses the direct singleton below for optimal tree-shaking. */
export function createSupabaseClient(configuration, factory) {
  if (!configuration?.configured) return null;
  if (typeof factory !== 'function') throw new TypeError('A Supabase client factory is required.');
  return factory(configuration.url, configuration.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, experimental: { passkey: true } }, db: { retryEnabled: false },
  });
}

export const supabaseConfiguration = readSupabaseConfiguration(import.meta.env || {});
export const supabase = supabaseConfiguration.configured
  ? createClient(supabaseConfiguration.url, supabaseConfiguration.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, experimental: { passkey: true } }, db: { retryEnabled: false },
  })
  : null;
export const isSupabaseConfigured = supabaseConfiguration.configured;
