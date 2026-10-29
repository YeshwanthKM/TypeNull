import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  ShieldCheck,
  Scale,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  FileCheck,
  Info,
  Lock,
  Plus,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { useAuth } from '../contexts/AuthContext';
import { fetchUserApplications } from '../services/applications';
import { DbApplication } from '../types';
import { STATUTORY_EOA_DOCUMENTS } from '../services/validation/eoaValidationEngine';

export const GovernmentApplicationsCataloguePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isConfigured } = useAuth();

  const [applications, setApplications] = useState<DbApplication[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedReqKey, setSelectedReqKey] = useState<string | null>(null);

  // Load existing institutional applications to connect card actions dynamically
  const loadApplications = useCallback(async () => {
    if (!user || !isConfigured) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data } = await fetchUserApplications(user.id);
    setApplications(data || []);
    setIsLoading(false);
  }, [user, isConfigured]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const latestApp = applications.length > 0 ? applications[0] : null;

  // Handlers for the 4 core actions
  const handleCheckReadiness = () => {
    if (latestApp) {
      navigate(`/applications/${latestApp.id}`);
    } else {
      navigate('/rulebook?tab=checklist');
    }
  };

  const handleViewRequirements = () => {
    const el = document.getElementById('statutory-requirements-breakdown');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/rulebook?tab=checklist');
    }
  };

  const handleValidateDocuments = () => {
    if (latestApp) {
      navigate(`/applications/${latestApp.id}`);
    } else {
      navigate('/applications/new');
    }
  };

  const handleReviewCompliance = () => {
    if (latestApp) {
      navigate(`/applications/${latestApp.id}`);
    } else {
      navigate('/rulebook?tab=rules');
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title="AICTE EoA Requirements"
        description="Review the requirements for your AICTE Extension of Approval application and prepare the supporting documents for validation and scrutiny."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'AICTE EoA Requirements' },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => navigate('/rulebook')}
              leftIcon={<Scale className="w-4 h-4 text-teal-700" />}
            >
              AICTE Rulebook
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/applications/new')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Prepare EoA Application
            </Button>
          </div>
        }
      />

      {/* Advisory & Scrutiny Notice */}
      <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/60 text-slate-800 text-xs flex items-start gap-3 shadow-xs">
        <Info className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-teal-950">
            TypeNull Institutional Application Scrutiny System
          </p>
          <p className="leading-relaxed text-teal-900">
            TypeNull supports pre-submission document validation, forensic tampering detection, and internal officer scrutiny under AICTE Approval Process Handbook (APH 2024–2027) standards. Verification findings are generated strictly from uploaded evidentiary files and do not substitute for official statutory approval from AICTE.
          </p>
        </div>
      </div>

      {/* Active Application Context Banner if user already has an application */}
      {isLoading ? (
        <LoadingState message="Loading AICTE application dossier status..." rows={1} />
      ) : latestApp ? (
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{latestApp.title}</span>
                <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold capitalize">
                  {latestApp.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {latestApp.organisation_name} &bull; {latestApp.category || 'AICTE EoA'} &bull; Cycle 2026–2027
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/applications/${latestApp.id}`)}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Open Active Dossier
          </Button>
        </div>
      ) : null}

      {/* SECTION: 4 Core Scrutiny & Validation Cards */}
      <section aria-labelledby="core-workflow-cards" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="core-workflow-cards" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            EoA Scrutiny &amp; Validation Modules
          </h2>
          <span className="text-[11px] font-mono text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full font-semibold">
            APH 2024–2027 Cycle
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CARD 1: Application Readiness */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-teal-300 hover:shadow-sm transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Readiness
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Application Readiness</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Review application completeness and identify missing or incomplete information before submitting documents for scrutiny.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100">
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-center"
                onClick={handleCheckReadiness}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Check Readiness
              </Button>
            </div>
          </div>

          {/* CARD 2: Document Requirements */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-teal-300 hover:shadow-sm transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                  <FileText className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                  Statutory Proofs
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Document Requirements</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Review the supporting documents relevant to the current AICTE EoA scrutiny workflow.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center"
                onClick={handleViewRequirements}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View Requirements
              </Button>
            </div>
          </div>

          {/* CARD 3: Document Authentication */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-teal-300 hover:shadow-sm transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
                  Forensics &amp; Crypto
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Document Authentication</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Submit and review supporting documents for structural integrity, digital signature verification, certificate trust status, and potential manipulation indicators.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center"
                onClick={handleValidateDocuments}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Validate Documents
              </Button>
            </div>
          </div>

          {/* CARD 4: Application Compliance */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-teal-300 hover:shadow-sm transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                  <Scale className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  AICTE Rules
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Application Compliance</h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  Check applicable validation rules and cross-document consistency to identify potential regulatory deficiencies requiring attention.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center"
                onClick={handleReviewCompliance}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Review Compliance
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Verified AICTE EoA Document Requirements Breakdown */}
      <section id="statutory-requirements-breakdown" aria-labelledby="breakdown-heading" className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 id="breakdown-heading" className="text-base font-bold text-slate-900">
              Verified AICTE EoA Document Requirements
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Statutory evidentiary proofs prescribed in the AICTE Approval Process Handbook (APH 2024–2027) for Extension of Approval.
            </p>
          </div>
          <Link
            to="/rulebook?tab=checklist"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900"
          >
            <span>Full Statutory Checklist</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STATUTORY_EOA_DOCUMENTS.map((doc, idx) => (
            <div
              key={doc.key}
              className={`p-4 rounded-xl border bg-white shadow-xs space-y-2.5 transition-all ${
                selectedReqKey === doc.key ? 'border-teal-500 ring-1 ring-teal-500' : 'border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => setSelectedReqKey(selectedReqKey === doc.key ? null : doc.key)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{doc.name}</h3>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                  Mandatory
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {doc.description}
              </p>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  {doc.ruleId}
                </span>
                <span className="text-slate-500 font-medium truncate max-w-xs">
                  {doc.ruleCitation}
                </span>
              </div>
            </div>
          ))}

          {/* Conditional NBA Accreditation Requirement */}
          <div className="p-4 rounded-xl border border-dashed border-teal-300 bg-teal-50/30 shadow-xs space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">
                  5
                </span>
                <h3 className="text-sm font-bold text-slate-900">NBA Accreditation Award Letter</h3>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                Conditional
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Official accreditation certificate issued by the National Board of Accreditation. Mandatory only when claiming multi-year Extension of Approval benefits under Chapter II.
            </p>

            <div className="pt-2 border-t border-teal-200/50 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                AICTE-RULE-NBA-ACCRED
              </span>
              <span className="text-slate-500 font-medium">
                APH 2024–2027 Chapter II Clause 2.4
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Evidence-Based Scrutiny & Supported Formats Notice */}
      <section aria-labelledby="evidence-standards-heading" className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-teal-700" />
          <h2 id="evidence-standards-heading" className="text-sm font-bold text-slate-900">
            Document Evidence &amp; Verification Standards
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 pt-1">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-teal-700" />
              Supported File Formats
            </p>
            <p className="leading-relaxed text-slate-600 text-[11px]">
              High-resolution searchable or raster PDFs and common image formats (PNG, JPEG). Scanned files undergo automated contrast and text stream recovery.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-teal-700" />
              Cryptographic Signatures
            </p>
            <p className="leading-relaxed text-slate-600 text-[11px]">
              Verifies PKCS#7 / CMS digital signatures (RSA &amp; ECDSA P-256) embedded in PDFs. Validates X.509 certificate chains to recognized trust anchors.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Forensic Analysis
            </p>
            <p className="leading-relaxed text-slate-600 text-[11px]">
              Inspects files for incremental update modifications post-signing, structural PDF discrepancies, and pixel-level tampering indicators.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
