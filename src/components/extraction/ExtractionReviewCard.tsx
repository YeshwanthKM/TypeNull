import React, { useState } from 'react';
import {
  Check,
  Edit2,
  X,
  Quote,
  Cpu,
  FileText,
  AlertCircle,
  Save,
} from 'lucide-react';
import { ExtractedFieldRecord, FieldReviewStatus } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';

interface ExtractionReviewCardProps {
  field: ExtractedFieldRecord;
  onUpdateField: (fieldId: string, reviewedValue: string, status: FieldReviewStatus) => Promise<void>;
}

export const ExtractionReviewCard: React.FC<ExtractionReviewCardProps> = ({
  field,
  onUpdateField,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [valueDraft, setValueDraft] = useState(field.reviewed_value || field.extracted_value || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await onUpdateField(field.id, field.reviewed_value || field.extracted_value || '', 'confirmed');
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to confirm field value.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCorrection = async () => {
    if (!valueDraft.trim()) {
      setErrorMsg('Field value cannot be blank.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const isDifferent = valueDraft.trim() !== (field.extracted_value || '').trim();
      const newStatus: FieldReviewStatus = isDifferent ? 'corrected' : 'confirmed';
      await onUpdateField(field.id, valueDraft.trim(), newStatus);
      setIsEditing(false);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to save correction.');
    } finally {
      setIsSaving(false);
    }
  };

  const isOcr = field.extraction_method === 'ocr';
  const confidencePercent = field.confidence_score
    ? Math.round(field.confidence_score * 100)
    : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3.5 transition-all hover:border-slate-300">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-slate-900">{field.field_label}</h4>
            <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
              {field.field_name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Page {field.page_number}</span>
            <span>&bull;</span>
            <span className="inline-flex items-center gap-1 font-mono text-[10px]">
              {isOcr ? (
                <>
                  <Cpu className="w-3 h-3 text-purple-600" />
                  <span>Tesseract OCR</span>
                </>
              ) : (
                <>
                  <FileText className="w-3 h-3 text-teal-600" />
                  <span>PDF Text Stream</span>
                </>
              )}
            </span>
            {confidencePercent !== null && (
              <>
                <span>&bull;</span>
                <span
                  className={`font-mono text-[10px] font-semibold ${
                    confidencePercent >= 90
                      ? 'text-emerald-700'
                      : confidencePercent >= 75
                      ? 'text-amber-700'
                      : 'text-rose-700'
                  }`}
                >
                  {confidencePercent}% Confidence
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={field.review_status} size="sm" />
        </div>
      </div>

      {/* Provenance Evidence Snippet Box */}
      {field.evidence_snippet && (
        <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <Quote className="w-3 h-3 text-slate-400" />
            <span>Document Provenance Evidence</span>
          </div>
          <p className="font-mono text-[11px] text-slate-700 italic leading-snug break-words">
            &ldquo;{field.evidence_snippet}&rdquo;
          </p>
        </div>
      )}

      {/* Value Inspection & Edit Interface */}
      <div className="space-y-2">
        {isEditing ? (
          <div className="space-y-2">
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
              Human Reviewer Correction
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={valueDraft}
                onChange={(e) => setValueDraft(e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 border border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 bg-teal-50/20 text-slate-900"
                placeholder="Enter corrected value..."
                autoFocus
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveCorrection}
                isLoading={isSaving}
                leftIcon={<Save className="w-3.5 h-3.5" />}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setValueDraft(field.reviewed_value || field.extracted_value || '');
                  setIsEditing(false);
                }}
                disabled={isSaving}
                leftIcon={<X className="w-3.5 h-3.5" />}
              >
                Cancel
              </Button>
            </div>
            {field.extracted_value && (
              <span className="text-[10px] text-slate-500 block">
                Original raw extracted value: <strong className="font-mono text-slate-700">{field.extracted_value}</strong>
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                Extracted Field Value
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100/80 px-2.5 py-1 rounded-md border border-slate-200 break-all">
                  {field.reviewed_value || field.extracted_value || '(Empty value)'}
                </span>
                {field.review_status === 'corrected' && field.extracted_value && (
                  <span className="text-[10px] text-slate-400 line-through font-mono">
                    {field.extracted_value}
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              {field.review_status !== 'confirmed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleConfirm}
                  isLoading={isSaving}
                  leftIcon={<Check className="w-3.5 h-3.5 text-emerald-600" />}
                  className="hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50"
                >
                  Confirm Value
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setValueDraft(field.reviewed_value || field.extracted_value || '');
                  setIsEditing(true);
                }}
                disabled={isSaving}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit
              </Button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-200">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
