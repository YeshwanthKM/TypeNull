import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  Scale,
  Compass,
  FileSpreadsheet,
  ArrowRight,
  BookOpen,
  Layers,
  Building,
  UserCheck,
  Info
} from 'lucide-react';
import { PRODUCT_GUIDES } from '../guides/UserGuidesData';

export const FeaturesOverview: React.FC = () => {
  const workflowSteps = [
    {
      step: '01',
      title: 'Select Application',
      desc: 'Browse the Government Applications Catalogue and answer tailored conditional questions to generate an accurate statutory checklist.',
      icon: Compass,
    },
    {
      step: '02',
      title: 'Upload Documents',
      desc: 'Attach required identity documents, address proofs, and certificates. In-browser OCR extracts key fields automatically with client-side privacy.',
      icon: FileText,
    },
    {
      step: '03',
      title: 'Run Pre-Validation',
      desc: 'The shared validation engine evaluates dossier completeness, verifies required fields, and performs cross-document consistency checks.',
      icon: Scale,
    },
    {
      step: '04',
      title: 'Review Findings & Fix',
      desc: 'Inspect categorised findings with severity ratings and specific remediation instructions. Correct documents and revalidate with instant delta tracking.',
      icon: CheckCircle,
    },
  ];

  const coreCapabilities = [
    {
      id: 'individual-validation',
      title: 'Individual Pre-Validation',
      desc: 'Self-service dossier preparation and automated pre-screening for citizens and business applicants prior to official portal submission.',
      icon: UserCheck,
      badge: 'Applicant Workflow',
    },
    {
      id: 'organisation-screening',
      title: 'Organisation Bulk Screening',
      desc: 'High-throughput batched application evaluation for compliance desks, featuring aggregated metrics, issue breakdowns, and CSV reporting.',
      icon: Building,
      badge: 'Institutional Desk',
    },
    {
      id: 'catalogue',
      title: 'Government Applications Catalogue',
      desc: 'Structured repository of government schemes (SPICe+, GST REG-01, Passport Form 1) with mandatory rules, conditional logic, and official links.',
      icon: Compass,
      badge: 'Knowledge Base',
    },
    {
      id: 'ocr-consistency',
      title: 'OCR & Cross-Document Consistency',
      desc: 'In-browser optical character recognition and multi-source alignment cross-checking names, dates, PAN/Aadhaar numbers, and application claims.',
      icon: Layers,
      badge: 'Extraction Engine',
    },
    {
      id: 'audit-reports',
      title: 'Auditable Findings & Stale Tracking',
      desc: 'Transparent, evidence-linked verification logs with stale-result invalidation when documents change, ensuring complete decision integrity.',
      icon: FileSpreadsheet,
      badge: 'Audit & Governance',
    },
  ];

  return (
    <div className="space-y-20 py-16 sm:py-24 bg-slate-50">
      {/* Section C: How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="border border-slate-200 rounded-2xl bg-white p-6 sm:p-10 shadow-sm">
          <div className="max-w-3xl mb-10">
            <span className="text-xs font-semibold tracking-wider text-teal-800 uppercase bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
              Operational Flow
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              How Pre-Validation Works
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              TypeNull guides you through a disciplined, 4-stage process to identify filing errors and document discrepancies before official submission.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((ws) => {
              const StepIcon = ws.icon;
              return (
                <div
                  key={ws.step}
                  className="p-5 rounded-xl bg-slate-50/80 border border-slate-200/80 hover:border-teal-300 hover:bg-white transition-all shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded">
                        Step {ws.step}
                      </span>
                      <StepIcon className="w-5 h-5 text-teal-700" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mb-1.5">{ws.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{ws.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section D: Core Capabilities */}
      <section id="capabilities" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="max-w-3xl mb-10">
          <span className="text-xs font-semibold tracking-wider text-teal-800 uppercase bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
            Platform Capabilities
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Comprehensive Regulatory Pre-Validation
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Engineered to automate statutory checklist evaluation, cross-record discrepancy detection, and evidence-backed audit reporting.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreCapabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.id}
                className="flex flex-col bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
                    {cap.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  {cap.title}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed flex-grow">
                  {cap.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section E: Target Audiences */}
      <section id="audience" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="border border-slate-200 rounded-2xl bg-white p-6 sm:p-10 shadow-sm">
          <div className="max-w-3xl mb-10">
            <span className="text-xs font-semibold tracking-wider text-teal-800 uppercase bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
              User Profiles
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Designed for Both Applicants and Institutional Officers
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              TypeNull delivers dedicated interfaces and validation depth tailored to distinct compliance roles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Individual Applicants */}
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-teal-100/70 border border-teal-200 flex items-center justify-center text-teal-800 mb-4">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Individual Applicants & Small Businesses
                </h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Citizens and business owners preparing statutory filings who want to catch document omissions, date conflicts, and formatting mistakes before paying filing fees or risking rejection.
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-700 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-teal-700 mt-0.5 flex-shrink-0" />
                    <span>Clear checklist requirements based on your specific situation.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-teal-700 mt-0.5 flex-shrink-0" />
                    <span>Automated OCR extracts names, dates, and identification numbers.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-teal-700 mt-0.5 flex-shrink-0" />
                    <span>Plain-language remediation advice for every detected finding.</span>
                  </li>
                </ul>
              </div>
              <Link
                to="/applications/explore"
                className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900"
              >
                Browse Government Applications &rarr;
              </Link>
            </div>

            {/* Institutional Officers */}
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-800 mb-4">
                  <Building className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Institutional Officers & Compliance Desks
                </h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                  Authorised personnel in enterprise onboarding, legal advisory, university admissions, or corporate secretarial roles who need to screen batches of applications systematically.
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-700 mb-6">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-700 mt-0.5 flex-shrink-0" />
                    <span>Bulk batch intake and multi-application parallel screening.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-700 mt-0.5 flex-shrink-0" />
                    <span>Clear distinction between unreadable files and confirmed rule violations.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-700 mt-0.5 flex-shrink-0" />
                    <span>Exportable CSV audit reports and aggregate compliance metrics.</span>
                  </li>
                </ul>
              </div>
              <Link
                to="/officer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
              >
                View Organisation Screening &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section F: Help & Getting Started */}
      <section id="guides-preview" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-teal-800 uppercase bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
              Documentation & Guides
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Step-by-Step User Guides
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              Learn how to navigate each workflow with comprehensive, screenshot-referenced documentation.
            </p>
          </div>
          <Link
            to="/guides"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-900 bg-white border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto"
          >
            <BookOpen className="w-4 h-4" />
            View All Guides
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCT_GUIDES.slice(0, 3).map((guide) => (
            <div
              key={guide.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                    {guide.category}
                  </span>
                  <span>{guide.readTime}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-1.5">{guide.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                  {guide.summary}
                </p>
              </div>

              <Link
                to={`/guides?guide=${guide.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 border-t border-slate-100 pt-3"
              >
                Read Guide
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Section G: Trust & Statutory Limitations */}
      <section id="trust" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="bg-amber-50/60 border border-amber-200/90 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 flex-shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-950">
                Important Regulatory & Statutory Disclaimers
              </h3>
              <p className="mt-1 text-sm text-amber-900/90 leading-relaxed">
                TypeNull is an independent pre-validation and document preparation tool designed to help applicants identify avoidable filing errors prior to official submission. Please review the platform scope:
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm text-amber-900">
                <div className="p-3 bg-white/70 rounded-lg border border-amber-200">
                  <p className="font-semibold text-amber-950 mb-1">Pre-Validation Only</p>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    TypeNull does not submit forms or replace government portals (MCA, GSTN, Passport Seva). Final submission must be completed through official channels.
                  </p>
                </div>
                <div className="p-3 bg-white/70 rounded-lg border border-amber-200">
                  <p className="font-semibold text-amber-950 mb-1">Document Dependence</p>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    Pre-validation accuracy depends entirely on the legibility, completeness, and recency of user-provided attachments and claims.
                  </p>
                </div>
                <div className="p-3 bg-white/70 rounded-lg border border-amber-200">
                  <p className="font-semibold text-amber-950 mb-1">No Statutory Guarantee</p>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    A clean pre-validation result does not guarantee approval by statutory authorities, who retain sole legal discretion over applications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
