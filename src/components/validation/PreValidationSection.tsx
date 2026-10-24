import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  ApplicationDocument,
  DbApplication,
  DocumentExtractionRecord,
  ExtractedFieldRecord,
  ScreeningOutcome,
  ValidationRun,
} from '../../types';
import { runValidationEngine } from '../../services/validation/engine';
import { fetchValidationRuns, saveValidationRun } from '../../services/validationService';

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
  const [showHistory, setShowHistory] = useState(false);

  // Load prior validation history on mount
  useEffect(() => {
    let mounted = true;
    fetchValidationRuns(application.id).then(({ data }) => {
      if (!mounted) return;
      if (data && data.length > 0) {
        setRunHistory(data);
        setCurrentRun(data[0]);
      }
    });
    return () => {
      mounted = false;
    };
  }, [application.id]);

  const handleRunValidation = async () => {
    setIsRunning(true);
    try {
      // Simulate slight processing delay for responsive tactile feel
      await new Promise((r) => setTimeout(r, 600));

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
      });

      setCurrentRun(result);
      setRunHistory((prev) => [result, ...prev]);

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
          label: 'Pre-Validation Complete: Ready for Official Filing',
          desc: 'All applicable automated statutory and documentary checks passed. No blocking compliance defects detected.',
        };
      case 'Minor Issues':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-800',
          icon: AlertTriangle,
          iconColor: 'text-amber-600',
          label: 'Minor Issues Detected: Correctable Before Submission',
          desc: 'Automated checks detected non-blocking warnings or formatting differences that you can easily correct.',
        };
      case 'Major Issues':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-800',
          icon: AlertOctagon,
          iconColor: 'text-rose-600',
          label: 'Major Issues: Mandatory Requirements Unfulfilled',
          desc: 'One or more required documents or statutory identifiers are missing, invalid, or inconsistent.',
        };
      case 'Unable to Assess':
      default:
        return {
          bg: 'bg-purple-50 border-purple-200 text-purple-800',
          icon: HelpCircle,
          iconColor: 'text-purple-600',
          label: 'Unable to Assess: Essential Evidence Incomplete',
          desc: 'Important documentary checks could not be completed because required evidence or readable OCR scans are unavailable.',
        };
    }
  };

  const filteredFindings = (currentRun?.findings || []).filter((f) => {
    if (filter === 'issues') return f.status === 'failed' || f.status === 'unable_to_check';
    if (filter === 'passed') return f.status === 'passed';
    if (filter === 'warnings') return f.status === 'warning';
    return true;
  });

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
              <span className="text-slate-600 font-medium text-[11px]">Major Issues</span>
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
              <strong>Advisory Pre-Validation:</strong> TypeNull pre-checks your dossier against official statutory form requirements to help you detect omissions and format errors. Final legal determinations are issued exclusively by the competent authority following official submission.
            </span>
          </div>
        </div>
      )}

      {/* Findings Breakdown & Filter Tabs */}
      {currentRun && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Detailed Rule Findings ({currentRun.findings.length})
            </h4>

            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All ({currentRun.findings.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('issues')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filter === 'issues'
                    ? 'bg-rose-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Issues to Fix ({currentRun.counts.majorIssues + currentRun.counts.minorIssues})
              </button>
              <button
                type="button"
                onClick={() => setFilter('passed')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filter === 'passed'
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Passed ({currentRun.counts.passed})
              </button>
              <button
                type="button"
                onClick={() => setFilter('warnings')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  filter === 'warnings'
                    ? 'bg-amber-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Warnings ({currentRun.counts.warnings})
              </button>
            </div>
          </div>

          {/* Finding Cards */}
          <div className="space-y-3">
            {filteredFindings.map((finding) => {
              const isPassed = finding.status === 'passed';
              const isWarning = finding.status === 'warning';
              const isUnable = finding.status === 'unable_to_check';
              const isBlocking = finding.isBlocking;

              return (
                <div
                  key={finding.id}
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
                              Blocking Issue
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
                    <div className="flex items-start gap-1.5 p-2 bg-teal-50/70 rounded-md border border-teal-200 text-[11px] text-teal-900">
                      <span className="font-bold flex-shrink-0">Corrective Action:</span>
                      <span>{finding.recommendedAction}</span>
                    </div>
                  )}

                  {/* Statutory Reference Citation */}
                  {finding.referenceCitation && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>Statutory Citation:</span>
                      <span className="font-mono text-slate-600">{finding.referenceCitation}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredFindings.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                No findings match the selected filter tab.
              </div>
            )}
          </div>
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
