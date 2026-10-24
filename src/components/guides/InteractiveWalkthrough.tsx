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
    headline: 'Validate Applications. Identify Document Gaps. Prepare with Confidence.',
    description:
      'TypeNull is a professional regulatory technology platform that helps applicants and institutional screening officers pre-validate application dossiers against official statutory requirements before formal submission.',
    icon: ShieldCheck,
    primaryActionLabel: 'Next: Explore Catalogue',
    highlights: [
      'Evidence-based pre-validation against official regulatory rules',
      'Client-side privacy: fast text extraction with no external data leakage',
      'Clear, explainable findings with statutory legal citations',
    ],
  },
  {
    title: 'Government Catalogue',
    category: 'Step 1: Service Discovery',
    headline: 'Authoritative Application Types with Publication Gating',
    description:
      'Browse published government service profiles (SPICe+ Company Incorporation, GST REG-01, Passport Form 1). Unverified candidate forms are clearly flagged as "Under Review" to prevent misleading determinations.',
    icon: Compass,
    primaryActionLabel: 'Next: Application Questionnaire',
    primaryActionRoute: '/applications/explore',
    highlights: [
      'Official statutory checklists from MCA, CBIC, and MEA',
      'Transparent lifecycle statuses: Published, Under Review, Discovered',
      'Direct link to official ministry guidance portals',
    ],
  },
  {
    title: 'Dynamic Questionnaires',
    category: 'Step 2: Situational Checklists',
    headline: 'Personalised Document Requirements based on Situational Rules',
    description:
      'Answer straightforward conditional questions (e.g., owned vs. rented office premise, corporate promoter presence). TypeNull dynamically adapts the required document checklist in real time.',
    icon: FileCheck2,
    primaryActionLabel: 'Next: Document Intelligence',
    primaryActionRoute: '/applications/new',
    highlights: [
      'Rented premise activates Lease Deed & Owner NOC requirements',
      'Corporate shareholders activate Board Resolution requirements',
      'Zero unnecessary paperwork for simple applicants',
    ],
  },
  {
    title: 'Document Intelligence',
    category: 'Step 3: Client-Side OCR',
    headline: 'Automated OCR & Cross-Document Consistency Checking',
    description:
      'Upload digital proofs (PDF, JPEG, PNG). In-browser parsers extract key regulatory fields (CIN, PAN, GSTIN, Entity Names, Dates) and cross-reference them for mismatches or expired credentials.',
    icon: Layers,
    primaryActionLabel: 'Next: Audit Results',
    highlights: [
      'Instant vector text parsing for high-fidelity digital PDFs',
      'WebAssembly Tesseract.js fallback for scanned bitmap documents',
      'Cross-checks GSTIN embedded PAN against standalone PAN credentials',
    ],
  },
  {
    title: 'Audit Findings & Outcomes',
    category: 'Step 4: Statutory Findings',
    headline: 'Mutually Exclusive Determinations & Institutional Reporting',
    description:
      'Results are classified into four mutually consistent outcomes: Complete, Minor Issues, Major Issues, and Unable to Assess. Institutional officers can screen multi-application batches and export CSV audit reports.',
    icon: FileSpreadsheet,
    primaryActionLabel: 'Explore Guides & Documentation',
    primaryActionRoute: '/guides',
    highlights: [
      'Unreadable scans evaluate to Unable to Assess (no false violations manufactured)',
      'Individual dossier failures never crash the surrounding batch',
      'One-click CSV export for audit-ready documentation',
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
