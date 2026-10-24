import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  Camera,
  FileText,
  AlertCircle,
  RefreshCw,
  Smartphone,
  Eye,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { FormSelect } from '../ui/FormSelect';
import { DocumentCategory, ApplicationDocument } from '../../types';
import {
  validateDocumentFile,
  uploadApplicationDocument,
  formatBytes,
} from '../../services/documents';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  userId: string;
  onUploadSuccess: (doc: ApplicationDocument) => void;
}

export const DOCUMENT_CATEGORY_OPTIONS = [
  { value: 'registration_certificate', label: 'Registration Certificate' },
  { value: 'identity_document', label: 'Identity Document (Aadhaar / Passport / Voter ID)' },
  { value: 'address_proof', label: 'Address Proof / Institutional Deed' },
  { value: 'tax_financial_document', label: 'Tax or Financial Statement (PAN / GSTIN / Audit)' },
  { value: 'application_form', label: 'Signed Application Form' },
  { value: 'supporting_evidence', label: 'Supporting Evidence / Affidavits' },
  { value: 'other', label: 'Other Regulatory Document' },
];

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  userId,
  onUploadSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('registration_certificate');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs to prevent browser memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!isOpen) return null;

  const handleFileSelection = (file: File | undefined) => {
    setError(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (!file) return;

    const validation = validateDocumentFile(file);
    if (!validation.isValid && validation.error) {
      setError(validation.error.message);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);

    // If image, create temporary local object URL for preview
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleResetSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select or capture a document to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const { data, error: uploadErr } = await uploadApplicationDocument({
      applicationId,
      userId,
      file: selectedFile,
      documentType: category,
    });

    setIsUploading(false);

    if (uploadErr || !data) {
      setError(uploadErr?.message || 'Failed to complete document ingestion.');
    } else {
      handleResetSelection();
      onUploadSuccess(data);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
    >
      <div className="relative bg-white rounded-xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            handleResetSelection();
            onClose();
          }}
          disabled={isUploading}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600 disabled:opacity-50"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center flex-shrink-0">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 id="upload-modal-title" className="text-lg font-bold text-slate-900 leading-tight">
              Ingest Verification Document
            </h2>
            <p className="text-xs text-slate-500">
              Upload PDF documents or capture physical credentials with your mobile camera.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-lg border border-red-200 bg-red-50 text-red-900 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold text-red-950">Validation Notice:</span>
              <p className="text-red-800 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-5">
          {/* Document Category Selection */}
          <FormSelect
            id="docCategory"
            name="docCategory"
            label="Document Classification"
            isRequired
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            options={DOCUMENT_CATEGORY_OPTIONS}
            helperText="Assign a category to guide automated rule evaluation in upcoming phases."
            disabled={isUploading}
          />

          {/* Hidden File Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            onChange={(e) => handleFileSelection(e.target.files?.[0])}
            className="hidden"
            id="hidden-file-input"
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileSelection(e.target.files?.[0])}
            className="hidden"
            id="hidden-camera-input"
          />

          {/* Action Trigger Buttons or Preview */}
          {!selectedFile ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Choose File Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-600 hover:bg-teal-50/40 text-slate-700 transition-all text-center group focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <FileText className="w-8 h-8 text-slate-400 group-hover:text-teal-700 mb-2 transition-colors" />
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-teal-900">
                    Choose File
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    PDF, JPG, or PNG (Max 10 MB)
                  </span>
                </button>

                {/* 2. Take Photo Button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-600 hover:bg-teal-50/40 text-slate-700 transition-all text-center group focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <Camera className="w-8 h-8 text-slate-400 group-hover:text-teal-700 mb-2 transition-colors" />
                  <span className="text-sm font-semibold text-slate-900 group-hover:text-teal-900">
                    Take Photo
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Mobile camera scanner
                  </span>
                </button>
              </div>

              {/* Mobile Photography Guidance */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Smartphone className="w-3.5 h-3.5 text-teal-700" />
                  <span>Tips for clear camera capture:</span>
                </div>
                <p className="leading-relaxed">
                  Hold device directly above document on a flat surface. Confirm adequate ambient lighting and ensure all text, signatures, and four page corners are sharp.
                </p>
              </div>
            </div>
          ) : (
            /* Selected File Preview Stage */
            <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0">
                    {previewUrl ? <Camera className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate max-w-xs sm:max-w-sm">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {formatBytes(selectedFile.size)} &bull; {selectedFile.type || 'Document'}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetSelection}
                  disabled={isUploading}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  className="self-end sm:self-auto"
                >
                  Retake / Change
                </Button>
              </div>

              {/* Image Preview Container */}
              {previewUrl && (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-black/5 max-h-56 flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Captured preview"
                    className="max-h-56 w-auto object-contain rounded"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-slate-900/80 text-white rounded text-[10px] font-mono flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    <span>Captured Preview</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                handleResetSelection();
                onClose();
              }}
              disabled={isUploading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!selectedFile || isUploading}
              isLoading={isUploading}
              leftIcon={<UploadCloud className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              {isUploading ? 'Uploading to Private Vault...' : 'Confirm & Upload Document'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
