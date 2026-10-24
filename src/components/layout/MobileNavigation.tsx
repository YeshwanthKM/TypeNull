import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FilePlus, Settings, ShieldCheck, X, Globe, Shield, Key } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({ isOpen, onClose }) => {
  const { role } = useAuth();

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navItems = [
    {
      to: '/dashboard',
      label: 'Pre-Validation Dashboard',
      icon: LayoutDashboard,
      show: role === 'applicant',
    },
    {
      to: '/applications/new',
      label: 'Prepare Application',
      icon: FilePlus,
      show: role === 'applicant',
    },
    {
      to: '/officer',
      label: 'Organisation Screening',
      icon: Shield,
      show: role === 'officer',
    },
    {
      to: '/admin',
      label: 'Administration Console',
      icon: Key,
      show: role === 'administrator',
    },
    {
      to: '/settings',
      label: 'Account Settings',
      icon: Settings,
      show: true,
    },
    {
      to: '/',
      label: 'Landing Page',
      icon: Globe,
      show: true,
    },
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-out Drawer Menu */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-200 ease-in-out md:hidden flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation Menu"
      >
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-slate-900">TypeNull</span>
              <span className="text-[10px] text-slate-500 uppercase font-mono">
                SIH 2026 Portal
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Navigation
          </p>
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard' || item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-teal-50 text-teal-800 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 ${
                          isActive ? 'text-teal-700' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
        </div>

        {/* Phase note in mobile menu */}
        <div className="p-4 m-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500">
          <p className="font-semibold text-slate-800 mb-1">Phase 4: Document Intelligence</p>
          <p className="text-[11px]">
            In-browser OCR, PDF text extraction, structured field parsing, and RBAC active.
          </p>
        </div>
      </div>

      {/* Bottom Sticky Mobile Navigation Bar for Quick Navigation on Handhelds */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-white/95 backdrop-blur border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-sm"
        aria-label="Mobile quick actions"
      >
        {role === 'applicant' && (
          <>
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              <LayoutDashboard className="w-5 h-5 mb-0.5" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/applications/new"
              className={({ isActive }) =>
                `flex flex-col items-center py-1 px-3 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`
              }
            >
              <FilePlus className="w-5 h-5 mb-0.5" />
              <span>New App</span>
            </NavLink>
          </>
        )}

        {role === 'officer' && (
          <NavLink
            to="/officer"
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-3 text-[11px] font-medium transition-colors ${
                isActive ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            <Shield className="w-5 h-5 mb-0.5" />
            <span>Screening</span>
          </NavLink>
        )}

        {role === 'administrator' && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-3 text-[11px] font-medium transition-colors ${
                isActive ? 'text-indigo-700 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`
            }
          >
            <Key className="w-5 h-5 mb-0.5" />
            <span>Admin</span>
          </NavLink>
        )}

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 text-[11px] font-medium transition-colors ${
              isActive ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span>Settings</span>
        </NavLink>

        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center py-1 px-3 text-[11px] font-medium transition-colors ${
              isActive ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <Globe className="w-5 h-5 mb-0.5" />
          <span>Website</span>
        </NavLink>
      </nav>
    </>
  );
};
