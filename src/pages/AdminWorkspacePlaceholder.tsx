import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ShieldAlert, Key, Info, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const AdminWorkspacePlaceholder: React.FC = () => {
  const { user, profile } = useAuth();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Administration Console"
        description="Privileged administrative controls, organisation management, and role provisioning."
        badge={<StatusBadge status="verified" />}
        breadcrumbs={[
          { label: 'Portal', href: '/dashboard' },
          { label: 'Administration Console' },
        ]}
      />

      {/* Admin Foundation Notice */}
      <div className="p-6 rounded-2xl border border-indigo-200 bg-white shadow-sm space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center flex-shrink-0">
            <Key className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Administrator Privileges Active
              </h3>
              <span className="text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full">
                Role: {profile?.role || 'administrator'}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              You are authenticated with system administrator privileges. This console establishes the foundation for managing platform user accounts, assigning officer clearances, and configuring evaluating organisations.
            </p>
          </div>
        </div>

        {/* Status Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Info className="w-4 h-4 text-indigo-700" />
            <span>Console Status: Operational Admin UI Pending Next Phase</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            The database role architecture, security triggers (<code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-[11px]">protect_profile_role</code>), and procedural role assignment functions are established in Supabase. Interactive user management panels will be activated in upcoming phases.
          </p>
        </div>

        {/* Administration Scope Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Admin Account</span>
            <span className="font-mono text-slate-800 font-semibold truncate block mt-0.5">
              {user?.email}
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Clearance Level</span>
            <span className="font-semibold text-indigo-800 flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
              System Administrator
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Security Model</span>
            <div className="flex items-center gap-1 mt-0.5 text-slate-700">
              <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
              <span>Database RLS &amp; Triggers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
