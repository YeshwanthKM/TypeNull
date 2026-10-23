import React from 'react';
import { X, Info, CheckCircle2 } from 'lucide-react';

interface PhaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExploreFeatures: () => void;
}

export const PhaseModal: React.FC<PhaseModalProps> = ({
  isOpen,
  onClose,
  onExploreFeatures,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="phase-modal-title"
    >
      <div className="relative bg-white rounded-xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-600 rounded-md p-1"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h3 id="phase-modal-title" className="text-lg font-bold text-slate-900">
              Phase 0 Foundation Active
            </h3>
            <p className="text-xs text-teal-700 font-semibold tracking-wide uppercase">
              Initialisation Milestone
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          The TypeNull application core has been successfully initialised. In accordance with project governance, authentication, document upload pipelines, OCR engines, and verification services are scheduled for incremental development in subsequent phases.
        </p>

        <div className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
          <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
            Current Phase Deliverables
          </h4>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>Vite + React + TypeScript + Tailwind CSS responsive architecture</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>Supabase integration readiness with safe credential placeholders</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>Vercel deployment configuration & SPA routing fallback</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onExploreFeatures();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-300 text-sm font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
          >
            Explore Planned Capabilities
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 text-sm font-semibold rounded-lg text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
