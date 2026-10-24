import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, ChevronDown, ShieldCheck, Layers, FileCheck } from 'lucide-react';

interface HeroProps {
  onGetStartedClick: () => void;
  onExploreFeaturesClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onGetStartedClick,
  onExploreFeaturesClick,
}) => {
  return (
    <section id="overview" className="relative py-16 sm:py-24 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          {/* Professional Platform Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-teal-600"></span>
            Regulatory Compliance Intelligence &bull; Pre-Validation Platform
          </div>

          {/* Project Identity & Value Proposition */}
          <h1 className="text-3xl sm:text-5xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            <span className="block text-teal-700">TypeNull</span>
            <span className="block mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-snug">
              Validate Applications. Identify Document Gaps. Prepare with Confidence.
            </span>
          </h1>

          {/* Short Description */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
            TypeNull provides automated pre-validation, optical document extraction, cross-record consistency checking, and auditable compliance verification for citizens and institutions prior to official departmental filing.
          </p>

          {/* Primary & Secondary Actions - Horizontal Responsive Button Group */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onGetStartedClick}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-transparent text-base font-semibold rounded-lg text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 shadow-sm transition-all"
            >
              Start Pre-Validation
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link
              to="/guides"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-slate-300 text-base font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 shadow-sm transition-colors"
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              Explore User Guides
            </Link>

            <button
              type="button"
              onClick={onExploreFeaturesClick}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 text-base font-medium text-slate-600 hover:text-teal-700 transition-colors"
            >
              How It Works
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Key Value Anchors - Honest, Technical & Evidence-Focused */}
          <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-teal-700 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Document Completeness</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Conditional checklist verification, mandatory attachment matching, and missing field alerts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Layers className="w-5 h-5 text-teal-700 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Cross-Record Consistency</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  In-browser OCR and multi-source alignment across PAN, Aadhaar, certificates, and application data.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileCheck className="w-5 h-5 text-teal-700 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Auditable Findings</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Severity-classified issues with precise remediation recommendations and exportable summaries.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
