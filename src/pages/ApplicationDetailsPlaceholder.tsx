import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Camera, ShieldAlert, FileCheck, Layers, Info, Calendar, Building, Globe } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { useAuth } from '../contexts/AuthContext';
import { fetchApplicationById } from '../services/applications';
import { DbApplication } from '../types';

export const ApplicationDetailsPlaceholder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConfigured } = useAuth();

  const [application, setApplication] = useState<DbApplication | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadApplication = useCallback(async () => {
    if (!id) {
      setError('Invalid application ID.');
      setIsLoading(false);
      return;
    }

    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: fetchErr } = await fetchApplicationById(id);

    setIsLoading(false);

    if (fetchErr || !data) {
      setError(
        fetchErr?.message ||
          'Application dossier not found or access restricted under active Row-Level Security policies.'
      );
    } else {
      setApplication(data);
    }
  }, [id, isConfigured]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-8">
        <LoadingState message="Fetching application record from Supabase PostgreSQL..." rows={4} />
      </div>
    );
  }

  // Not found or RLS access denied state
  if (error && isConfigured) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 rounded-xl border border-slate-200 bg-white text-center shadow-sm space-y-5">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 mx-auto">
          <ShieldAlert className="w-8 h-8 text-rose-600" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">
            Dossier Not Found or Access Restricted
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {error}
          </p>
        </div>
        <div className="pt-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/dashboard')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Fallback for preview mode or when viewing with Supabase unconfigured
  const displayTitle = application?.title || `Application Dossier: ${id || 'PREVIEW'}`;
  const displayCategory = application?.category?.replace(/_/g, ' ') || 'Institutional Registration';
  const displayOrg = application?.organisation_name || 'Designated Institution (Preview)';
  const displayReg = application?.registration_number || 'N/A';
  const displayJurisdiction = application?.jurisdiction || 'India';
  const displayDesc = application?.description || 'No additional scope notes recorded.';
  const displayStatus = application?.status || 'draft';
  const displayDate = application?.created_at
    ? new Date(application.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Phase 2 Staging';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <PageHeader
        title={displayTitle}
        description={`Institutional validation dossier for ${displayOrg}.`}
        badge={<StatusBadge status={displayStatus} />}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Applications' },
          { label: id ? `${id.slice(0, 8)}...` : 'Dossier' },
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

      {/* Database Persistence Verified Banner */}
      {application ? (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-teal-200 bg-teal-50/70 text-xs text-teal-900">
          <FileCheck className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-teal-950">
              Database Record Verified (PostgreSQL)
            </p>
            <p className="leading-relaxed text-teal-800">
              This dossier is persisted in Supabase and secured under your authenticated user ID. In Phase 3, document uploads and OCR text extraction will link directly to this record.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900">
          <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950">
              Preview Mode (Supabase Unconfigured)
            </p>
            <p className="leading-relaxed text-amber-800">
              Configure Supabase credentials in <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env</code> to view live PostgreSQL dossier records.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Application Information & Document Submission */}
        <div className="lg:col-span-2 space-y-6">
          {/* Real Application Info Card */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-700" />
                Dossier Metadata &amp; Claims
              </h3>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                {application ? 'PostgreSQL Active' : 'Schema Preview'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
                  Dossier ID
                </span>
                <span className="text-slate-900 font-mono font-semibold text-xs mt-0.5 block break-all">
                  {id}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
                  Application Category
                </span>
                <span className="text-slate-800 font-medium capitalize mt-0.5 block">
                  {displayCategory}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
                  Organisation / Institution
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 text-slate-800 font-medium">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span>{displayOrg}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
                  Registration / Licence Number
                </span>
                <span className="text-slate-800 font-mono mt-0.5 block">
                  {displayReg}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
                  Jurisdiction
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 text-slate-800 font-medium">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>{displayJurisdiction}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px]">
                  Submission Date
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 text-slate-800 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{displayDate}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-slate-400 block font-medium uppercase tracking-wider text-[10px] mb-1">
                Scope &amp; Description
              </span>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                {displayDesc}
              </p>
            </div>
          </div>

          {/* Document Ingestion & Camera Capture Section Placeholder */}
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-teal-700" />
                Document Intake &amp; Mobile Camera Capture
              </h3>
              <span className="text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-medium border border-teal-200">
                Phase 3 Engine
              </span>
            </div>

            <div className="p-8 border-2 border-dashed border-slate-200 rounded-lg text-center bg-slate-50/50">
              <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-800">
                Document Upload &amp; Scanner Module
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                Supabase Storage bucket integration and camera OCR extraction will connect to this dossier in Phase 3.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="text-[11px] px-2.5 py-1 bg-white rounded border border-slate-200 text-slate-600">
                  Supabase Storage Buckets
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
                Cross-Document Findings
              </h3>
              <ShieldAlert className="w-4 h-4 text-slate-400" />
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              When documents are uploaded, TypeNull will cross-reference claims against documentary proofs to identify discrepancies.
            </p>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500">
              <span className="font-semibold text-slate-700 block mb-1">Upcoming in Phase 4:</span>
              Automated Discrepancy Matrix comparing names, registration numbers, and dates across multi-source evidence.
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
              Evidence-linked evaluation against statutory policies and reference institutional datasets.
            </p>

            <div className="p-3.5 rounded-lg bg-teal-50/60 border border-teal-100 text-xs text-teal-900">
              <span className="font-semibold text-teal-950 block mb-1">Audit Report (Phase 5):</span>
              Exportable verification certificates with cryptographic timestamps and audit trails will be downloadable here.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
