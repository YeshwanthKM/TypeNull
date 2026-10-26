import React, { useState } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Send,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { respondToInformationRequest } from '../../services/institutionVerificationService';

export const InstitutionVerificationBanner: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  if (!profile) return null;

  const status = profile.verification_status || 'pending_verification';

  const handleSendResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseNotes.trim()) {
      setSubmitError('Please provide your clarification notes or details.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const { success, error } = await respondToInformationRequest(
      profile.id,
      responseNotes
    );

    setIsSubmitting(false);

    if (error || !success) {
      setSubmitError(error?.message || 'Failed to submit response. Please try again.');
    } else {
      setSubmitSuccess(true);
      setTimeout(async () => {
        setIsModalOpen(false);
        setSubmitSuccess(false);
        setResponseNotes('');
        await refreshProfile();
      }, 1200);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Pending Verification */}
      {status === 'pending_verification' && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-950 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 flex-shrink-0 mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-950">
                    Institution Registration Status: Pending AICTE Verification
                  </h3>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-mono">
                    Under Scrutiny
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 leading-relaxed max-w-2xl">
                  Your institutional profile is currently undergoing verification by an authorized AICTE Officer. You can safely prepare and save Extension of Approval (EoA) draft dossiers in the interim.
                </p>
                {profile.institution_name && (
                  <p className="text-[11px] text-amber-900/80 font-medium pt-1">
                    Registered as: <strong>{profile.institution_name}</strong> {profile.aicte_permanent_id ? `(AICTE PID: ${profile.aicte_permanent_id})` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Additional Info Required */}
      {status === 'additional_info_required' && (
        <div className="p-4 rounded-xl border border-orange-200 bg-orange-50 text-orange-950 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-700 flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-orange-950">
                    Action Required: Additional Information Requested by AICTE Officer
                  </h3>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300 font-mono">
                    Clarification Needed
                  </span>
                </div>
                {profile.verification_reason && (
                  <div className="p-2.5 rounded-lg bg-white/80 border border-orange-200 text-xs text-orange-900 font-mono">
                    <span className="font-sans font-bold text-[10px] uppercase text-orange-700 block mb-0.5">Officer Note:</span>
                    {profile.verification_reason}
                  </div>
                )}
                <p className="text-xs text-orange-800 leading-relaxed">
                  Please review the officer&apos;s request and provide the required clarification or supporting documentation.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<MessageSquare className="w-4 h-4" />}
              className="bg-orange-700 hover:bg-orange-800 text-white flex-shrink-0"
            >
              Respond to Officer
            </Button>
          </div>
        </div>
      )}

      {/* 3. Verified Institution */}
      {status === 'verified' && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-950 shadow-xs">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-emerald-950">
                    AICTE Verified Institution
                  </h3>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-emerald-800/90 leading-relaxed">
                  Institutional identity and Permanent ID verified for Extension of Approval (EoA) processing.
                  {profile.verified_at && (
                    <span className="ml-1 text-[11px] text-emerald-700">
                      (Verified: {new Date(profile.verified_at).toLocaleDateString()})
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-3 py-1.5 rounded-lg border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>EoA Eligible</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Rejected */}
      {status === 'rejected' && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-950 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 flex-shrink-0 mt-0.5">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-rose-950">
                  Institution Registration Rejected
                </h3>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-mono">
                  Rejected
                </span>
              </div>
              {profile.verification_reason && (
                <div className="p-2.5 rounded-lg bg-white/80 border border-rose-200 text-xs text-rose-900 font-mono">
                  <span className="font-sans font-bold text-[10px] uppercase text-rose-700 block mb-0.5">Officer Reason:</span>
                  {profile.verification_reason}
                </div>
              )}
              <p className="text-xs text-rose-800 leading-relaxed">
                Your institution registration was not approved. Please consult with your AICTE Regional Office or update your institutional profile in Account Settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Response Modal for Additional Information Request */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-teal-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Respond to AICTE Officer
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {profile.verification_reason && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700 block text-[11px] mb-1 uppercase tracking-wider">
                  Officer&apos;s Request:
                </span>
                <p className="text-slate-800 font-mono">{profile.verification_reason}</p>
              </div>
            )}

            {submitError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Response submitted! Updating status to Pending Verification...</span>
              </div>
            )}

            <form onSubmit={handleSendResponse} className="space-y-4">
              <div>
                <label htmlFor="responseNotes" className="block text-xs font-semibold text-slate-700 mb-1">
                  Clarification &amp; Response Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="responseNotes"
                  rows={4}
                  required
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Detail the corrections made, or explain how the requested requirement is satisfied..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-3 text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Submitting this response moves your registration back to Pending Verification for officer review.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Submit Clarification
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
