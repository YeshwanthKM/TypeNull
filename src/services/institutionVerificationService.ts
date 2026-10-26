import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, InstitutionVerificationStatus, InstitutionVerificationAudit } from '../types';

export interface InstitutionReviewPayload {
  institutionId: string;
  action: 'approve' | 'reject' | 'request_info';
  reasonMessage: string;
}

// In-memory demo store for evaluation without Supabase connection
let DEMO_INSTITUTIONS: UserProfile[] = [
  {
    id: 'demo-inst-1',
    full_name: 'Dr. Ramesh Sharma',
    role: 'institution',
    institution_name: 'Delhi Institute of Engineering & Technology',
    aicte_permanent_id: '1-43289012',
    institution_type: 'Engineering & Technology',
    address: 'Plot 4, Institutional Area, Sector 14',
    state: 'Delhi',
    contact_person_designation: 'Principal',
    contact_phone: '+91 11 2659 1000',
    is_admin: false,
    verification_status: 'pending_verification',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'demo-inst-2',
    full_name: 'Prof. Ananya Sen',
    role: 'institution',
    institution_name: 'Vanguard Institute of Management & Research',
    aicte_permanent_id: '1-77889900',
    institution_type: 'Management (MBA/PGDM)',
    address: '22 Knowledge Park III, Greater Bengaluru',
    state: 'Karnataka',
    contact_person_designation: 'Director',
    contact_phone: '+91 80 4123 4567',
    is_admin: false,
    verification_status: 'additional_info_required',
    verification_reason: 'Land ownership title deed missing Sub-Registrar stamp. Please update document proof.',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'demo-inst-3',
    full_name: 'Dr. Vikramaditya Joshi',
    role: 'institution',
    institution_name: 'National College of Pharmaceutical Sciences',
    aicte_permanent_id: '1-99887766',
    institution_type: 'Pharmacy',
    address: 'B-12 Science Enclave, Pune University Campus',
    state: 'Maharashtra',
    contact_person_designation: 'Dean & Head of Institute',
    contact_phone: '+91 20 2569 8899',
    is_admin: false,
    verification_status: 'verified',
    verified_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    verified_by: 'demo-officer-admin-user',
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'demo-inst-4',
    full_name: 'Suresh Menon',
    role: 'institution',
    institution_name: 'Horizon Applied Arts & Craft Academy',
    aicte_permanent_id: '1-11223344',
    institution_type: 'Applied Arts & Crafts',
    address: 'Expressway Tower 8, Kochi',
    state: 'Kerala',
    contact_person_designation: 'Administrator',
    contact_phone: '+91 484 288 9900',
    is_admin: false,
    verification_status: 'rejected',
    verification_reason: 'Invalid Permanent Institute ID. Society registration certificate not verified in state database.',
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

let DEMO_AUDITS: InstitutionVerificationAudit[] = [
  {
    id: 'demo-audit-1',
    institution_id: 'demo-inst-2',
    reviewer_id: 'demo-officer-admin-user',
    action: 'requested_info',
    reason_or_message: 'Land ownership title deed missing Sub-Registrar stamp. Please update document proof.',
    from_status: 'pending_verification',
    to_status: 'additional_info_required',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'demo-audit-2',
    institution_id: 'demo-inst-3',
    reviewer_id: 'demo-officer-admin-user',
    action: 'approved',
    reason_or_message: 'AICTE Permanent ID confirmed against central registry. Society credentials intact.',
    from_status: 'pending_verification',
    to_status: 'verified',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 'demo-audit-3',
    institution_id: 'demo-inst-4',
    reviewer_id: 'demo-officer-admin-user',
    action: 'rejected',
    reason_or_message: 'Invalid Permanent Institute ID. Society registration certificate not verified in state database.',
    from_status: 'pending_verification',
    to_status: 'rejected',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

/**
 * Fetches all registered institution profiles for AICTE Officer review.
 */
export async function fetchAllInstitutionRegistrations(): Promise<{
  data: UserProfile[];
  error: Error | null;
}> {
  if (!supabase || !isSupabaseConfigured) {
    return { data: [...DEMO_INSTITUTIONS], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or('role.eq.institution,role.eq.applicant')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    const profiles: UserProfile[] = (data || []).map((row: any) => ({
      id: row.id,
      full_name: row.full_name,
      role: row.role,
      institution_name: row.institution_name,
      aicte_permanent_id: row.aicte_permanent_id,
      institution_type: row.institution_type,
      address: row.address,
      state: row.state,
      contact_person_designation: row.contact_person_designation,
      contact_phone: row.contact_phone,
      is_admin: Boolean(row.is_admin),
      verification_status: (row.verification_status as InstitutionVerificationStatus) || 'pending_verification',
      verification_reason: row.verification_reason,
      verified_at: row.verified_at,
      verified_by: row.verified_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return { data: profiles, error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

/**
 * Fetches verification audit logs for a specific institution.
 */
export async function fetchInstitutionVerificationAudits(
  institutionId: string
): Promise<{
  data: InstitutionVerificationAudit[];
  error: Error | null;
}> {
  if (!supabase || !isSupabaseConfigured) {
    const matched = DEMO_AUDITS.filter((a) => a.institution_id === institutionId);
    return { data: matched, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('institution_verification_audits')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], error: new Error(error.message) };
    }

    return { data: (data || []) as InstitutionVerificationAudit[], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

/**
 * Performs an administrative review on an institution registration.
 * Accessible only to AICTE Officers with administrative clearance.
 */
export async function reviewInstitutionRegistration(
  payload: InstitutionReviewPayload
): Promise<{
  success: boolean;
  newStatus?: InstitutionVerificationStatus;
  error: Error | null;
}> {
  const { institutionId, action, reasonMessage } = payload;

  if (action === 'reject' && !reasonMessage.trim()) {
    return { success: false, error: new Error('A mandatory reason is required when rejecting an institution.') };
  }

  if (action === 'request_info' && !reasonMessage.trim()) {
    return { success: false, error: new Error('A detailed message is required when requesting additional information.') };
  }

  if (!supabase || !isSupabaseConfigured) {
    // In-memory demo simulation
    let newStatus: InstitutionVerificationStatus = 'verified';
    let auditAction: 'approved' | 'rejected' | 'requested_info' = 'approved';

    if (action === 'reject') {
      newStatus = 'rejected';
      auditAction = 'rejected';
    } else if (action === 'request_info') {
      newStatus = 'additional_info_required';
      auditAction = 'requested_info';
    }

    const index = DEMO_INSTITUTIONS.findIndex((i) => i.id === institutionId);
    const prevStatus = index >= 0 ? DEMO_INSTITUTIONS[index].verification_status : 'pending_verification';

    if (index >= 0) {
      DEMO_INSTITUTIONS[index] = {
        ...DEMO_INSTITUTIONS[index],
        verification_status: newStatus,
        verification_reason: reasonMessage.trim() || null,
        verified_at: newStatus === 'verified' ? new Date().toISOString() : DEMO_INSTITUTIONS[index].verified_at,
        updated_at: new Date().toISOString(),
      };
    }

    DEMO_AUDITS.unshift({
      id: `demo-audit-${Date.now()}`,
      institution_id: institutionId,
      reviewer_id: 'demo-officer-admin-user',
      action: auditAction,
      reason_or_message: reasonMessage.trim() || null,
      from_status: prevStatus,
      to_status: newStatus,
      created_at: new Date().toISOString(),
    });

    return { success: true, newStatus, error: null };
  }

  try {
    const { data, error } = await supabase.rpc('review_institution_registration', {
      target_institution_id: institutionId,
      review_action: action,
      reason_message: reasonMessage.trim(),
    });

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return {
      success: Boolean(data?.success),
      newStatus: data?.new_status as InstitutionVerificationStatus,
      error: null,
    };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}

/**
 * Submits an institution's response to an information request, moving status back to pending_verification.
 */
export async function respondToInformationRequest(
  institutionId: string,
  responseNotes: string,
  updatedFields?: Partial<UserProfile>
): Promise<{ success: boolean; error: Error | null }> {
  if (!responseNotes.trim()) {
    return { success: false, error: new Error('Please enter clarification notes for the AICTE Officer.') };
  }

  if (!supabase || !isSupabaseConfigured) {
    const index = DEMO_INSTITUTIONS.findIndex((i) => i.id === institutionId);
    if (index >= 0) {
      DEMO_INSTITUTIONS[index] = {
        ...DEMO_INSTITUTIONS[index],
        ...updatedFields,
        verification_status: 'pending_verification',
        verification_reason: `Institution response submitted: ${responseNotes.trim()}`,
        updated_at: new Date().toISOString(),
      };
    }

    DEMO_AUDITS.unshift({
      id: `demo-audit-${Date.now()}`,
      institution_id: institutionId,
      reviewer_id: institutionId,
      action: 'requested_info',
      reason_or_message: `Institution Clarification: ${responseNotes.trim()}`,
      from_status: 'additional_info_required',
      to_status: 'pending_verification',
      created_at: new Date().toISOString(),
    });

    return { success: true, error: null };
  }

  try {
    const updatePayload: Record<string, any> = {
      ...updatedFields,
      verification_status: 'pending_verification',
      verification_reason: `Response submitted: ${responseNotes.trim()}`,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', institutionId);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    // Log response to audit
    await supabase.from('institution_verification_audits').insert({
      institution_id: institutionId,
      reviewer_id: institutionId,
      action: 'requested_info',
      reason_or_message: `Institution Clarification: ${responseNotes.trim()}`,
      from_status: 'additional_info_required',
      to_status: 'pending_verification',
      created_at: new Date().toISOString(),
    });

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err as Error };
  }
}
