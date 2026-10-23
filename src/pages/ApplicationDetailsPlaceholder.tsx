import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Camera, ShieldAlert, FileCheck, Layers, Info } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';

export const ApplicationDetailsPlaceholder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title={`Application: ${id || 'APP-PREVIEW'}`}
        description="Structured verification dossier and multi-source document evidence review."
        badge={<StatusBadge status="prototype" />}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Applications' },
          { label: id || 'Preview' },
        ]}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Dashboard
          </Button>
        }
      />

      {/* Honest Scope Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm text-xs text-slate-700">
        <Info className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-900">
            Phase 1 Architectural Placeholder
          </p>
          <p className="leading-relaxed text-slate-600">
            This view outlines the structure for application inspection, document uploads, OCR cross-checks, and regulatory compliance reports. Actual application data persistence will connect to Supabase in Phase 2.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Application Information & Document Submission */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Info Card */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-700" />
                Application Dossier Information
              </h3>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                Schema Ready
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
                  Dossier Identifier
                </span>
                <span className="text-slate-900 font-mono font-semibold text-sm mt-0.5 block">
                  {id || 'APP-PREVIEW-01'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
                  Assigned Workflow Category
                </span>
                <span className="text-slate-800 font-medium mt-0.5 block">
                  Institutional Registration (Prototype)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
                  Target Jurisdiction
                </span>
                <span className="text-slate-800 font-medium mt-0.5 block">
                  India (Statutory Verification)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
                  Current Phase Status
                </span>
                <span className="text-teal-700 font-semibold mt-0.5 block">
                  Phase 1: Frontend Foundation
                </span>
              </div>
            </div>
          </div>

          {/* Document Ingestion & Camera Capture Section Placeholder */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-teal-700" />
                Document Submission & Camera Capture
              </h3>
              <span className="text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-medium border border-teal-200">
                Phase 2 / Phase 3 Module
              </span>
            </div>

            <div className="p-8 border-2 border-dashed border-slate-200 rounded-lg text-center bg-slate-50/50">
              <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-800">
                Document Upload Pipeline Placeholder
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Desktop drag-and-drop and mobile phone camera document capture will be enabled once Supabase Storage buckets are provisioned in Phase 2.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="text-[11px] px-2.5 py-1 bg-white rounded border border-slate-200 text-slate-600">
                  PDF & High-Res Image Upload
                </span>
                <span className="text-[11px] px-2.5 py-1 bg-white rounded border border-slate-200 text-slate-600">
                  Mobile Camera Capture
                </span>
                <span className="text-[11px] px-2.5 py-1 bg-white rounded border border-slate-200 text-slate-600">
                  OCR Text Extraction
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Findings & Compliance Reports */}
        <div className="space-y-6">
          {/* Verification Findings Placeholder */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-700" />
                Consistency Findings
              </h3>
              <ShieldAlert className="w-4 h-4 text-slate-400" />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              When documents are ingested, TypeNull cross-references names, dates, and registration numbers across claims and uploaded proofs.
            </p>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500">
              <span className="font-semibold text-slate-700 block mb-1">Upcoming Engine:</span>
              Cross-Document Discrepancy Matrix will highlight mismatched dates of birth, conflicting credentials, and unverified stamps.
            </div>
          </div>

          {/* Regulatory Compliance Reports Placeholder */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-700" />
                Compliance Intelligence
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Automated rules will test submitted proofs against scheme circulars and statutory benchmarks.
            </p>

            <div className="p-3.5 rounded-lg bg-teal-50/60 border border-teal-100 text-xs text-teal-900">
              <span className="font-semibold text-teal-950 block mb-1">Evidence Trail Report:</span>
              Exportable audit certificates containing OCR bounding coordinates and verification logs will be downloadable here.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
