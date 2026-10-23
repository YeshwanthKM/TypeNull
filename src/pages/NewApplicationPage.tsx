import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Info, Send, FileCheck } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { FormInput } from '../components/ui/FormInput';
import { FormSelect } from '../components/ui/FormSelect';
import { FormTextarea } from '../components/ui/FormTextarea';
import { NewApplicationFormData } from '../types';

export const NewApplicationPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<NewApplicationFormData>({
    title: '',
    category: '',
    institutionName: '',
    registrationNumber: '',
    jurisdiction: 'India (Central & State Compliance)',
    description: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof NewApplicationFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

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
    // Clear error for field once user types
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Simulate instant client-side validation check
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmissionSuccess(true);
    }, 400);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header with breadcrumbs */}
      <PageHeader
        title="Create New Application"
        description="Initiate an institutional validation dossier for multi-document authentication and compliance verification."
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

      {/* Prototype Category Notice */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-teal-200 bg-teal-50/70 text-teal-900 text-xs leading-relaxed">
        <Info className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-teal-950">
            Phase 1 Prototype Notice
          </p>
          <p className="mt-0.5 text-teal-800">
            These application categories represent prototype workflow schemas. Official verification rules and automated compliance tests will be linked in upcoming phases.
          </p>
        </div>
      </div>

      {/* Submission Success Dialog / Modal */}
      {submissionSuccess && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative bg-white rounded-xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              Client-Side Validation Passed
            </h3>

            <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider mt-1 mb-3">
              Application Intake Staged: &ldquo;{formData.title}&rdquo;
            </p>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2 mb-6">
              <p className="font-semibold text-slate-900">Persistence Status Notice:</p>
              <p className="leading-relaxed">
                In accordance with Phase 1 development rules, this application was validated completely on the client side. Database persistence and file storage will be connected in Phase 2 with Supabase.
              </p>
              <p className="text-slate-500 text-[11px]">
                No mock data or fake records have been written to Supabase.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto"
              >
                Return to Dashboard
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate('/applications/preview-prototype-01')}
                leftIcon={<FileCheck className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Inspect Details Placeholder
              </Button>
            </div>
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
          />
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/dashboard')}
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
            Validate & Submit Intake
          </Button>
        </div>
      </form>
    </div>
  );
};
