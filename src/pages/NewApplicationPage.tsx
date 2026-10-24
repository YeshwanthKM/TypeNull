import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  Send,
  Info,
  Globe,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
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
import { getPublishedGovernmentServices } from '../services/ingestion/ingestionService';
import { evaluateConditionalChecklist } from '../services/conditionalEvaluator';

export const NewApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isConfigured } = useAuth();

  // Published Government Services from the Knowledge Base
  const [publishedServices, setPublishedServices] = useState<GovernmentService[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');

  // Dynamic conditional answers state: { [questionCode]: answer }
  const [conditionalAnswers, setConditionalAnswers] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState<NewApplicationFormData>({
    title: '',
    category: '',
    institutionName: '',
    registrationNumber: '',
    jurisdiction: 'India (Central & State Compliance)',
    description: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof NewApplicationFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load published government services on mount and pre-select from URL params
  useEffect(() => {
    getPublishedGovernmentServices().then((srvs) => {
      setPublishedServices(srvs);

      const serviceParam = searchParams.get('serviceId') || searchParams.get('serviceCode');
      const variantParam = searchParams.get('variantId') || searchParams.get('variantCode');

      if (serviceParam && srvs.length > 0) {
        const foundSrv = srvs.find(
          (s) => s.id === serviceParam || s.serviceCode === serviceParam
        );
        if (foundSrv && foundSrv.applicationTypes.length > 0) {
          setSelectedServiceId(foundSrv.id);

          const foundVariant =
            (variantParam &&
              foundSrv.applicationTypes.find(
                (v) => v.id === variantParam || v.variantCode === variantParam
              )) ||
            foundSrv.applicationTypes[0];

          setSelectedVariantId(foundVariant.id);

          setFormData((prev) => ({
            ...prev,
            title: foundVariant.applicationName,
            category: (foundSrv.category as ApplicationCategory) || 'general_registration',
            institutionName: foundSrv.department,
            jurisdiction: foundSrv.jurisdiction,
            description: foundSrv.description,
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
      }
    });
  }, [searchParams]);

  // Selected Service and Variant objects
  const selectedService = useMemo(
    () => publishedServices.find((s) => s.id === selectedServiceId),
    [publishedServices, selectedServiceId]
  );

  const selectedVariant: ServiceApplicationType | undefined = useMemo(() => {
    if (!selectedService || selectedService.applicationTypes.length === 0) return undefined;
    if (selectedVariantId) {
      return selectedService.applicationTypes.find((v) => v.id === selectedVariantId) || selectedService.applicationTypes[0];
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

      // Auto-fill form fields based on official service registry
      setFormData((prev) => ({
        ...prev,
        title: primaryVariant.applicationName,
        category: (srv.category as ApplicationCategory) || 'general_registration',
        institutionName: srv.department,
        jurisdiction: srv.jurisdiction,
        description: srv.description,
      }));

      // Initialize default conditional answers
      const initialAnswers: Record<string, any> = {};
      (primaryVariant.conditionalQuestions || []).forEach((q) => {
        const key = q.questionCode || q.questionKey || q.id;
        initialAnswers[key] = q.defaultValue || (q.responseType === 'boolean' || q.questionType === 'boolean' ? 'no' : '');
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
    { value: 'general_registration', label: 'General Registration' },
    { value: 'organisation_registration', label: 'Organisation Registration' },
    { value: 'institution_registration', label: 'Institution Registration' },
    { value: 'certificate_verification', label: 'Certificate Verification' },
    { value: 'regulatory_application', label: 'Regulatory Application' },
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
      newErrors.institutionName = 'Organisation or institution name is required.';
    }

    if (!formData.jurisdiction.trim()) {
      newErrors.jurisdiction = 'Country or jurisdiction is required.';
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

    // Embed structured service metadata & answers for downstream validation engine
    const metadataPayload = {
      userNotes: formData.description.trim(),
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
        title="Prepare Application Dossier"
        description="Select an official Indian government service or custom category to receive an individualized required document checklist and run pre-validation compliance checks."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Explore Applications', href: '/applications/explore' },
          { label: 'Prepare Application' },
        ]}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Dashboard
          </Button>
        }
      />

      {/* Supabase Unconfigured Warning */}
      {!isConfigured && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs leading-relaxed">
          <Info className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-950">
              Database Persistence Notice
            </p>
            <p className="mt-0.5 text-amber-800">
              Real application storage requires configuring your Supabase project in <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">.env</code>. Submissions will validate client-side contracts and require Supabase credentials for persistence.
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

      {/* SECTION 1: OFFICIAL GOVERNMENT SERVICE DISCOVERY SELECTOR */}
      <div className="p-6 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/60 via-white to-slate-50 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
              <Globe className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Select Authoritative Government Service (Knowledge Base)
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full border border-indigo-200">
            SIH 2026 Engine
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Choose a verified official Indian government service to automatically populate statutory compliance requirements, answer situational questions, and receive a tailored document checklist.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => handleServiceSelect('')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              !selectedServiceId
                ? 'border-indigo-600 bg-white ring-1 ring-indigo-600 shadow-sm'
                : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
            }`}
          >
            <div className="font-bold text-xs text-slate-900">Custom / General Application</div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Configure dossier fields and categories manually without a government template.
            </p>
          </button>

          {publishedServices.map((srv) => {
            const isSelected = selectedServiceId === srv.id;
            return (
              <button
                key={srv.id}
                type="button"
                onClick={() => handleServiceSelect(srv.id)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-white ring-1 ring-indigo-600 shadow-sm'
                    : 'border-slate-200 bg-white/70 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {srv.serviceCode}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Verified
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-900 mt-1">{srv.serviceName}</div>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{srv.department}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: DYNAMIC CONDITIONAL QUESTIONS (IF SERVICE SELECTED) */}
      {selectedVariant && (selectedVariant.conditionalQuestions || []).length > 0 && (
        <div className="p-6 rounded-2xl border border-indigo-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Situational &amp; Conditional Eligibility Questions
            </h3>
            <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              Tailors Document Checklist
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {selectedVariant.conditionalQuestions.map((q) => {
              const qKey = q.questionCode || q.questionKey || q.id;
              const currentVal = conditionalAnswers[qKey];

              return (
                <div
                  key={q.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2"
                >
                  <label className="block font-semibold text-slate-900">
                    {q.questionText}
                  </label>
                  {q.helpText && <p className="text-[11px] text-slate-500">{q.helpText}</p>}

                  {/* Radio options for boolean */}
                  {(q.questionType === 'boolean' || q.responseType === 'boolean') ? (
                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name={qKey}
                          value="yes"
                          checked={currentVal === 'yes'}
                          onChange={() => handleAnswerChange(qKey, 'yes')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-700">Yes</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name={qKey}
                          value="no"
                          checked={currentVal === 'no'}
                          onChange={() => handleAnswerChange(qKey, 'no')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-slate-700">No</span>
                      </label>
                    </div>
                  ) : (
                    <select
                      value={currentVal || ''}
                      onChange={(e) => handleAnswerChange(qKey, e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:ring-1 focus:ring-indigo-600"
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

      {/* SECTION 3: PERSONALIZED REQUIRED DOCUMENT CHECKLIST (LIVE PREVIEW) */}
      {personalizedChecklist && (
        <div className="p-6 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Personalized Document Checklist ({personalizedChecklist.totalRequiredCount} Required)
              </h3>
            </div>
            <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
              Live Tailored Preview
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Mandatory Documents */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-white space-y-2">
              <span className="font-bold text-emerald-900 text-[11px] uppercase tracking-wider block">
                Mandatory Base Documents ({personalizedChecklist.mandatoryDocuments.length})
              </span>
              <ul className="space-y-1.5">
                {personalizedChecklist.mandatoryDocuments.map((doc, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">{doc.documentName}</span>
                      <span className="block text-[10px] font-mono text-slate-400">
                        Canonical: {doc.canonicalDocumentKey || doc.documentType}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Conditional Documents (Triggered by applicant answers) */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-white space-y-2">
              <span className="font-bold text-amber-900 text-[11px] uppercase tracking-wider block">
                Conditional Documents Activated ({personalizedChecklist.conditionalDocuments.length})
              </span>
              {personalizedChecklist.conditionalDocuments.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">
                  No additional conditional documents triggered based on your current answers.
                </p>
              ) : (
                <ul className="space-y-2">
                  {personalizedChecklist.conditionalDocuments.map((cDoc, idx) => (
                    <li key={idx} className="p-2 rounded-lg bg-amber-50/70 border border-amber-200">
                      <span className="font-semibold text-slate-900 block">
                        {cDoc.requirement.documentName}
                      </span>
                      <span className="text-[10px] text-amber-800 block mt-0.5">
                        Triggered because: {cDoc.triggeredByQuestion} = <strong>{String(cDoc.userAnswer)}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Alternative Document Options */}
            {personalizedChecklist.alternativeDocumentGroups.length > 0 && (
              <div className="p-3.5 rounded-xl border border-blue-200 bg-white space-y-2 md:col-span-2">
                <span className="font-bold text-blue-900 text-[11px] uppercase tracking-wider block">
                  Accepted Alternative Document Options
                </span>
                <div className="space-y-1.5">
                  {personalizedChecklist.alternativeDocumentGroups.map((group, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-900">{group.groupName}</span>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Provide any 1 of: {group.options[0]?.acceptedAlternatives?.join(' OR ') || 'Official proof'}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-semibold">
                        1 of Any
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: DOSSIER PARTICULARS FORM */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="space-y-4">
          <FormInput
            id="title"
            name="title"
            label="Application Title"
            isRequired
            placeholder="e.g., Corporate Incorporation & Registration (SPICe+)"
            value={formData.title}
            onChange={handleInputChange}
            error={errors.title}
            helperText="A descriptive title summarizing this validation dossier."
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
              helperText="Determines the target regulatory checklist."
              disabled={isSubmitting}
            />

            <FormInput
              id="institutionName"
              name="institutionName"
              label="Organisation / Department Name"
              isRequired
              placeholder="e.g., Ministry of Corporate Affairs (MCA)"
              value={formData.institutionName}
              onChange={handleInputChange}
              error={errors.institutionName}
              helperText="Authority receiving or inspecting the dossier."
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              id="registrationNumber"
              name="registrationNumber"
              label="Registration / Reference Code"
              placeholder="e.g., CIN / GSTIN / Reference (Optional)"
              value={formData.registrationNumber}
              onChange={handleInputChange}
              helperText="Government or institutional reference code if applicable."
              disabled={isSubmitting}
            />

            <FormInput
              id="jurisdiction"
              name="jurisdiction"
              label="Country / Jurisdiction"
              isRequired
              placeholder="e.g., India (Central)"
              value={formData.jurisdiction}
              onChange={handleInputChange}
              error={errors.jurisdiction}
              helperText="Applicable legal framework for compliance verification."
              disabled={isSubmitting}
            />
          </div>

          <FormTextarea
            id="description"
            name="description"
            label="Applicant Remarks & Scope Description"
            rows={3}
            placeholder="Add any specific context, operational locations, or details for pre-validation inspection..."
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
