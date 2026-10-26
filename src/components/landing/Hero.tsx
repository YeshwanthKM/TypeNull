import React from 'react';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Search,
  Lock,
  Compass,
  FileText,
  Layers,
  FileCheck2,
} from 'lucide-react';

interface HeroProps {
  onGetStartedClick: () => void;
  onExploreFeaturesClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  onGetStartedClick,
  onExploreFeaturesClick,
}) => {
  return (
    <section id="overview" className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 bg-gradient-to-b from-white via-slate-50/60 to-blue-50/30 border-b border-slate-200 overflow-hidden">
      {/* Decorative ambient background accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-r from-blue-100/30 via-teal-100/20 to-indigo-100/30 blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Headline, Copy & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Institutional Platform Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold tracking-wide shadow-xs">
              <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
              <span>AICTE Approval &bull; Institutional Verification Platform</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-5xl lg:text-[46px] font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              AICTE Application Validation &amp; Document Verification
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-normal">
              Streamline institutional approval workflows with intelligent document validation, potential manipulation detection, cross-document consistency checks, and regulatory compliance assistance.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
              <button
                type="button"
                onClick={onGetStartedClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-transparent text-sm font-semibold rounded-xl text-white bg-teal-700 hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600 shadow-sm transition-all"
              >
                <span>Start EoA Application</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#workflow"
                onClick={(e) => {
                  e.preventDefault();
                  onExploreFeaturesClick();
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 border border-slate-300 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 shadow-xs transition-colors"
              >
                <Compass className="w-4 h-4 text-blue-700" />
                <span>Explore Verification Process</span>
              </a>
            </div>

            {/* Micro Highlights Bar */}
            <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-y-2 gap-x-6 text-xs text-slate-500">
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Pre-Submission Validation</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Cross-Record Correlation</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Human Regulatory Oversight</span>
              </div>
            </div>
          </div>

          {/* Right Column: Modern Interactive Dashboard & Forensics Preview */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              
              {/* Outer Glow / Shadow Frame */}
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
                
                {/* Window Title Bar */}
                <div className="px-4 py-3 bg-[#0F1E36] text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block opacity-80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block opacity-80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block opacity-80" />
                    </div>
                    <span className="text-[11px] font-mono text-slate-300 ml-2 font-medium">
                      dossier-audit-viewer // AICTE-EOA-2026-089
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-teal-900/60 text-teal-300 px-2 py-0.5 rounded border border-teal-700">
                    Prototype Demonstration
                  </span>
                </div>

                {/* Dossier Header Strip */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Apex Institute of Engineering &amp; Technology
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      AICTE Extension of Approval (EoA) Dossier &bull; APH 2026-27 Norms
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex-shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Pre-Submission Validated
                  </span>
                </div>

                {/* Dashboard Body Cards */}
                <div className="p-4 space-y-3.5 text-xs">
                  
                  {/* Item 1: Document Forensics & Structure */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-700" />
                        Land &amp; Building Norms / Society Trust Deed
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        MATCH (AICTE Proforma)
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 font-mono pt-1">
                      <div>PDF Stream: <span className="text-slate-800 font-medium">100% Digital</span></div>
                      <div>ByteRange Sig: <span className="text-emerald-700 font-medium">PKCS#7 Valid</span></div>
                    </div>
                  </div>

                  {/* Item 2: Cross-Document Entity Validation */}
                  <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-indigo-700" />
                        Multi-Record Alignment Matrix (Faculty &amp; Land)
                      </span>
                      <span className="text-[10px] font-mono font-bold text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200">
                        Cross-Checked
                      </span>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-600">
                      <div className="flex justify-between items-center py-0.5 border-b border-blue-100/70">
                        <span>Faculty Cadre Ratio:</span>
                        <span className="font-mono font-semibold text-emerald-700">1:15 Meets AICTE Norms</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span>Entity Name &amp; Address:</span>
                        <span className="font-semibold text-emerald-700">100% Disambiguated</span>
                      </div>
                    </div>
                  </div>

                  {/* Item 3: Regulatory Checklist Pre-Validation */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-teal-700" />
                        AICTE Regulatory Checklist Pre-Validation
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500">
                        6 of 6 Mandatory Attached
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-teal-600 h-1.5 rounded-full w-full" />
                    </div>
                  </div>

                  {/* Item 4: Decision Support & Officer Status */}
                  <div className="p-3 rounded-xl border border-teal-200 bg-teal-50/50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-teal-700 flex-shrink-0" />
                      <div>
                        <p className="font-bold text-teal-950 text-[11px]">
                          Evidence Dossier Assembled
                        </p>
                        <p className="text-[10px] text-teal-800">
                          Ready for authorized officer review &bull; Zero blocking anomalies
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onGetStartedClick}
                      className="px-2.5 py-1 text-[11px] font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-2xs transition-colors whitespace-nowrap"
                    >
                      Start EoA Application
                    </button>
                  </div>
                </div>

                {/* Footer Security Badge */}
                <div className="px-4 py-2.5 bg-slate-100/80 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Client-side encrypted evaluation
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    AICTE Norms Engine v2026.1
                  </span>
                </div>
              </div>

              {/* Floating Accent Pill */}
              <div className="hidden sm:flex absolute -bottom-4 -left-4 items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 shadow-lg text-xs font-semibold text-slate-800">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <span>Forensic Anomaly Detection Active</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

