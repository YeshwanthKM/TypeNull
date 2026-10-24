import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Shield,
  Info,
  Lock,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Save,
  Building2,
  Plus,
  Clock,
  X,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { FormInput } from '../components/ui/FormInput';
import { useAuth } from '../contexts/AuthContext';
import { getRoleDisplayLabel } from '../utils/roleUtils';
import {
  Organisation,
  OrganisationAccessRequest,
  OrganisationMember,
} from '../types';
import {
  fetchOrganisations,
  fetchUserAccessRequests,
  submitAccessRequest,
  fetchUserMemberships,
} from '../services/organisationAccessService';

export const SettingsPage: React.FC = () => {
  const { user, profile, updateProfile, signOut, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Organisation Access & Requests State
  const [availableOrgs, setAvailableOrgs] = useState<Organisation[]>([]);
  const [accessRequests, setAccessRequests] = useState<OrganisationAccessRequest[]>([]);
  const [memberships, setMemberships] = useState<(OrganisationMember & { organisation?: Organisation })[]>([]);
  const [isLoadingAccessData, setIsLoadingAccessData] = useState(false);

  // Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [requestExplanation, setRequestExplanation] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Sync state if profile loads asynchronously
  useEffect(() => {
    if (profile?.full_name && !fullName) {
      setFullName(profile.full_name);
    }
  }, [profile, fullName]);

  // Load organisations, user requests, and memberships
  const loadAccessData = async () => {
    if (!user) return;
    setIsLoadingAccessData(true);
    try {
      const [orgsRes, reqsRes, memsRes] = await Promise.all([
        fetchOrganisations(),
        fetchUserAccessRequests(user.id),
        fetchUserMemberships(user.id),
      ]);

      if (orgsRes.data) setAvailableOrgs(orgsRes.data);
      if (reqsRes.data) setAccessRequests(reqsRes.data);
      if (memsRes.data) setMemberships(memsRes.data);
    } catch (err: any) {
      console.warn('[TypeNull] Error loading access data:', err.message);
    } finally {
      setIsLoadingAccessData(false);
    }
  };

  useEffect(() => {
    loadAccessData();
  }, [user]);

  // Modal accessibility: body scroll lock and Escape key dismiss
  useEffect(() => {
    if (isRequestModalOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsRequestModalOpen(false);
          setRequestError(null);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isRequestModalOpen]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!user) return;

    setIsUpdating(true);
    const { error } = await updateProfile(fullName);
    setIsUpdating(false);

    if (error) {
      setErrorMessage(error.message || 'Failed to update profile.');
    } else {
      setSuccessMessage('Profile name updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleSubmitAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);

    if (!user || !selectedOrgId) return;

    setIsSubmittingRequest(true);
    const { data, error } = await submitAccessRequest(
      user.id,
      user.email || 'user@typenull.local',
      fullName || user.email || 'User',
      selectedOrgId,
      requestExplanation
    );
    setIsSubmittingRequest(false);

    if (error) {
      setRequestError(error.message);
    } else if (data) {
      setSuccessMessage(`Access request for "${data.organisation_name}" submitted successfully.`);
      setIsRequestModalOpen(false);
      setSelectedOrgId('');
      setRequestExplanation('');
      await loadAccessData();
      setTimeout(() => setSuccessMessage(null), 5000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Settings & Account"
        description="Manage your profile credentials, inspect session parameters, and configure audit preferences."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings' },
        ]}
      />

      {/* Supabase Notice */}
      {!isConfigured && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900">
          <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950">
              Supabase Configuration Notice
            </p>
            <p className="leading-relaxed text-amber-800">
              Profile updates and session persistence will sync to Supabase once <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> is supplied in your environment configuration. Local evaluation and demo workflows are fully operational.
            </p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Section 1: User Account & Profile */}
        <section
          aria-labelledby="account-settings-heading"
          className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <User className="w-5 h-5 text-teal-700 flex-shrink-0" />
              <div>
                <h2 id="account-settings-heading" className="text-sm font-bold text-slate-900">
                  Account &amp; Profile
                </h2>
                <p className="text-xs text-slate-500">
                  Manage your display name and review authenticated session details.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              leftIcon={<LogOut className="w-3.5 h-3.5 text-red-600" />}
              className="text-red-700 hover:bg-red-50 hover:border-red-200 self-start sm:self-auto"
            >
              Sign Out
            </Button>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <FormInput
                id="fullName"
                name="fullName"
                label="Full Name / Display Identity"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Rajesh Sharma"
                disabled={isUpdating || !isConfigured}
                helperText="Stored in public.profiles table."
              />

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Authenticated Email
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.email || 'unauthenticated@portal'}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-sm cursor-not-allowed font-mono"
                />
                <p className="text-xs text-slate-400 mt-1">Managed via Supabase Auth.</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Application Role
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm font-mono">
                  <span className="w-2 h-2 rounded-full bg-teal-600" />
                  <span className="font-semibold">{getRoleDisplayLabel(profile?.role)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Enforced via PostgreSQL RLS &amp; triggers. Non-modifiable by client.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isUpdating}
                disabled={!isConfigured || !user}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Save Profile Name
              </Button>
            </div>
          </form>

          <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                User UUID: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">{user?.id || 'N/A'}</code>
              </span>
            </div>
          </div>
        </section>

        {/* Section 2: Organisation Access */}
        <section
          aria-labelledby="org-access-heading"
          className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-5 h-5 text-teal-700 flex-shrink-0" />
              <div>
                <h2 id="org-access-heading" className="text-sm font-bold text-slate-900">
                  Organisation Access
                </h2>
                <p className="text-xs text-slate-500">
                  Request access to an organisation workspace to participate in its application screening and evaluation activities.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRequestModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5 text-teal-700" />}
              className="text-teal-800 border-teal-300 hover:bg-teal-50 self-start sm:self-auto font-medium"
            >
              Request Organisation Access
            </Button>
          </div>

          {/* Active Memberships */}
          {memberships.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Approved Organisation Memberships
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {memberships.map((mem) => (
                  <div
                    key={mem.id}
                    className="p-3.5 rounded-lg border border-teal-200 bg-teal-50/40 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{mem.organisation?.name || 'Organisation'}</span>
                        <span className="font-mono text-[10px] bg-white text-teal-800 border border-teal-200 px-1.5 py-0.2 rounded font-semibold">
                          {mem.organisation?.code || 'ORG'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Clearance: {mem.member_role === 'officer' ? 'Screening Officer' : mem.member_role}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Active Member
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Access Requests History */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Access Requests ({accessRequests.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadAccessData}
                isLoading={isLoadingAccessData}
                className="text-xs text-slate-500 hover:text-slate-800 py-0.5 px-2 h-auto"
              >
                Refresh
              </Button>
            </div>

            {accessRequests.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Organisation</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                      <th className="py-2.5 px-3 font-semibold">Submitted</th>
                      <th className="py-2.5 px-3 font-semibold">Details / Review Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accessRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-slate-900 block">{req.organisation_name}</span>
                          <span className="text-[10px] font-mono text-slate-500">{req.organisation_code}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              req.status === 'approved'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : req.status === 'rejected'
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {req.status === 'approved' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                            {req.status === 'rejected' && <AlertCircle className="w-3 h-3 text-rose-600" />}
                            {req.status === 'pending' && <Clock className="w-3 h-3 text-amber-600" />}
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(req.submitted_at).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs">
                          {req.explanation && (
                            <p className="truncate text-[11px]" title={req.explanation}>
                              <span className="font-medium text-slate-700">Reason:</span> {req.explanation}
                            </p>
                          )}
                          {req.review_note && (
                            <p className="text-[11px] text-slate-500 italic mt-0.5" title={req.review_note}>
                              <span className="font-medium text-slate-700 not-italic">Admin note:</span>{' '}
                              {req.review_note}
                            </p>
                          )}
                          {!req.explanation && !req.review_note && (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-center text-xs text-slate-500 space-y-1">
                <p className="font-medium text-slate-700">No organisation access requests submitted yet.</p>
                <p className="text-slate-500 text-[11px]">
                  Click &ldquo;Request Organisation Access&rdquo; to submit an evaluation clearance request to an institution.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Section 3: Privacy & Regulatory Standards */}
        <section
          aria-labelledby="privacy-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Shield className="w-5 h-5 text-teal-700" />
            <div>
              <h2 id="privacy-heading" className="text-sm font-bold text-slate-900">
                Data Privacy &amp; Audit Governance
              </h2>
              <p className="text-xs text-slate-500">
                Compliance safeguards applied to institutional verification dossiers.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-900">Security Architecture:</p>
            <p className="leading-relaxed">
              Every database query enforces Row-Level Security (RLS) linked strictly to your authenticated Supabase user identity (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">auth.uid() = user_id</code>). Applications and profiles cannot be accessed or altered by unauthorized users.
            </p>
            <p className="text-slate-500 text-[11px]">
              Complies with Digital Personal Data Protection (DPDP) principles and auditable governance guidelines.
            </p>
          </div>
        </section>
      </div>

      {/* Request Organisation Access Modal */}
      {isRequestModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-access-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="request-access-modal-title" className="text-sm font-bold text-slate-900">
                    Request Organisation Access
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select an organisation and provide your clearance justification.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRequestModalOpen(false);
                  setRequestError(null);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-600"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {requestError && (
              <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{requestError}</span>
              </div>
            )}

            {availableOrgs.length > 0 ? (
              <form onSubmit={handleSubmitAccessRequest} className="space-y-4 text-xs">
                <div>
                  <label htmlFor="targetOrgSelect" className="block font-semibold text-slate-700 mb-1">
                    Select Evaluating Organisation <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="targetOrgSelect"
                    required
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs text-slate-800"
                  >
                    <option value="">-- Choose an Organisation --</option>
                    {availableOrgs.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.code})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Only verified institutional bodies registered on TypeNull are listed.
                  </p>
                </div>

                <div>
                  <label htmlFor="requestExplanation" className="block font-semibold text-slate-700 mb-1">
                    Explanation / Reason for Access <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    id="requestExplanation"
                    rows={3}
                    value={requestExplanation}
                    onChange={(e) => setRequestExplanation(e.target.value)}
                    placeholder="e.g. Assigned as verifying officer for MCA corporate incorporation filings..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs text-slate-800 resize-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Provide relevant departmental or institutional role details for reviewing administrators.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsRequestModalOpen(false);
                      setRequestError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSubmittingRequest}
                    disabled={!selectedOrgId}
                  >
                    Submit Request
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-6 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-600 space-y-3">
                <p className="font-semibold text-slate-800">No Eligible Organisations Available</p>
                <p className="text-[11px] text-slate-500">
                  There are currently no registered institutional organisations open for access requests. Please check back later or contact a system administrator.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRequestModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
