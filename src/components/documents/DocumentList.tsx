import React, { useState } from 'react';
import {
  FileText,
  Trash2,
  Eye,
  AlertTriangle,
  Clock,
  Tag,
  Camera,
} from 'lucide-react';
import { ApplicationDocument, DocumentCategory } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { LoadingState } from '../ui/LoadingState';
import { formatBytes, deleteApplicationDocument } from '../../services/documents';

interface DocumentListProps {
  documents: ApplicationDocument[];
  isLoading: boolean;
  onOpenUploadModal: () => void;
  onPreviewDocument: (doc: ApplicationDocument) => void;
  onDocumentDeleted: (docId: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  isLoading,
  onOpenUploadModal,
  onPreviewDocument,
  onDocumentDeleted,
}) => {
  const [deletingDoc, setDeletingDoc] = useState<ApplicationDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!deletingDoc) return;

    setIsDeleting(true);
    setDeleteError(null);

    const { error } = await deleteApplicationDocument(deletingDoc);

    setIsDeleting(false);

    if (error) {
      setDeleteError(error.message);
    } else {
      onDocumentDeleted(deletingDoc.id);
      setDeletingDoc(null);
    }
  };

  const getCategoryLabel = (category: DocumentCategory | string): string => {
    const formatted = category.replace(/_/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  if (isLoading) {
    return <LoadingState message="Fetching application documents from secure vault..." rows={3} />;
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No Documents Uploaded Yet"
        description="Ingest verification documents using desktop upload or mobile camera capture. Once stored, credentials will be prepared for OCR text extraction and cross-document validation."
        action={
          <Button
            variant="primary"
            size="md"
            onClick={onOpenUploadModal}
            leftIcon={<Camera className="w-4 h-4" />}
          >
            Upload or Capture Document
          </Button>
        }
        note="Documents are stored in a private Supabase Storage vault with strict Row-Level Security."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Delete Confirmation Dialog */}
      {deletingDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Delete Stored Document?
                </h3>
                <p className="text-xs text-slate-500">
                  This action is permanent and irreversible.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900">{deletingDoc.original_filename}</strong> from your application dossier and storage vault?
            </p>

            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
                {deleteError}
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeletingDoc(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDelete}
                isLoading={isDeleting}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Document Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Document Filename &amp; Category
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Size &amp; Format
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Upload Date
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Processing Status
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {documents.map((doc) => {
                const isPdf = doc.mime_type === 'application/pdf';
                return (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Filename & Classification */}
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-900 block truncate max-w-xs sm:max-w-md">
                            {doc.original_filename}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <Tag className="w-3 h-3 text-slate-400" />
                            {getCategoryLabel(doc.document_type)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Size & MIME */}
                    <td className="px-6 py-4 text-slate-600 font-mono text-[11px]">
                      <div>{formatBytes(doc.file_size_bytes)}</div>
                      <div className="text-slate-400 uppercase text-[10px]">
                        {isPdf ? 'Portable Document (PDF)' : doc.mime_type.split('/')[1] || 'Image'}
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(doc.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                    </td>

                    {/* Processing Status Badge */}
                    <td className="px-6 py-4">
                      <StatusBadge status={doc.processing_status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPreviewDocument(doc)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                          title="Preview document"
                        >
                          Preview
                        </Button>

                        <button
                          type="button"
                          onClick={() => setDeletingDoc(doc)}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete document"
                          aria-label={`Delete ${doc.original_filename}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
