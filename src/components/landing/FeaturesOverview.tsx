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
  Info,
  KeyRound,
  FileCheck2,
  FileSearch,
  Compass,
  AlertCircle,
  Building2,
  Check,
} from 'lucide-react';

export const FeaturesOverview: React.FC = () => {
  // Section 2: The Challenge (5 cards)
  const challenges = [
    {
      id: 'volume',
      title: 'Manual Volume Verification',
      desc: 'Manual verification of large volumes of application documents creates backlogs, administrative fatigue, and multi-week approval delays.',
      icon: FileStack,
      tag: 'Volume Scale',
    },
    {
      id: 'missing-expired',
      title: 'Missing & Expired Records',
      desc: 'Missing, expired, or inconsistent supporting documents submitted without early pre-checks trigger repetitive rejection cycles.',
      icon: FileWarning,
      tag: 'Incompleteness',
    },
    {
      id: 'alterations-duplicates',
      title: 'Potential Alterations & Duplicates',
      desc: 'Potential document alterations, recycled certificates, and duplicate submissions that evade basic visual spot-checks.',
      icon: Copy,
      tag: 'Anomaly Risk',
    },
    {
      id: 'cross-checking',
      title: 'Multi-Record Cross-Checking',
      desc: 'Difficulty cross-checking information across multiple records, land titles, trust deeds, faculty registers, and financial proofs.',
      icon: GitCompare,
      tag: 'Cross-Correlation',
    },
    {
      id: 'regulatory-time',
      title: 'Time-Consuming Compliance',
      desc: 'Time-consuming regulatory compliance reviews against intricate AICTE Approval Process Handbook (APH) norms and statutory checklists.',
      icon: Scale,
      tag: 'Regulatory Review',
    },
  ];

  // Section 5: Document Validation Capabilities (7 cards)
  const validationCapabilities = [
    {
      id: 'pre-submission',
      title: 'Pre-Submission Validation',
      desc: 'Checks completeness, required attachments, and obvious discrepancies before formal submission to prevent rejected filings.',
      icon: FileCheck2,
      badge: 'Early Screening',
    },
    {
      id: 'doc-extraction',
      title: 'Document Extraction',
      desc: 'Extracts key institutional and document data from submitted files using appropriate digital extraction or OCR pipelines.',
      icon: FileSearch,
      badge: 'Hybrid Extraction',
    },
    {
      id: 'doc-forensics',
      title: 'Document Forensics',
      desc: 'Analyzes document structure, PDF properties, image characteristics, and metadata for potential anomalies.',
      icon: Search,
      badge: 'Forensic Audit',
    },
    {
      id: 'cross-doc',
      title: 'Cross-Document Checks',
      desc: 'Compares details across submitted documents (e.g., institution name, land records, society/trust registration, faculty details, financial documents).',
      icon: GitCompare,
      badge: 'Multi-Record Check',
    },
    {
      id: 'regulatory-compliance',
      title: 'Regulatory Compliance',
      desc: 'Evaluates application details against AICTE approval norms and requirements defined in statutory proformas.',
      icon: Scale,
      badge: 'Norms Engine',
    },
    {
      id: 'evidence-reports',
      title: 'Evidence-Linked Reports',
      desc: 'Generates a clear verification report highlighting findings, matched information, and potential concerns with references to source documents.',
      icon: FileSpreadsheet,
      badge: 'Evidence Trail',
    },
    {
      id: 'officer-review',
      title: 'Officer Review',
      desc: 'Provides authorized officers with an organized summary and evidence to support their independent evaluation.',
      icon: UserCheck,
      badge: 'Human Oversight',
    },
  ];

  // Section 6: How the EoA Workflow Works (8 stages)
  const eoaWorkflow = [
    {
      step: '01',
      title: 'Select Extension of Approval (EoA)',
      desc: 'Institution selects Extension of Approval (EoA) from the institutional approval catalogue.',
      icon: FileText,
      actor: 'Institution Action',
      actorType: 'human',
    },
    {
      step: '02',
      title: 'Enter Details & Upload Documents',
      desc: 'Institution enters application details and uploads supporting documents (land title, trust deed, faculty list, financial proof).',
      icon: Layers,
      actor: 'Institution Action',
      actorType: 'human',
    },
    {
      step: '03',
      title: 'Pre-Submission Validation',
      desc: 'System performs pre-submission validation to identify missing fields, incomplete documents, and basic inconsistencies.',
      icon: FileCheck2,
      actor: 'Automated System Check',
      actorType: 'automated',
    },
    {
      step: '04',
      title: 'Correct Deficiencies & Submit',
      desc: 'Institution corrects identified deficiencies where applicable and formally submits application dossier.',
      icon: CheckCircle2,
      actor: 'Institution Action',
      actorType: 'human',
    },
    {
      step: '05',
      title: 'Data Extraction & Forensics',
      desc: 'System extracts document information and performs supported forensic checks on PDF streams, metadata, and image integrity.',
      icon: Search,
      actor: 'Automated System Check',
      actorType: 'automated',
    },
    {
      step: '06',
      title: 'Cross-Document & Regulatory Checks',
      desc: 'Cross-document and regulatory checks compare institutional claims across records and evaluate compliance against AICTE norms.',
      icon: GitCompare,
      actor: 'Automated System Check',
      actorType: 'automated',
    },
    {
      step: '07',
      title: 'Evidence-Linked Verification Report',
      desc: 'System generates an evidence-linked verification report correlating findings, document references, and verification statuses.',
      icon: FileSpreadsheet,
      actor: 'Automated System Check',
      actorType: 'automated',
    },
    {
      step: '08',
      title: 'Authorized Officer Review',
      desc: 'An authorized officer reviews application, inspects flagged anomalies with source citations, and records appropriate action.',
      icon: UserCheck,
      actor: 'Authorized Human Decision',
      actorType: 'decision',
    },
  ];

  // Section 8: Trust & Governance Pillars
  const trustPillars = [
    {
      title: 'Role-Based Access Control',
      desc: 'Strict segregation between applicant self-service, institutional officer desks, and administrative governance.',
      icon: KeyRound,
    },
    {
      title: 'Protected Handling of Documents',
      desc: 'Client-side processing options, AES-256 encrypted storage, and time-bounded signed URLs for sensitive institutional files.',
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

  const eoaFeatures = [
    'Application information validation.',
    'Supporting-document completeness checks.',
    'Expiry and consistency checks where applicable.',
    'Potential document manipulation indicators.',
    'Regulatory checklist validation.',
    'Evidence-linked findings for officer review.',
  ];

  return (
    <div className="space-y-24 py-16 sm:py-24 bg-slate-50 text-slate-900">
      
      {/* =========================================================================
          SECTION 1: AICTE APPROVAL APPLICATIONS (Prioritize Extension of Approval)
         ========================================================================= */}
      <section id="applications" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs font-bold tracking-wider text-blue-900 uppercase bg-blue-50 px-3.5 py-1.5 rounded-full border border-blue-200">
            Institutional Approval Workflows
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            AICTE Approval Applications
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
            Intelligent pre-validation and document verification tailored for institutional regulatory submissions, with Extension of Approval (EoA) as our primary workflow.
          </p>
        </div>

        {/* PRIMARY APPLICATION CARD: Extension of Approval (EoA) - Visually Dominant */}
        <div className="relative rounded-3xl bg-gradient-to-br from-white via-blue-50/20 to-slate-50 border-2 border-blue-600/90 shadow-xl overflow-hidden mb-10 transition-all hover:shadow-2xl">
          {/* Top highlight bar */}
          <div className="h-2 w-full bg-gradient-to-r from-blue-700 via-teal-600 to-indigo-700" />
          
          <div className="p-6 sm:p-10 lg:p-12">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
              
              {/* Left Column: Heading, Badge, Description, Features */}
              <div className="space-y-6 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-700 text-white shadow-xs">
                    Primary Workflow &bull; Fully Supported
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>AICTE Approval Process Handbook Norms</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    Extension of Approval (EoA)
                  </h3>
                  <p className="mt-2.5 text-sm sm:text-base text-slate-600 leading-relaxed">
                    Submit and validate institutional Extension of Approval applications with supporting documents, application-detail checks, document analysis, and regulatory compliance assistance.
                  </p>
                </div>

                {/* 6 Core EoA Features */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                    Supported Verification Capabilities:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {eoaFeatures.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                        <div className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </div>
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Badges Demonstrating Findings Communication */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 mr-1">System Status Indicators:</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Pre-Submission Validated
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                    <GitCompare className="w-3 h-3 text-blue-600" />
                    Cross-Checked
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    <UserCheck className="w-3 h-3 text-amber-600" />
                    Requires Officer Review
                  </span>
                </div>
              </div>

              {/* Right Column: Prominent Action Box */}
              <div className="lg:w-80 flex flex-col justify-between p-6 rounded-2xl bg-slate-900 text-white shadow-lg border border-slate-800 flex-shrink-0 space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 font-bold bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800">
                      Applicant Self-Service
                    </span>
                    <Building2 className="w-5 h-5 text-teal-400" />
                  </div>
                  <h4 className="text-base font-bold text-white">
                    Start Your EoA Dossier
                  </h4>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Create a new Extension of Approval application, upload required attachments, and verify completeness before formal submission.
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  <Link
                    to="/applications/new"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-slate-950 bg-teal-400 hover:bg-teal-300 transition-colors shadow-sm"
                  >
                    <span>Start EoA Application</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <a
                    href="#workflow"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <span>View EoA Workflow Steps</span>
                    &rarr;
                  </a>
                </div>

                <p className="text-[10px] text-slate-400 font-mono text-center border-t border-slate-800 pt-3">
                  Pre-validation runs securely in sandbox mode
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* SECONDARY SECTION: Other AICTE-Related Applications in Catalogue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  Institutional Catalogue Scope
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Regulatory Requirements Engine
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-bold text-slate-900">
                Additional AICTE Institutional Approval Categories
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Additional institutional approval categories—such as <em>Establishment of New Technical Institutions</em>, <em>Introduction of New Courses / Divisions</em>, and <em>Variation in Intake</em>—are indexed in our statutory catalogue for proforma inspection and checklist verification. Extension of Approval (EoA) is currently the active, fully supported institutional validation workflow.
              </p>
            </div>

            <div className="flex-shrink-0">
              <Link
                to="/applications/explore"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors shadow-2xs whitespace-nowrap"
              >
                <Compass className="w-4 h-4 text-blue-700" />
                <span>Explore Regulatory Catalogue</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

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
            Institutional approval desks and regulatory officers evaluate complex submissions annually. Manual document inspection exposes institutions to operational bottlenecks, repeated re-filings, and overlooked anomalies.
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
          SECTION 3: DOCUMENT VALIDATION CAPABILITIES
         ========================================================================= */}
      <section id="capabilities" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="border border-slate-200 rounded-3xl bg-white p-6 sm:p-12 shadow-sm">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold tracking-wider text-teal-900 uppercase bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              Inspection &amp; Verification Modules
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Document Validation Capabilities
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              When an institution submits an Extension of Approval (EoA) dossier, TypeNull performs multi-tier analysis across document extraction, structural forensics, and regulatory alignment.
            </p>
          </div>

          {/* 7 Capabilities Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {validationCapabilities.map((cap, idx) => {
              const Icon = cap.icon;
              const isHighlight = idx === 0;
              return (
                <div
                  key={cap.id}
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
                        {cap.badge}
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

          {/* Anomaly Detection & Decision-Support Boundary */}
          <div className="mt-8 p-4 rounded-2xl bg-slate-100/80 border border-slate-200 text-slate-600 text-xs flex items-start gap-3">
            <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">
              <strong className="text-slate-800">Anomaly Detection &amp; Decision Support Boundary:</strong> Document manipulation indicators highlight potential anomalies, visual irregularities, or structural revisions for targeted review. They do not constitute conclusive proof of fraud. Final regulatory determinations remain exclusively with authorized officials.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 4: HOW THE EOA WORKFLOW WORKS
         ========================================================================= */}
      <section id="workflow" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="border border-slate-200 rounded-3xl bg-white p-6 sm:p-12 shadow-sm space-y-10">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold tracking-wider text-indigo-900 uppercase bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Institutional Approval Pipeline
            </span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              How the EoA Workflow Works
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
              A transparent 8-stage operational flow incorporating early pre-submission checkpoints, automated forensic verification, and human regulatory adjudication.
            </p>
          </div>

          {/* Workflow Legend: Separating Automated Checks from Human Decisions */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <span className="font-bold text-slate-800">Workflow Responsibilities:</span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                <span className="text-slate-700 font-medium">Institution Action</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                <span className="text-slate-700 font-medium">Automated System Check</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                <span className="text-slate-700 font-medium">Authorized Human Decision</span>
              </div>
            </div>
          </div>

          {/* 8-Stage Flowchart Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {eoaWorkflow.map((ws) => {
              const Icon = ws.icon;
              const isAutomated = ws.actorType === 'automated';
              const isDecision = ws.actorType === 'decision';

              return (
                <div
                  key={ws.step}
                  className={`relative p-5 rounded-2xl border transition-all shadow-xs flex flex-col justify-between group ${
                    isDecision
                      ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                      : isAutomated
                      ? 'bg-teal-50/30 border-teal-200/90 hover:border-teal-300'
                      : 'bg-slate-50/80 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div>
                    {/* Step Pill & Phase */}
                    <div className="flex items-center justify-between mb-3.5">
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                        isDecision
                          ? 'text-amber-900 bg-amber-100 border-amber-200'
                          : isAutomated
                          ? 'text-teal-900 bg-teal-100 border-teal-200'
                          : 'text-blue-900 bg-blue-100 border-blue-200'
                      }`}>
                        Step {ws.step}
                      </span>
                      <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${
                        isDecision
                          ? 'text-amber-800 bg-amber-100/80'
                          : isAutomated
                          ? 'text-teal-800 bg-teal-100/80'
                          : 'text-blue-800 bg-blue-100/80'
                      }`}>
                        {ws.actor}
                      </span>
                    </div>

                    {/* Step Icon */}
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-2xs mb-3 group-hover:bg-slate-50 transition-colors">
                      <Icon className="w-4 h-4 text-blue-700" />
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

          {/* Interactive Pre-Validation Callout */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-50 via-sky-50 to-blue-50 border border-teal-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-slate-900">
                  Pre-Submission Validation Minimizes Rejection Cycles
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Institutions correct incomplete fields, unreadable uploads, and missing documents before formal regulatory submission.
                </p>
              </div>
            </div>
            <Link
              to="/applications/new"
              className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors whitespace-nowrap shadow-xs self-stretch sm:self-auto text-center"
            >
              Start EoA Application &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 5: TRUST, SECURITY AND HUMAN OVERSIGHT
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

          {/* Regulatory Authority Notice */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-teal-950 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <ShieldCheck className="w-7 h-7 text-teal-400 flex-shrink-0 hidden sm:block" />
              <div>
                <p className="text-sm font-bold text-white">
                  Human-in-the-Loop Regulatory Adjudication
                </p>
                <p className="text-xs text-slate-300 mt-0.5">
                  TypeNull assists authorized officials by synthesizing multi-document evidence. It does not replace human regulatory authority or make independent approval decisions.
                </p>
              </div>
            </div>
            <Link
              to="/guides?guide=understanding-results"
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-xl transition-colors whitespace-nowrap shadow-xs"
            >
              Review Verification Protocol &rarr;
            </Link>
          </div>

          {/* Prototype Demonstration Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p>
                <strong>Demonstration &amp; Architecture Disclaimer:</strong> TypeNull is a technology demonstration prototype demonstrating automated document pre-validation and evidence synthesis for AICTE-style institutional approval workflows. It is not an official AICTE platform and does not claim direct integration with restricted government databases.
              </p>
              <p className="text-slate-500">
                Sample dossiers use simulated demonstration proformas labeled for prototype evaluation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 6: FINAL CALL TO ACTION
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
              Streamline AICTE Approval Verification
            </h2>

            <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto leading-relaxed font-normal">
              Validate institutional Extension of Approval (EoA) applications with multi-document cross-checks, forensic analysis, and evidence-linked reporting.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/applications/new"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-transparent text-sm font-semibold rounded-xl text-slate-950 bg-teal-400 hover:bg-teal-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 shadow-sm transition-all"
              >
                <span>Start EoA Application</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#workflow"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-slate-700 text-sm font-semibold rounded-xl text-slate-200 bg-slate-800/80 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Compass className="w-4 h-4 text-teal-400" />
                <span>Explore Verification Process</span>
              </a>
            </div>

            <p className="text-[11px] text-slate-400 font-mono pt-2">
              Supports technical institutions, applicant coordinators, and authorized verification desks.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};
