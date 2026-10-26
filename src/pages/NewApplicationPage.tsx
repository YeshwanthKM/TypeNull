import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  Send,
  Info,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
  BookOpen,
  ShieldAlert,
  Award,
  FileText,
  Building,
  Calendar,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { FormInput } from '../components/ui/FormInput';
import { FormSelect } from '../components/ui/FormSelect';
import { FormTextarea } from '../components/ui/FormTextarea';
import {
  ApplicationCategory,
  GovernmentService,
  NewApplicationFormData,
  PersonalizedChecklistResult,
  ServiceApplicationType,
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { createApplication } from '../services/applications';
import { getActiveGovernmentServices } from '../services/ingestion/ingestionService';
import { evaluateConditionalChecklist } from '../services/conditionalEvaluator';

interface RulebookTraceabilityInfo {
  ruleId: string;
  ruleTitle: string;
  sourceDoc: string;
  officialReference: string;
}

const AICTE_RULEBOOK_TRACES: Record<string, RulebookTraceabilityInfo> = {
  affidavit: {
    ruleId: 'AICTE-RULE-AFFIDAVIT-1',
    ruleTitle: 'Form 1 Statutory Compliance Affidavit',
    sourceDoc: 'Approval Process Handbook (APH) 2024–2027',
    officialReference: 'Appendix 17 (Sworn Affidavit Format on Non-Judicial Stamp Paper)',
  },
  land: {
    ruleId: 'AICTE-RULE-LAND-BUILTUP',
    ruleTitle: 'Land & Built-up Area Certification Norms',
    sourceDoc: 'Approval Process Handbook (APH) 2024–2027',
    officialReference: 'Appendix 4 & Clause 2.1 (Architect / Municipal Completion Certificate)',
  },
  faculty: {
    ruleId: 'AICTE-RULE-FACULTY-CADRE',
    ruleTitle: 'Faculty Cadre Ratio & Qualification Verification',
    sourceDoc: 'APH 2024–2027 & Gazette 2019',
    officialReference: 'Appendix 7 & Gazette Notification F.No. 61-1/RIFD/7th CPC/2016-17',
  },
  financial: {
    ruleId: 'AICTE-RULE-FIN-UDIN',
    ruleTitle: 'Audited Financial Statements with CA UDIN Mandate',
    sourceDoc: 'APH 2024–2027 & ICAI Mandate',
    officialReference: 'Chapter I & Gazette Mandate on 18-digit Unique Document Identification Number',
  },
  nba: {
    ruleId: 'AICTE-RULE-NBA-ACCRED',
    ruleTitle: 'NBA Accreditation Multi-Year Approval Eligibility',
    sourceDoc: 'APH 2024–2027',
    officialReference: 'Chapter II Clause 2.4 (Multi-Year Approval Eligibility Criteria)',
  },
};

function getRulebookTraceability(docName: string, canonicalKey?: string): RulebookTraceabilityInfo | null {
  const text = (docName + ' ' + (canonicalKey || '')).toLowerCase();
  if (text.includes('affidavit') || text.includes('form 1') || text.includes('statutory_declaration')) {
    return AICTE_RULEBOOK_TRACES.affidavit;
  }
  if (text.includes('land') || text.includes('built-up') || text.includes('utility_bill')) {
    return AICTE_RULEBOOK_TRACES.land;
  }
  if (text.includes('faculty') || text.includes('cadre') || text.includes('bio-data')) {
    return AICTE_RULEBOOK_TRACES.faculty;
  }
  if (text.includes('financial') || text.includes('audited') || text.includes('udin') || text.includes('incorporation_certificate')) {
    return AICTE_RULEBOOK_TRACES.financial;
  }
  if (text.includes('nba') || text.includes('accredit')) {
    return AICTE_RULEBOOK_TRACES.nba;
  }
  return null;
}

export const NewApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, isConfigured } = useAuth();

  // Published Government Services from the Knowledge Base (strictly active, non-archived)
  const [publishedServices, setPublishedServices] = useState<GovernmentService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');

  // Dynamic conditional answers state: { [questionCode]: answer }
  const [conditionalAnswers, setConditionalAnswers] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState<NewApplicationFormData>({
    title: 'AICTE Extension of Approval (EoA) 2026–27',
    category: 'regulatory_application',
    institutionName: '',
    registrationNumber: '',
    jurisdiction: 'India (Central Approval Bureau)',
    description: 'Extension of Approval dossier prepared for AICTE compliance scrutiny and document authenticity verification.',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof NewApplicationFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-fill profile details when available
  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        institutionName: prev.institutionName || profile.institution_name || '',
        registrationNumber: prev.registrationNumber || profile.aicte_permanent_id || '',
      }));
    }
  }, [profile]);

  // Load published government services on mount and pre-select AICTE EoA
  useEffect(() => {
    getActiveGovernmentServices().then((srvs) => {
      setPublishedServices(srvs);

      const serviceParam = searchParams.get('serviceId') || searchParams.get('serviceCode');
      const variantParam = searchParams.get('variantId') || searchParams.get('variantCode');

      let targetSrv: GovernmentService | undefined;

      if (serviceParam && srvs.length > 0) {
        targetSrv = srvs.find((s) => s.id === serviceParam || s.serviceCode === serviceParam);
      }

      // Default to AICTE Extension of Approval service
      if (!targetSrv && srvs.length > 0) {
        targetSrv = srvs.find((s) => s.serviceCode === 'AICTE-SRV-EOA') || srvs[0];
      }

      if (targetSrv && targetSrv.applicationTypes.length > 0) {
        setSelectedServiceId(targetSrv.id);

        const foundVariant =
          (variantParam &&
            targetSrv.applicationTypes.find(
              (v) => v.id === variantParam || v.variantCode === variantParam
            )) ||
          targetSrv.applicationTypes[0];

        setSelectedVariantId(foundVariant.id);

        setFormData((prev) => ({
          ...prev,
          title: foundVariant.applicationName,
          category: (targetSrv!.category as ApplicationCategory) || 'regulatory_application',
          institutionName: prev.institutionName || profile?.institution_name || targetSrv!.department,
          registrationNumber: prev.registrationNumber || profile?.aicte_permanent_id || '',
          jurisdiction: targetSrv!.jurisdiction,
          description: targetSrv!.description,
        }));

        const initialAnswers: Record<string, any> = {};
        (foundVariant.conditionalQuestions || []).forEach((q) => {
          const key = q.questionCode || q.questionKey || q.id;
          initialAnswers[key] =
            q.defaultValue ||
            (q.responseType === 'boolean' || q.questionType === 'boolean' ? 'no' : '');
        });
        setConditionalAnswers(initialAnswers);
      }
    });
  }, [searchParams, profile]);

  // Selected Service and Variant objects
  const selectedService = useMemo(
    () => publishedServices.find((s) => s.id === selectedServiceId),
    [publishedServices, selectedServiceId]
  );

  const selectedVariant: ServiceApplicationType | undefined = useMemo(() => {
    if (!selectedService || selectedService.applicationTypes.length === 0) return undefined;
    if (selectedVariantId) {
      return (
        selectedService.applicationTypes.find((v) => v.id === selectedVariantId) ||
        selectedService.applicationTypes[0]
      );
    }
    return selectedService.applicationTypes[0];
  }, [selectedService, selectedVariantId]);

  // Handle service selection change
  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    if (!serviceId) {
      setSelectedVariantId('');
      setConditionalAnswers({});
      return;
    }

    const srv = publishedServices.find((s) => s.id === serviceId);
    if (srv && srv.applicationTypes.length > 0) {
      const primaryVariant = srv.applicationTypes[0];
      setSelectedVariantId(primaryVariant.id);

      setFormData((prev) => ({
        ...prev,
        title: primaryVariant.applicationName,
        category: (srv.category as ApplicationCategory) || 'regulatory_application',
        jurisdiction: srv.jurisdiction,
        description: srv.description,
      }));

      const initialAnswers: Record<string, any> = {};
      (primaryVariant.conditionalQuestions || []).forEach((q) => {
        const key = q.questionCode || q.questionKey || q.id;
        initialAnswers[key] =
          q.defaultValue ||
          (q.responseType === 'boolean' || q.questionType === 'boolean' ? 'no' : '');
      });
      setConditionalAnswers(initialAnswers);
    }
  };

  // Handle answering dynamic conditional questions
  const handleAnswerChange = (questionKey: string, value: any) => {
    setConditionalAnswers((prev) => ({
      ...prev,
      [questionKey]: value,
    }));
  };

  // Evaluate tailored checklist in real time
  const personalizedChecklist: PersonalizedChecklistResult | null = useMemo(() => {
    if (!selectedVariant) return null;
    return evaluateConditionalChecklist({
      applicationType: selectedVariant,
      userAnswers: conditionalAnswers,
      uploadedDocumentTypes: [],
    });
  }, [selectedVariant, conditionalAnswers]);

  const categoryOptions = [
    { value: 'regulatory_application', label: 'AICTE Extension of Approval (EoA)' },
    { value: 'institution_registration', label: 'Institution Registration' },
    { value: 'general_registration', label: 'General Technical Approval' },
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof NewApplicationFormData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof NewApplicationFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Application title is required.';
    } else if (formData.title.trim().length < 4) {
      newErrors.title = 'Title must be at least 4 characters.';
    }

    if (!formData.category) {
      newErrors.category = 'Please select an application category.';
    }

    if (!formData.institutionName.trim()) {
      newErrors.institutionName = 'Institution name is required.';
    }

    if (!formData.jurisdiction.trim()) {
      newErrors.jurisdiction = 'Jurisdiction is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    if (!user) {
      setSubmitError('Authentication required. Please sign in to create and persist an application.');
      return;
    }

    if (!isConfigured) {
      setSubmitError(
        'Supabase is not configured in this environment. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to persist records.'
      );
      return;
    }

    setIsSubmitting(true);

    const metadataPayload = {
      userNotes: formData.description.trim(),
      academicYear: '2026-2027',
      regulatoryCycle: 'APH 2024–2027 (Multi-Year Approval Norms)',
      governmentService: selectedService
        ? {
            id: selectedService.id,
            serviceCode: selectedService.serviceCode,
            serviceName: selectedService.serviceName,
            variantCode: selectedVariant?.variantCode,
            applicationTypeId: selectedVariant?.id,
            conditionalAnswers,
          }
        : null,
    };

    const submissionFormData: NewApplicationFormData = {
      ...formData,
      description: JSON.stringify(metadataPayload),
    };

    const { data, error } = await createApplication(submissionFormData, user.id);

    setIsSubmitting(false);

    if (error || !data) {
      setSubmitError(error?.message || 'Failed to create application. Please try again.');
    } else {
      navigate(`/applications/${data.id}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with breadcrumbs */}
      <PageHeader
        title="Prepare AICTE EoA Application Dossier"
        description="Assemble statutory compliance documentation for Extension of Approval (EoA 2026–27) under official AICTE Approval Process Handbook (APH) 2024–2027 regulations."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'AICTE Rulebook', href: '/rulebook' },
          { label: 'Prepare EoA Dossier' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/rulebook')}
              leftIcon={<BookOpen className="w-4 h-4 text-indigo-600" />}
            >
              Browse AICTE Rulebook
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Dashboard
            </Button>
          </div>
        }
      />

      {/* STATUTORY DISCLAIMER BANNER */}
      <div className="p-4 sm:p-5 rounded-2xl border border-amber-300 bg-amber-50/70 text-amber-950 text-xs shadow-sm space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Statutory AICTE Submission Boundary &amp; Prototype Notice</span>
        </div>
        <p className="text-amber-800 leading-relaxed">
          TypeNull is an AI-powered institutional validation and document authenticity platform designed for institutional validation demonstration. Assembling and verifying a dossier here conducts automated forensic checks, regulatory compliance assessments, and rulebook traceability. <strong>Creating or submitting a dossier inside TypeNull does NOT constitute direct filing to the official AICTE web portal (aicte-india.org).</strong> Institutional authorities must complete their statutory submissions through the official AICTE National Portal.
        </p>
      </div>

      {/* Supabase Unconfigured Warning */}
      {!isConfigured && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs leading-relaxed">
          <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-950">Database Persistence Notice</p>
            <p className="mt-0.5 text-amber-800">
              Real application storage requires configuring your Supabase project in{' '}
              <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env</code>.
            </p>
          </div>
        </div>
      )}

      {/* Error alert if submission failed */}
      {submitError && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-red-950">Submission Error</p>
            <p className="text-red-800 leading-relaxed">{submitError}</p>
          </div>
        </div>
      )}

      {/* SECTION 1: AICTE REGULATORY CATEGORY SELECTOR */}
      <div className="p-4 sm:p-6 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/60 via-white to-slate-50 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white flex-shrink-0">
              <BookOpen className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              AICTE Regulatory Framework (APH 2024–2027)
            </h3>
          </div>
          <span className="self-start sm:self-auto text-[10px] font-mono font-bold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full border border-indigo-200">
            Multi-Year Approval Norms
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          The Approval Process Handbook 2024–2027 establishes a multi-year regulatory block. Select the active Extension of Approval (EoA) category below to review verified statutory requirements.
        </p>

        {/* Primary AICTE EoA Application Tile */}
        <div className="grid grid-cols-1 gap-3 pt-1">
          {publishedServices.map((srv) => {
            const isSelected = selectedServiceId === srv.id;
            return (
              <div
                key={srv.id}
                onClick={() => handleServiceSelect(srv.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20 shadow-sm'
                    : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {srv.serviceCode}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active &amp; Verified
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    APH 2024–2027 Chapter II
                  </span>
                </div>
                <div className="font-bold text-sm text-slate-900 mt-2">{srv.serviceName}</div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{srv.description}</p>
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-slate-400" />
                    {srv.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Academic Year 2026–2027
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Other AICTE Categories (Marked Inactive / Unsupported with Clear Reasons) */}
        <div className="pt-2">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
            Other AICTE Application Categories (Demonstration Prototype Scope)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 text-xs opacity-75">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-[11px]">New Technical Institution</span>
                <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                  INACTIVE
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Requires physical Scrutiny Committee &amp; Expert Visit Committee (EVC) under APH Chapter I. Unverified for online self-declaration.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 text-xs opacity-75">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-[11px]">Intake Increase / New Course</span>
                <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                  UNSUPPORTED
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Contingent on NBA accreditation validity and cadre ratio compliance under APH Chapter II.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 text-xs opacity-75">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 text-[11px]">Institution Closure / Shift</span>
                <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                  UNSUPPORTED
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Requires Trust/Society Governing Resolution and State Government NOC under APH Chapter II.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: SITUATIONAL QUESTIONS & MULTI-YEAR ACCREDITATION CHECK */}
      {selectedVariant && (selectedVariant.conditionalQuestions || []).length > 0 && (
        <div className="p-4 sm:p-6 rounded-2xl border border-indigo-200 bg-white shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>Institutional Accreditation &amp; Situational Conditions</span>
            </h3>
            <span className="self-start sm:self-auto text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              APH Clause 2.4 Multi-Year Rule
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {selectedVariant.conditionalQuestions.map((q) => {
              const qKey = q.questionCode || q.questionKey || q.id;
              const currentVal = conditionalAnswers[qKey];

              return (
                <div
                  key={q.id}
                  className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="font-semibold text-slate-900 text-xs leading-snug">
                      {q.questionText}
                    </label>
                    <button
                      type="button"
                      onClick={() => navigate('/rulebook?ruleId=AICTE-RULE-NBA-ACCRED')}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex-shrink-0"
                    >
                      <BookOpen className="w-3 h-3" />
                      View Rule
                    </button>
                  </div>
                  {q.helpText && <p className="text-[11px] text-slate-500">{q.helpText}</p>}

                  {/* Radio options for boolean */}
                  {q.questionType === 'boolean' || q.responseType === 'boolean' ? (
                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-2 min-h-[44px] cursor-pointer py-1 px-3 rounded-lg hover:bg-slate-100/70 transition-colors border border-slate-200 bg-white">
                        <input
                          type="radio"
                          name={qKey}
                          value="yes"
                          checked={currentVal === 'yes'}
                          onChange={() => handleAnswerChange(qKey, 'yes')}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-slate-800">Yes, accredited</span>
                      </label>
                      <label className="flex items-center gap-2 min-h-[44px] cursor-pointer py-1 px-3 rounded-lg hover:bg-slate-100/70 transition-colors border border-slate-200 bg-white">
                        <input
                          type="radio"
                          name={qKey}
                          value="no"
                          checked={currentVal === 'no'}
                          onChange={() => handleAnswerChange(qKey, 'no')}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-700">No active NBA accreditation</span>
                      </label>
                    </div>
                  ) : (
                    <select
                      value={currentVal || ''}
                      onChange={(e) => handleAnswerChange(qKey, e.target.value)}
                      className="w-full sm:w-auto px-3 py-2 rounded-lg border border-slate-300 bg-white text-base sm:text-xs focus:ring-1 focus:ring-indigo-600"
                    >
                      {(q.options || []).map((opt, oIdx) => {
                        const optVal = typeof opt === 'string' ? opt : opt.value;
                        const optLabel = typeof opt === 'string' ? opt : opt.label;
                        return (
                          <option key={oIdx} value={optVal}>
                            {optLabel}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: STATUTORY REQUIRED DOCUMENT CHECKLIST & RULEBOOK TRACEABILITY */}
      {personalizedChecklist && (
        <div className="p-4 sm:p-6 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Statutory Document Checklist ({personalizedChecklist.totalRequiredCount} Required)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Verified against AICTE Approval Process Handbook (APH) 2024–2027
                </span>
              </div>
            </div>
            <span className="self-start sm:self-auto text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
              Regulatory Traceability Active
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Mandatory Documents */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-white space-y-3">
              <span className="font-bold text-emerald-900 text-[11px] uppercase tracking-wider block">
                Mandatory Base Documents ({personalizedChecklist.mandatoryDocuments.length})
              </span>
              <div className="space-y-2.5">
                {personalizedChecklist.mandatoryDocuments.map((doc, idx) => {
                  const trace = getRulebookTraceability(doc.documentName, doc.canonicalDocumentKey);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">
                            {doc.documentName}
                          </span>
                          {trace && (
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              Statutory Citation: <strong className="text-slate-700">{trace.officialReference}</strong>
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                            Canonical Key: {doc.canonicalDocumentKey || doc.documentType}
                          </span>
                        </div>
                      </div>

                      {trace && (
                        <button
                          type="button"
                          onClick={() => navigate(`/rulebook?ruleId=${trace.ruleId}`)}
                          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex-shrink-0"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>View in Rulebook</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Conditional Documents (Triggered by applicant answers) */}
            <div className="p-4 rounded-xl border border-amber-200 bg-white space-y-3">
              <span className="font-bold text-amber-900 text-[11px] uppercase tracking-wider block">
                Conditional Documents ({personalizedChecklist.conditionalDocuments.length} Activated)
              </span>
              {personalizedChecklist.conditionalDocuments.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  No conditional documents activated. If you select NBA Accreditation above, the NBA Award Letter requirement will be dynamically added.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {personalizedChecklist.conditionalDocuments.map((cDoc, idx) => {
                    const trace = getRulebookTraceability(
                      cDoc.requirement.documentName,
                      cDoc.requirement.canonicalDocumentKey
                    );
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-2.5">
                          <Award className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">
                              {cDoc.requirement.documentName}
                            </span>
                            <span className="text-[10px] text-amber-900 block mt-0.5">
                              Triggered by condition: <strong>{cDoc.triggeredByQuestion} = {String(cDoc.userAnswer)}</strong>
                            </span>
                            {trace && (
                              <span className="text-[11px] text-slate-600 block mt-0.5">
                                Statutory Citation: <strong className="text-slate-800">{trace.officialReference}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {trace && (
                          <button
                            type="button"
                            onClick={() => navigate(`/rulebook?ruleId=${trace.ruleId}`)}
                            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors flex-shrink-0"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>View in Rulebook</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: DOSSIER PARTICULARS FORM */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-8 shadow-sm space-y-6"
      >
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Institutional Particulars</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Details will be bound to your application dossier for forensic document verification.
          </p>
        </div>

        <div className="space-y-4">
          <FormInput
            id="title"
            name="title"
            label="Application Dossier Title"
            isRequired
            placeholder="e.g., Extension of Approval (EoA) 2026–27 Dossier"
            value={formData.title}
            onChange={handleInputChange}
            error={errors.title}
            helperText="A descriptive title summarizing this institutional dossier."
            disabled={isSubmitting}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormSelect
              id="category"
              name="category"
              label="Application Category"
              isRequired
              options={categoryOptions}
              value={formData.category}
              onChange={handleInputChange}
              error={errors.category}
              placeholder="Select application category"
              helperText="Determines the target AICTE regulatory checklist."
              disabled={isSubmitting}
            />

            <FormInput
              id="institutionName"
              name="institutionName"
              label="Institution Full Name"
              isRequired
              placeholder="e.g., Bharat Institute of Technology & Science"
              value={formData.institutionName}
              onChange={handleInputChange}
              error={errors.institutionName}
              helperText="Institution name registered with AICTE."
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              id="registrationNumber"
              name="registrationNumber"
              label="AICTE Permanent ID"
              placeholder="e.g., 1-1234567890 (Permanent Institute ID)"
              value={formData.registrationNumber}
              onChange={handleInputChange}
              helperText="Assigned by AICTE during initial approval."
              disabled={isSubmitting}
            />

            <FormInput
              id="jurisdiction"
              name="jurisdiction"
              label="Regulatory Authority / Jurisdiction"
              isRequired
              placeholder="e.g., India (Central Approval Bureau)"
              value={formData.jurisdiction}
              onChange={handleInputChange}
              error={errors.jurisdiction}
              helperText="Statutory authority evaluating this compliance dossier."
              disabled={isSubmitting}
            />
          </div>

          <FormTextarea
            id="description"
            name="description"
            label="Institutional Scope & Notes for Verification Officer"
            rows={3}
            placeholder="Specify any relevant notes such as multi-year approval claim, pending NBA renewals, or campus details..."
            value={formData.description}
            onChange={handleInputChange}
            helperText="Context to assist verification officers during inspection."
            disabled={isSubmitting}
          />
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            leftIcon={<Send className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Create Dossier &amp; Receive Checklist
          </Button>
        </div>
      </form>
    </div>
  );
};
