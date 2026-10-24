import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  CheckCircle2,
  Play,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle,
  Globe,
  FileText,
  Layers,
  Scale,
  Calendar,
  ScanLine,
  FileQuestion,
  Filter,
  LayoutList,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  ApplicationDocument,
  DbApplication,
  DocumentExtractionRecord,
  ExtractedFieldRecord,
  ScreeningOutcome,
  ValidationRun,
  PersonalizedChecklistResult,
  ValidationFinding,
} from '../../types';
import { runValidationEngine } from '../../services/validation/engine';
import { fetchValidationRuns, saveValidationRun } from '../../services/validationService';
import { CANDIDATE_GOVERNMENT_SERVICES } from '../../services/ingestion/ingestionService';
import { evaluateConditionalChecklist } from '../../services/conditionalEvaluator';
import {
  groupFindingsByCategory,
  FindingCategoryKey,
  GroupedCategoryFindings,
} from '../../services/validation/findingCategories';

interface PreValidationSectionProps {
  application: DbApplication;
  documents: ApplicationDocument[];
  extractions: DocumentExtractionRecord[];
  fields: ExtractedFieldRecord[];
  userId: string;
}

export const PreValidationSection: React.FC<PreValidationSectionProps> = ({
  application,
  documents,
  extractions,
  fields,
  userId,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentRun, setCurrentRun] = useState<ValidationRun | null>(null);
  const [runHistory, setRunHistory] = useState<ValidationRun[]>([]);
  const [filter, setFilter] = useState<'all' | 'issues' | 'passed' | 'warnings'>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [showHistory, setShowHistory] = useState(false);

  // Check if this application dossier was created from an official government service
  const parsedGovMeta = useMemo(() => {
    if (!application.description) return null;
    try {
      const obj = JSON.parse(application.description);
      if (obj && typeof obj === 'object' && obj.governmentService) {
        return obj.governmentService;
      }
    } catch {
      // plain text description
    }
    return null;
  }, [application.description]);

  // Compute live tailored checklist based on applicant answers and uploaded documents
  const tailoredChecklist: PersonalizedChecklistResult | null = useMemo(() => {
    if (!parsedGovMeta) return null;
    const srv = CANDIDATE_GOVERNMENT_SERVICES.find(
      (s) => s.id === parsedGovMeta.id || s.serviceCode === parsedGovMeta.serviceCode
    );
    if (!srv) return null;

    const variant =
      srv.applicationTypes.find(
        (v) => v.id === parsedGovMeta.applicationTypeId || v.variantCode === parsedGovMeta.variantCode
      ) || srv.applicationTypes[0];

    if (!variant) return null;

    const uploadedTypes = documents.map((d) => d.document_type);

    return evaluateConditionalChecklist({
      applicationType: variant,
      userAnswers: parsedGovMeta.conditionalAnswers || {},
      uploadedDocumentTypes: uploadedTypes,
    });
  }, [parsedGovMeta, documents]);

  // Compute input fingerprint to detect when documents or fields change after validation
  const dossierFingerprint = useMemo(() => {
    const docTokens = documents
      .map((d) => `${d.id}:${d.document_type}:${d.processing_status}:${d.updated_at || d.created_at}`)
      .sort()
      .join(';');
    const extTokens = extractions
      .map((e) => `${e.document_id}:${e.extraction_status}:${e.raw_text?.length || 0}`)
      .sort()
      .join(';');
    const fieldTokens = fields
      .map((f) => `${f.id}:${f.reviewed_value || f.extracted_value || ''}`)
      .sort()
      .join(';');
    const appTokens = `${application.title}::${application.organisation_name || ''}::${application.registration_number || ''}`;
    return `${docTokens}##${extTokens}##${fieldTokens}##${appTokens}`;
  }, [
    documents,
    extractions,
    fields,
    application.title,
    application.organisation_name,
    application.registration_number,
  ]);

  const [lastValidatedFingerprint, setLastValidatedFingerprint] = useState<string | null>(null);

  // Load prior validation history on mount
  useEffect(() => {
    let mounted = true;
    fetchValidationRuns(application.id).then(({ data }) => {
      if (!mounted) return;
      if (data && data.length > 0) {
        setRunHistory(data);
        setCurrentRun(data[0]);
        // Set last validated fingerprint to null so we compare timestamps for historical runs
      }
    });
    return () => {
      mounted = false;
    };
  }, [application.id]);

  // Determine if displayed validation results are stale relative to latest dossier state
  const isResultStale = useMemo(() => {
    if (!currentRun) return false;
    if (lastValidatedFingerprint !== null) {
      return lastValidatedFingerprint !== dossierFingerprint;
    }
    // If loaded from historical records, compare timestamps
    const runTime = new Date(currentRun.validatedAt).getTime();
    const hasNewerDoc = documents.some(
      (d) => new Date(d.updated_at || d.created_at).getTime() > runTime
    );
    const hasNewerField = fields.some(
      (f) => new Date(f.updated_at || f.created_at).getTime() > runTime
    );
    return hasNewerDoc || hasNewerField;
  }, [currentRun, lastValidatedFingerprint, dossierFingerprint, documents, fields]);

  const handleRunValidation = async () => {
    setIsRunning(true);
    try {
      // Simulate slight processing delay for tactile feel
      await new Promise((r) => setTimeout(r, 600));

      const allPersonalizedReqs = tailoredChecklist
        ? [
            ...tailoredChecklist.mandatoryDocuments,
            ...tailoredChecklist.conditionalDocuments.map((c) => c.requirement),
            ...tailoredChecklist.alternativeDocumentGroups.flatMap((g) => g.options),
          ]
        : undefined;

      const result = runValidationEngine({
        applicationId: application.id,
        category: application.category,
        applicationMetadata: {
          title: application.title,
          organisation_name: application.organisation_name,
          registration_number: application.registration_number,
          jurisdiction: application.jurisdiction,
        },
        documents,
        extractions,
        fields,
        personalizedRequirements: allPersonalizedReqs,
        serviceName: tailoredChecklist?.serviceName || application.title,
      });

      setCurrentRun(result);
      setRunHistory((prev) => [result, ...prev]);
      setLastValidatedFingerprint(dossierFingerprint);

      // Save to Supabase (or fallback in-memory)
      await saveValidationRun(userId, result);
    } catch (err) {
      console.error('[TypeNull] Pre-validation execution error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const getOutcomeBadgeStyle = (outcome: ScreeningOutcome) => {
    switch (outcome) {
      case 'Complete':
        return {
          bg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          icon: CheckCircle2,
          iconColor: 'text-emerald-600',
          label: 'Pre-Validation Advisory: Ready for Official Filing',
          desc: 'All applicable automated statutory and documentary pre-checks passed. No blocking submission defects detected. Note: Official statutory acceptance is determined exclusively by the competent government authority.',
        };
      case 'Minor Issues':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          label: 'Minor Issues Detected: Correctable Before Official Submission',
          desc: 'Automated checks detected non-blocking warnings or formatting differences. You can correct these in your dossier to avoid processing delays during official agency review.',
        };
      case 'Major Issues':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-800',
          icon: AlertOctagon,
          iconColor: 'text-rose-600',
          label: 'Submission Blockers Detected: Mandatory Requirements Unfulfilled',
          desc: 'One or more required documents or statutory identifiers are missing, invalid, or inconsistent across submitted proofs. Resolve these blockers prior to submitting through the official government portal.',
        };
      case 'Unable to Assess':
      default:
        return {
          bg: 'bg-purple-50 border-purple-200 text-purple-800',
          icon: HelpCircle,
          iconColor: 'text-purple-600',
          label: 'Pre-Validation Pending: Essential Evidence Incomplete',
          desc: 'Statutory documentary checks cannot be completed because required evidence or readable OCR scans are unavailable. Upload legible documents to enable automated assessment.',
        };
    }
  };

  // Grouped findings by SIH demonstration categories
  const groupedCategories: GroupedCategoryFindings[] = useMemo(() => {
    if (!currentRun) return [];
    return groupFindingsByCategory(currentRun.findings, filter);
  }, [currentRun, filter]);

  // Flat list filtered findings
  const flatFindings: ValidationFinding[] = useMemo(() => {
    if (!currentRun) return [];
    return currentRun.findings.filter((f) => {
      if (filter === 'issues') return f.status === 'failed' || f.status === 'unable_to_check';
      if (filter === 'passed') return f.status === 'passed';
      if (filter === 'warnings') return f.status === 'warning';
      return true;
    });
  }, [currentRun, filter]);

  const toggleCategoryCollapse = (categoryKey: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryKey]: !prev[categoryKey],
    }));
  };

  const getCategoryIcon = (key: FindingCategoryKey) => {
    switch (key) {
      case 'missing_documents':
        return FileText;
      case 'missing_fields':
        return Layers;
      case 'cross_document':
        return Scale;
      case 'date_format_issues':
        return Calendar;
      case 'extraction_review':
        return ScanLine;
      case 'unassessed_requirements':
      default:
        return FileQuestion;
    }
  };

  const outcomeMeta = currentRun ? getOutcomeBadgeStyle(currentRun.outcome) : null;
  const OutcomeIcon = outcomeMeta?.icon || HelpCircle;

  return (
    <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-700" />
              Applicant Pre-Validation Engine
            </h3>
            <span className="text-[11px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-semibold">
              Shared Engine v2024.1
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Verify mandatory documents, field formats, and cross-document coherence before formal institutional submission.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleRunValidation}
          isLoading={isRunning}
          leftIcon={currentRun ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        >
          {currentRun ? 'Re-Run Pre-Validation' : 'Run Pre-Validation'}
        </Button>
      </div>

      {/* Official Government Tailored Requirements Card */}
      {tailoredChecklist && (
        <div className="p-5 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/50 via-white to-slate-50 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-indigo-600 text-white">
                <Globe className="w-3.5 h-3.5" />
              </span>
              <h4 className="text-xs font-bold text-slate-900">
                Official Statutory Requirements: {tailoredChecklist.serviceName}
              </h4>
            </div>
            <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded border border-indigo-200">
              {tailoredChecklist.totalRequiredCount} Tailored Rules Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Mandatory Base Requirements */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider block">
                Mandatory Base Proofs ({tailoredChecklist.mandatoryDocuments.length})
              </span>
              <div className="space-y-1.5">
                {tailoredChecklist.mandatoryDocuments.map((doc, idx) => {
                  const key = (doc.canonicalDocumentKey || doc.documentType || doc.documentName).toLowerCase();
                  const isUploaded = documents.some(
                    (d) =>
                      d.document_type.toLowerCase() === key ||
                      d.original_filename.toLowerCase().includes(key)
                  );
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        {isUploaded ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        )}
                        <span className="font-medium text-slate-800">{doc.documentName}</span>
                      </div>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          isUploaded ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isUploaded ? 'Uploaded' : 'Missing'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Conditional Requirements Triggered by Applicant's Answers */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider block">
                Conditional Requirements ({tailoredChecklist.conditionalDocuments.length})
              </span>
              {tailoredChecklist.conditionalDocuments.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic p-3">
                  No additional conditional documents triggered by your answers.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {tailoredChecklist.conditionalDocuments.map((cDoc, idx) => {
                    const key = (cDoc.requirement.canonicalDocumentKey || cDoc.requirement.documentType || cDoc.requirement.documentName).toLowerCase();
                    const isUploaded = documents.some(
                      (d) =>
                        d.document_type.toLowerCase() === key ||
                        d.original_filename.toLowerCase().includes(key)
                    );
                    return (
                      <div
                        key={idx}
                        className="p-2 rounded-lg bg-amber-50/60 border border-amber-200 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">
                            {cDoc.requirement.documentName}
                          </span>
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                              isUploaded ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isUploaded ? 'Uploaded' : 'Required'}
                          </span>
                        </div>
                        <p className="text-[10px] text-amber-900">
                          Activated because: {cDoc.triggeredByQuestion} = <strong>{String(cDoc.userAnswer)}</strong>
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Alternative Document Groups */}
            {tailoredChecklist.alternativeDocumentGroups.length > 0 && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 md:col-span-2">
                <span className="font-bold text-slate-900 text-[11px] uppercase tracking-wider block">
                  Alternative Document Groups (1 of Any Accepted)
                </span>
                <div className="space-y-1.5">
                  {tailoredChecklist.alternativeDocumentGroups.map((group, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold text-slate-900">{group.groupName}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Accepts: {group.options[0]?.acceptedAlternatives?.join(' OR ') || 'Proof document'}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          group.isSatisfied ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {group.isSatisfied ? 'Satisfied' : 'Pending Upload'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stale Validation Result Warning Banner */}
      {isResultStale && currentRun && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-200/70 text-amber-800 flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div className="space-y-0.5">
              <h5 className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                Dossier Modified Since Last Validation Check
                <span className="text-[10px] bg-amber-200/80 text-amber-900 font-mono px-1.5 py-0.2 rounded font-semibold">
                  Results Outdated
                </span>
              </h5>
              <p className="text-xs text-amber-800 leading-relaxed">
                Documents or extracted field values in this dossier were modified after the previous validation check. Click re-run to refresh findings.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={handleRunValidation}
            isLoading={isRunning}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Refresh Findings
          </Button>
        </div>
      )}

      {/* When no validation has been run yet */}
      {!currentRun && !isRunning && (
        <div className="p-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-sm font-bold text-slate-900">Run Automated Statutory Pre-Check</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Click &quot;Run Pre-Validation&quot; to scan your uploaded documents and extracted fields against official requirements for{' '}
              <strong className="text-slate-700 font-semibold">{application.category.replace(/_/g, ' ')}</strong>.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={handleRunValidation} leftIcon={<Play className="w-4 h-4" />}>
              Run Pre-Validation Now
            </Button>
          </div>
        </div>
      )}

      {/* Outcome Banner */}
      {currentRun && outcomeMeta && (
        <div className={`p-5 rounded-xl border ${outcomeMeta.bg} space-y-3 transition-all`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white/80 shadow-xs flex-shrink-0 mt-0.5">
                <OutcomeIcon className={`w-5 h-5 ${outcomeMeta.iconColor}`} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider font-mono">
                    Screening Outcome:
                  </span>
                  <span className="text-sm font-extrabold">{currentRun.outcome}</span>
                </div>
                <h4 className="text-sm font-bold">{outcomeMeta.label}</h4>
                <p className="text-xs leading-relaxed opacity-90">{outcomeMeta.desc}</p>
              </div>
            </div>

            <div className="text-right text-[11px] font-mono opacity-75 hidden sm:block">
              <span>Validated: </span>
              <span>{new Date(currentRun.validatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          {/* KPI Metric Counter Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
            <div className="p-2.5 rounded-lg bg-white/90 border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-600 font-medium text-[11px]">Passed Checks</span>
              <span className="font-mono font-bold text-emerald-700 text-sm">
                {currentRun.counts.passed}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/90 border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-600 font-medium text-[11px]">Minor Issues</span>
              <span className="font-mono font-bold text-amber-700 text-sm">
                {currentRun.counts.minorIssues}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/90 border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-600 font-medium text-[11px]">Major Blockers</span>
              <span className="font-mono font-bold text-rose-700 text-sm">
                {currentRun.counts.majorIssues}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/90 border border-slate-200/60 flex items-center justify-between">
              <span className="text-slate-600 font-medium text-[11px]">Unable to Assess</span>
              <span className="font-mono font-bold text-purple-700 text-sm">
                {currentRun.counts.unableToAssess}
              </span>
            </div>
          </div>

          {/* Advisory Disclaimer */}
          <div className="p-3 bg-white/70 rounded-lg border border-slate-200/50 text-[11px] leading-relaxed text-slate-600 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Advisory Pre-Validation Disclaimer:</strong> TypeNull pre-checks your dossier against published statutory rules to help you identify omissions, format errors, and inconsistencies before submission. Final statutory determinations remain strictly within the sovereign authority of the competent government department.
            </span>
          </div>
        </div>
      )}

      {/* Findings Breakdown & Controls */}
      {currentRun && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Demonstration Findings ({currentRun.findings.length})
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Categorized to distinguish statutory defects from OCR scan quality notes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 text-xs bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({currentRun.findings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('issues')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filter === 'issues'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Issues ({currentRun.counts.majorIssues + currentRun.counts.minorIssues})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('passed')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filter === 'passed'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Passed ({currentRun.counts.passed})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter('warnings')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filter === 'warnings'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Warnings ({currentRun.counts.warnings})
                </button>
              </div>

              {/* View Mode Toggle: Grouped vs Flat */}
              <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-lg text-xs">
                <button
                  type="button"
                  title="Grouped by Category"
                  onClick={() => setViewMode('grouped')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'grouped'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Flat List View"
                  onClick={() => setViewMode('flat')}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === 'flat'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Grouped Category View (Primary SIH Demonstration View) */}
          {viewMode === 'grouped' ? (
            <div className="space-y-4">
              {groupedCategories.map((group) => {
                const CategoryIcon = getCategoryIcon(group.category.key);
                const isCollapsed = collapsedCategories[group.category.key];

                return (
                  <div
                    key={group.category.key}
                    className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all"
                  >
                    {/* Category Header */}
                    <button
                      type="button"
                      onClick={() => toggleCategoryCollapse(group.category.key)}
                      className="w-full p-3.5 bg-slate-50/80 hover:bg-slate-100/80 transition-colors flex items-center justify-between gap-3 text-left border-b border-slate-200/60"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-teal-100/70 text-teal-800 flex-shrink-0">
                          <CategoryIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {group.category.label}
                            </span>
                            <span
                              className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                group.category.distinction === 'statutory_defect'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : group.category.distinction === 'ocr_quality'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-slate-200 text-slate-700 border border-slate-300'
                              }`}
                            >
                              {group.category.distinctionLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {group.category.shortDescription}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {group.blockingCount > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white">
                            {group.blockingCount} Blocker{group.blockingCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {group.issuesCount > 0 && group.blockingCount === 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">
                            {group.issuesCount} Issue{group.issuesCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {group.issuesCount === 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {group.passedCount} Passed
                          </span>
                        )}
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Category Findings Cards */}
                    {!isCollapsed && (
                      <div className="p-3.5 space-y-3 bg-slate-50/30">
                        {group.findings.map((finding) => (
                          <FindingCardItem key={finding.id} finding={finding} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {groupedCategories.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  No findings match the selected filter tab ({filter}).
                </div>
              )}
            </div>
          ) : (
            /* Flat List View */
            <div className="space-y-3">
              {flatFindings.map((finding) => (
                <FindingCardItem key={finding.id} finding={finding} />
              ))}

              {flatFindings.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  No findings match the selected filter tab ({filter}).
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Validation Run History Accordion */}
      {runHistory.length > 1 && (
        <div className="pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors py-1"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Previous Pre-Validation Runs ({runHistory.length})
            </span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2">
              {runHistory.map((run, idx) => (
                <div
                  key={run.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400">#{runHistory.length - idx}</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(run.validatedAt).toLocaleDateString()} at{' '}
                      {new Date(run.validatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                        run.outcome === 'Complete'
                          ? 'bg-emerald-100 text-emerald-800'
                          : run.outcome === 'Minor Issues'
                          ? 'bg-amber-100 text-amber-800'
                          : run.outcome === 'Major Issues'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {run.outcome}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-500 font-mono">
                    {run.counts.passed} Passed &bull; {run.counts.majorIssues + run.counts.minorIssues} Issues
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Finding Card Item with comprehensive details, provenance, and distinction tags
 */
const FindingCardItem: React.FC<{ finding: ValidationFinding }> = ({ finding }) => {
  const isPassed = finding.status === 'passed';
  const isWarning = finding.status === 'warning';
  const isUnable = finding.status === 'unable_to_check';
  const isBlocking = finding.isBlocking;

  return (
    <div
      className={`p-4 rounded-xl border transition-all text-xs space-y-2.5 ${
        isPassed
          ? 'border-slate-200 bg-white hover:border-slate-300'
          : isWarning
          ? 'border-amber-200 bg-amber-50/40'
          : isUnable
          ? 'border-purple-200 bg-purple-50/40'
          : 'border-rose-200 bg-rose-50/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5">
            {isPassed && <CheckCircle className="w-4 h-4 text-emerald-600" />}
            {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600" />}
            {isUnable && <HelpCircle className="w-4 h-4 text-purple-600" />}
            {!isPassed && !isWarning && !isUnable && (
              <AlertOctagon className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                {finding.title}
              </span>
              <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                {finding.ruleId} v{finding.ruleVersion}
              </span>
              {isBlocking && (
                <span className="text-[10px] font-semibold bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                  Blocking Submission Blocker
                </span>
              )}
              {finding.requiresManualReview && (
                <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                  Requires Human Review
                </span>
              )}
            </div>
            <p className="text-slate-600 leading-relaxed text-xs">
              {finding.explanation}
            </p>
          </div>
        </div>

        <span
          className={`text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
            isPassed
              ? 'bg-emerald-100 text-emerald-800'
              : isWarning
              ? 'bg-amber-100 text-amber-800'
              : isUnable
              ? 'bg-purple-100 text-purple-800'
              : 'bg-rose-100 text-rose-800'
          }`}
        >
          {finding.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Observed vs Expected Context Grid */}
      {(finding.observedValue || finding.expectedValue || finding.sourceDocument) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 bg-white rounded-lg border border-slate-200 text-[11px]">
          {finding.observedValue && (
            <div>
              <span className="text-slate-400 block font-medium uppercase text-[9px]">
                Observed Value
              </span>
              <span className="font-mono font-semibold text-slate-800 break-all">
                {finding.observedValue}
              </span>
            </div>
          )}
          {finding.expectedValue && (
            <div>
              <span className="text-slate-400 block font-medium uppercase text-[9px]">
                Expected Regulatory Syntax
              </span>
              <span className="font-mono text-slate-700 break-all">
                {finding.expectedValue}
              </span>
            </div>
          )}
          {finding.sourceDocument && (
            <div>
              <span className="text-slate-400 block font-medium uppercase text-[9px]">
                Source Document
              </span>
              <span className="font-medium text-teal-800 truncate block">
                {finding.sourceDocument} {finding.sourcePage ? `(p.${finding.sourcePage})` : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Evidence Snippet from OCR */}
      {finding.evidenceSnippet && (
        <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px] font-mono text-slate-600">
          <span className="text-slate-400 uppercase text-[9px] block font-sans font-semibold mb-0.5">
            OCR Evidence Provenance Snippet:
          </span>
          &ldquo;{finding.evidenceSnippet}&rdquo;
        </div>
      )}

      {/* Recommended Corrective Action */}
      {finding.recommendedAction && (
        <div className="flex items-start gap-1.5 p-2.5 bg-teal-50/70 rounded-md border border-teal-200 text-[11px] text-teal-950">
          <span className="font-bold text-teal-900 flex-shrink-0">Corrective Action:</span>
          <span>{finding.recommendedAction}</span>
        </div>
      )}

      {/* Statutory Reference Citation */}
      {finding.referenceCitation && (
        <div className="text-[10px] text-slate-400 flex items-center gap-1">
          <span>Statutory Authority &amp; Citation:</span>
          <span className="font-mono text-slate-600">{finding.referenceCitation}</span>
        </div>
      )}
    </div>
  );
};
