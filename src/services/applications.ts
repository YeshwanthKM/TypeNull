import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DbApplication, NewApplicationFormData } from '../types';

/**
 * Applications Service (Supabase PostgreSQL Integration)
 *
 * All operations interact directly with the 'applications' table and are strictly
 * bounded by Supabase Row-Level Security (RLS) policies.
 */

export async function createApplication(
  formData: NewApplicationFormData,
  userId: string
): Promise<{ data: DbApplication | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: new Error(
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to persist records.'
      ),
    };
  }

  if (!userId) {
    return {
      data: null,
      error: new Error('Cannot create application: Authenticated user ID is required.'),
    };
  }

  try {
    const { data, error } = await supabase
      .from('applications')
      .insert({
        user_id: userId,
        title: formData.title.trim(),
        category: formData.category,
        organisation_name: formData.institutionName.trim(),
        registration_number: formData.registrationNumber.trim() || null,
        jurisdiction: formData.jurisdiction.trim(),
        description: formData.description.trim() || null,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as DbApplication, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

export async function fetchUserApplications(
  userId: string
): Promise<{ data: DbApplication[]; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: [],
      error: new Error('Supabase is not configured.'),
    };
  }

  if (!userId) {
    return {
      data: [],
      error: new Error('User ID is required to fetch applications.'),
    };
  }

  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data as DbApplication[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

export async function fetchApplicationById(
  id: string
): Promise<{ data: DbApplication | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      data: null,
      error: new Error('Supabase is not configured.'),
    };
  }

  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as DbApplication, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}
