import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, LogIn, AlertCircle, Info, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { FormInput } from '../components/ui/FormInput';

export const LoginPage: React.FC = () => {
  const { signIn, isConfigured, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect to dashboard or intended destination
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  React.useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

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

    setIsLoading(true);

    const { error: signInError } = await signIn(email, password);

    setIsLoading(false);

    if (signInError) {
      setError(signInError.message || 'Failed to authenticate. Please check your credentials.');
    } else {
      navigate(from, { replace: true });
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
            Sign In to Officer Portal
          </h1>
          <p className="mt-1.5 text-xs text-slate-600">
            Access application validation dossiers and regulatory compliance records.
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
              Environment credentials (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code>) are required for active authentication.
            </p>
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
              placeholder="officer@agency.gov.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
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
              disabled={isLoading}
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
              isLoading={isLoading}
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              Don&apos;t have an officer account?{' '}
              <Link
                to="/register"
                className="font-semibold text-teal-700 hover:text-teal-800 transition-colors"
              >
                Register here
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
