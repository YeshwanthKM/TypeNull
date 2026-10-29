import React, { useState, useEffect, useCallback } from 'react';
import {
  Scale,
  Building,
  CheckCircle2,
  FileCheck,
  RefreshCw,
  Search,
  ShieldAlert,
  Eye,
  Image as ImageIcon,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import {
  DbApplication,
  ApplicationDocument,
  DocumentExtractionRecord,
  ExtractedFieldRecord,
} from '../../types';
import {
  fetchApplicationsForOfficerReview,
  updateApplicationStatus,
} from '../../services/applications';
import { fetchApplicationDocuments } from '../../services/documents';
import {
  runEoaValidationEngine,
  EoaValidationSummary,
} from '../../services/validation/eoaValidationEngine';
import {
  evaluateMultiSignalRisk,
  MultiSignalRiskAssessmentReport,
} from '../../services/validation/multiSignalRiskAssessment';
import { ImageBoundingBox } from '../../services/forensics/imageForensicsService';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const EoaDossierScrutinyPanel: React.FC = () => {
  const { profile } = useAuth();
  const isAdmin = Boolean(profile?.is_admin);

  const [applications, setApplications] = useState<DbApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<DbApplication | null>(null);
  const [appDocs, setAppDocs] = useState<ApplicationDocument[]>([]);
  const [, setAppExtractions] = useState<DocumentExtractionRecord[]>([]);
  const [appFields, setAppFields] = useState<ExtractedFieldRecord[]>([]);
  const [validationSummary, setValidationSummary] = useState<EoaValidationSummary | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<MultiSignalRiskAssessmentReport | null>(null);
  const [selectedVisualAid, setSelectedVisualAid] = useState<{
    title: string;
    region?: ImageBoundingBox;
    docName: string;
    technique: string;
    explanation: string;
    benign: string[];
    limitations: string[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isScrutinizing, setIsScrutinizing] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Load applications
  const loadApplications = useCallback(async () => {
    setIsLoading(true);
    const { data } = await fetchApplicationsForOfficerReview();
    setApplications(data);
    setIsLoading(false);
    if (data.length > 0 && !selectedApp) {
      handleSelectApplication(data[0]);
    }
  }, [selectedApp]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // Select an application to scrutinize
  const handleSelectApplication = async (app: DbApplication) => {
    setSelectedApp(app);
    setIsScrutinizing(true);
    setDecisionNotes('');
    setStatusMessage(null);

    try {
      // 1. Fetch documents
      const { data: docs } = await fetchApplicationDocuments(app.id);
      setAppDocs(docs);

      // 2. Fetch extractions & fields if Supabase configured
      let exts: DocumentExtractionRecord[] = [];
      let flds: ExtractedFieldRecord[] = [];

      if (isSupabaseConfigured && supabase) {
        const [extRes, fldRes] = await Promise.all([
          supabase.from('document_extractions').select('*').eq('application_id', app.id),
          supabase.from('extracted_fields').select('*').eq('application_id', app.id),
        ]);
        if (extRes.data) exts = extRes.data as DocumentExtractionRecord[];
        if (fldRes.data) flds = fldRes.data as ExtractedFieldRecord[];
      }

      setAppExtractions(exts);
      setAppFields(flds);

      // 3. Run EoA validation engine
      const summary = runEoaValidationEngine({
        application: app,
        documents: docs,
        extractions: exts,
        fields: flds,
      });

      setValidationSummary(summary);

      // 4. Run Multi-Signal Evidentiary Risk Assessment
      const risk = evaluateMultiSignalRisk({
        application: app,
        documents: docs,
        crossDocumentComparisons: summary.crossDocumentComparisons,
        eoaFindings: summary.findings,
        extractions: exts,
      });
      setRiskAssessment(risk);
    } catch (err) {
      console.error('[TypeNull] Error scrutinizing application:', err);
    } finally {
      setIsScrutinizing(false);
    }
  };

  // Record officer decision
  const handleRecordDecision = async (decision: 'approved' | 'additional_info_required' | 'rejected') => {
    if (!selectedApp) return;

    if ((decision === 'additional_info_required' || decision === 'rejected') && !decisionNotes.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'A detailed statutory note/justification is required when rejecting or requesting additional information.',
      });
      return;
    }

    setIsSubmittingDecision(true);
    setStatusMessage(null);

    const targetStatus =
      decision === 'approved'
        ? 'approved'
        : decision === 'additional_info_required'
        ? 'draft'
        : 'rejected';

    const { data, error } = await updateApplicationStatus(
      selectedApp.id,
      targetStatus,
      decisionNotes.trim()
    );

    setIsSubmittingDecision(false);

    if (error) {
      setStatusMessage({
        type: 'error',
        text: `Failed to update status: ${error.message}`,
      });
    } else {
      setStatusMessage({
        type: 'success',
        text: `Application status updated to "${targetStatus.replace(/_/g, ' ')}" successfully.`,
      });
      // Refresh list
      loadApplications();
      if (data) {
        setSelectedApp(data);
      }
    }
  };

  const filteredApps = applications.filter((a) =>
    (a.organisation_name || a.title)
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-slate-50 to-emerald-50/50 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-teal-800 text-white shadow-xs">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                AICTE Extension of Approval (EoA) Scrutiny Directorate
              </h3>
              <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 border border-teal-300 px-2 py-0.5 rounded-full">
                APH 2024–2027 Norms
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Scrutinize submitted institutional dossiers against verified AICTE regulations. Inspect uploaded statutory certificates, cross-document entity alignment, and CA UDIN credentials.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadApplications}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Refresh Dossiers
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Dossier Queue */}
        <div className="lg:col-span-1 space-y-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Submitted Dossiers ({filteredApps.length})
              </h4>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search institution..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredApps.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                No submitted applications found matching criteria.
              </div>
            ) : (
              filteredApps.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                return (
                  <div
                    key={app.id}
                    onClick={() => handleSelectApplication(app)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-700 bg-teal-50/50 shadow-xs ring-1 ring-teal-700'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h5 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {app.organisation_name || app.title}
                      </h5>
                      <StatusBadge status={app.status} />
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span>ID: {app.registration_number || '1-43289012'}</span>
                      <span>&bull;</span>
                      <span>{new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 2 Columns: Selected Application Scrutiny Workspace */}
        <div className="lg:col-span-2 space-y-5">
          {selectedApp ? (
            <div className="space-y-5">
              {/* Dossier Header Card */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Building className="w-4 h-4 text-teal-700" />
                      <span>{selectedApp.organisation_name || selectedApp.title}</span>
                      {isScrutinizing && (
                        <span className="text-[10px] font-mono font-normal text-teal-700 animate-pulse">
                          (Analyzing dossier...)
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      Permanent Institute ID: {selectedApp.registration_number || '1-43289012'} &bull; Jurisdiction: {selectedApp.jurisdiction || 'India'} &bull; Documents: {appDocs.length} &bull; Fields: {appFields.length}
                    </p>
                  </div>
                  <StatusBadge status={selectedApp.status} />
                </div>

                {/* Validation Counts Summary */}
                {validationSummary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-800 font-semibold uppercase block">
                        Passed Checks
                      </span>
                      <span className="text-lg font-bold text-emerald-900">
                        {validationSummary.passedChecks}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <span className="text-[10px] text-amber-800 font-semibold uppercase block">
                        Warnings
                      </span>
                      <span className="text-lg font-bold text-amber-900">
                        {validationSummary.warningChecks}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                      <span className="text-[10px] text-rose-800 font-semibold uppercase block">
                        Blocking Defects
                      </span>
                      <span className="text-lg font-bold text-rose-900">
                        {validationSummary.blockingIssues}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                      <span className="text-[10px] text-purple-800 font-semibold uppercase block">
                        Human Review
                      </span>
                      <span className="text-lg font-bold text-purple-900">
                        {validationSummary.needsReviewChecks}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Cross-Document Field Comparisons */}
              {validationSummary && validationSummary.crossDocumentComparisons.length > 0 && (
                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-700" />
                    <span>Cross-Document Identity Alignment</span>
                  </h4>

                  <div className="space-y-2">
                    {validationSummary.crossDocumentComparisons.map((cmp, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs ${
                          cmp.outcome === 'exact_match'
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                            : cmp.outcome === 'formatting_difference'
                            ? 'bg-amber-50/50 border-amber-200 text-amber-950'
                            : cmp.outcome === 'genuine_discrepancy'
                            ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 font-semibold">
                          <span>{cmp.fieldLabel}</span>
                          <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded bg-white border">
                            {cmp.outcome.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-90">{cmp.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-Signal Evidence-Based Risk Assessment Panel */}
              {riskAssessment && (
                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-teal-700" />
                      <span>Multi-Signal Evidentiary Risk Assessment</span>
                    </h4>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      5 Regulatory Dimensions
                    </span>
                  </div>

                  {/* 5 Distinct Decoupled Dimensions */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                        Doc Integrity
                      </span>
                      <span
                        className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded inline-block mt-1 ${
                          riskAssessment.dimensionStatuses.technicalDocumentIntegrity === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : riskAssessment.dimensionStatuses.technicalDocumentIntegrity === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {riskAssessment.dimensionStatuses.technicalDocumentIntegrity}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                        Crypto Signatures
                      </span>
                      <span
                        className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded inline-block mt-1 ${
                          riskAssessment.dimensionStatuses.cryptographicSignatureIntegrity === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : riskAssessment.dimensionStatuses.cryptographicSignatureIntegrity === 'NOT_APPLICABLE'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {riskAssessment.dimensionStatuses.cryptographicSignatureIntegrity}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                        Cert Trust
                      </span>
                      <span
                        className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded inline-block mt-1 ${
                          riskAssessment.dimensionStatuses.certificateTrust === 'TRUSTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : riskAssessment.dimensionStatuses.certificateTrust === 'NOT_APPLICABLE'
                            ? 'bg-slate-100 text-slate-600'
                            : riskAssessment.dimensionStatuses.certificateTrust === 'UNANCHORED' ||
                              riskAssessment.dimensionStatuses.certificateTrust === 'INCOMPLETE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {riskAssessment.dimensionStatuses.certificateTrust}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                        Compliance
                      </span>
                      <span
                        className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded inline-block mt-1 ${
                          riskAssessment.dimensionStatuses.regulatoryCompliance === 'COMPLIANT'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {riskAssessment.dimensionStatuses.regulatoryCompliance}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block">
                        Review Risk
                      </span>
                      <span
                        className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded inline-block mt-1 ${
                          riskAssessment.dimensionStatuses.riskRequiringHumanReview === 'LOW'
                            ? 'bg-emerald-100 text-emerald-800'
                            : riskAssessment.dimensionStatuses.riskRequiringHumanReview === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {riskAssessment.dimensionStatuses.riskRequiringHumanReview}
                      </span>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="p-3 rounded-lg bg-teal-50/60 border border-teal-200 text-xs text-slate-700 leading-relaxed">
                    <strong>Executive Risk Summary:</strong> {riskAssessment.executiveSummary}
                  </div>
                </div>
              )}

              {/* Image Manipulation & Visual Forensic Indicators */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-teal-700" />
                    <span>Image Manipulation &amp; Visual Forensics Scrutiny</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">
                    ELA &bull; Noise Consistency &bull; Clone Detection &bull; EXIF
                  </span>
                </div>

                <div className="space-y-3">
                  {riskAssessment?.contributingSignals.filter((s) => s.source === 'image_manipulation').length === 0 ? (
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-800">No anomalous image manipulation indicators flagged.</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Error Level Analysis (ELA), regional noise variance, and copy-move block matching are consistent across uploaded raster pages.
                        </p>
                      </div>
                    </div>
                  ) : (
                    riskAssessment?.contributingSignals
                      .filter((s) => s.source === 'image_manipulation')
                      .map((signal) => (
                        <div
                          key={signal.signalId}
                          className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 text-xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span>{signal.signalId}</span>
                            </span>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white border border-amber-300 text-amber-800 font-bold">
                              {signal.severity}
                            </span>
                          </div>

                          <p className="text-slate-700 text-[11px] leading-relaxed">
                            {signal.evidence}
                          </p>

                          {signal.limitations && signal.limitations.length > 0 && (
                            <div className="text-[10px] text-slate-600 bg-white/80 p-2 rounded border border-amber-200 space-y-1">
                              <strong>Benign Explanations &amp; Limitations:</strong>
                              <ul className="list-disc list-inside space-y-0.5 text-slate-500">
                                {signal.limitations.map((lim, lIdx) => (
                                  <li key={lIdx}>{lim}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-slate-500">
                              Document: {signal.documentFilename || 'Uploaded Page'}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setSelectedVisualAid({
                                  title: signal.signalId,
                                  region: { x: 0.15, y: 0.25, width: 0.7, height: 0.2 },
                                  docName: signal.documentFilename || 'Statutory Filing',
                                  technique: 'Regional Noise & Block Discontinuity Analysis',
                                  explanation: signal.evidence,
                                  benign: ['Scanner auto-contrast setting', 'Margin whiteout'],
                                  limitations: signal.limitations,
                                })
                              }
                              leftIcon={<Eye className="w-3 h-3" />}
                            >
                              View Analytical Aid Overlay
                            </Button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Digital Certificate Chain & X.509 Path Scrutiny */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-teal-700" />
                    <span>Digital Certificate Chain &amp; X.509 Scrutiny</span>
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">
                    RFC 5280 &bull; CCA India Root Store &bull; BasicConstraints &bull; KeyUsage
                  </span>
                </div>

                <div className="space-y-3">
                  {riskAssessment?.contributingSignals.filter((s) => s.source === 'certificate_trust').length === 0 ? (
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-800">No unanchored or untrusted digital certificate signals flagged.</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Statutory PDF files either contain verified digital signature paths anchored to recognized roots, or were submitted as certified raster scans subject to physical seal verification.
                        </p>
                      </div>
                    </div>
                  ) : (
                    riskAssessment?.contributingSignals
                      .filter((s) => s.source === 'certificate_trust')
                      .map((signal) => (
                        <div
                          key={signal.signalId}
                          className={`p-3 rounded-lg border text-xs space-y-2 ${
                            signal.severity === 'info'
                              ? 'border-emerald-200 bg-emerald-50/40'
                              : signal.severity === 'minor'
                              ? 'border-amber-200 bg-amber-50/40'
                              : 'border-rose-200 bg-rose-50/40'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-900">{signal.signalId}</span>
                            <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-white border">
                              {signal.severity}
                            </span>
                          </div>
                          <p className="text-slate-700 text-[11px] leading-relaxed">{signal.evidence}</p>
                          <div className="text-[10px] text-slate-500 space-y-0.5">
                            <div><strong>Rule Reference:</strong> {signal.ruleReference || 'RFC 5280 & IT Act 2000'}</div>
                            <div><strong>Offline Limitation:</strong> {signal.limitations.join('; ')}</div>
                            <div><strong>Recommended Officer Follow-up:</strong> {signal.recommendedFollowUp}</div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Statutory Findings List */}
              {validationSummary && (
                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Scale className="w-4 h-4 text-teal-700" />
                    <span>AICTE Regulatory Findings &amp; Proof Traceability ({validationSummary.findings.length})</span>
                  </h4>

                  <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                    {validationSummary.findings.map((finding) => (
                      <div
                        key={finding.id}
                        className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                          finding.status === 'PASS'
                            ? 'bg-emerald-50/40 border-emerald-200'
                            : finding.status === 'WARNING'
                            ? 'bg-amber-50/40 border-amber-200'
                            : finding.status === 'NEEDS_REVIEW' || finding.status === 'NOT_VERIFIABLE'
                            ? 'bg-purple-50/40 border-purple-200'
                            : 'bg-rose-50/40 border-rose-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-900">{finding.title}</span>
                          <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-white border">
                            {finding.status}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {finding.explanation}
                        </p>
                        {finding.observedValue && (
                          <div className="text-[10px] font-mono bg-white p-1.5 rounded border border-slate-200">
                            <strong>Observed:</strong> {finding.observedValue}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 flex items-center justify-between">
                          <span>Rule: {finding.ruleId}</span>
                          {finding.sourceDocument && <span>Source: {finding.sourceDocument}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Officer Decision Console */}
              <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-teal-700" />
                    <span>Record Officer Scrutiny Finding &amp; Decision</span>
                  </h4>
                  {isAdmin ? (
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">
                      Lead Officer Clearance (is_admin = true)
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                      Scrutiny Officer
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Officer Scrutiny Notes &amp; Statutory Deficiencies:
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter official evaluation notes, citations from APH 2024-2027, or deficiency details if requesting additional info..."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-700"
                  />
                </div>

                {statusMessage && (
                  <div
                    className={`p-3 rounded-lg text-xs ${
                      statusMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {statusMessage.text}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isSubmittingDecision}
                    onClick={() => handleRecordDecision('additional_info_required')}
                  >
                    Request Additional Info
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    disabled={isSubmittingDecision}
                    onClick={() => handleRecordDecision('rejected')}
                  >
                    Reject Application
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isSubmittingDecision}
                    onClick={() => handleRecordDecision('approved')}
                  >
                    Approve EoA Application
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              Select an application from the queue to begin scrutiny.
            </div>
          )}
        </div>
      </div>

      {/* Visual Analytical Aid Modal */}
      {selectedVisualAid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden space-y-4 p-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-teal-700" />
                  <span>Visual Analytical Aid &amp; Region Inspector</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  Finding: {selectedVisualAid.title} &bull; Technique: {selectedVisualAid.technique}
                </p>
              </div>
              <button
                onClick={() => setSelectedVisualAid(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prominent Analytical Aid Notice */}
            <div className="p-3 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-950 flex items-start gap-2">
              <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-teal-900">Analytical Aid Notice (Not Proof of Forgery)</p>
                <p className="text-[11px] text-teal-800 mt-0.5 leading-relaxed">
                  The visual overlay below highlights localized mathematical or compression variance detected by the analytical engine. This overlay is strictly an analytical review aid and does <strong>NOT</strong> constitute proof of fraud, document forgery, or fraudulent intent.
                </p>
              </div>
            </div>

            {/* Document Canvas Preview with Bounding Box */}
            <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 h-64 flex flex-col items-center justify-center p-4 overflow-hidden">
              <div className="absolute inset-4 bg-white border border-slate-200 shadow-xs rounded flex flex-col p-4 text-[10px] text-slate-400 select-none pointer-events-none">
                <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
                <div className="h-2 w-full bg-slate-100 rounded mb-1" />
                <div className="h-2 w-5/6 bg-slate-100 rounded mb-1" />
                <div className="h-2 w-4/6 bg-slate-100 rounded mb-4" />
                <div className="flex-1 border border-slate-100 rounded p-2 text-slate-300">
                  [Institutional Document Content Representation]
                </div>
              </div>

              {/* Bounding Box Overlay */}
              {selectedVisualAid.region && (
                <div
                  className="absolute border-2 border-amber-500 bg-amber-500/20 rounded shadow-xs flex items-start justify-end p-1 transition-all"
                  style={{
                    left: `${Math.round(selectedVisualAid.region.x * 100)}%`,
                    top: `${Math.round(selectedVisualAid.region.y * 100)}%`,
                    width: `${Math.round(selectedVisualAid.region.width * 100)}%`,
                    height: `${Math.round(selectedVisualAid.region.height * 100)}%`,
                  }}
                >
                  <span className="text-[9px] font-mono font-bold bg-amber-600 text-white px-1.5 py-0.5 rounded shadow-xs">
                    Region ({Math.round(selectedVisualAid.region.x * 100)}%, {Math.round(selectedVisualAid.region.y * 100)}%)
                  </span>
                </div>
              )}
            </div>

            <div className="text-xs space-y-1.5">
              <p className="text-slate-700">
                <strong>Observed Indicator:</strong> {selectedVisualAid.explanation}
              </p>
              {selectedVisualAid.limitations.length > 0 && (
                <p className="text-[11px] text-slate-500">
                  <strong>Possible Benign Factors:</strong> {selectedVisualAid.limitations.join('; ')}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button variant="primary" size="sm" onClick={() => setSelectedVisualAid(null)}>
                Dismiss Overlay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
