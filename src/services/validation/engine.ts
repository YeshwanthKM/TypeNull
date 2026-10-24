import {
  ApplicationDocument,
  DocumentExtractionRecord,
  ExtractedFieldRecord,
  ScreeningOutcome,
  ValidationFinding,
  ValidationRun,
  ValidationSummaryCounts,
} from '../../types';
import { getKnowledgeBaseEntry, KnowledgeBaseEntry } from '../knowledgeBase';

export interface ValidationEngineInput {
  applicationId: string;
  category: string;
  applicationMetadata?: {
    title?: string;
    organisation_name?: string;
    registration_number?: string | null;
    jurisdiction?: string;
  };
  documents: ApplicationDocument[];
  extractions?: DocumentExtractionRecord[];
  fields?: ExtractedFieldRecord[];
}

/**
 * Calculates string similarity between two names using token set comparison
 */
function calculateNameSimilarity(a: string, b: string): number {
  const cleanA = a
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\b(private|pvt|limited|ltd|llp|inc|corp|corporation)\b/g, '')
    .trim();
  const cleanB = b
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
    .replace(/\b(private|pvt|limited|ltd|llp|inc|corp|corporation)\b/g, '')
    .trim();

  if (!cleanA || !cleanB) return 0;
  if (cleanA === cleanB) return 1.0;
  if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return 0.85;

  const tokensA = new Set(cleanA.split(/\s+/).filter(Boolean));
  const tokensB = new Set(cleanB.split(/\s+/).filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionCount = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) intersectionCount++;
  });

  const unionSize = new Set([...tokensA, ...tokensB]).size;
  return intersectionCount / unionSize;
}

/**
 * Normalizes date string into Date object
 */
function parseDateSafe(val?: string | null): Date | null {
  if (!val) return null;
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Shared TypeNull Validation Engine
 * Evaluates dossier documents and extracted intelligence against Knowledge Base requirements.
 */
export function runValidationEngine(input: ValidationEngineInput): ValidationRun {
  const {
    applicationId,
    category,
    applicationMetadata = {},
    documents = [],
    extractions = [],
    fields = [],
  } = input;

  const kb: KnowledgeBaseEntry = getKnowledgeBaseEntry(category);
  const findings: ValidationFinding[] = [];

  // Helper map: group fields by field_name (pick reviewed_value or extracted_value)
  const fieldMap = new Map<string, Array<{ value: string; docId: string; snippet?: string; page?: number }>>();
  for (const f of fields) {
    const val = (f.reviewed_value || f.extracted_value || '').trim();
    if (val) {
      const list = fieldMap.get(f.field_name) || [];
      list.push({
        value: val,
        docId: f.document_id,
        snippet: f.evidence_snippet || undefined,
        page: f.page_number,
      });
      fieldMap.set(f.field_name, list);
    }
  }

  // Helper map: document extractions by document_id
  const extractionMap = new Map<string, DocumentExtractionRecord>();
  for (const ext of extractions) {
    extractionMap.set(ext.document_id, ext);
  }

  // -------------------------------------------------------------
  // 1. Mandatory Supporting Document Checklist
  // -------------------------------------------------------------
  for (const reqDoc of kb.mandatoryDocuments) {
    const matchingDocs = documents.filter((d) => d.document_type === reqDoc.type);
    const ruleId = `DOC-REQ-${reqDoc.type.toUpperCase()}`;

    if (matchingDocs.length === 0) {
      findings.push({
        id: `finding-${ruleId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ruleId,
        ruleVersion: kb.version,
        title: `Mandatory Document Missing: ${reqDoc.name}`,
        status: 'failed',
        severity: 'blocking',
        explanation: `Statutory requirement: Application lacks ${reqDoc.name}. ${reqDoc.description}`,
        expectedValue: `Uploaded file of category "${reqDoc.type}" (${reqDoc.acceptableFormats.join(', ')})`,
        observedValue: 'No document uploaded',
        recommendedAction: `Upload a clear, legible copy of ${reqDoc.name} in PDF or image format.`,
        isBlocking: true,
        requiresManualReview: false,
        referenceCitation: `${kb.citation.authority} (${kb.citation.statute}, ${kb.citation.section})`,
      });
    } else {
      const targetDoc = matchingDocs[0];
      findings.push({
        id: `finding-${ruleId}-pass-${Math.random().toString(36).slice(2, 6)}`,
        ruleId,
        ruleVersion: kb.version,
        title: `Mandatory Document Present: ${reqDoc.name}`,
        status: 'passed',
        severity: 'info',
        explanation: `${reqDoc.name} is uploaded and registered in dossier.`,
        sourceDocument: targetDoc.original_filename,
        expectedValue: reqDoc.name,
        observedValue: `${targetDoc.original_filename} (${targetDoc.document_type})`,
        isBlocking: false,
        requiresManualReview: false,
        referenceCitation: kb.citation.statute,
      });
    }
  }

  // -------------------------------------------------------------
  // 2. Document Processing & Extraction Quality Warnings
  // -------------------------------------------------------------
  for (const doc of documents) {
    const ext = extractionMap.get(doc.id);

    if (doc.processing_status === 'failed' || ext?.extraction_status === 'failed') {
      findings.push({
        id: `finding-EXT-FAIL-${doc.id}`,
        ruleId: 'OCR-QUAL-FAIL',
        ruleVersion: kb.version,
        title: `Text Extraction Failed: ${doc.original_filename}`,
        status: 'unable_to_check',
        severity: 'major',
        explanation: `Automated OCR and PDF parser could not extract text from "${doc.original_filename}". Error: ${
          ext?.error_message || 'Unreadable stream or rasterization failure'
        }`,
        sourceDocument: doc.original_filename,
        recommendedAction: 'Upload a higher-contrast digital document scan (300 DPI or vector PDF).',
        isBlocking: false,
        requiresManualReview: true,
      });
    } else if (ext && (!ext.raw_text || ext.raw_text.trim().length < 20)) {
      findings.push({
        id: `finding-EXT-EMPTY-${doc.id}`,
        ruleId: 'OCR-QUAL-LOW',
        ruleVersion: kb.version,
        title: `Low Text Density / Scanned Image Warning: ${doc.original_filename}`,
        status: 'warning',
        severity: 'minor',
        explanation: `Fewer than 20 characters could be extracted from "${doc.original_filename}". If this is a photo scan, ensure text is legible.`,
        sourceDocument: doc.original_filename,
        recommendedAction: 'Verify document readability under human review.',
        isBlocking: false,
        requiresManualReview: true,
      });
    }
  }

  // -------------------------------------------------------------
  // 3. Required Fields & Regulatory Format Validation
  // -------------------------------------------------------------
  for (const reqField of kb.mandatoryFields) {
    const ruleId = `FLD-${reqField.fieldName.toUpperCase()}`;
    const extractedItems = fieldMap.get(reqField.fieldName) || [];

    // Fallback: check application declared metadata
    let observedValue = extractedItems[0]?.value || '';
    let evidenceSnippet = extractedItems[0]?.snippet;
    let sourceDocId = extractedItems[0]?.docId;
    let pageNum = extractedItems[0]?.page;

    if (!observedValue) {
      if (reqField.fieldName === 'organisation_name' && applicationMetadata.organisation_name) {
        observedValue = applicationMetadata.organisation_name;
      } else if (
        reqField.fieldName === 'registration_number' &&
        applicationMetadata.registration_number
      ) {
        observedValue = applicationMetadata.registration_number;
      }
    }

    if (!observedValue) {
      findings.push({
        id: `finding-${ruleId}-missing-${Math.random().toString(36).slice(2, 6)}`,
        ruleId,
        ruleVersion: kb.version,
        title: `Required Field Missing: ${reqField.label}`,
        status: 'failed',
        severity: 'major',
        explanation: `Mandatory statutory field "${reqField.label}" was not detected in submitted documents or metadata.`,
        expectedValue: reqField.example,
        observedValue: 'Missing / Unspecified',
        recommendedAction: `Ensure ${reqField.label} is clearly visible on primary documentary proofs.`,
        isBlocking: true,
        requiresManualReview: false,
        referenceCitation: kb.citation.statute,
      });
      continue;
    }

    // Regex format check
    if (reqField.regexPattern) {
      const regex = new RegExp(reqField.regexPattern, 'i');
      const matches = regex.test(observedValue.trim());
      const sourceDocName = documents.find((d) => d.id === sourceDocId)?.original_filename;

      if (!matches) {
        findings.push({
          id: `finding-${ruleId}-format-${Math.random().toString(36).slice(2, 6)}`,
          ruleId,
          ruleVersion: kb.version,
          title: `Statutory Format Discrepancy: ${reqField.label}`,
          status: 'failed',
          severity: 'blocking',
          explanation: `Value "${observedValue}" violates required statutory format: ${reqField.description}`,
          expectedValue: `Matches regex pattern /${reqField.regexPattern}/ (e.g. ${reqField.example})`,
          observedValue: observedValue,
          sourceDocument: sourceDocName,
          sourcePage: pageNum,
          evidenceSnippet,
          recommendedAction: `Correct ${reqField.label} to strictly match the regulatory identifier format.`,
          isBlocking: true,
          requiresManualReview: false,
          referenceCitation: kb.citation.statute,
        });
      } else {
        findings.push({
          id: `finding-${ruleId}-pass-${Math.random().toString(36).slice(2, 6)}`,
          ruleId,
          ruleVersion: kb.version,
          title: `Valid Statutory Format: ${reqField.label}`,
          status: 'passed',
          severity: 'info',
          explanation: `${reqField.label} conforms to the prescribed regulatory syntax (${observedValue}).`,
          expectedValue: reqField.example,
          observedValue: observedValue,
          sourceDocument: sourceDocName,
          sourcePage: pageNum,
          evidenceSnippet,
          isBlocking: false,
          requiresManualReview: false,
          referenceCitation: kb.citation.statute,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // 4. Date & Temporal Validity Checks
  // -------------------------------------------------------------
  const issueDates = fieldMap.get('issue_date') || [];
  const expiryDates = fieldMap.get('expiry_date') || [];

  const parsedIssue = parseDateSafe(issueDates[0]?.value);
  const parsedExpiry = parseDateSafe(expiryDates[0]?.value);
  const now = new Date();

  if (parsedIssue) {
    if (parsedIssue.getTime() > now.getTime() + 86400000) {
      findings.push({
        id: `finding-DATE-FUTURE-${Math.random().toString(36).slice(2, 6)}`,
        ruleId: 'DATE-VAL-FUTURE',
        ruleVersion: kb.version,
        title: 'Anomalous Future Issue Date',
        status: 'failed',
        severity: 'major',
        explanation: `Issue date (${issueDates[0]?.value}) is in the future relative to verification timestamp.`,
        observedValue: issueDates[0]?.value,
        expectedValue: 'Historical or contemporary date',
        isBlocking: true,
        requiresManualReview: true,
      });
    }
  }

  if (parsedExpiry) {
    if (parsedExpiry.getTime() < now.getTime()) {
      findings.push({
        id: `finding-DATE-EXPIRED-${Math.random().toString(36).slice(2, 6)}`,
        ruleId: 'DATE-VAL-EXPIRED',
        ruleVersion: kb.version,
        title: 'Document Validity Expired',
        status: 'failed',
        severity: 'blocking',
        explanation: `Document expired on ${expiryDates[0]?.value}. Credential is no longer active for regulatory compliance.`,
        observedValue: expiryDates[0]?.value,
        expectedValue: 'Future expiry date',
        recommendedAction: 'Upload renewed or current documentary credential.',
        isBlocking: true,
        requiresManualReview: false,
      });
    } else {
      findings.push({
        id: `finding-DATE-EXPIRY-PASS-${Math.random().toString(36).slice(2, 6)}`,
        ruleId: 'DATE-VAL-ACTIVE',
        ruleVersion: kb.version,
        title: 'Document Validity Active',
        status: 'passed',
        severity: 'info',
        explanation: `Document is active and valid until ${expiryDates[0]?.value}.`,
        observedValue: expiryDates[0]?.value,
        isBlocking: false,
        requiresManualReview: false,
      });
    }
  }

  if (parsedIssue && parsedExpiry && parsedExpiry.getTime() <= parsedIssue.getTime()) {
    findings.push({
      id: `finding-DATE-INVERSION-${Math.random().toString(36).slice(2, 6)}`,
      ruleId: 'DATE-VAL-ORDER',
      ruleVersion: kb.version,
      title: 'Inverted Temporal Sequence',
      status: 'failed',
      severity: 'blocking',
      explanation: `Expiry date (${expiryDates[0]?.value}) cannot precede or equal issue date (${issueDates[0]?.value}).`,
      observedValue: `Issue: ${issueDates[0]?.value}, Expiry: ${expiryDates[0]?.value}`,
      isBlocking: true,
      requiresManualReview: true,
    });
  }

  // -------------------------------------------------------------
  // 5. Cross-Document Consistency Checking
  // -------------------------------------------------------------
  // Check A: Declared Entity Name vs Extracted Document Name
  const declaredOrg = (applicationMetadata.organisation_name || '').trim();
  const extractedOrgs = fieldMap.get('organisation_name') || [];

  if (declaredOrg && extractedOrgs.length > 0) {
    const extractedOrgVal = extractedOrgs[0].value;
    const similarity = calculateNameSimilarity(declaredOrg, extractedOrgVal);
    const sourceDocName = documents.find((d) => d.id === extractedOrgs[0].docId)?.original_filename;

    if (similarity >= 0.75) {
      findings.push({
        id: `finding-XDOC-NAME-MATCH-${Math.random().toString(36).slice(2, 6)}`,
        ruleId: 'XDOC-NAME-ALIGN',
        ruleVersion: kb.version,
        title: 'Corporate / Entity Name Alignment Verified',
        status: 'passed',
        severity: 'info',
        explanation: `Application entity name "${declaredOrg}" matches extracted documentary evidence (${Math.round(
          similarity * 100
        )}% token congruence).`,
        observedValue: extractedOrgVal,
        expectedValue: declaredOrg,
        sourceDocument: sourceDocName,
        evidenceSnippet: extractedOrgs[0].snippet,
        isBlocking: false,
        requiresManualReview: false,
      });
    } else {
      findings.push({
        id: `finding-XDOC-NAME-MISMATCH-${Math.random().toString(36).slice(2, 6)}`,
        ruleId: 'XDOC-NAME-ALIGN',
        ruleVersion: kb.version,
        title: 'Entity Name Inconsistency Across Documents',
        status: 'failed',
        severity: 'major',
        explanation: `Declared name "${declaredOrg}" diverges from extracted document name "${extractedOrgVal}".`,
        observedValue: extractedOrgVal,
        expectedValue: declaredOrg,
        sourceDocument: sourceDocName,
        evidenceSnippet: extractedOrgs[0].snippet,
        recommendedAction: 'Verify that the uploaded certificate corresponds to the exact entity declared.',
        isBlocking: true,
        requiresManualReview: true,
      });
    }
  }

  // Check B: GSTIN & PAN Embedding Consistency (Digits 3-12 of GSTIN must equal 10-digit PAN)
  const regNumbers = fieldMap.get('registration_number') || [];
  const gstinCandidate = regNumbers.find((r) =>
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(r.value)
  );
  const panCandidate = regNumbers.find((r) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(r.value));

  if (gstinCandidate && panCandidate) {
    const gstinPanSlice = gstinCandidate.value.slice(2, 12).toUpperCase();
    const cleanPan = panCandidate.value.trim().toUpperCase();

    if (gstinPanSlice === cleanPan) {
      findings.push({
        id: `finding-XDOC-GST-PAN-MATCH-${Math.random().toString(36).slice(2, 6)}`,
        ruleId: 'XDOC-GST-PAN-ALIGN',
        ruleVersion: kb.version,
        title: 'GSTIN Embedded PAN Concurrency Verified',
        status: 'passed',
        severity: 'info',
        explanation: `GSTIN embedded PAN (${gstinPanSlice}) matches standalone PAN credential (${cleanPan}) perfectly.`,
        observedValue: gstinPanSlice,
        expectedValue: cleanPan,
        isBlocking: false,
        requiresManualReview: false,
        referenceCitation: 'CGST Rules 2017, Rule 8',
      });
    } else {
      findings.push({
        id: `finding-XDOC-GST-PAN-DIFF-${Math.random().toString(36).slice(2, 6)}`,
        ruleId: 'XDOC-GST-PAN-ALIGN',
        ruleVersion: kb.version,
        title: 'GSTIN and PAN Mismatch Detected',
        status: 'failed',
        severity: 'blocking',
        explanation: `The PAN embedded inside GSTIN (${gstinPanSlice}) does not match the submitted PAN document (${cleanPan}).`,
        observedValue: gstinPanSlice,
        expectedValue: cleanPan,
        recommendedAction: 'Ensure submitted GST registration belongs to the same corporate or individual PAN.',
        isBlocking: true,
        requiresManualReview: false,
        referenceCitation: 'CGST Rules 2017, Rule 8',
      });
    }
  }

  // -------------------------------------------------------------
  // 6. Duplicate Document Detection
  // -------------------------------------------------------------
  const filenameMap = new Map<string, ApplicationDocument>();
  for (const doc of documents) {
    const lowerName = doc.original_filename.toLowerCase();
    if (filenameMap.has(lowerName)) {
      const prior = filenameMap.get(lowerName)!;
      findings.push({
        id: `finding-DUP-${doc.id}`,
        ruleId: 'DOC-DUP-CHECK',
        ruleVersion: kb.version,
        title: `Possible Duplicate Document Uploaded: ${doc.original_filename}`,
        status: 'warning',
        severity: 'minor',
        explanation: `Files "${doc.original_filename}" and "${prior.original_filename}" have identical names and may represent redundant uploads.`,
        sourceDocument: doc.original_filename,
        recommendedAction: 'Remove duplicate files and upload distinct required documentary proofs.',
        isBlocking: false,
        requiresManualReview: false,
      });
    } else {
      filenameMap.set(lowerName, doc);
    }
  }

  // -------------------------------------------------------------
  // 7. Calculate Counts and Final 4-Category Outcome
  // -------------------------------------------------------------
  const counts: ValidationSummaryCounts = {
    passed: findings.filter((f) => f.status === 'passed').length,
    warnings: findings.filter((f) => f.status === 'warning').length,
    minorIssues: findings.filter((f) => f.status === 'failed' && f.severity === 'minor').length,
    majorIssues: findings.filter((f) => f.status === 'failed' && (f.severity === 'blocking' || f.severity === 'major')).length,
    unableToAssess: findings.filter((f) => f.status === 'unable_to_check').length,
    total: findings.length,
  };

  let outcome: ScreeningOutcome = 'Complete';

  if (documents.length === 0 || counts.unableToAssess > 0) {
    // If no evidence uploaded, or vital checks could not be resolved due to unreadable scans
    outcome = documents.length === 0 || counts.unableToAssess >= 2 ? 'Unable to Assess' : 'Major Issues';
  } else if (counts.majorIssues > 0) {
    outcome = 'Major Issues';
  } else if (counts.warnings > 0 || counts.minorIssues > 0) {
    outcome = 'Minor Issues';
  } else {
    outcome = 'Complete';
  }

  return {
    id: `val-run-${applicationId || 'batch'}-${Date.now()}`,
    applicationId,
    category,
    outcome,
    findings,
    counts,
    validatedAt: new Date().toISOString(),
  };
}
