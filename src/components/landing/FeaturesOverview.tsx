import React from 'react';
import { FileText, CheckCircle, Scale, ShieldAlert, Cpu, Laptop, FileSpreadsheet } from 'lucide-react';

export const FeaturesOverview: React.FC = () => {
  const pillars = [
    {
      id: 'doc-verification',
      category: 'Document Verification',
      title: 'Automated Document Authentication & OCR Extraction',
      description:
        'Processes identity documents, certificates, and institutional forms captured via desktop upload or mobile camera. Prepares structural verification, OCR text extraction, and tamper indicators.',
      capabilities: [
        'Desktop file uploads & mobile camera document capture',
        'Optical character extraction with bounding-box coordinate tracking',
        'Document structural sanity and image quality assessment',
        'Support for multiple standardized and regional document formats',
      ],
      icon: FileText,
      badge: 'Core Engine',
    },
    {
      id: 'app-validation',
      category: 'Application Validation',
      title: 'Multi-Source Cross-Document Consistency Analysis',
      description:
        'Validates entered application form fields against submitted documentary evidence. Systematically identifies omissions, conflicting dates, mismatched names, and forged identity credentials.',
      capabilities: [
        'Bi-directional cross-checks between application data and uploaded proof',
        'Fuzzy matching and alias detection for complex regional names',
        'Cross-document timeline and date-of-birth consistency auditing',
        'Flagging ambiguous or conflicting statements for manual officer review',
      ],
      icon: CheckCircle,
      badge: 'Validation Matrix',
    },
    {
      id: 'compliance-intelligence',
      category: 'Compliance Checking',
      title: 'Regulatory Rule Evaluation & Auditable Reporting',
      description:
        'Evaluates applications against predefined statutory policies, institutional eligibility criteria, and regulatory mandates, generating tamper-evident verification reports.',
      capabilities: [
        'Configurable regulatory rules engine mapping to scheme guidelines',
        'Reference-record matching against benchmark institutional datasets',
        'Evidence-linked verification summaries with transparent justifications',
        'Exportable audit trails designed for regulatory and institutional scrutiny',
      ],
      icon: Scale,
      badge: 'Governance & Audit',
    },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Document Ingestion',
      desc: 'User uploads documents via responsive web interface or captures credentials via phone camera.',
      icon: Laptop,
    },
    {
      step: '02',
      title: 'Information Extraction',
      desc: 'Extracted key fields are normalized into structured data points with verified confidence bounds.',
      icon: Cpu,
    },
    {
      step: '03',
      title: 'Consistency Checking',
      desc: 'Application fields are cross-referenced across documents and reference records for discrepancy detection.',
      icon: ShieldAlert,
    },
    {
      step: '04',
      title: 'Compliance Audit Report',
      desc: 'A comprehensive, evidence-linked report is compiled for automated acceptance or officer escalation.',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="space-y-16 py-16 sm:py-20 bg-slate-50">
      {/* Three Pillars Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-xs font-semibold tracking-wider text-teal-800 uppercase">
            Platform Capabilities
          </h2>
          <p className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Comprehensive Verification and Compliance Intelligence
          </p>
          <p className="mt-3 text-base text-slate-600">
            TypeNull bridges the gap between raw document submissions, human-readable claims, and strict compliance standards through structured verification pipelines.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.id}
                className="flex flex-col bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
                    {pillar.badge}
                  </span>
                </div>

                <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                  {pillar.category}
                </span>

                <h3 className="text-lg font-bold text-slate-900 mt-1 mb-2">
                  {pillar.title}
                </h3>

                <p className="text-sm text-slate-600 mb-6 flex-grow leading-relaxed">
                  {pillar.description}
                </p>

                <div className="border-t border-slate-100 pt-4 mt-auto">
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                    Key Technical Aspects
                  </h4>
                  <ul className="space-y-2">
                    {pillar.capabilities.map((cap, i) => (
                      <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1.5 flex-shrink-0" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Planned Verification Flow */}
      <section id="flow" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-slate-200 rounded-2xl bg-white p-6 sm:p-10 shadow-sm">
          <div className="max-w-3xl mb-10">
            <h2 className="text-xs font-semibold tracking-wider text-teal-800 uppercase">
              Operational Pipeline
            </h2>
            <h3 className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Evidence-Linked Verification Architecture
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              The TypeNull verification pipeline operates progressively to guarantee zero unsubstantiated decisions and clear audit trails for regulatory compliance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((ws) => {
              const StepIcon = ws.icon;
              return (
                <div key={ws.step} className="p-4 rounded-lg bg-slate-50 border border-slate-100 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Step {ws.step}
                    </span>
                    <StepIcon className="w-4 h-4 text-slate-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm mb-1">{ws.title}</h4>
                  <p className="text-xs text-slate-600 leading-normal">{ws.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Phase Progression Notice */}
      <section id="scope" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-teal-400 mb-2">
                Development Roadmap & Governance
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Phase 0 Status: Foundation & Deployment Baseline
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                TypeNull is being constructed in disciplined, auditable phases. Phase 0 establishes the responsive frontend architecture, TypeScript typing, and deployment pipeline. OCR models, verification rules, and backend data services will be connected incrementally in subsequent phases.
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-start md:items-end gap-2 text-xs text-slate-400 font-mono">
              <span className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-teal-300">
                Phase 0: Complete
              </span>
              <span className="px-3 py-1 rounded bg-slate-800/50 text-slate-400">
                Phase 1: Application Architecture
              </span>
              <span className="px-3 py-1 rounded bg-slate-800/50 text-slate-400">
                Phase 2: Supabase Integration
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
