import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, UserPlus, AlertCircle, ArrowLeft, Info, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { FormInput } from '../components/ui/FormInput';

export const RegisterPage: React.FC = () => {
  const { signUp, isConfigured, user } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
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

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    if (!email.trim()) {
      setError('Email address is required.');
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

    const { error: signUpError, session } = await signUp(email, password, fullName);

    setIsLoading(false);

    if (signUpError) {
      setError(signUpError.message || 'Registration failed. Please try again.');
    } else {
      setRegisteredEmail(email);
      // If Supabase returned a session immediately, email confirmation is disabled
      if (session) {
        navigate('/dashboard', { replace: true });
      } else {
        // Email confirmation is required
        setConfirmationNeeded(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
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
                Portal Authentication
              </span>
            </div>
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            Create Verification Account
          </h1>
          <p className="mt-1.5 text-xs text-slate-600">
            Register for access to application validation and regulatory compliance tools.
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
              Real user registration requires configuring <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> in your environment file.
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
            <p className="text-xs text-slate-600 leading-relaxed">
              We have dispatched a verification link to <strong className="text-slate-900">{registeredEmail}</strong>. Please check your inbox and confirm your email to activate your account.
            </p>
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
              <FormInput
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                label="Full Name"
                isRequired
                placeholder="Dr. Rajesh Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
                helperText="Will be linked to your audit profile."
              />

              <FormInput
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                label="Institutional Email"
                isRequired
                placeholder="officer@agency.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />

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
                helperText="Must be minimum 6 characters."
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

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  size="md"
                  isLoading={isLoading}
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  Create Account
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
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
