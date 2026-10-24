import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  FileText,
  Building,
  Calendar,
  Hash,
  MapPin,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { ApplicationDocument, ExtractedFieldRecord } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';

interface ExtractedDossierSectionProps {
  applicationId: string;
  documents: ApplicationDocument[];
  onOpenExtractionModal: (doc: ApplicationDocument) => void;
}

export const ExtractedDossierSection: React.FC<ExtractedDossierSectionProps> = ({
  applicationId,
  documents,
  onOpenExtractionModal,
}) => {
  const [allFields, setAllFields] = useState<ExtractedFieldRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadAllFields() {
      if (!isSupabaseConfigured || !supabase || !applicationId) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('extracted_fields')
          .select('*')
          .eq('application_id', applicationId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          setAllFields(data as ExtractedFieldRecord[]);
        }
      } catch (err) {
        console.warn('[TypeNull] Failed to load application extracted fields:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAllFields();
  }, [applicationId, documents]);

  const extractedDocs = documents.filter((d) => d.processing_status === 'completed');
  const pendingDocs = documents.filter((d) => d.processing_status !== 'completed');

  const getFieldIcon = (name: string) => {
    switch (name) {
      case 'organisation_name':
      case 'applicant_name':
        return <Building className="w-4 h-4 text-teal-600" />;
      case 'registration_number':
        return <Hash className="w-4 h-4 text-indigo-600" />;
      case 'issue_date':
      case 'expiry_date':
        return <Calendar className="w-4 h-4 text-amber-600" />;
      case 'address':
        return <MapPin className="w-4 h-4 text-emerald-600" />;
      case 'issuing_authority':
        return <Shield className="w-4 h-4 text-sky-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 rounded-xl border border-slate-200 bg-white shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Extracted Intelligence &amp; Human Review
            </h3>
            <p className="text-xs text-slate-500">
              Normalized fields from uploaded documents awaiting or undergoing human audit
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200">
            {extractedDocs.length} of {documents.length} Extracted
          </span>
        </div>
      </div>

      {/* When no documents have been extracted yet */}
      {extractedDocs.length === 0 ? (
        <div className="p-6 rounded-lg bg-slate-50 border border-slate-200/80 text-center space-y-3">
          <Layers className="w-8 h-8 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-800">
              Extraction Pipeline Ready
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Select any document in the table above and click &ldquo;Extract Data&rdquo; to execute optical character recognition and identify candidate claims.
            </p>
          </div>
          {pendingDocs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenExtractionModal(pendingDocs[0])}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-teal-600" />}
            >
              Extract &lsquo;{pendingDocs[0].original_filename}&rsquo;
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Consolidated Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allFields.length === 0 && !isLoading && (
              <p className="text-xs text-slate-500 col-span-2 py-2">
                Documents have been extracted, but no candidate fields matched the statutory catalogue. You can view the raw text in each document&apos;s review dialog.
              </p>
            )}

            {allFields.map((field) => (
              <div
                key={field.id}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-md bg-white border border-slate-200 mt-0.5">
                    {getFieldIcon(field.field_name)}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      {field.field_label}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-900 block break-all">
                      {field.reviewed_value || field.extracted_value}
                    </span>
                    {field.evidence_snippet && (
                      <span className="text-[10px] text-slate-500 italic block line-clamp-1">
                        &ldquo;{field.evidence_snippet}&rdquo;
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={field.review_status} size="sm" />
                  <span className="text-[10px] font-mono text-slate-400">
                    p. {field.page_number}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick links to review each completed document */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500">
              Audit specific document evidence &amp; inspect raw OCR streams:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {extractedDocs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onOpenExtractionModal(doc)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-900 bg-teal-50 hover:bg-teal-100/80 px-2.5 py-1 rounded-md border border-teal-200 transition-colors"
                >
                  <span className="truncate max-w-[140px]">{doc.original_filename}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
