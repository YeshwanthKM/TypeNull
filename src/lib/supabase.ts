import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Client Initialisation (Phase 2 Readiness)
 * 
 * Note: Actual database connection, authentication, and storage operations
 * will be implemented in Phase 2 once environment credentials are provided.
 * 
 * Under no circumstances should service-role keys or database passwords
 * be exposed here or in client-side bundles.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!)
  : null;

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // Helpful developmental notice without throwing runtime exceptions
  console.info(
    '[TypeNull: Phase 0] Supabase client is uninitialised. Credentials will be connected in Phase 2.'
  );
}
