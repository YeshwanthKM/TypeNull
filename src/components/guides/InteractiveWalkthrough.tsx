import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Compass,
  FileCheck2,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
} from 'lucide-react';

export interface WalkthroughStep {
  title: string;
  category: string;
  headline: string;
  description: string;
  icon: React.ElementType;
  primaryActionLabel: string;
  primaryActionRoute?: string;
  highlights: string[];
}

export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    title: 'Platform Overview',
    category: 'Welcome to TypeNull',
    headline: 'AICTE Application Validation & Document Verification',
    description:
      'TypeNull is an institutional regulatory technology platform that helps technical institutions and regulatory officers validate Extension of Approval (EoA) dossiers against statutory norms before formal review.',
    icon: ShieldCheck,
    primaryActionLabel: 'Next: Institution Portal',
    highlights: [
      'Evidence-based pre-validation against AICTE Approval Process Handbook norms',
      'Client-side privacy: fast text extraction with no external data leakage',
      'Clear, explainable findings with document evidence citations',
    ],
  },
  {
    title: 'Institution Portal',
    category: 'Step 1: EoA Application',
    headline: 'Structured Dossier Creation for Extension of Approval',
    description:
      'Technical institutions enter institutional details, approved programmes, and intake capacity, then upload mandatory supporting documents including land deeds, trust registration, and building certificates.',
    icon: Compass,
    primaryActionLabel: 'Next: Pre-Submission Validation',
    primaryActionRoute: '/applications/new',
    highlights: [
      'Step-by-step institutional identity and programme intake capture',
      'Support for mandatory statutory attachments and digital certificates',
      'Draft save and resume support to prepare documents at your own pace',
    ],
  },
  {
    title: 'Pre-Submission Validation',
    category: 'Step 2: Automated Pre-Check',
    headline: 'Instant Detection of Incomplete Fields & Missing Documents',
    description:
      'Automated pre-submission checks inspect uploaded files for completeness, readable text streams, and mandatory document requirements, minimizing rejection cycles before formal submission.',
    icon: FileCheck2,
    primaryActionLabel: 'Next: Document Forensics',
    primaryActionRoute: '/applications/new',
    highlights: [
      'Identifies missing mandatory attachments before dossier lock',
      'Flags unreadable scans and expired statutory approvals early',
      'Provides deficiency guidance so institutions can correct errors',
    ],
  },
  {
    title: 'Document Forensics & Cross-Checks',
    category: 'Step 3: Multi-Signal Inspection',
    headline: 'Structural Forensics & Cross-Document Reconciliation',
    description:
      'Inspects PDF stream structures, image compression characteristics, and PKCS#7 digital signatures while cross-correlating entity names and land areas across disparate proofs.',
    icon: Layers,
    primaryActionLabel: 'Next: Officer Review',
    highlights: [
      'High-fidelity digital PDF extraction and OCR pipeline',
      'Cross-checks institution details across trust deed, land title, and application form',
      'Validates ByteRange hash and digital signature integrity where supported',
    ],
  },
  {
    title: 'AICTE Officer Review',
    category: 'Step 4: Human-in-the-Loop Adjudication',
    headline: 'Transparent Decision Support for Authorized Officers',
    description:
      'Authorized regulatory officers inspect flagged anomalies with exact source citations, review cross-document consistency matrices, and record official inspection decisions.',
    icon: FileSpreadsheet,
    primaryActionLabel: 'Explore Handbook & Documentation',
    primaryActionRoute: '/guides',
    highlights: [
      'Evidence dossier connects every finding to exact document coordinates',
      'Distinguishes unreadable scans from potential document anomalies',
      'Final regulatory decisions remain under authorized human control',
    ],
  },
];

interface InteractiveWalkthroughProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InteractiveWalkthrough: React.FC<InteractiveWalkthroughProps> = ({
  isOpen,
  onClose,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const navigate = useNavigate();

  const handleFinish = useCallback(() => {
    try {
      localStorage.setItem('typenull_walkthrough_completed', 'true');
    } catch {
      // Ignore local storage error in sandboxed iframe
    }
    onClose();
  }, [onClose]);

  const handleNext = () => {
    if (currentStepIdx < WALKTHROUGH_STEPS.length - 1) {
      setCurrentStepIdx((prev) => prev + 1);
    } else {
      handleFinish();
      navigate('/guides');
    }
  };

  const handleBack = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx((prev) => prev - 1);
    }
  };

  // Reset to Step 1 whenever the walkthrough modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIdx(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        if (currentStepIdx < WALKTHROUGH_STEPS.length - 1) {
          setCurrentStepIdx((prev) => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStepIdx > 0) {
          setCurrentStepIdx((prev) => prev - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIdx, onClose]);

  if (!isOpen) return null;

  const step = WALKTHROUGH_STEPS[currentStepIdx];
  const StepIcon = step.icon;
  const isFirst = currentStepIdx === 0;
  const isLast = currentStepIdx === WALKTHROUGH_STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkthrough-title"
    >
      <div className="relative bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-600" />
            <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">
              Product Walkthrough &bull; Step {currentStepIdx + 1} of {WALKTHROUGH_STEPS.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
            aria-label="Close walkthrough"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center flex-shrink-0 shadow-xs">
              <StepIcon className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                {step.category}
              </span>
              <h3 id="walkthrough-title" className="text-xl font-bold text-slate-900 leading-snug">
                {step.headline}
              </h3>
            </div>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>

          {/* Highlights checklist */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Key Capabilities in this Step:
            </span>
            <ul className="space-y-2">
              {step.highlights.map((highlight, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 leading-normal">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5 pt-2">
            {WALKTHROUGH_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIdx(idx)}
                className={`h-1.5 rounded-full transition-all focus:outline-none ${
                  idx === currentStepIdx
                    ? 'w-8 bg-teal-600'
                    : idx < currentStepIdx
                    ? 'w-4 bg-teal-200'
                    : 'w-2 bg-slate-200'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          {!isLast ? (
            <button
              type="button"
              onClick={handleFinish}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded transition-colors"
            >
              Skip Tour
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2.5">
            {!isFirst && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
            >
              <span>{step.primaryActionLabel}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
