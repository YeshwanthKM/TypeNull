import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X, ArrowRight, UserCheck, Play } from 'lucide-react';
import { useAuth, getRoleRedirectPath } from '../../contexts/AuthContext';

interface NavbarProps {
  onGetStartedClick: () => void;
  onStartTourClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onGetStartedClick, onStartTourClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, role } = useAuth();
  const location = useLocation();

  const isLandingPage = location.pathname === '/';

  const navItems = [
    { label: 'The Challenge', href: '/#challenge' },
    { label: 'Our Solution', href: '/#solution' },
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Capabilities', href: '/#capabilities' },
    { label: 'Trust & Oversight', href: '/#trust' },
    { label: 'Help & Guides', href: '/guides', isRoute: true },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-2 focus:ring-teal-600 rounded-md"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg text-slate-900 tracking-tight leading-none group-hover:text-teal-700 transition-colors">
                TypeNull
              </span>
              <span className="text-[10px] font-medium tracking-wider text-slate-500 uppercase mt-0.5">
                Regulatory Technology Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-6" aria-label="Main Navigation">
            {navItems.map((item) =>
              item.isRoute ? (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`text-xs font-semibold px-2 py-1 rounded transition-colors ${
                    location.pathname === item.href
                      ? 'text-teal-700 bg-teal-50'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={isLandingPage ? item.href.replace('/#', '#') : item.href}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors px-1 py-0.5"
                >
                  {item.label}
                </a>
              )
            )}
          </nav>

          {/* Desktop Auth / Tour / CTA Actions */}
          <div className="hidden lg:flex items-center space-x-3">
            {onStartTourClick && (
              <button
                type="button"
                onClick={onStartTourClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Start interactive product tour"
              >
                <Play className="w-3.5 h-3.5 text-teal-700 fill-current" />
                <span>Product Tour</span>
              </button>
            )}

            {user ? (
              <Link
                to={getRoleRedirectPath(role)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-teal-700 text-xs font-semibold rounded-lg text-white bg-teal-700 hover:bg-teal-800 shadow-sm transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  {role === 'officer'
                    ? 'Officer Workspace'
                    : role === 'administrator'
                    ? 'Admin Console'
                    : 'Applicant Dashboard'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 text-xs font-semibold text-slate-700 hover:text-teal-700 transition-colors"
                >
                  Sign In
                </Link>
                <button
                  type="button"
                  onClick={onGetStartedClick}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-semibold rounded-lg text-white bg-teal-700 hover:bg-teal-800 shadow-sm transition-colors"
                >
                  Start Pre-Validation
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3">
          <div className="flex flex-col space-y-2">
            {navItems.map((item) =>
              item.isRoute ? (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-md text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={isLandingPage ? item.href.replace('/#', '#') : item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-md text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  {item.label}
                </a>
              )
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            {onStartTourClick && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onStartTourClick();
                }}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <Play className="w-3.5 h-3.5 text-teal-700 fill-current" />
                <span>Start Product Tour</span>
              </button>
            )}

            {user ? (
              <Link
                to={getRoleRedirectPath(role)}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-teal-700 hover:bg-teal-800 shadow-sm transition-colors"
              >
                <span>
                  {role === 'officer'
                    ? 'Officer Workspace'
                    : role === 'administrator'
                    ? 'Admin Console'
                    : 'Applicant Dashboard'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                >
                  Sign In
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onGetStartedClick();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-teal-700 hover:bg-teal-800 shadow-sm transition-colors"
                >
                  Start Pre-Validation
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
export default Navbar;
