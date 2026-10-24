import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Cpu,
  FileText,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import {
  ApplicationDocument,
  DocumentExtractionRecord,
  ExtractedFieldRecord,
  FieldReviewStatus,
} from '../../types';
import {
  executeDocumentExtraction,
  fetchDocumentExtraction,
  updateExtractedFieldReview,
  batchConfirmFields,
} from '../../services/extraction';
import { ExtractionReviewCard } from './ExtractionReviewCard';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { LoadingState } from '../ui/LoadingState';

interface DocumentExtractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApplicationDocument | null;
  userId: string;
  onDocumentStatusChanged?: (docId: string, newStatus: ApplicationDocument['processing_status']) => void;
}

export const DocumentExtractionModal: React.FC<DocumentExtractionModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  userId,
  onDocumentStatusChanged,
}) => {
  const [extraction, setExtraction] = useState<DocumentExtractionRecord | null>(null);
  const [fields, setFields] = useState<ExtractedFieldRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [isBatchConfirming, setIsBatchConfirming] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    if (!doc) return;
    setIsLoading(true);
    setErrorMsg(null);

    const { extraction: extData, fields: fieldsData, error } =
      await fetchDocumentExtraction(doc.id);

    setIsLoading(false);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setExtraction(extData);
      setFields(fieldsData);
    }
  }, [doc]);

  useEffect(() => {
    if (isOpen && doc) {
      loadData();
    } else {
      setExtraction(null);
      setFields([]);
      setErrorMsg(null);
      setIsProcessing(false);
      setShowRawText(false);
    }
  }, [isOpen, doc, loadData]);

  if (!isOpen || !doc) return null;

  const handleStartExtraction = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setProgressMsg('Initialising intelligence pipeline...');

    const { extraction: extRecord, fields: extractedFields, error } =
      await executeDocumentExtraction(doc, userId, (msg) => {
        setProgressMsg(msg);
      });

    setIsProcessing(false);

    if (error) {
      setErrorMsg(error.message);
      onDocumentStatusChanged?.(doc.id, 'failed');
    } else {
      setExtraction(extRecord);
      setFields(extractedFields);
      onDocumentStatusChanged?.(doc.id, 'completed');
    }
  };

  const handleUpdateField = async (
    fieldId: string,
    reviewedValue: string,
    status: FieldReviewStatus
  ) => {
    const { error } = await updateExtractedFieldReview(fieldId, reviewedValue, status);
    if (error) {
      throw error;
    }
    // Update local state
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? {
              ...f,
              reviewed_value: reviewedValue,
              review_status: status,
              updated_at: new Date().toISOString(),
            }
          : f
      )
    );
  };

  const handleBatchConfirmAll = async () => {
    const unconfirmedIds = fields
      .filter((f) => f.review_status !== 'confirmed')
      .map((f) => f.id);

    if (unconfirmedIds.length === 0) return;

    setIsBatchConfirming(true);
    const { error } = await batchConfirmFields(unconfirmedIds);
    setIsBatchConfirming(false);

    if (!error) {
      setFields((prev) =>
        prev.map((f) => ({
          ...f,
          review_status: 'confirmed',
          updated_at: new Date().toISOString(),
        }))
      );
    }
  };

  const needsReviewCount = fields.filter((f) => f.review_status === 'needs_review').length;
  const confirmedCount = fields.filter((f) => f.review_status === 'confirmed').length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
    >
      <div className="relative bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal-100/70 border border-teal-200 text-teal-800 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-teal-700" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                  Document Intelligence: {doc.original_filename}
                </h3>
                <StatusBadge status={doc.processing_status} size="sm" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                PDF text stream parsing &bull; Tesseract OCR &bull; Provenance audit
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="self-end sm:self-auto p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Active Processing State */}
          {isProcessing && (
            <div className="p-8 rounded-xl border border-teal-200 bg-teal-50/50 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-teal-600 border-t-transparent animate-spin mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  Processing Document Pipeline
                </h4>
                <p className="text-xs text-teal-800 font-medium font-mono">
                  {progressMsg || 'Analysing document content...'}
                </p>
              </div>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Executing client-side OCR via Tesseract.js and PDF stream extraction. Private documents never leave your browser session unencrypted.
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && !isProcessing && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-semibold text-rose-950">Extraction Problem Detected</p>
                <p className="leading-relaxed">{errorMsg}</p>
                <div className="pt-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleStartExtraction}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Retry Extraction
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Initial State: Document Uploaded but Not Yet Extracted */}
          {!isProcessing && !extraction && !isLoading && (
            <div className="p-8 rounded-xl border border-slate-200 bg-white text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
                <Cpu className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-base font-bold text-slate-900">
                  Extraction Pipeline Ready
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Extract embedded text from digital PDFs or perform optical character recognition (OCR) on scanned documents and mobile camera photos to identify candidate regulatory fields.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStartExtraction}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
                  Run Document Intelligence &amp; OCR
                </Button>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
                <span>PDF Stream Extraction</span>
                <span>&bull;</span>
                <span>Tesseract.js OCR WASM</span>
                <span>&bull;</span>
                <span>Provenance Snippets</span>
                <span>&bull;</span>
                <span>Human Review Ready</span>
              </div>
            </div>
          )}

          {/* Loading Existing Extraction */}
          {isLoading && !isProcessing && (
            <LoadingState message="Retrieving extracted document intelligence..." rows={3} />
          )}

          {/* Extracted Results & Human Review Interface */}
          {!isProcessing && extraction && (
            <div className="space-y-6">
              {/* Classification & Provenance Banner */}
              <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-teal-50/50 via-white to-slate-50 p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-700" />
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800 block">
                        Document Classification Heuristic
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 capitalize">
                        {extraction.classified_type?.replace(/_/g, ' ') || 'General Evidence'}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {extraction.classification_confidence && (
                      <span className="text-xs font-mono font-bold text-teal-800 bg-teal-100/60 px-2.5 py-1 rounded-md border border-teal-200">
                        {Math.round(extraction.classification_confidence * 100)}% Match
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 uppercase">
                      Method: {extraction.extraction_method.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {extraction.classification_reason && (
                  <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-2.5">
                    <strong>Reasoning:</strong> {extraction.classification_reason}
                  </p>
                )}
              </div>

              {/* Review Statistics & Batch Actions Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Identified Fields: </span>
                    <strong className="text-slate-900 font-mono">{fields.length}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Needs Review: </span>
                    <strong className="text-amber-800 font-mono">{needsReviewCount}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Confirmed: </span>
                    <strong className="text-emerald-800 font-mono">{confirmedCount}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {needsReviewCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBatchConfirmAll}
                      isLoading={isBatchConfirming}
                      leftIcon={<CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                    >
                      Confirm All Fields ({needsReviewCount})
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleStartExtraction}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    title="Re-run OCR and text extraction on this file"
                  >
                    Re-extract
                  </Button>
                </div>
              </div>

              {/* Extracted Candidate Fields List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-700" />
                  Structured Fields for Human Review
                </h4>

                {fields.length === 0 ? (
                  <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                    No structured regulatory fields could be reliably parsed from this file. You may inspect the raw text below or upload a higher resolution document.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {fields.map((f) => (
                      <ExtractionReviewCard
                        key={f.id}
                        field={f}
                        onUpdateField={handleUpdateField}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Collapsible Raw Extracted Text Viewer */}
              {extraction.raw_text && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowRawText(!showRawText)}
                    className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      Raw Extracted Text Stream ({extraction.page_count} {extraction.page_count === 1 ? 'Page' : 'Pages'})
                    </span>
                    {showRawText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showRawText && (
                    <div className="p-4 bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap select-all">
                      {extraction.raw_text}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 text-center sm:text-left">
            <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Original raw extracted values are permanently preserved for regulatory compliance.</span>
          </div>

          <Button variant="outline" size="sm" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
