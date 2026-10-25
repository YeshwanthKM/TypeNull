import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Organisation,
  OrganisationMember,
  OrganisationAccessRequest,
  AccessRequestStatus,
} from '../types';

// Default seeded organisations for offline evaluation and instant demo clearance
export const DEFAULT_DEMO_ORGANISATIONS: Organisation[] = [
  {
    id: 'org-mca-roc',
    name: 'Ministry of Corporate Affairs - ROC',
    code: 'MCA-ROC',
    category: 'regulatory_body',
    description: 'Statutory authority evaluating incorporation, SPICe+ dossiers, and company governance.',
    created_at: '2026-01-15T00:00:00.000Z',
    updated_at: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'org-cbdt-dir',
    name: 'Central Board of Indirect Taxes and Customs - CBDT',
    code: 'CBDT',
    category: 'regulatory_body',
    description: 'Evaluates indirect tax compliance, GST filings, and customs duties.',
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'org-uidai',
    name: 'Unique Identification Authority of India (UIDAI)',
    code: 'UIDAI',
    category: 'regulatory_body',
    description: 'Issues Aadhaar numbers and manages demographic identity verification.',
    created_at: '2026-02-10T00:00:00.000Z',
    updated_at: '2026-02-10T00:00:00.000Z',
  },
  {
    id: 'org-mea',
    name: 'Ministry of External Affairs (MEA)',
    code: 'MEA',
    category: 'regulatory_body',
    description: 'Handles passport issuance and international travel documentation.',
    created_at: '2026-02-20T00:00:00.000Z',
    updated_at: '2026-02-20T00:00:00.000Z',
  },
  {
    id: 'org-dpiit',
    name: 'Department for Promotion of Industry and Internal Trade (DPIIT)',
    code: 'DPIIT',
    category: 'regulatory_body',
    description: 'Oversees company registration, industry promotion, and startup policy.',
    created_at: '2026-03-01T00:00:00.000Z',
    updated_at: '2026-03-01T00:00:00.000Z',
  },
];

// Offline Storage Keys
const STORAGE_KEYS = {
  ORGANISATIONS: 'typenull_organisations_cache',
  REQUESTS: 'typenull_access_requests_cache',
  MEMBERSHIPS: 'typenull_memberships_cache',
};

// In-memory fallbacks for non-browser/test environments
let inMemoryOrganisations: Organisation[] = [...DEFAULT_DEMO_ORGANISATIONS];
let inMemoryRequests: OrganisationAccessRequest[] = [];
let inMemoryMemberships: OrganisationMember[] = [];

// Seed initial offline storage if absent
function getStoredOrganisations(): Organisation[] {
  if (typeof window === 'undefined') return inMemoryOrganisations;
  const raw = localStorage.getItem(STORAGE_KEYS.ORGANISATIONS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.ORGANISATIONS, JSON.stringify(DEFAULT_DEMO_ORGANISATIONS));
    return DEFAULT_DEMO_ORGANISATIONS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return DEFAULT_DEMO_ORGANISATIONS;
  }
}

function saveStoredOrganisations(orgs: Organisation[]) {
  if (typeof window === 'undefined') {
    inMemoryOrganisations = [...orgs];
    return;
  }
  localStorage.setItem(STORAGE_KEYS.ORGANISATIONS, JSON.stringify(orgs));
}

function getStoredRequests(): OrganisationAccessRequest[] {
  if (typeof window === 'undefined') return inMemoryRequests;
  const raw = localStorage.getItem(STORAGE_KEYS.REQUESTS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredRequests(reqs: OrganisationAccessRequest[]) {
  if (typeof window === 'undefined') {
    inMemoryRequests = [...reqs];
    return;
  }
  localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(reqs));
}

function getStoredMemberships(): OrganisationMember[] {
  if (typeof window === 'undefined') return inMemoryMemberships;
  const raw = localStorage.getItem(STORAGE_KEYS.MEMBERSHIPS);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStoredMemberships(mems: OrganisationMember[]) {
  if (typeof window === 'undefined') {
    inMemoryMemberships = [...mems];
    return;
  }
  localStorage.setItem(STORAGE_KEYS.MEMBERSHIPS, JSON.stringify(mems));
}

/**
 * 1. Fetch all organisations available on the platform
 */
export async function fetchOrganisations(): Promise<{ data: Organisation[]; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: getStoredOrganisations(), error: null };
  }

  try {
    const { data, error } = await supabase
      .from('organisations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('[TypeNull] Falling back to offline organisations:', error.message);
      return { data: getStoredOrganisations(), error: null };
    }

    if (!data || data.length === 0) {
      return { data: getStoredOrganisations(), error: null };
    }

    return { data: data as Organisation[], error: null };
  } catch (err: any) {
    return { data: getStoredOrganisations(), error: null };
  }
}

/**
 * 2. Create a new evaluating organisation (Admin operation)
 * Generates a clean statutory code if none is provided.
 */
export async function createOrganisation(
  name: string,
  code?: string,
  category: string = 'regulatory_body',
  description?: string
): Promise<{ data: Organisation | null; error: Error | null }> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { data: null, error: new Error('Organisation name is required.') };
  }

  // Derive identifier slug if code omitted (e.g. "MCA Registrar of Companies" -> "MCA-ROC")
  let finalCode = (code || '').trim().toUpperCase();
  if (!finalCode) {
    finalCode = trimmedName
      .replace(/[^A-Za-z0-9\s]/g, '')
      .split(/\s+/)
      .map((word) => word.slice(0, 3).toUpperCase())
      .slice(0, 3)
      .join('-');
    if (finalCode.length < 3) {
      finalCode = `ORG-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }

  if (!isSupabaseConfigured || !supabase) {
    const currentOrgs = getStoredOrganisations();
    if (currentOrgs.some((o) => o.code === finalCode)) {
      finalCode = `${finalCode}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const newOrg: Organisation = {
      id: `org-custom-${Date.now()}`,
      name: trimmedName,
      code: finalCode,
      category,
      description: description || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [newOrg, ...currentOrgs];
    saveStoredOrganisations(updated);
    return { data: newOrg, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('organisations')
      .insert({
        name: trimmedName,
        code: finalCode,
        category,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as Organisation, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || String(err)) };
  }
}

/**
 * 3. Fetch access requests submitted by a specific user (for Settings page)
 */
export async function fetchUserAccessRequests(
  userId: string
): Promise<{ data: OrganisationAccessRequest[]; error: Error | null }> {
  if (!userId) {
    return { data: [], error: null };
  }

  if (!isSupabaseConfigured || !supabase) {
    const all = getStoredRequests();
    const orgs = getStoredOrganisations();
    const userReqs = all
      .filter((r) => r.user_id === userId)
      .map((r) => {
        const org = orgs.find((o) => o.id === r.organisation_id);
        return {
          ...r,
          organisation_name: org?.name || 'Evaluating Organisation',
          organisation_code: org?.code || 'ORG',
        };
      })
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    return { data: userReqs, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('organisation_access_requests')
      .select('*, organisations(name, code)')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.warn('[TypeNull] Error fetching user access requests:', error.message);
      // Fallback to offline store
      const all = getStoredRequests().filter((r) => r.user_id === userId);
      return { data: all, error: null };
    }

    const formatted: OrganisationAccessRequest[] = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      organisation_id: row.organisation_id,
      explanation: row.explanation,
      status: row.status as AccessRequestStatus,
      submitted_at: row.submitted_at,
      reviewed_at: row.reviewed_at,
      reviewed_by: row.reviewed_by,
      review_note: row.review_note,
      created_at: row.created_at,
      updated_at: row.updated_at,
      organisation_name: row.organisations?.name || 'Organisation',
      organisation_code: row.organisations?.code || 'ORG',
    }));

    return { data: formatted, error: null };
  } catch (err: any) {
    return { data: [], error: new Error(err.message || String(err)) };
  }
}

/**
 * 4. Fetch all access requests across the platform (for Admin Dashboard)
 */
export async function fetchAllAccessRequests(): Promise<{
  data: OrganisationAccessRequest[];
  error: Error | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    const all = getStoredRequests();
    const orgs = getStoredOrganisations();
    const formatted = all
      .map((r) => {
        const org = orgs.find((o) => o.id === r.organisation_id);
        return {
          ...r,
          organisation_name: org?.name || 'Evaluating Organisation',
          organisation_code: org?.code || 'ORG',
        };
      })
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
    return { data: formatted, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('organisation_access_requests')
      .select('*, organisations(name, code), profiles!user_id(full_name)')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.warn('[TypeNull] Falling back to offline access requests:', error.message);
      return { data: getStoredRequests(), error: null };
    }

    const formatted: OrganisationAccessRequest[] = (data || []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      organisation_id: row.organisation_id,
      explanation: row.explanation,
      status: row.status as AccessRequestStatus,
      submitted_at: row.submitted_at,
      reviewed_at: row.reviewed_at,
      reviewed_by: row.reviewed_by,
      review_note: row.review_note,
      created_at: row.created_at,
      updated_at: row.updated_at,
      user_name: row.profiles?.full_name || 'User',
      organisation_name: row.organisations?.name || 'Organisation',
      organisation_code: row.organisations?.code || 'ORG',
    }));

    return { data: formatted, error: null };
  } catch (err: any) {
    return { data: getStoredRequests(), error: null };
  }
}

/**
 * 5. Submit an access request to an organisation
 * Enforces duplicate pending request prevention!
 */
export async function submitAccessRequest(
  userId: string,
  userEmail: string,
  userName: string,
  organisationId: string,
  explanation?: string
): Promise<{ data: OrganisationAccessRequest | null; error: Error | null }> {
  if (!userId) {
    return { data: null, error: new Error('Authentication required to request access.') };
  }
  if (!organisationId) {
    return { data: null, error: new Error('Please select an organisation.') };
  }

  // 1. Check offline store or supabase for duplicate pending request
  if (!isSupabaseConfigured || !supabase) {
    const existing = getStoredRequests();
    const hasPending = existing.some(
      (r) => r.user_id === userId && r.organisation_id === organisationId && r.status === 'pending'
    );

    if (hasPending) {
      return {
        data: null,
        error: new Error(
          'You already have an active pending access request for this organisation. Please wait for an administrator to review it.'
        ),
      };
    }

    const orgs = getStoredOrganisations();
    const targetOrg = orgs.find((o) => o.id === organisationId);

    const newRequest: OrganisationAccessRequest = {
      id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: userId,
      user_name: userName || userEmail.split('@')[0],
      user_email: userEmail,
      organisation_id: organisationId,
      organisation_name: targetOrg?.name || 'Evaluating Organisation',
      organisation_code: targetOrg?.code || 'ORG',
      explanation: explanation?.trim() || null,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [newRequest, ...existing];
    saveStoredRequests(updated);
    return { data: newRequest, error: null };
  }

  try {
    // Check for existing pending request first
    const { data: existingPending, error: checkError } = await supabase
      .from('organisation_access_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('organisation_id', organisationId)
      .eq('status', 'pending')
      .maybeSingle();

    if (checkError) {
      console.warn('[TypeNull] Pending check notice:', checkError.message);
    }

    if (existingPending) {
      return {
        data: null,
        error: new Error(
          'You already have an active pending access request for this organisation. Please wait for an administrator to review it.'
        ),
      };
    }

    const { data, error } = await supabase
      .from('organisation_access_requests')
      .insert({
        user_id: userId,
        organisation_id: organisationId,
        explanation: explanation?.trim() || null,
        status: 'pending',
      })
      .select('*, organisations(name, code)')
      .single();

    if (error) {
      // Check for PostgreSQL unique index violation (idx_unique_pending_user_org_request)
      if (error.code === '23505' || error.message.includes('unique')) {
        return {
          data: null,
          error: new Error(
            'You already have an active pending access request for this organisation. Please wait for an administrator to review it.'
          ),
        };
      }
      return { data: null, error: new Error(error.message) };
    }

    const formatted: OrganisationAccessRequest = {
      id: data.id,
      user_id: data.user_id,
      organisation_id: data.organisation_id,
      explanation: data.explanation,
      status: data.status as AccessRequestStatus,
      submitted_at: data.submitted_at,
      organisation_name: data.organisations?.name || 'Organisation',
      organisation_code: data.organisations?.code || 'ORG',
      user_name: userName,
      user_email: userEmail,
    };

    return { data: formatted, error: null };
  } catch (err: any) {
    return { data: null, error: new Error(err.message || String(err)) };
  }
}

/**
 * 6. Admin Decision: Approve Access Request
 * - Enforces self-approval block (admin cannot approve their own request)
 * - Adds user to organisation_members
 * - Updates user profile role to 'officer' if currently 'applicant'
 */
export async function approveAccessRequest(
  adminId: string,
  requestId: string,
  adminNote?: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!adminId) {
    return { success: false, error: new Error('Admin identification required.') };
  }

  // 1. Offline evaluation handling
  if (!isSupabaseConfigured || !supabase) {
    const requests = getStoredRequests();
    const reqIndex = requests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) {
      return { success: false, error: new Error('Request not found.') };
    }

    const targetReq = requests[reqIndex];

    // Security Guard: Prevent self-approval
    if (targetReq.user_id === adminId) {
      return {
        success: false,
        error: new Error('Security Violation: Administrators cannot approve their own organisation access requests.'),
      };
    }

    if (targetReq.status !== 'pending') {
      return {
        success: false,
        error: new Error(`Request has already been resolved with status "${targetReq.status}".`),
      };
    }

    // Update request
    targetReq.status = 'approved';
    targetReq.reviewed_at = new Date().toISOString();
    targetReq.reviewed_by = adminId;
    targetReq.review_note = adminNote?.trim() || null;
    targetReq.updated_at = new Date().toISOString();

    requests[reqIndex] = targetReq;
    saveStoredRequests(requests);

    // Add membership
    const memberships = getStoredMemberships();
    const alreadyMember = memberships.some(
      (m) => m.user_id === targetReq.user_id && m.organisation_id === targetReq.organisation_id
    );

    if (!alreadyMember) {
      memberships.push({
        id: `mem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        organisation_id: targetReq.organisation_id,
        user_id: targetReq.user_id,
        member_role: 'officer',
        created_at: new Date().toISOString(),
      });
      saveStoredMemberships(memberships);
    }

    return { success: true, error: null };
  }

  // 2. Supabase Cloud Execution
  try {
    // Attempt RPC procedure first
    const { error: rpcError } = await supabase.rpc(
      'approve_organisation_access_request',
      {
        target_request_id: requestId,
        admin_note: adminNote?.trim() || null,
      }
    );

    if (!rpcError) {
      return { success: true, error: null };
    }

    console.warn('[TypeNull] RPC unavailable, falling back to direct query execution:', rpcError.message);

    // Fallback direct execution:
    const { data: req, error: fetchErr } = await supabase
      .from('organisation_access_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchErr || !req) {
      return { success: false, error: new Error('Access request not found.') };
    }

    if (req.user_id === adminId) {
      return {
        success: false,
        error: new Error('Security Violation: Administrators cannot approve their own organisation access requests.'),
      };
    }

    if (req.status !== 'pending') {
      return {
        success: false,
        error: new Error(`Request is already resolved with status "${req.status}".`),
      };
    }

    // Update request status
    const { error: updateErr } = await supabase
      .from('organisation_access_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
        review_note: adminNote?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateErr) {
      return { success: false, error: new Error(updateErr.message) };
    }

    // Insert membership
    await supabase
      .from('organisation_members')
      .insert({
        organisation_id: req.organisation_id,
        user_id: req.user_id,
        member_role: 'officer',
      });

    // Upgrade profile role if applicant
    await supabase
      .from('profiles')
      .update({ role: 'officer', updated_at: new Date().toISOString() })
      .eq('id', req.user_id)
      .eq('role', 'applicant');

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err.message || String(err)) };
  }
}

/**
 * 7. Admin Decision: Reject Access Request
 * - Enforces self-rejection guard
 * - Preserves existing user permissions and role
 */
export async function rejectAccessRequest(
  adminId: string,
  requestId: string,
  adminNote?: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!adminId) {
    return { success: false, error: new Error('Admin identification required.') };
  }

  // 1. Offline evaluation handling
  if (!isSupabaseConfigured || !supabase) {
    const requests = getStoredRequests();
    const reqIndex = requests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) {
      return { success: false, error: new Error('Request not found.') };
    }

    const targetReq = requests[reqIndex];

    if (targetReq.user_id === adminId) {
      return {
        success: false,
        error: new Error('Security Violation: Administrators cannot review their own organisation access requests.'),
      };
    }

    if (targetReq.status !== 'pending') {
      return {
        success: false,
        error: new Error(`Request has already been resolved with status "${targetReq.status}".`),
      };
    }

    targetReq.status = 'rejected';
    targetReq.reviewed_at = new Date().toISOString();
    targetReq.reviewed_by = adminId;
    targetReq.review_note = adminNote?.trim() || null;
    targetReq.updated_at = new Date().toISOString();

    requests[reqIndex] = targetReq;
    saveStoredRequests(requests);

    return { success: true, error: null };
  }

  // 2. Supabase Cloud Execution
  try {
    const { error: rpcError } = await supabase.rpc('reject_organisation_access_request', {
      target_request_id: requestId,
      admin_note: adminNote?.trim() || null,
    });

    if (!rpcError) {
      return { success: true, error: null };
    }

    // Direct fallback:
    const { data: req, error: fetchErr } = await supabase
      .from('organisation_access_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchErr || !req) {
      return { success: false, error: new Error('Access request not found.') };
    }

    if (req.user_id === adminId) {
      return {
        success: false,
        error: new Error('Security Violation: Administrators cannot review their own organisation access requests.'),
      };
    }

    if (req.status !== 'pending') {
      return {
        success: false,
        error: new Error(`Request is already resolved with status "${req.status}".`),
      };
    }

    const { error: updateErr } = await supabase
      .from('organisation_access_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
        review_note: adminNote?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateErr) {
      return { success: false, error: new Error(updateErr.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err.message || String(err)) };
  }
}

/**
 * 8. Fetch active organisation memberships for a user
 */
export async function fetchUserMemberships(
  userId: string
): Promise<{ data: (OrganisationMember & { organisation?: Organisation })[]; error: Error | null }> {
  if (!userId) return { data: [], error: null };

  if (!isSupabaseConfigured || !supabase) {
    const mems = getStoredMemberships().filter((m) => m.user_id === userId);
    const orgs = getStoredOrganisations();
    const joined = mems.map((m) => ({
      ...m,
      organisation: orgs.find((o) => o.id === m.organisation_id),
    }));
    return { data: joined, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('organisation_members')
      .select('*, organisations(*)')
      .eq('user_id', userId);

    if (error) {
      console.warn('[TypeNull] Error fetching memberships:', error.message);
      return { data: [], error: null };
    }

    const formatted = (data || []).map((row: any) => ({
      id: row.id,
      organisation_id: row.organisation_id,
      user_id: row.user_id,
      member_role: row.member_role,
      created_at: row.created_at,
      organisation: row.organisations as Organisation | undefined,
    }));

    return { data: formatted, error: null };
  } catch (err: any) {
    return { data: [], error: new Error(err.message || String(err)) };
  }
}

/**
 * 9. Revoke an organisation membership (Admin operation)
 */
export async function revokeMembership(
  adminId: string,
  membershipId: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!adminId) {
    return { success: false, error: new Error('Admin identification required.') };
  }

  if (!isSupabaseConfigured || !supabase) {
    const mems = getStoredMemberships();
    const updated = mems.filter((m) => m.id !== membershipId);
    saveStoredMemberships(updated);
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase
      .from('organisation_members')
      .delete()
      .eq('id', membershipId);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: new Error(err.message || String(err)) };
  }
}
