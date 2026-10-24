import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Send, Info } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { FormInput } from '../components/ui/FormInput';
import { FormSelect } from '../components/ui/FormSelect';
import { FormTextarea } from '../components/ui/FormTextarea';
import { NewApplicationFormData } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { createApplication } from '../services/applications';

export const NewApplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isConfigured } = useAuth();

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

    const { data, error } = await createApplication(formData, user.id);

    setIsSubmitting(false);

    if (error || !data) {
      setSubmitError(error?.message || 'Failed to create application. Please try again.');
    } else {
      // Navigate to details page of the newly created application
      navigate(`/applications/${data.id}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header with breadcrumbs */}
      <PageHeader
        title="Prepare Application Dossier"
        description="Initiate an application pre-validation dossier for multi-document authentication and compliance checks before formal submission."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'New Application' },
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
              Database Persistence Notice (Phase 2)
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

      {/* Main Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6"
      >
        <div className="space-y-4">
          <FormInput
            id="title"
            name="title"
            label="Application Title"
            isRequired
            placeholder="e.g., Annual Institution Accreditation & Compliance Review"
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
              label="Organisation / Institution Name"
              isRequired
              placeholder="e.g., National Technical Council"
              value={formData.institutionName}
              onChange={handleInputChange}
              error={errors.institutionName}
              helperText="Entity making the claims or submitting proofs."
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              id="registrationNumber"
              name="registrationNumber"
              label="Registration / Licence Number"
              placeholder="e.g., REG-2026-IND-8849 (Optional)"
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
              placeholder="e.g., India"
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
            label="Application Scope & Description"
            rows={4}
            placeholder="Outline the scope of the application, relevant regulatory circulars, or specific documents that will be provided..."
            value={formData.description}
            onChange={handleInputChange}
            helperText="Optional context to assist verification officers during inspection."
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
            Create & Persist Application
          </Button>
        </div>
      </form>
    </div>
  );
};
