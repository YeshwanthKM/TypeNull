import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Menu, Globe, UserCheck, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleDisplayLabel } from '../../utils/roleUtils';

export interface AppHeaderProps {
  onToggleMobileMenu: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onToggleMobileMenu }) => {
  const { user, profile, signOut, isConfigured } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Authenticated User';
  const displayRole = profile?.role || 'applicant';
  const displayEmail = user?.email || (isConfigured ? 'Authenticated' : 'Offline Mode');

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      {/* Left side: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
          aria-label="Open mobile navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <Link
          to="/dashboard"
          className="flex items-center gap-2 group focus:outline-none focus:ring-2 focus:ring-teal-600 rounded-md"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="font-bold text-base text-slate-900 tracking-tight leading-none group-hover:text-teal-700 transition-colors">
              TypeNull
            </span>
            <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase mt-0.5">
              Portal Console
            </span>
          </div>
        </Link>
      </div>

      {/* Right side: Navigation & Auth State */}
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
        >
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Landing Page</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <Link
              to="/settings"
              className="flex items-center gap-2 text-left group hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-teal-600 rounded"
              title="View settings & profile"
            >
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs border border-teal-200">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="hidden lg:flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-800 leading-tight group-hover:text-teal-700">
                    {displayName}
                  </span>
                  <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {getRoleDisplayLabel(displayRole)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                  {displayEmail}
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-teal-700 hover:bg-teal-800 shadow-sm transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
