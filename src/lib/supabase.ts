import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Reusable Supabase Client for TypeNull
 * 
 * Configured using public client-safe environment variables:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_PUBLISHABLE_KEY
 * 
 * NEVER expose service-role keys or database passwords in frontend code.
 */

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim();

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
      'Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file or deployment settings.'
    );
  }
  return supabase;
}

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[TypeNull: Phase 2] Supabase is unconfigured. Real authentication and persistence require VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.'
  );
}
