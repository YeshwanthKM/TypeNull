import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileText,
  Eye,
  X,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/Button';
import {
  ApplicationDocument,
  DocumentAuthenticityAssessment,
  DocumentExtractionRecord,
  ExtractedFieldRecord,
} from '../../types';
import {
  assessDocumentAuthenticity,
} from '../../services/documentAuthenticityService';

interface DocumentAuthenticitySectionProps {
  documents: ApplicationDocument[];
  extractions: DocumentExtractionRecord[];
  fields: ExtractedFieldRecord[];
  applicationId: string;
}

export const DocumentAuthenticitySection: React.FC<DocumentAuthenticitySectionProps> = ({
  documents,
  extractions,
  fields,
  applicationId,
}) => {
  const [assessments, setAssessments] = useState<Record<string, DocumentAuthenticityAssessment>>({});
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [inspectedAssessment, setInspectedAssessment] = useState<DocumentAuthenticityAssessment | null>(null);

  useEffect(() => {
    // Generate or fetch authenticity assessment for each document
    const newAssessments: Record<string, DocumentAuthenticityAssessment> = {};

    documents.forEach((doc) => {
      // Find matching extraction and fields
      const extraction = extractions.find((e) => e.document_id === doc.id);
      const docFields = fields.filter((f) => f.document_id === doc.id);

      const fieldMap: Record<string, string> = {};
      docFields.forEach((f) => {
        if (f.extracted_value) {
          fieldMap[f.field_name] = f.extracted_value;
        }
      });

      // Assess document
      const assessment = assessDocumentAuthenticity({
        documentId: doc.id,
        applicationId,
        originalFilename: doc.original_filename,
        rawText: extraction?.raw_text || doc.original_filename,
        extractedFields: fieldMap,
        targetRequirement: doc.document_type,
        pageCount: extraction?.page_count || 1,
      });

      newAssessments[doc.id] = assessment;
    });

    setAssessments(newAssessments);
    if (documents.length > 0 && !selectedDocId) {
      setSelectedDocId(documents[0].id);
    }
  }, [documents, extractions, fields, applicationId]);

  if (documents.length === 0) {
    return null;
  }

  const activeDoc = documents.find((d) => d.id === selectedDocId) || documents[0];
  const activeAssessment = activeDoc ? assessments[activeDoc.id] : null;

  const getDimensionBadge = (_label: string, status: string) => {
    switch (status) {
      case 'VERIFIED':
      case 'MATCH':
      case 'CONSISTENT':
      case 'COMPLIANT':
      case 'NO_ALTERATIONS_DETECTED':
      case 'VALID_SIGNATURE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {status}
          </span>
        );
      case 'SUSPICIOUS':
      case 'NON_COMPLIANT':
      case 'MALFORMED_OR_INVALID':
      case 'INCONSISTENT':
      case 'VERIFICATION_FAILED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            {status}
          </span>
        );
      case 'STRUCTURAL_MISMATCH':
      case 'FIELD_MISSING':
      case 'INCOMPLETE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            {status}
          </span>
        );
      case 'UNABLE_TO_VERIFY':
      case 'TEMPLATE_UNAVAILABLE':
      case 'INCONCLUSIVE':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle className="w-3 h-3 text-slate-500" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl border border-indigo-200 bg-white shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Document Reference &amp; Authenticity Verification
              </h3>
              <span className="text-[10px] uppercase font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                Autonomous Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Structural comparison against authoritative reference templates, alteration indicators, and issuing-authority verification.
            </p>
          </div>
        </div>

        {/* Document Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {documents.map((doc) => {
            const isSelected = doc.id === (activeDoc?.id || '');
            const docAssessment = assessments[doc.id];
            const isSuspicious =
              docAssessment?.statusDimensions.overallAuthenticity === 'SUSPICIOUS';

            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => setSelectedDocId(doc.id)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-800'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="max-w-[140px] truncate">{doc.original_filename}</span>
                {isSuspicious && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeAssessment && (
        <div className="space-y-4">
          {/* Selected Reference Banner */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">
                  Detected Document Type:
                </span>
                <span className="text-xs font-bold text-slate-900">
                  {activeAssessment.detectedDocumentType}
                </span>
                {activeAssessment.selectedReferenceProvenance === 'synthetic_demo' && (
                  <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                    SYNTHETIC DEMO REFERENCE
                  </span>
                )}
                {activeAssessment.selectedReferenceProvenance === 'official_gazette' && (
                  <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                    OFFICIAL GAZETTE PROFORMA
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {activeAssessment.readabilityStatus && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    activeAssessment.readabilityStatus === 'digital_text'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : activeAssessment.readabilityStatus === 'scanned_ocr'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : activeAssessment.readabilityStatus === 'password_protected'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {activeAssessment.readabilityStatus === 'digital_text' && 'Digital PDF'}
                    {activeAssessment.readabilityStatus === 'scanned_ocr' && 'Scanned OCR'}
                    {activeAssessment.readabilityStatus === 'password_protected' && 'Password Protected'}
                    {activeAssessment.readabilityStatus === 'unreadable' && 'Unreadable Scan'}
                    {activeAssessment.readabilityStatus === 'unsupported_format' && 'Unsupported Format'}
                    {activeAssessment.extractionConfidence !== undefined && activeAssessment.extractionConfidence !== null && (
                      <span className="ml-1 opacity-80">({Math.round(activeAssessment.extractionConfidence * 100)}%)</span>
                    )}
                  </span>
                )}
                <span className="text-slate-500">Reference:</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                  {activeAssessment.selectedReferenceVersion || 'UNAVAILABLE'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 italic">
              Selection Rationale: {activeAssessment.selectionReason}
            </p>

            {activeAssessment.normalizationNotes && activeAssessment.normalizationNotes.length > 0 && (
              <div className="pt-1 border-t border-slate-200/60 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-indigo-700">Transparent Normalizations:</span>
                <span>{activeAssessment.normalizationNotes.join(' • ')}</span>
              </div>
            )}

            {activeAssessment.unreadableFields && activeAssessment.unreadableFields.length > 0 && (
              <div className="pt-1 border-t border-slate-200/60 flex items-center gap-2 text-[11px] text-amber-700">
                <span className="font-semibold">Illegible Fields:</span>
                <span>{activeAssessment.unreadableFields.join(', ')}</span>
              </div>
            )}
          </div>

          {/* 7-Dimension Status Matrix */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Assessment Dimensions Breakdown
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
              {/* 1. Overall Authenticity */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Overall Authenticity
                </span>
                <div>
                  {getDimensionBadge(
                    'Overall',
                    activeAssessment.statusDimensions.overallAuthenticity
                  )}
                </div>
              </div>

              {/* 2. Template Comparison */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Template Comparison
                </span>
                <div>
                  {getDimensionBadge(
                    'Template',
                    activeAssessment.statusDimensions.templateComparison
                  )}
                </div>
              </div>

              {/* 3. Text Consistency */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Field Consistency
                </span>
                <div>
                  {getDimensionBadge(
                    'Fields',
                    activeAssessment.statusDimensions.textConsistency
                  )}
                </div>
              </div>

              {/* 4. Potential Alterations */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Alteration Indicators
                </span>
                <div>
                  {getDimensionBadge(
                    'Alterations',
                    activeAssessment.statusDimensions.alterationIndicators
                  )}
                </div>
              </div>

              {/* 5. QR & Signature */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Digital Signature / QR
                </span>
                <div>
                  {getDimensionBadge(
                    'Signature',
                    activeAssessment.statusDimensions.qrAndSignatureVerification
                  )}
                </div>
              </div>

              {/* 6. Issuing Authority */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Issuing Authority
                </span>
                <div>
                  {getDimensionBadge(
                    'Authority',
                    activeAssessment.statusDimensions.issuingAuthorityVerification
                  )}
                </div>
              </div>

              {/* 7. Application Compliance */}
              <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1 col-span-1 sm:col-span-2">
                <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                  Application Compliance
                </span>
                <div>
                  {getDimensionBadge(
                    'Compliance',
                    activeAssessment.statusDimensions.applicationCompliance
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Alteration Indicators Warnings if Any */}
          {activeAssessment.alterationIndicators.length > 0 && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-rose-900 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Observed Discrepancy &amp; Potential Alteration Indicators ({activeAssessment.alterationIndicators.length})</span>
              </div>
              <div className="space-y-1.5 pl-6">
                {activeAssessment.alterationIndicators.map((alt, i) => (
                  <div key={i} className="text-rose-800">
                    <span className="font-semibold">{alt.indicatorType}:</span> {alt.description}
                    <div className="text-[11px] text-rose-600 mt-0.5">
                      Evidence: {alt.evidence}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Next Action & Evidence Button */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block">Recommended Next Action:</span>
              <p className="text-slate-800 font-medium mt-0.5">
                {activeAssessment.recommendedNextAction}
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInspectedAssessment(activeAssessment)}
              className="flex items-center gap-1.5 text-xs whitespace-nowrap"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>Inspect Full Evidence Dossier</span>
            </Button>
          </div>
        </div>
      )}

      {/* Full Evidence Inspection Modal */}
      {inspectedAssessment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 max-h-[85vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Authenticity &amp; Reference Verification Evidence</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Document: {inspectedAssessment.originalFilename}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedAssessment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Structural Findings */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                1. Structural Layout Findings
              </h5>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Structural Aspect</th>
                      <th className="py-2 px-3">Expected</th>
                      <th className="py-2 px-3">Observed</th>
                      <th className="py-2 px-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {inspectedAssessment.structuralComparisonFindings.map((f, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-semibold text-slate-800">{f.aspect}</td>
                        <td className="py-2 px-3 text-slate-500">{f.expected}</td>
                        <td className="py-2 px-3 text-slate-700">{f.observed}</td>
                        <td className="py-2 px-3">
                          {f.matched ? (
                            <span className="text-emerald-700 font-semibold">Matched</span>
                          ) : (
                            <span className="text-rose-600 font-semibold">Discrepancy</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Field Comparison Findings */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                2. Field-by-Field Verification Findings
              </h5>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                    <tr>
                      <th className="py-2 px-3">Field Label</th>
                      <th className="py-2 px-3">Expected Regex</th>
                      <th className="py-2 px-3">Observed Value</th>
                      <th className="py-2 px-3">Finding Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {inspectedAssessment.fieldComparisonFindings.map((f, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-semibold text-slate-800">{f.label}</td>
                        <td className="py-2 px-3 font-mono text-slate-500 text-[10px]">
                          {f.expectedFormat || 'Any'}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-800">
                          {f.status === 'unreadable' ? (
                            <span className="text-amber-700 italic font-sans">&lt;Unreadable / Illegible&gt;</span>
                          ) : (
                            f.observedValue || '<Missing>'
                          )}
                          {f.rawObservedValue && f.normalizationApplied && (
                            <span className="block text-[9px] text-indigo-600 font-sans mt-0.5">
                              Raw: &quot;{f.rawObservedValue}&quot; ({f.normalizationApplied})
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`font-semibold capitalize ${
                              f.status === 'present_valid'
                                ? 'text-emerald-700'
                                : f.status === 'missing' || f.status === 'unreadable'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {f.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* QR & Digital Signature Notes */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                3. Cryptographic Signature &amp; QR Integrity
              </h5>
              <p className="text-slate-700">
                {inspectedAssessment.qrAndSignatureFindings.signatureDetails}
              </p>
              <p className="text-[11px] text-slate-500 italic">
                {inspectedAssessment.qrAndSignatureFindings.limitations}
              </p>
            </div>

            {/* Issuing Authority Verification */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                4. Issuing Authority Verification Status
              </h5>
              <p className="text-slate-700">
                Status: <strong className="font-semibold">{inspectedAssessment.issuerVerificationResult.status}</strong>
              </p>
              <p className="text-[11px] text-slate-600">
                {inspectedAssessment.issuerVerificationResult.details}
              </p>
              <p className="text-[11px] text-slate-400 italic">
                {inspectedAssessment.issuerVerificationResult.limitations}
              </p>
            </div>

            {/* Checks Not Performed */}
            <div className="space-y-1 text-slate-500 text-[11px]">
              <span className="font-semibold text-slate-700 block">
                Disclosed Limitations &amp; Checks Not Performed:
              </span>
              <ul className="list-disc pl-5 space-y-0.5">
                {inspectedAssessment.checksNotPerformed.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInspectedAssessment(null)}
              >
                Close Evidence Dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
