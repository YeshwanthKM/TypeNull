import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileStack,
  FileWarning,
  Copy,
  GitCompare,
  Scale,
  CheckCircle2,
  FileText,
  Search,
  ShieldCheck,
  FileSpreadsheet,
  UserCheck,
  ArrowRight,
  Lock,
  Layers,
  Sparkles,
  Info,
  KeyRound,
  FileCheck2,
  FileSearch,
  Compass,
} from 'lucide-react';

export const FeaturesOverview: React.FC = () => {
  // Section 2: 5 Challenges
  const challenges = [
    {
      id: 'volume',
      title: 'Manual Volume Verification',
      desc: 'Manual verification of large volumes of application documents creates backlogs, administrative fatigue, and multi-week approval delays.',
      icon: FileStack,
      tag: 'Scale Bottleneck',
    },
    {
      id: 'missing-expired',
      title: 'Missing & Expired Records',
      desc: 'Missing, expired, or inconsistent supporting documents submitted without early pre-checks trigger repetitive rejection cycles.',
      icon: FileWarning,
      tag: 'Document Incompleteness',
    },
    {
      id: 'alterations-duplicates',
      title: 'Alterations & Duplicate Submissions',
      desc: 'Potential document alterations, recycled files, and duplicate submissions that evade basic visual spot-checks.',
      icon: Copy,
      tag: 'Tampering Anomaly',
    },
    {
      id: 'cross-checking',
      title: 'Multi-Record Cross-Checking',
      desc: 'Difficulty cross-checking information across multiple records, disparate identity proofs, and separate regulatory certificates.',
      icon: GitCompare,
      tag: 'Information Discrepancy',
    },
    {
      id: 'regulatory-time',
      title: 'Time-Consuming Compliance',
      desc: 'Time-consuming regulatory compliance reviews against intricate, fast-evolving statutory checklists and government norms.',
      icon: Scale,
      tag: 'Statutory Burden',
    },
  ];

  // Section 3: 7 Solution Capabilities
  const solutions = [
    {
      id: 'pre-validation',
      title: 'Application Pre-Validation',
      desc: 'Identify missing fields, incomplete documents, and basic inconsistencies before submission to prevent invalid dossier filings.',
      icon: FileCheck2,
      badge: 'Pre-Submission',
    },
    {
      id: 'hybrid-extraction',
      title: 'Hybrid Document Extraction',
      desc: 'Extract information from digital PDFs and scanned documents using appropriate text extraction and client/server OCR pipelines.',
      icon: FileSearch,
      badge: 'OCR & PDF Stream',
    },
    {
      id: 'document-forensics',
      title: 'Document Forensics',
      desc: 'Examine PDF structure, metadata, image manipulation indicators, and digital-signature integrity where supported.',
      icon: Search,
      badge: 'Structural Analysis',
    },
    {
      id: 'cross-doc',
      title: 'Cross-Document Validation',
      desc: 'Compare extracted information across application forms and supporting documents to surface conflicting claims.',
      icon: GitCompare,
      badge: 'Entity Matching',
    },
    {
      id: 'compliance-assistance',
      title: 'Regulatory Compliance Assistance',
      desc: 'Evaluate applications against configurable regulatory checklists (e.g., SPICe+, GST REG-01, Passport Form 1).',
      icon: Scale,
      badge: 'Checklist Engine',
    },
    {
      id: 'evidence-reporting',
      title: 'Evidence-Linked Reporting',
      desc: 'Present findings with document references, bounding boxes, transparent explanations, and verification statuses.',
      icon: FileSpreadsheet,
      badge: 'Audit Trail',
    },
    {
      id: 'human-review',
      title: 'Human Review & Decision Support',
      desc: 'Support authorized officers in reviewing flagged cases, recording decisions, and executing statutory adjudications.',
      icon: UserCheck,
      badge: 'Officer Governance',
    },
  ];

  // Section 4: 8 Workflow Steps
  const workflowSteps = [
    {
      step: '01',
      title: 'Dossier Submission',
      desc: 'Institution submits application and supporting documents through secure portal.',
      icon: FileText,
      phase: 'Intake',
    },
    {
      step: '02',
      title: 'Format Inspection',
      desc: 'System inspects container validity, classifies file formats, and maps target requirements.',
      icon: Layers,
      phase: 'Classification',
    },
    {
      step: '03',
      title: 'Hybrid Text Extraction',
      desc: 'Text extraction and OCR identify relevant statutory identifiers, dates, and entity names.',
      icon: FileSearch,
      phase: 'Extraction',
    },
    {
      step: '04',
      title: 'Forensic Examination',
      desc: 'Document-forensics modules examine metadata revisions, structure, and manipulation cues.',
      icon: Search,
      phase: 'Forensics',
    },
    {
      step: '05',
      title: 'Cross-Document Checks',
      desc: 'Multi-record correlation compares extracted claims to identify discrepancies across proofs.',
      icon: GitCompare,
      phase: 'Correlation',
    },
    {
      step: '06',
      title: 'Regulatory Checklist',
      desc: 'Regulatory rules and authorized-source checks run where integrations are supported.',
      icon: Scale,
      phase: 'Compliance',
    },
    {
      step: '07',
      title: 'Evidence Dossier Assembly',
      desc: 'Findings are correlated into a consolidated, evidence-linked compliance audit report.',
      icon: FileSpreadsheet,
      phase: 'Reporting',
    },
    {
      step: '08',
      title: 'Authorized Officer Review',
      desc: 'Authorized officers inspect flagged anomalies, review provenance, and decide next steps.',
      icon: UserCheck,
      phase: 'Adjudication',
    },
  ];

  // Section 5: 6 Key Capabilities
  const capabilities = [
    {
      id: 'pdf-forensics',
      title: 'PDF Structural Forensics',
      desc: 'Examines PDF metadata, structural streams, object dictionaries, and available revision history to detect structural anomalies.',
      icon: FileText,
      techNote: 'Metadata & Stream Inspection',
    },
    {
      id: 'image-manipulation',
      title: 'Image Manipulation Analysis',
      desc: 'Flags potential image alterations, compression irregularities, and localized modifications for targeted officer review.',
      icon: Search,
      techNote: 'Pixel Anomaly Flags',
    },
    {
      id: 'multi-signal',
      title: 'Multi-Signal Evidence Analysis',
      desc: 'Correlates layout templates, extraction confidence, and text consistency to highlight suspicious inconsistencies.',
      icon: Sparkles,
      techNote: 'Correlation Matrix',
    },
    {
      id: 'evidence-linked',
      title: 'Evidence-Linked Verification',
      desc: 'Connects findings directly to supporting documents, extracted field coordinates, and auditable references.',
      icon: FileSpreadsheet,
      techNote: 'Traceable Provenance',
    },
    {
      id: 'digital-sig',
      title: 'Digital-Signature Verification',
      desc: 'Checks signature integrity, ByteRange hash validation, and certificate trust chains where supported in digital PDFs.',
      icon: Lock,
      techNote: 'PKCS#7 Integrity Check',
    },
    {
      id: 'cross-doc-consistency',
      title: 'Cross-Document Consistency',
      desc: 'Identifies conflicting information (names, PAN, Aadhaar, dates, and registration IDs) across submitted records.',
      icon: GitCompare,
      techNote: 'Multi-Record Reconciliation',
    },
  ];

  // Section 6: Trust & Governance Pillars
  const trustPillars = [
    {
      title: 'Role-Based Access Control',
      desc: 'Strict segregation between applicant self-service, institutional officer desks, and administrative governance.',
      icon: KeyRound,
    },
    {
      title: 'Protected Handling of Documents',
      desc: 'Client-side processing options, AES-256 encrypted storage, and time-bounded signed URLs for sensitive files.',
      icon: Lock,
    },
    {
      title: 'Traceable Verification Records',
      desc: 'Audit logs link every verification outcome to exact document snippets, timestamped rules, and candidate values.',
      icon: FileSpreadsheet,
    },
    {
      title: 'Clear Explanation of Inconsistencies',
      desc: 'Transparent reporting clearly distinguishes unreadable scans or template gaps from substantive non-compliance.',
      icon: Info,
    },
    {
      title: 'Human Review for Regulatory Decisions',
      desc: 'Automated signals provide decision support; authorized officers maintain sole authority over statutory approvals.',
      icon: UserCheck,
    },
    {
      title: 'Authorized-Source Verification Where Supported',
      desc: 'Connects to authoritative reference templates and public proformas only where official integrations are active.',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="space-y-24 py-16 sm:py-24 bg-slate-50 text-slate-900">
      
      {/* =========================================================================
          SECTION 2: THE CHALLENGE
         ========================================================================= */}
      <section id="challenge" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold tracking-wider text-blue-900 uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            The Institutional Challenge
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Making Institutional Verification More Efficient
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            Approval desks and regulatory bodies process thousands of complex filings annually. Manual document inspection exposes institutions to operational bottlenecks, repeated re-filings, and overlooked anomalies.
          </p>
        </div>

        {/* 5 Clean Challenge Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((c, idx) => {
            const Icon = c.icon;
            const isFullWidth = idx === 4; // 5th card spans nicely on lg
            return (
              <div
                key={c.id}
                className={`p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between ${
                  isFullWidth ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {c.tag}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {c.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {c.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION 3: OUR SOLUTION
         ========================================================================= */}
      <section id="solution" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="border border-slate-200 rounded-3xl bg-white p-6 sm:p-12 shadow-sm">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold tracking-wider text-teal-900 uppercase bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              Assisted Verification Architecture
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Intelligent Verification. Evidence-Based Decisions.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              TypeNull equips institutional verification desks with automated pre-screening, forensic anomaly signals, and cross-record reconciliation—enabling officers to make fast, defensible, and evidence-backed decisions.
            </p>
          </div>

          {/* 7 Solution Points */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {solutions.map((sol, idx) => {
              const Icon = sol.icon;
              const isHighlight = idx === 0;
              return (
                <div
                  key={sol.id}
                  className={`p-6 rounded-2xl border transition-all flex flex-col justify-between ${
                    isHighlight
                      ? 'bg-gradient-to-br from-teal-50/70 via-white to-blue-50/40 border-teal-300 shadow-sm'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                        isHighlight
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                          : 'bg-white text-teal-800 border-slate-200'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-semibold text-teal-900 bg-teal-100/70 px-2.5 py-0.5 rounded-full border border-teal-200">
                        {sol.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">
                      {sol.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      {sol.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: HOW IT WORKS (Visual Workflow Flowchart)
         ========================================================================= */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="border border-slate-200 rounded-3xl bg-white p-6 sm:p-12 shadow-sm space-y-10">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold tracking-wider text-indigo-900 uppercase bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              End-to-End Pipeline
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              From Application to Evidence-Based Review
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              A transparent 8-stage operational flow incorporating early pre-submission checkpoints to prevent rejected filings before official scrutiny.
            </p>
          </div>

          {/* Pre-Submission Early Checkpoint Highlight Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-50 via-sky-50 to-blue-50 border border-teal-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-teal-700 text-white px-2 py-0.5 rounded">
                    Early Checkpoint
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">
                    Pre-Submission Validation Active
                  </p>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Submitting institutions verify mandatory checklist compliance, missing fields, and basic consistency before final dossier lock.
                </p>
              </div>
            </div>
            <Link
              to="/applications/explore"
              className="px-3.5 py-1.5 text-xs font-semibold text-teal-800 bg-white border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors whitespace-nowrap shadow-2xs self-stretch sm:self-auto text-center"
            >
              Test Pre-Validation &rarr;
            </Link>
          </div>

          {/* Compact 8-Stage Flowchart Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {workflowSteps.map((ws) => {
              const Icon = ws.icon;
              return (
                <div
                  key={ws.step}
                  className="relative p-5 rounded-2xl bg-slate-50/80 border border-slate-200/90 hover:border-blue-300 hover:bg-white transition-all shadow-xs flex flex-col justify-between group"
                >
                  <div>
                    {/* Step Pill & Phase */}
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-xs font-mono font-bold text-blue-900 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">
                        Step {ws.step}
                      </span>
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold">
                        {ws.phase}
                      </span>
                    </div>

                    {/* Step Icon */}
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-700 shadow-2xs mb-3 group-hover:bg-blue-50 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Title & Description */}
                    <h3 className="font-bold text-slate-900 text-sm mb-1.5">
                      {ws.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {ws.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: KEY CAPABILITIES
         ========================================================================= */}
      <section id="capabilities" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold tracking-wider text-blue-900 uppercase bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Forensic &amp; Validation Modules
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Key Capabilities
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            Multi-signal inspection modules engineered to surface subtle discrepancies and document anomalies without drawing premature conclusions.
          </p>
        </div>

        {/* 6 Capabilities Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.id}
                className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {cap.techNote}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {cap.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mandatory Anomaly Detection Disclaimer */}
        <div className="mt-8 p-4 rounded-2xl bg-slate-100/80 border border-slate-200 text-slate-600 text-xs flex items-start gap-3">
          <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            <strong className="text-slate-800">Anomaly Detection &amp; Decision-Support Boundary:</strong> These capabilities highlight anomalies, structural inconsistencies, and revision indicators. They do not claim to conclusively prove fraud or replace statutory legal discretion. Final administrative determinations remain with authorized officials.
          </p>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: TRUST, SECURITY AND HUMAN OVERSIGHT
         ========================================================================= */}
      <section id="trust" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="border border-slate-200 rounded-3xl bg-white p-6 sm:p-12 shadow-sm space-y-10">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold tracking-wider text-teal-900 uppercase bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              Institutional Governance
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Transparent, Secure, and Human-Guided
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              Designed around institutional accountability: zero black-box determinations, immutable audit records, and strict data privacy safeguards.
            </p>
          </div>

          {/* 6 Trust Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trustPillars.map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-start gap-3.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">
                      {p.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Prominent Clear Statement */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 to-slate-900 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <ShieldCheck className="w-7 h-7 text-teal-400 flex-shrink-0 hidden sm:block" />
              <div>
                <p className="text-sm font-bold text-white">
                  Human-in-the-Loop Regulatory Decision Making
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  The platform supports authorized officials; it does not independently make final approval decisions.
                </p>
              </div>
            </div>
            <Link
              to="/guides?guide=understanding-results"
              className="px-4 py-2 text-xs font-semibold text-slate-900 bg-teal-300 hover:bg-teal-200 rounded-xl transition-colors whitespace-nowrap shadow-xs"
            >
              Review Audit Protocol &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 7: FINAL CALL TO ACTION
         ========================================================================= */}
      <section id="cta" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-[#0F1E36] via-slate-900 to-teal-950 text-white p-8 sm:p-16 text-center shadow-xl relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-3xl mx-auto space-y-6">
            <span className="text-xs font-mono uppercase tracking-wider text-teal-400 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800">
              Institutional Approval &bull; Verification Platform
            </span>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Make Application Verification Smarter
            </h2>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed font-normal">
              Bring document analysis, consistency checks, and regulatory review assistance into one structured workflow.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-transparent text-sm font-semibold rounded-xl text-slate-950 bg-teal-400 hover:bg-teal-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 shadow-sm transition-all"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/applications/explore"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-slate-700 text-sm font-semibold rounded-xl text-slate-200 bg-slate-800/80 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Compass className="w-4 h-4 text-teal-400" />
                <span>Explore the Platform</span>
              </Link>
            </div>

            <p className="text-[11px] text-slate-400 font-mono pt-2">
              Supports citizens, institutional applicants, and authorized verification desks.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};

