import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Camera,
  ShieldAlert,
  FileCheck,
  Layers,
  Info,
  Calendar,
  Building,
  Globe,
  UploadCloud,
  Lock,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { DocumentList } from '../components/documents/DocumentList';
import { DocumentUploadModal } from '../components/documents/DocumentUploadModal';
import { DocumentPreviewModal } from '../components/documents/DocumentPreviewModal';
import { DocumentExtractionModal } from '../components/extraction/DocumentExtractionModal';
import { ExtractedDossierSection } from '../components/extraction/ExtractedDossierSection';
import { PreValidationSection } from '../components/validation/PreValidationSection';
import { EoaWorkflowProgressBar } from '../components/validation/EoaWorkflowProgressBar';
import { DocumentAuthenticitySection } from '../components/documents/DocumentAuthenticitySection';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchApplicationById, submitApplicationForInternalReview } from '../services/applications';
import { fetchApplicationDocuments } from '../services/documents';
import { runEoaValidationEngine, EoaValidationSummary } from '../services/validation/eoaValidationEngine';
import {
  DbApplication,
  ApplicationDocument,
  DocumentExtractionRecord,
  ExtractedFieldRecord,
} from '../types';

export const ApplicationDetailsPlaceholder: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isConfigured } = useAuth();

  const [application, setApplication] = useState<DbApplication | null>(null);
  const [documents, setDocuments] = useState<ApplicationDocument[]>([]);
  const [isLoadingApp, setIsLoadingApp] = useState<boolean>(true);
  const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewingDoc, setPreviewingDoc] = useState<ApplicationDocument | null>(null);
  const [extractingDoc, setExtractingDoc] = useState<ApplicationDocument | null>(null);

  const handleDocumentStatusChanged = (
    docId: string,
    newStatus: ApplicationDocument['processing_status']
  ) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, processing_status: newStatus } : d))
    );
    loadExtractionsAndFields();
  };

  // Load application details
  const loadApplication = useCallback(async () => {
    if (!id) {
      setError('Invalid application ID.');
      setIsLoadingApp(false);
      return;
    }

    setIsLoadingApp(true);
    setError(null);

    const { data, error: fetchErr } = await fetchApplicationById(id);

    setIsLoadingApp(false);

    if (fetchErr || !data) {
      setError(
        fetchErr?.message ||
          'Application dossier not found or access restricted under active Row-Level Security policies.'
      );
    } else {
      setApplication(data);
    }
  }, [id]);

  // Extractions & Fields state for Validation Engine
  const [extractions, setExtractions] = useState<DocumentExtractionRecord[]>([]);
  const [fields, setFields] = useState<ExtractedFieldRecord[]>([]);

  // Load application documents
  const loadDocuments = useCallback(async () => {
    if (!id) {
      setIsLoadingDocs(false);
      return;
    }

    setIsLoadingDocs(true);
    const { data, error: docErr } = await fetchApplicationDocuments(id);
    setIsLoadingDocs(false);

    if (!docErr) {
      setDocuments(data);
    }
  }, [id]);

  // Load extractions and fields for validation engine
  const loadExtractionsAndFields = useCallback(async () => {
    if (!id || !isConfigured || !supabase) return;

    try {
      const [extRes, fieldRes] = await Promise.all([
        supabase.from('document_extractions').select('*').eq('application_id', id),
        supabase.from('extracted_fields').select('*').eq('application_id', id),
      ]);

      if (!extRes.error && extRes.data) {
        setExtractions(extRes.data as DocumentExtractionRecord[]);
      }
      if (!fieldRes.error && fieldRes.data) {
        setFields(fieldRes.data as ExtractedFieldRecord[]);
      }
    } catch (err) {
      console.warn('[TypeNull] Error loading extractions for validation:', err);
    }
  }, [id, isConfigured]);

  useEffect(() => {
    loadApplication();
    loadDocuments();
    loadExtractionsAndFields();
  }, [loadApplication, loadDocuments, loadExtractionsAndFields]);

  // Comprehensive AICTE EoA validation summary
  const eoaSummary: EoaValidationSummary | null = React.useMemo(() => {
    if (!application) return null;
    return runEoaValidationEngine({
      application,
      documents,
      extractions,
      fields,
    });
  }, [application, documents, extractions, fields]);

  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const handleSubmitForReview = async () => {
    if (!id) return;
    setIsSubmittingReview(true);
    await submitApplicationForInternalReview(id);
    await loadApplication();
    setIsSubmittingReview(false);
  };

  // Handler when new document upload completes
  const handleDocumentUploaded = (newDoc: ApplicationDocument) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  // Handler when document is deleted
  const handleDocumentDeleted = (deletedId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== deletedId));
  };

  if (isLoadingApp) {
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
          <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
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

  const displayTitle = application?.title || `Application Dossier: ${id || 'PREVIEW'}`;
  const displayCategory = application?.category?.replace(/_/g, ' ') || 'Institutional Registration';
  const displayOrg = application?.organisation_name || 'Designated Entity (Preview)';
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
    : 'Initial Intake';

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
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              leftIcon={<UploadCloud className="w-4 h-4" />}
            >
              Upload Document
            </Button>
          </div>
        }
      />

      {/* Supabase Unconfigured Warning */}
      {!isConfigured && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-900">
          <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950">
              Supabase Storage Connection Pending
            </p>
            <p className="leading-relaxed text-amber-800">
              Document uploads interact directly with your private Supabase Storage bucket (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">application-documents</code>). Ensure your Supabase project is active with migration 002 applied.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Application Information & Document Management */}
        <div className="lg:col-span-2 space-y-6">
          {/* Real Application Info Card */}
          <div className="p-4 sm:p-6 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-700 flex-shrink-0" />
                <span>Dossier Metadata &amp; Claims</span>
              </h3>
              <span className="self-start sm:self-auto text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                PostgreSQL Active
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
                <span className="text-slate-800 font-mono mt-0.5 block">{displayReg}</span>
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
                  Creation Date
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

          {/* AICTE EoA Workflow Progress & Internal Submission Boundary */}
          {eoaSummary && (
            <EoaWorkflowProgressBar
              currentStage={eoaSummary.workflowStage}
              blockingIssuesCount={eoaSummary.blockingIssues}
              warningsCount={eoaSummary.warningChecks}
              passedChecksCount={eoaSummary.passedChecks}
              isSubmissionReady={eoaSummary.isSubmissionReady}
              onSubmitForReview={handleSubmitForReview}
              isSubmitting={isSubmittingReview}
            />
          )}

          {/* Document Management Section */}
          <div className="p-4 sm:p-6 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-teal-700" />
                  Uploaded Verification Documents
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Private storage vault &bull; Signed URL access only
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto"
              >
                Add Document
              </Button>
            </div>

            <DocumentList
              documents={documents}
              isLoading={isLoadingDocs}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              onPreviewDocument={(doc) => setPreviewingDoc(doc)}
              onExtractDocument={(doc) => setExtractingDoc(doc)}
              onDocumentDeleted={handleDocumentDeleted}
            />
          </div>

          {/* Pre-Validation Engine Section */}
          {application && user && (
            <PreValidationSection
              application={application}
              documents={documents}
              extractions={extractions}
              fields={fields}
              userId={user.id}
            />
          )}

          {/* Document Reference & Authenticity Verification Section */}
          {documents.length > 0 && (
            <DocumentAuthenticitySection
              documents={documents}
              extractions={extractions}
              fields={fields}
              applicationId={id || ''}
            />
          )}

          {/* Extracted Intelligence & Human Review Dossier Section */}
          <ExtractedDossierSection
            applicationId={id || ''}
            documents={documents}
            onOpenExtractionModal={(doc) => setExtractingDoc(doc)}
          />
        </div>

        {/* Right Column: Vault Security & Pipeline Intelligence */}
        <div className="space-y-6">
          {/* Vault Security Summary Card */}
          <div className="p-4 sm:p-6 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-2.5">
              <Lock className="w-4 h-4 text-teal-700" />
              <span>Storage Vault Status</span>
            </div>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Total Uploaded Files</span>
                <span className="font-semibold text-slate-900 font-mono">{documents.length}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Access Mode</span>
                <span className="font-semibold text-teal-700">Private / Signed 15m</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">Max File Limit</span>
                <span className="font-semibold text-slate-800">10 MB / file</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">Encryption</span>
                <span className="font-semibold text-slate-800">AES-256 (At Rest)</span>
              </div>
            </div>
          </div>

          {/* Document Intelligence Status */}
          <div className="p-4 sm:p-6 rounded-xl border border-teal-200 bg-teal-50/30 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-teal-100 pb-2.5">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-700" />
                Document Intelligence
              </h4>
              <span className="text-[10px] uppercase font-mono text-teal-800 bg-teal-100 px-2 py-0.5 rounded border border-teal-300 font-semibold">
                Automated OCR
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              In-browser WebAssembly OCR (Tesseract.js) and PDF stream parsing identify candidate fields with document provenance snippets and human review tracking.
            </p>

            <div className="p-3 bg-white rounded-lg border border-teal-100 text-xs text-slate-600 space-y-1">
              <span className="font-semibold text-teal-900 block">Supported Fields:</span>
              <p className="text-[11px] leading-relaxed text-slate-500">
                GSTIN, PAN, CIN, Registration IDs, Entity Name, Issue/Expiry Dates, Address, and Issuing Authority.
              </p>
            </div>
          </div>

          {/* Compliance Audit Report */}
          <div className="p-4 sm:p-6 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-700" />
                Compliance Audit Report
              </h4>
              <span className="text-[10px] uppercase font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-semibold">
                Audit Engine
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Generates cryptographic tamper-evident verification certificates mapping documentary proofs directly to statutory guidelines.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {id && user && (
        <DocumentUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          applicationId={id}
          userId={user.id}
          onUploadSuccess={handleDocumentUploaded}
        />
      )}

      {/* Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(previewingDoc)}
        onClose={() => setPreviewingDoc(null)}
        document={previewingDoc}
      />

      {/* Extraction & Human Review Modal */}
      {user && (
        <DocumentExtractionModal
          isOpen={Boolean(extractingDoc)}
          onClose={() => setExtractingDoc(null)}
          document={extractingDoc}
          userId={user.id}
          onDocumentStatusChanged={handleDocumentStatusChanged}
        />
      )}
    </div>
  );
};
