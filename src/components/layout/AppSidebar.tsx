import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  FilePlus,
  Settings,
  Shield,
  Key,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const AppSidebar: React.FC = () => {
  const { role } = useAuth();

  const navItems = [
    {
      to: '/dashboard',
      label: 'Pre-Validation Dashboard',
      icon: LayoutDashboard,
      show: role === 'applicant',
    },
    {
      to: '/applications/explore',
      label: 'Explore Applications',
      icon: Compass,
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
      to: '/guides',
      label: 'Help & User Guides',
      icon: BookOpen,
      show: true,
    },
    {
      to: '/settings',
      label: 'Account Settings',
      icon: Settings,
      show: true,
    },
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:inset-y-0 border-r border-slate-200 bg-white">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        {/* Navigation Links */}
        <div className="px-4 mb-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Verification Console
          </p>
          <nav className="space-y-1" aria-label="Portal Navigation">
            {navItems
              .filter((item) => item.show)
              .map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/dashboard'}
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
                          className={`w-4 h-4 flex-shrink-0 ${
                            isActive ? 'text-teal-700' : 'text-slate-400'
                          }`}
                        />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
          </nav>
        </div>

        {/* Quick Links Section */}
        <div className="px-4 mt-4 pt-4 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Reference
          </p>
          <NavLink
            to="/"
            className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-slate-400" />
              Public Landing
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </NavLink>
        </div>

        {/* Guidance Support Card */}
        <div className="mt-auto p-4 m-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <BookOpen className="w-4 h-4 text-teal-700" />
            Product Guidance
          </div>
          <p className="text-slate-500 leading-normal text-[11px]">
            Review official filing checklists, conditional rules, and screening workflows in the User Guides.
          </p>
          <NavLink
            to="/guides"
            className="inline-flex items-center gap-1 text-teal-700 font-semibold hover:underline text-[11px]"
          >
            Explore Guides &rarr;
          </NavLink>
        </div>
      </div>
    </aside>
  );
};
export default AppSidebar;
