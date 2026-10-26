import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, UserPlus, AlertCircle, ArrowLeft, Info, Mail, Building2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { FormInput } from '../components/ui/FormInput';

const INSTITUTION_TYPES = [
  'Engineering & Technology',
  'Management (MBA/PGDM)',
  'Pharmacy',
  'Architecture & Planning',
  'Applied Arts & Crafts',
  'Hotel Management & Catering Technology',
  'Computer Applications (MCA)',
  'Polytechnic / Diploma',
  'Other Approved Institution',
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry'
];

export const RegisterPage: React.FC = () => {
  const { signUp, isConfigured, user } = useAuth();
  const navigate = useNavigate();

  // Institutional credentials and details
  const [institutionName, setInstitutionName] = useState('');
  const [aictePermanentId, setAictePermanentId] = useState('');
  const [institutionType, setInstitutionType] = useState(INSTITUTION_TYPES[0]);
  const [address, setAddress] = useState('');
  const [state, setState] = useState('Delhi');
  const [contactName, setContactName] = useState('');
  const [contactDesignation, setContactDesignation] = useState('Registrar');
  const [contactPhone, setContactPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [confirmationNeeded, setConfirmationNeeded] = useState(false);

  React.useEffect(() => {
    if (user && !confirmationNeeded) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, confirmationNeeded, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!institutionName.trim()) {
      setError('Institution Name is required.');
      return;
    }

    if (!contactName.trim()) {
      setError('Contact Person Name is required.');
      return;
    }

    if (!email.trim()) {
      setError('Official Institutional Email is required.');
      return;
    }

    if (!address.trim()) {
      setError('Campus Address is required.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    const { error: signUpError, session } = await signUp(
      email,
      password,
      contactName,
      {
        institution_name: institutionName,
        aicte_permanent_id: aictePermanentId,
        institution_type: institutionType,
        address,
        state,
        contact_person_designation: contactDesignation,
        contact_phone: contactPhone,
      }
    );

    setIsLoading(false);

    if (signUpError) {
      setError(signUpError.message || 'Registration failed. Please try again.');
    } else {
      setRegisteredEmail(email);
      if (session) {
        navigate('/dashboard', { replace: true });
      } else {
        setConfirmationNeeded(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl px-4">
        {/* Brand header */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-teal-600 rounded-md"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-700 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="block font-bold text-xl text-slate-900 tracking-tight leading-none">
                TypeNull
              </span>
              <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase">
                Institutional Portal Registration
              </span>
            </div>
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            Register Institution
          </h1>
          <p className="mt-1.5 text-xs text-slate-600 max-w-lg mx-auto">
            Create an authorized institution account to prepare Extension of Approval (EoA) applications, submit compliance documentation, and track institutional verification.
          </p>
        </div>

        {/* Configuration Notice if Supabase keys missing */}
        {!isConfigured && (
          <div className="mt-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-950">
              <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>Supabase Not Yet Connected</span>
            </div>
            <p className="leading-relaxed">
              Real institutional registration requires configuring <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> in your environment file.
            </p>
          </div>
        )}

        {/* Success State when Email Confirmation is Required */}
        {confirmationNeeded ? (
          <div className="mt-6 bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Confirm Your Email Address
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
              We have dispatched a verification link to <strong className="text-slate-900">{registeredEmail}</strong>. Please check your inbox and confirm your email to activate your institutional login.
            </p>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 text-left space-y-1">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                Email Verification vs Institution Verification:
              </span>
              <p>
                Email confirmation confirms control of your institutional email inbox. After login, your institutional credentials and Permanent ID will undergo AICTE Officer verification before formal EoA clearance.
              </p>
            </div>
            <div className="pt-3">
              <Link to="/login">
                <Button variant="primary" size="md" fullWidth>
                  Proceed to Login
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
            {error && (
              <div
                role="alert"
                className="mb-6 p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="border-b border-slate-200 pb-2 mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-teal-700" />
                  <span>Institutional Details</span>
                </div>
              </div>

              <FormInput
                id="institutionName"
                name="institutionName"
                type="text"
                label="Institution Name"
                isRequired
                placeholder="e.g. Delhi Institute of Engineering & Technology"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                disabled={isLoading}
                helperText="Official legal title as recorded in AICTE records."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  id="aictePermanentId"
                  name="aictePermanentId"
                  type="text"
                  label="AICTE Permanent ID"
                  placeholder="e.g. 1-43289012 (Optional for new)"
                  value={aictePermanentId}
                  onChange={(e) => setAictePermanentId(e.target.value)}
                  disabled={isLoading}
                  helperText="Existing AICTE Permanent Institute ID, if issued."
                />

                <div>
                  <label htmlFor="institutionType" className="block text-xs font-semibold text-slate-700 mb-1">
                    Institution Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="institutionType"
                    name="institutionType"
                    value={institutionType}
                    onChange={(e) => setInstitutionType(e.target.value)}
                    disabled={isLoading}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-xs focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  >
                    {INSTITUTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <FormInput
                    id="address"
                    name="address"
                    type="text"
                    label="Campus Address"
                    isRequired
                    placeholder="Institutional Area, Sector 14"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-xs font-semibold text-slate-700 mb-1">
                    State / UT <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="state"
                    name="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    disabled={isLoading}
                    className="w-full text-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-xs focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-b border-slate-200 pb-2 pt-2 mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>Authorized Contact & Login Credentials</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  id="contactName"
                  name="contactName"
                  type="text"
                  label="Contact Person Name"
                  isRequired
                  placeholder="Dr. Rajesh Sharma"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  disabled={isLoading}
                  helperText="Authorized representative or nodal officer."
                />

                <FormInput
                  id="contactDesignation"
                  name="contactDesignation"
                  type="text"
                  label="Designation"
                  isRequired
                  placeholder="Principal / Registrar / Director"
                  value={contactDesignation}
                  onChange={(e) => setContactDesignation(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  label="Official Institutional Email"
                  isRequired
                  placeholder="principal@ietdelhi.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  helperText="Used for login and verification communications."
                />

                <FormInput
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  label="Official Contact Number"
                  placeholder="+91 11 2659 1000"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  label="Password"
                  isRequired
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />

                <FormInput
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  label="Confirm Password"
                  isRequired
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  size="md"
                  isLoading={isLoading}
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  Register Institution
                </Button>
              </div>
            </form>

            <div className="mt-5 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 leading-relaxed text-left space-y-1">
              <span className="font-semibold text-slate-700 block">Two-Role Authorization Model:</span>
              <p>
                TypeNull maintains two dedicated roles: <strong>Institution</strong> (registers, submits EoA drafts, and uploads proofs) and <strong>AICTE Officer</strong> (reviews registrations, inspects dossiers, and evaluates compliance). Officer accounts are provisioned administratively.
              </p>
            </div>

            <div className="mt-5 pt-5 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-600">
                Already registered?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-teal-700 hover:text-teal-800 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Back to Home link */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Public Website
          </Link>
        </div>
      </div>
    </div>
  );
};
