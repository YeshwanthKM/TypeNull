import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="Verification Dashboard"
        description="Monitor application verification requests, inspect document authentication pipelines, and audit regulatory compliance."
        action={
          <Button
            variant="primary"
            onClick={() => navigate('/applications/new')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            New Application
          </Button>
        }
      />

      {/* Honest Application Metrics / Summary Section */}
      <section aria-labelledby="summary-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="summary-heading" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Application Pipeline Summary
          </h2>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            Phase 1 Baseline &bull; 0 Persisted Records
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Total Registered Applications</span>
              <FileText className="w-4 h-4 text-teal-700" />
            </div>
            <p className="text-3xl font-extrabold text-slate-900">0</p>
            <p className="text-xs text-slate-500 mt-2">
              No applications recorded in current session.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Pending Document Capture</span>
              <ShieldAlert className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-3xl font-extrabold text-slate-900">0</p>
            <p className="text-xs text-slate-500 mt-2">
              Awaiting camera upload or file intake.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-medium">Completed Verifications</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-extrabold text-slate-900">0</p>
            <p className="text-xs text-slate-500 mt-2">
              Audited with full evidence trail.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-2.5">
          Note: Authentic database metrics will populate once Supabase tables and PostgreSQL persistence are connected in Phase 2.
        </p>
      </section>

      {/* Recent Applications Section with Honest Empty State */}
      <section aria-labelledby="recent-apps-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-apps-heading" className="text-base font-bold text-slate-900">
            Recent Applications
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/applications/new')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Start new intake
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <EmptyState
            icon={FileText}
            title="No Applications Created Yet"
            description="You have not created any validation applications in this session. Create your first application to initiate cross-document consistency checks and regulatory compliance workflows."
            action={
              <Button
                variant="primary"
                onClick={() => navigate('/applications/new')}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create New Application
              </Button>
            }
            note="Applications created in Phase 1 demonstrate client-side validation schemas. Persistent records and document storage will be integrated in Phase 2."
          />
        </div>
      </section>

      {/* Verification Workflow Preview for SIH Demonstrations */}
      <section className="rounded-xl border border-teal-100 bg-teal-50/50 p-6">
        <h3 className="text-sm font-bold text-teal-900 mb-1">
          Next Generation Verification Pipeline
        </h3>
        <p className="text-xs text-teal-800 leading-relaxed mb-4 max-w-3xl">
          Each application progresses through structured verification stages designed to eliminate manual review delays while enforcing regulatory integrity:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white p-3 rounded-lg border border-teal-200/60 shadow-xs">
            <span className="font-bold text-teal-900 block mb-1">1. Application Intake</span>
            <p className="text-slate-600 text-[11px]">Structured claim fields and institutional identifier registration.</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-teal-200/60 shadow-xs">
            <span className="font-bold text-teal-900 block mb-1">2. Document Ingestion</span>
            <p className="text-slate-600 text-[11px]">Mobile camera capture or desktop PDF/image uploads.</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-teal-200/60 shadow-xs">
            <span className="font-bold text-teal-900 block mb-1">3. Cross-Validation</span>
            <p className="text-slate-600 text-[11px]">OCR text extraction and multi-document consistency comparison.</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-teal-200/60 shadow-xs">
            <span className="font-bold text-teal-900 block mb-1">4. Evidence Report</span>
            <p className="text-slate-600 text-[11px]">Auditable compliance findings with reference-record validation.</p>
          </div>
        </div>
      </section>
    </div>
  );
};
