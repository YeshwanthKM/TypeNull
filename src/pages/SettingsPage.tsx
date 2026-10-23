import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Info, Lock, LogOut, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { FormInput } from '../components/ui/FormInput';
import { useAuth } from '../contexts/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user, profile, updateProfile, signOut, isConfigured } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state if profile loads asynchronously
  React.useEffect(() => {
    if (profile?.full_name && !fullName) {
      setFullName(profile.full_name);
    }
  }, [profile, fullName]);

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Settings & Account"
        description="Manage your officer profile credentials, inspect session parameters, and configure audit preferences."
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
              Profile updates and session persistence will sync to Supabase once <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> is supplied in your environment configuration.
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
        {/* Section 1: Officer Account */}
        <section
          aria-labelledby="account-settings-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <User className="w-5 h-5 text-teal-700" />
              <div>
                <h2 id="account-settings-heading" className="text-sm font-bold text-slate-900">
                  Officer Account &amp; Profile
                </h2>
                <p className="text-xs text-slate-500">
                  Manage your display name and review authenticated Supabase session details.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              leftIcon={<LogOut className="w-3.5 h-3.5 text-red-600" />}
              className="text-red-700 hover:bg-red-50 hover:border-red-200"
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
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-sm font-mono capitalize">
                  <span className="w-2 h-2 rounded-full bg-teal-600" />
                  <span className="font-semibold">{profile?.role || 'applicant'}</span>
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
