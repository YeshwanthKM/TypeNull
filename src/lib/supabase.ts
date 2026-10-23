import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Reusable Supabase Client for TypeNull
 * 
 * Configured using public client-safe environment variables.
 * Supports both manual Vite naming and Vercel native integration variables:
 * - VITE_SUPABASE_URL or SUPABASE_URL
 * - VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_ANON_KEY, or SUPABASE_ANON_KEY
 * 
 * NEVER expose service-role keys or database passwords in frontend code.
 */

const env = import.meta.env as Record<string, string | undefined>;

const supabaseUrl = (
  env.VITE_SUPABASE_URL ||
  env.SUPABASE_URL
)?.trim();

const supabasePublishableKey = (
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY
)?.trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  supabaseUrl.length > 0 &&
  supabasePublishableKey.length > 0 &&
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Helper to retrieve the active Supabase client or throw a descriptive error
 */
export function getSupabase(): SupabaseClient {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error(
      'Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or connect the Vercel Supabase integration).'
    );
  }
  return supabase;
}

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[TypeNull: Phase 2] Supabase is unconfigured. Real authentication and persistence require Supabase environment variables.'
  );
}
