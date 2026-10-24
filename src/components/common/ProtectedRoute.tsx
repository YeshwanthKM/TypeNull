import React from 'react';
import { Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth, getRoleRedirectPath } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { LoadingState } from '../ui/LoadingState';
import { ShieldAlert, ArrowRight, Lock, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, profile, role, isLoading, isConfigured, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Initial Authentication & Profile Loading State
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <LoadingState message="Verifying session and authorization permissions..." rows={2} />
      </div>
    );
  }

  // 2. Supabase Unconfigured Guide & Evaluation Launchpad
  if (!isConfigured && !user) {
    const recommendedRole: UserRole = allowedRoles?.includes('officer') && !allowedRoles?.includes('applicant')
      ? 'officer'
      : allowedRoles?.includes('administrator') && !allowedRoles?.includes('applicant')
      ? 'administrator'
      : 'applicant';

    return (
      <div className="max-w-2xl mx-auto my-12 p-6 sm:p-8 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-950">
              Supabase Configuration Notice
            </h2>
            <p className="text-xs text-amber-800">
              Protected portal route: <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded">{location.pathname}</code>
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm leading-relaxed text-amber-900">
          This route requires an active, authenticated Supabase session. To connect real authentication and database persistence:
        </p>

        <div className="p-3.5 bg-white/80 rounded-lg border border-amber-200 text-xs font-mono space-y-1 text-slate-800">
          <p className="text-slate-500 font-sans text-[11px] mb-1 font-semibold">
            Add to your local <code className="bg-slate-100 px-1 py-0.5 rounded">.env</code>:
          </p>
          <p>VITE_SUPABASE_URL=https://your-project-ref.supabase.co</p>
          <p>VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...</p>
        </div>

        <div className="pt-2 border-t border-amber-200/80">
          <p className="text-xs font-semibold text-amber-950 mb-2">
            Local Evaluation &amp; QA Demo Mode:
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            {useAuth().startDemoSession && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => useAuth().startDemoSession!(recommendedRole)}
                >
                  Explore as {recommendedRole.charAt(0).toUpperCase() + recommendedRole.slice(1)} (Demo)
                </Button>
                {recommendedRole !== 'applicant' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => useAuth().startDemoSession!('applicant')}
                  >
                    Applicant Demo
                  </Button>
                )}
                {recommendedRole !== 'officer' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => useAuth().startDemoSession!('officer')}
                  >
                    Officer Demo
                  </Button>
                )}
              </>
            )}
            <Link to="/login">
              <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Go to Login Page
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" size="sm">
                Back to Landing Page
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Unauthenticated User Redirect
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Role Verification for Role-Restricted Routes
  if (allowedRoles && allowedRoles.length > 0) {
    // If authenticated but profile/role is still being retrieved
    if (!profile) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <LoadingState message="Verifying account role and workspace clearance..." rows={2} />
        </div>
      );
    }

    // Role indeterminate or invalid
    const activeRole = role || profile.role;
    if (!activeRole || !['applicant', 'officer', 'administrator'].includes(activeRole)) {
      return (
        <div className="max-w-md mx-auto my-16 p-8 rounded-2xl border border-rose-200 bg-white text-center shadow-lg space-y-5">
          <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900">
              Account Role Indeterminate
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your account&apos;s authorization role could not be verified by the security policy. Please contact an administrator or sign in again.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign Out &amp; Retry
            </Button>
          </div>
        </div>
      );
    }

    // Role Not Authorised -> Access Denied Screen
    if (!allowedRoles.includes(activeRole)) {
      const authorizedDestination = getRoleRedirectPath(activeRole);
      return (
        <div className="max-w-lg mx-auto my-16 p-8 rounded-2xl border border-slate-200 bg-white text-center shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100/70 border border-amber-200 text-amber-800 text-xs font-semibold uppercase tracking-wider">
              <span>Restricted Clearance</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Access Denied: Unauthorised Workspace
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
              Your account is registered as <strong className="font-semibold text-slate-900 uppercase font-mono">{activeRole}</strong>, but this section requires <strong className="font-semibold text-slate-900 uppercase font-mono">{allowedRoles.join(' or ')}</strong> clearance.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-left text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Authenticated Identity:</span>
              <span className="font-mono text-slate-800 font-semibold">{user.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Assigned Role:</span>
              <span className="font-mono text-teal-800 font-semibold capitalize">{activeRole}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Target Workspace:</span>
              <span className="font-mono text-slate-700">{location.pathname}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(authorizedDestination, { replace: true })}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Go to Your Workspace
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
            >
              Sign Out
            </Button>
          </div>
        </div>
      );
    }
  }

  // Authorised
  return <>{children}</>;
};
