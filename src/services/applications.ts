import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DbApplication, NewApplicationFormData } from '../types';

/**
 * Applications Service (Supabase PostgreSQL Integration with Local Evaluation Fallback)
 *
 * All operations interact directly with the 'applications' table when Supabase is
 * configured and are strictly bounded by Supabase Row-Level Security (RLS) policies.
 * When Supabase is unconfigured, an in-memory session store enables seamless
 * offline evaluation and demonstration.
 */

// In-memory application store for offline demonstration & tests
const IN_MEMORY_APPLICATIONS: DbApplication[] = [
  {
    id: 'demo-eoa-app-001',
    user_id: 'demo-institution-user',
    title: 'Extension of Approval (EoA) 2026–27 — Delhi Institute of Technology',
    category: 'extension_of_approval',
    organisation_name: 'Delhi Institute of Engineering & Technology',
    registration_number: '1-43289012',
    jurisdiction: 'New Delhi, India',
    description: JSON.stringify({
      academicYear: '2026-27',
      serviceCode: 'AICTE-EOA-2026',
      approvalCategory: 'Extension of Approval (Existing Technical Institution)',
    }),
    status: 'draft',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function createApplication(
  formData: NewApplicationFormData,
  userId: string
): Promise<{ data: DbApplication | null; error: Error | null }> {
  if (!userId) {
    return {
      data: null,
      error: new Error('Cannot create application: Authenticated user ID is required.'),
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    const newApp: DbApplication = {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      user_id: userId,
      title: formData.title.trim(),
      category: formData.category,
      organisation_name: formData.institutionName.trim(),
      registration_number: formData.registrationNumber.trim() || null,
      jurisdiction: formData.jurisdiction.trim(),
      description: formData.description.trim() || null,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    IN_MEMORY_APPLICATIONS.unshift(newApp);
    return { data: newApp, error: null };
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
  if (!userId) {
    return {
      data: [],
      error: new Error('User ID is required to fetch applications.'),
    };
  }

  if (!isSupabaseConfigured || !supabase) {
    const userApps = IN_MEMORY_APPLICATIONS.filter((a) => a.user_id === userId);
    return { data: userApps, error: null };
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
    const app = IN_MEMORY_APPLICATIONS.find((a) => a.id === id);
    if (!app) {
      return { data: null, error: new Error('Application dossier not found.') };
    }
    return { data: app, error: null };
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

/**
 * Update application lifecycle status
 */
export async function updateApplicationStatus(
  id: string,
  newStatus: DbApplication['status'],
  decisionNotes?: string
): Promise<{ data: DbApplication | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    const app = IN_MEMORY_APPLICATIONS.find((a) => a.id === id);
    if (!app) return { data: null, error: new Error('Application not found') };
    app.status = newStatus;
    app.updated_at = new Date().toISOString();
    return { data: { ...app }, error: null };
  }

  try {
    const updatePayload: Record<string, any> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (decisionNotes) {
      updatePayload.decision_notes = decisionNotes;
    }

    const { data, error } = await supabase
      .from('applications')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: new Error(error.message) };
    return { data: data as DbApplication, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/**
 * Submit an application dossier for TypeNull Internal Officer Review
 * (Distinguished clearly from direct official AICTE portal submission)
 */
export async function submitApplicationForInternalReview(
  id: string
): Promise<{ data: DbApplication | null; error: Error | null }> {
  return updateApplicationStatus(id, 'under_review');
}

/**
 * Fetch applications awaiting or undergoing Officer Review
 */
export async function fetchApplicationsForOfficerReview(): Promise<{
  data: DbApplication[];
  error: Error | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [...IN_MEMORY_APPLICATIONS], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { data: [], error: new Error(error.message) };
    return { data: (data as DbApplication[]) || [], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}
