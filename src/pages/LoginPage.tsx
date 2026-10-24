import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, LogIn, AlertCircle, Info, ArrowLeft } from 'lucide-react';
import { useAuth, getRoleRedirectPath } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { FormInput } from '../components/ui/FormInput';

export const LoginPage: React.FC = () => {
  const { signIn, isConfigured, user, role, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already logged in, redirect based on verified role
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  React.useEffect(() => {
    if (user && !isAuthLoading) {
      const destination = getRoleRedirectPath(role, from);
      navigate(destination, { replace: true });
    }
  }, [user, isAuthLoading, role, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsSubmitting(true);

    const { error: signInError, role: verifiedRole } = await signIn(email, password);

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message || 'Failed to authenticate. Please check your credentials.');
    } else {
      const destination = getRoleRedirectPath(verifiedRole, from);
      navigate(destination, { replace: true });
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
                Unified Portal Authentication
              </span>
            </div>
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">
            Sign In to TypeNull
          </h1>
          <p className="mt-1.5 text-xs text-slate-600">
            Access your authorized portal as a User, Organisation, or Admin.
          </p>
        </div>

        {/* Configuration Notice if Supabase keys missing */}
        {!isConfigured && (
          <div className="mt-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs space-y-3">
            <div className="flex items-center gap-2 font-semibold text-amber-950">
              <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>Supabase Not Yet Connected</span>
            </div>
            <p className="leading-relaxed">
              Environment credentials (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code>) are required for live cloud auth.
            </p>
            <div className="pt-2 border-t border-amber-200/80">
              <span className="block text-[11px] font-semibold text-amber-950 mb-1.5 uppercase tracking-wider">
                Explore in Evaluation Mode:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem('typenull_demo_role', 'applicant');
                    window.location.href = '/dashboard';
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-teal-700 text-white hover:bg-teal-800 transition-colors"
                >
                  User Portal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem('typenull_demo_role', 'officer');
                    window.location.href = '/officer';
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Organisation Workspace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.setItem('typenull_demo_role', 'administrator');
                    window.location.href = '/admin';
                  }}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Admin Console
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Login Box */}
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

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <FormInput
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              label="Email Address"
              isRequired
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />

            <FormInput
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              label="Password"
              isRequired
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
            />

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Secure Supabase Auth</span>
              <Link
                to="/forgot-password"
                className="font-medium text-teal-700 hover:text-teal-800 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="md"
              isLoading={isSubmitting}
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          {/* Role Redirection Overview */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="rounded-lg bg-slate-50 border border-slate-200/70 p-2.5 text-[11px] text-slate-500 space-y-1">
              <span className="font-semibold text-slate-700 block text-[10px] uppercase tracking-wider">
                Automatic Role Routing
              </span>
              <p>
                &bull; <strong className="text-slate-700">Applicants</strong> &rarr; Application Management Dashboard<br />
                &bull; <strong className="text-slate-700">Officers</strong> &rarr; Dossier Review Workspace<br />
                &bull; <strong className="text-slate-700">Administrators</strong> &rarr; System Console
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Need an applicant account?{' '}
              <Link
                to="/register"
                className="font-semibold text-teal-700 hover:text-teal-800 transition-colors"
              >
                Register as Applicant
              </Link>
            </p>
          </div>
        </div>

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
