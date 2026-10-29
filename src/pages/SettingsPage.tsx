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
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { FormInput } from '../components/ui/FormInput';
import { useAuth } from '../contexts/AuthContext';
import { getRoleDisplayLabel } from '../utils/roleUtils';

export const SettingsPage: React.FC = () => {
  const { user, profile, updateProfile, signOut, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [institutionName, setInstitutionName] = useState(profile?.institution_name || '');
  const [aictePid, setAictePid] = useState(profile?.aicte_permanent_id || '');
  const [institutionType, setInstitutionType] = useState(profile?.institution_type || 'Engineering & Technology');
  const [address, setAddress] = useState(profile?.address || '');
  const [state, setState] = useState(profile?.state || 'Delhi');
  const [designation, setDesignation] = useState(profile?.contact_person_designation || '');
  const [phone, setPhone] = useState(profile?.contact_phone || '');

  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if profile loads asynchronously
  useEffect(() => {
    if (profile) {
      if (profile.full_name) setFullName(profile.full_name);
      if (profile.institution_name) setInstitutionName(profile.institution_name);
      if (profile.aicte_permanent_id) setAictePid(profile.aicte_permanent_id);
      if (profile.institution_type) setInstitutionType(profile.institution_type);
      if (profile.address) setAddress(profile.address);
      if (profile.state) setState(profile.state);
      if (profile.contact_person_designation) setDesignation(profile.contact_person_designation);
      if (profile.contact_phone) setPhone(profile.contact_phone);
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!user) return;

    setIsUpdating(true);
    const { error } = await updateProfile(fullName, {
      institution_name: institutionName,
      aicte_permanent_id: aictePid,
      institution_type: institutionType,
      address,
      state,
      contact_person_designation: designation,
      contact_phone: phone,
    });
    setIsUpdating(false);

    if (error) {
      setErrorMessage(error.message || 'Failed to update profile.');
    } else {
      setSuccessMessage('Profile and institutional details updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
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
        description="Manage your institutional profile credentials, inspect session parameters, and review verification clearance."
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
                  Account &amp; Institutional Profile
                </h2>
                <p className="text-xs text-slate-500">
                  Manage your institutional details and review authenticated session clearance.
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
                label="Authorized Contact Person Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Dr. Rajesh Sharma"
                disabled={isUpdating}
                helperText="Nodal representative name."
              />

              <FormInput
                id="designation"
                name="designation"
                label="Designation"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g., Principal / Registrar"
                disabled={isUpdating}
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

              <FormInput
                id="phone"
                name="phone"
                label="Official Contact Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 11 2659 1000"
                disabled={isUpdating}
              />

              <div className="sm:col-span-2 border-t border-slate-100 pt-3">
                <span className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Institutional Registration Parameters
                </span>
              </div>

              <div className="sm:col-span-2">
                <FormInput
                  id="institutionName"
                  name="institutionName"
                  label="Institution Legal Name"
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="e.g. Delhi Institute of Engineering & Technology"
                  disabled={isUpdating}
                />
              </div>

              <FormInput
                id="aictePid"
                name="aictePid"
                label="AICTE Permanent ID"
                value={aictePid}
                onChange={(e) => setAictePid(e.target.value)}
                placeholder="e.g. 1-43289012"
                disabled={isUpdating}
              />

              <FormInput
                id="institutionType"
                name="institutionType"
                label="Institution Type"
                value={institutionType}
                onChange={(e) => setInstitutionType(e.target.value)}
                placeholder="e.g. Engineering & Technology"
                disabled={isUpdating}
              />

              <FormInput
                id="address"
                name="address"
                label="Campus Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Institutional Area, Sector 14"
                disabled={isUpdating}
              />

              <FormInput
                id="state"
                name="state"
                label="State / Union Territory"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Delhi"
                disabled={isUpdating}
              />

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Application Role
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm font-mono">
                  <span className="w-2 h-2 rounded-full bg-teal-600" />
                  <span className="font-semibold">{getRoleDisplayLabel(profile?.role)}</span>
                  {profile?.is_admin && (
                    <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      Admin Clearance
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Enforced via PostgreSQL RLS &amp; triggers. Non-modifiable by client.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Verification Status
                </label>
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm font-mono">
                  <span className={`w-2 h-2 rounded-full ${
                    profile?.verification_status === 'verified'
                      ? 'bg-emerald-600'
                      : profile?.verification_status === 'rejected'
                      ? 'bg-rose-600'
                      : profile?.verification_status === 'additional_info_required'
                      ? 'bg-orange-600'
                      : 'bg-amber-600'
                  }`} />
                  <span className="font-semibold uppercase text-xs">
                    {(profile?.verification_status || 'pending_verification').replace(/_/g, ' ')}
                  </span>
                </div>
                {profile?.verification_reason && (
                  <p className="text-xs text-slate-500 mt-1">
                    Note: {profile.verification_reason}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isUpdating}
                disabled={!user}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Save Institutional Profile
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

        {/* Section 2: Privacy & Regulatory Standards */}
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
    </div>
  );
};
