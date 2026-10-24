import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { ApplicationDocument } from '../../types';
import { createDocumentSignedUrl, formatBytes } from '../../services/documents';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: ApplicationDocument | null;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document: doc,
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !doc) {
      setSignedUrl(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    // Request 15-minute temporary signed URL
    createDocumentSignedUrl(doc.storage_path, 900)
      .then(({ signedUrl: url, error: err }) => {
        if (!isMounted) return;
        setIsLoading(false);
        if (err || !url) {
          setError(err?.message || 'Failed to generate secure preview URL.');
        } else {
          setSignedUrl(url);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsLoading(false);
        setError(err.message || 'An unexpected preview error occurred.');
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const isPdf = doc.mime_type === 'application/pdf' || doc.original_filename.toLowerCase().endsWith('.pdf');
  const isImage = doc.mime_type.startsWith('image/');

  const handleDownload = async () => {
    // Generate signed download URL with original filename
    const { signedUrl: downloadUrl, error: downloadErr } = await createDocumentSignedUrl(
      doc.storage_path,
      300,
      doc.original_filename
    );

    if (downloadErr || !downloadUrl) {
      alert(`Download failed: ${downloadErr?.message || 'Unable to generate download URL'}`);
      return;
    }

    const link = window.document.createElement('a');
    link.href = downloadUrl;
    link.download = doc.original_filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
    >
      <div className="relative bg-white rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0">
              {isPdf ? <FileText className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </div>
            <div className="space-y-0.5 min-w-0">
              <h3 id="preview-modal-title" className="text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md">
                {doc.original_filename}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {formatBytes(doc.file_size_bytes)} &bull; {doc.mime_type} &bull; Signed 15m Token
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              leftIcon={<Download className="w-3.5 h-3.5" />}
              title="Download private document"
            >
              Download
            </Button>
            {signedUrl && (
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm"
              >
                <span>Full Tab</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-600"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-100 flex items-center justify-center min-h-[380px] max-h-[75vh]">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-slate-600 text-xs py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-700" />
              <span>Decrypting private storage object &amp; generating signed token...</span>
            </div>
          ) : error ? (
            <div className="p-6 rounded-lg bg-red-50 border border-red-200 text-red-900 max-w-md text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
              <h4 className="font-semibold text-sm">Preview Access Denied or Expired</h4>
              <p className="text-xs text-red-700 leading-relaxed">{error}</p>
            </div>
          ) : signedUrl ? (
            isImage ? (
              <div className="flex items-center justify-center w-full h-full">
                <img
                  src={signedUrl}
                  alt={doc.original_filename}
                  className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm bg-white"
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={signedUrl}
                title={doc.original_filename}
                className="w-full h-[68vh] rounded-lg border border-slate-300 bg-white shadow-sm"
              />
            ) : (
              <div className="text-center p-8 bg-white rounded-lg border border-slate-200 max-w-sm space-y-3">
                <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="font-semibold text-sm text-slate-900">Binary Preview Unavailable</h4>
                <p className="text-xs text-slate-500">
                  This document format cannot be embedded inline. Please download the file to inspect its contents.
                </p>
                <Button variant="primary" size="sm" onClick={handleDownload}>
                  Download Document
                </Button>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
};
