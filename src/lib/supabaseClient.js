import { createClient } from '@supabase/supabase-js';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function readSupabaseConfiguration(environment = {}) {
  const url = clean(environment.VITE_SUPABASE_URL);
  const anonKey = clean(environment.VITE_SUPABASE_ANON_KEY);
  return Object.freeze({ url, anonKey, configured: Boolean(url && anonKey) });
}

/** Testable constructor helper; production uses the direct singleton below for optimal tree-shaking. */
export function createSupabaseClient(configuration, factory) {
  if (!configuration?.configured) return null;
  if (typeof factory !== 'function') throw new TypeError('A Supabase client factory is required.');
  return factory(configuration.url, configuration.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}

export const supabaseConfiguration = readSupabaseConfiguration(import.meta.env || {});
export const supabase = supabaseConfiguration.configured
  ? createClient(supabaseConfiguration.url, supabaseConfiguration.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  : null;
export const isSupabaseConfigured = supabaseConfiguration.configured;
