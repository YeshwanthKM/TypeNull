import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Send,
  ShieldCheck,
  Info,
  Scale,
  FileCheck,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ApplicationWorkflowStage } from '../../services/validation/eoaValidationEngine';

interface EoaWorkflowProgressBarProps {
  currentStage: ApplicationWorkflowStage;
  blockingIssuesCount: number;
  warningsCount: number;
  passedChecksCount: number;
  isSubmissionReady: boolean;
  onSubmitForReview: () => Promise<void>;
  isSubmitting?: boolean;
}

const STAGES: Array<{
  id: ApplicationWorkflowStage;
  stepNumber: number;
  label: string;
  shortDesc: string;
}> = [
  {
    id: 'document_uploaded',
    stepNumber: 1,
    label: 'Document Uploaded',
    shortDesc: 'Files vaulted in private storage',
  },
  {
    id: 'extraction_completed',
    stepNumber: 2,
    label: 'Extraction Completed',
    shortDesc: 'Text parsing & candidate fields identified',
  },
  {
    id: 'automated_validation_completed',
    stepNumber: 3,
    label: 'Validation Completed',
    shortDesc: 'Evaluated against APH 2024–27 rules',
  },
  {
    id: 'institution_corrections_pending',
    stepNumber: 4,
    label: 'Corrections Pending',
    shortDesc: 'Addressing warnings & blocking criteria',
  },
  {
    id: 'ready_for_internal_submission',
    stepNumber: 5,
    label: 'Ready for Submission',
    shortDesc: 'Statutory requirements satisfied',
  },
  {
    id: 'submitted_for_officer_review',
    stepNumber: 6,
    label: 'Officer Review In Progress',
    shortDesc: 'Under evaluation by AICTE Officer',
  },
  {
    id: 'officer_review_completed',
    stepNumber: 7,
    label: 'Review Decision Recorded',
    shortDesc: 'Verified, Info Requested, or Decided',
  },
];

export const EoaWorkflowProgressBar: React.FC<EoaWorkflowProgressBarProps> = ({
  currentStage,
  blockingIssuesCount,
  warningsCount,
  passedChecksCount,
  isSubmissionReady,
  onSubmitForReview,
  isSubmitting = false,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const getStageIndex = (stage: ApplicationWorkflowStage) => {
    return STAGES.findIndex((s) => s.id === stage);
  };

  const currentIndex = getStageIndex(currentStage);

  return (
    <div className="space-y-4 p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-teal-700" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              AICTE EoA Application Lifecycle &amp; Pre-Validation Stages
            </h3>
            <p className="text-xs text-slate-500">
              Progressive verification stages from initial intake to TypeNull internal officer review
            </p>
          </div>
        </div>

        <span className="self-start sm:self-auto text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          Stage {currentIndex + 1} of 7
        </span>
      </div>

      {/* Progress Steps Indicator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
        {STAGES.map((stage, idx) => {
          const isCurrent = stage.id === currentStage;
          const isCompleted = idx < currentIndex;

          let badgeColor = 'bg-slate-100 text-slate-500 border-slate-200';
          if (isCompleted) {
            badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
          } else if (isCurrent) {
            badgeColor =
              stage.id === 'institution_corrections_pending'
                ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-200'
                : 'bg-teal-50 text-teal-900 border-teal-300 ring-2 ring-teal-200';
          }

          return (
            <div
              key={stage.id}
              className={`p-2.5 rounded-lg border text-left transition-all ${badgeColor}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold">
                  0{stage.stepNumber}
                </span>
                {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                {isCurrent && <Clock className="w-3.5 h-3.5 text-teal-700 animate-pulse" />}
              </div>
              <p className="text-xs font-bold leading-tight line-clamp-1">{stage.label}</p>
              <p className="text-[10px] opacity-75 mt-0.5 line-clamp-1">{stage.shortDesc}</p>
            </div>
          );
        })}
      </div>

      {/* Submission Boundary Notice & Action */}
      <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-2.5 max-w-2xl text-xs text-slate-600">
          <Info className="w-4 h-4 text-teal-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-slate-900 block">
              Submission Boundary &amp; AICTE Regulatory Scope:
            </span>
            <p className="leading-relaxed text-[11px] text-slate-600">
              Submitting this application sends the completed dossier to <strong>TypeNull&apos;s internal scrutiny workflow</strong> for evaluation by an authorized AICTE Officer. It does <em>not</em> submit directly to the official external AICTE portal. Non-blocking warnings will not prevent submission, but all mandatory documents must be present without blocking defects.
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 w-full md:w-auto">
          {currentStage === 'submitted_for_officer_review' || currentStage === 'officer_review_completed' ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 text-xs font-semibold">
              <FileCheck className="w-4 h-4 text-teal-700" />
              <span>Dossier Submitted to Officer Review</span>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              disabled={!isSubmissionReady || blockingIssuesCount > 0 || isSubmitting}
              onClick={() => setShowConfirmModal(true)}
              leftIcon={<Send className="w-3.5 h-3.5" />}
              className="w-full md:w-auto"
            >
              {blockingIssuesCount > 0
                ? `Resolve ${blockingIssuesCount} Blocker${blockingIssuesCount > 1 ? 's' : ''}`
                : 'Submit for Officer Review'}
            </Button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-800">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Submit Dossier for Officer Review?
                </h4>
                <p className="text-xs text-slate-500">
                  TypeNull Internal AICTE Scrutiny Workflow
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-2 border border-slate-200">
              <div className="flex justify-between items-center text-slate-700">
                <span>Passed Regulatory Checks:</span>
                <span className="font-bold text-emerald-700">{passedChecksCount}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Non-Blocking Warnings:</span>
                <span className="font-bold text-amber-700">{warningsCount}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Blocking Defects:</span>
                <span className="font-bold text-slate-900">0</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Once submitted, your application status will transition to <strong>Under Review</strong> and will appear in the authorized AICTE Officer workspace for institutional scrutiny.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Send className="w-3.5 h-3.5" />}
                disabled={isSubmitting}
                onClick={async () => {
                  await onSubmitForReview();
                  setShowConfirmModal(false);
                }}
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
