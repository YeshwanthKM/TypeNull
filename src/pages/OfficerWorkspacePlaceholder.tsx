import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Shield, Building, Info, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const OfficerWorkspacePlaceholder: React.FC = () => {
  const { user, profile } = useAuth();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Officer Verification Workspace"
        description="Statutory review queue for formally submitted institutional validation dossiers."
        badge={<StatusBadge status="under_review" />}
        breadcrumbs={[
          { label: 'Portal', href: '/dashboard' },
          { label: 'Officer Workspace' },
        ]}
      />

      {/* Workspace Foundation Notice */}
      <div className="p-6 rounded-2xl border border-teal-200 bg-white shadow-sm space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Officer Authorization Established
              </h3>
              <span className="text-[11px] font-mono font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full">
                Role: {profile?.role || 'officer'}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              You are authenticated with institutional officer privileges. In this workspace, authorized officers will inspect submitted dossiers, verify cross-document evidence, and record statutory compliance determinations.
            </p>
          </div>
        </div>

        {/* Status Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
          <div className="flex items-center gap-2 text-slate-900 font-semibold">
            <Info className="w-4 h-4 text-teal-700" />
            <span>Workspace Status: Operational Features Pending Next Phase</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            The role-based security foundation, Row-Level Security policies, and organisation membership model are fully active. Operational dossier assignment queues and decision-recording tools will be activated in upcoming phases.
          </p>
        </div>

        {/* Current Officer Clearance Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2">
          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Officer Account</span>
            <span className="font-mono text-slate-800 font-semibold truncate block mt-0.5">
              {user?.email}
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Clearance Level</span>
            <span className="font-semibold text-teal-800 flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              Verified Officer
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg border border-slate-200">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Organisation Access</span>
            <div className="flex items-center gap-1 mt-0.5 text-slate-700">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Assigned Organisations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
