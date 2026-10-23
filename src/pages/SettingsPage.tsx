import React from 'react';
import { User, Sliders, Shield, Info, Lock } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';

export const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Settings & System Governance"
        description="Review operator preferences, audit log configurations, and institutional privacy standards."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings' },
        ]}
      />

      {/* Honest Prototype Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm text-xs text-slate-700">
        <Info className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-900">
            Phase 1 Settings Prototype
          </p>
          <p className="leading-relaxed text-slate-600">
            Settings persistence and authenticated officer profiles will be connected to Supabase Auth and PostgreSQL profile tables in Phase 2. No persistent preferences are stored yet.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Section 1: Account */}
        <section
          aria-labelledby="account-settings-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <User className="w-5 h-5 text-teal-700" />
            <div>
              <h2 id="account-settings-heading" className="text-sm font-bold text-slate-900">
                Officer Account Information
              </h2>
              <p className="text-xs text-slate-500">
                Credentials and role assignments for verification personnel.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Officer Name
              </label>
              <input
                type="text"
                disabled
                value="Evaluation Officer (Phase 1 Demo)"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Institutional Role
              </label>
              <input
                type="text"
                disabled
                value="Lead Document Verification Auditor"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Supabase Auth session binding will be established in Phase 2.</span>
          </div>
        </section>

        {/* Section 2: Preferences */}
        <section
          aria-labelledby="preferences-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Sliders className="w-5 h-5 text-teal-700" />
            <div>
              <h2 id="preferences-heading" className="text-sm font-bold text-slate-900">
                Inspection Preferences
              </h2>
              <p className="text-xs text-slate-500">
                Default display modes and sensitivity thresholds for consistency checks.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <p className="font-semibold text-slate-900">Discrepancy Sensitivity Threshold</p>
                <p className="text-slate-500 text-[11px]">
                  Controls tolerance for name spelling variations and alias matching.
                </p>
              </div>
              <span className="text-[11px] font-mono font-medium text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200">
                Standard (85% Fuzzy Match)
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <p className="font-semibold text-slate-900">Review Viewport Density</p>
                <p className="text-slate-500 text-[11px]">
                  Optimized for multi-document split-screen comparison.
                </p>
              </div>
              <span className="text-[11px] font-mono font-medium text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200">
                Comfortable Responsive
              </span>
            </div>
          </div>
        </section>

        {/* Section 3: Privacy & Compliance */}
        <section
          aria-labelledby="privacy-heading"
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <Shield className="w-5 h-5 text-teal-700" />
            <div>
              <h2 id="privacy-heading" className="text-sm font-bold text-slate-900">
                Data Privacy & Regulatory Audit Standards
              </h2>
              <p className="text-xs text-slate-500">
                Compliance policies governing uploaded citizen credentials and audit trails.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-900">Governance Framework:</p>
            <p className="leading-relaxed">
              TypeNull enforces zero unverified claims. All document extractions retain evidence bounding boxes and timestamped cryptographic hashes for tamper detection.
            </p>
            <p className="text-slate-500 text-[11px]">
              Complies with Digital Personal Data Protection (DPDP) principles and government audit trail guidelines.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="outline" size="sm" disabled>
              Save Changes (Phase 2)
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};
