import React from 'react';
import { ArrowRight, ChevronDown, Shield, FileCheck, Layers } from 'lucide-react';

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
          {/* SIH Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
            Smart India Hackathon 2026 Initiative &bull; Phase 0 Foundation
          </div>

          {/* Project Identity */}
          <h1 className="text-3xl sm:text-5xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            <span className="block text-teal-700">TypeNull</span>
            <span className="block mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-snug">
              AI-Powered Application Validation, Document Authentication and Regulatory Compliance Intelligence
            </span>
          </h1>

          {/* Short Description */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 leading-relaxed font-normal">
            An intelligent platform for validating applications, analysing documents, identifying inconsistencies, and supporting evidence-based verification.
          </p>

          {/* Primary & Secondary Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onGetStartedClick}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-transparent text-base font-semibold rounded-lg text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 shadow-sm transition-all"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onExploreFeaturesClick}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-slate-300 text-base font-semibold rounded-lg text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 shadow-sm transition-colors"
            >
              Explore Features
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Key Value Anchors - Honest, Technical & Evidence-Focused */}
          <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-teal-700 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Document Authenticity</p>
                <p className="text-xs text-slate-500 mt-0.5">Camera capture & desktop upload with structural validation.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Layers className="w-5 h-5 text-teal-700 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Cross-Record Consistency</p>
                <p className="text-xs text-slate-500 mt-0.5">Multi-source alignment across user claims & documents.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileCheck className="w-5 h-5 text-teal-700 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Auditable Evidence</p>
                <p className="text-xs text-slate-500 mt-0.5">Traceable verification trails with rule compliance reporting.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
