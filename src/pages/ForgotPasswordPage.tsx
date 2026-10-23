import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle, CheckCircle2, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { FormInput } from '../components/ui/FormInput';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    setIsLoading(true);

    const { error: resetError } = await resetPassword(email);

    setIsLoading(false);

    if (resetError) {
      setError(resetError.message || 'Failed to initiate password reset.');
    } else {
      setSuccess(true);
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
            Reset Password
          </h1>
          <p className="mt-1.5 text-xs text-slate-600">
            Enter your institutional email to receive a password recovery link.
          </p>
        </div>

        {/* Form or Success Box */}
        <div className="mt-6 bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Password Reset Link Dispatched
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                If an account exists with <strong className="text-slate-900">{email}</strong>, you will receive a secure password recovery email shortly.
              </p>
              <div className="pt-2">
                <Link to="/login">
                  <Button variant="primary" size="md" fullWidth>
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
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
                  id="email"
                  name="email"
                  type="email"
                  label="Registered Email"
                  isRequired
                  placeholder="officer@agency.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || !isConfigured}
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  size="md"
                  isLoading={isLoading}
                  disabled={!isConfigured}
                  leftIcon={<KeyRound className="w-4 h-4" />}
                >
                  Send Recovery Link
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-100 text-center">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
                >
                  Return to sign in
                </Link>
              </div>
            </>
          )}
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
