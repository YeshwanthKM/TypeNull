/**
 * TypeNull AICTE Extension of Approval (EoA) Validation Engine
 *
 * Implements the explainable statutory verification engine for AICTE EoA Approval Workflow.
 * Evaluates application metadata, uploaded documents, extracted intelligence,
 * and deterministic file integrity checks against official AICTE Approval
 * Process Handbook (APH 2024–2027) regulatory rules.
 */

import {
  ApplicationDocument,
  DocumentExtractionRecord,
  ExtractedFieldRecord,
  DbApplication,
} from '../../types';
import {
  compareInstitutionName,
  comparePermanentId,
  validateUdinFormat,
  FieldComparisonResult,
} from './crossDocumentComparator';
import { DocumentIntegrityResult } from '../documentIntegrityService';

export type EoaFindingCategory =
  | 'missing_documents'
  | 'missing_fields'
  | 'inconsistent_information'
  | 'invalid_or_malformed_value'
  | 'unreadable_document'
  | 'potential_metadata_anomaly'
  | 'unsupported_signature_verification'
  | 'potential_document_integrity_concern'
  | 'regulatory_requirement_not_satisfied'
  | 'external_verification_unavailable';

export type EoaFindingStatus = 'PASS' | 'WARNING' | 'FAIL' | 'NEEDS_REVIEW' | 'NOT_VERIFIABLE';
export type EoaFindingSeverity = 'info' | 'minor' | 'major' | 'blocking';

export interface EoaValidationFinding {
  id: string;
  ruleId: string;
  ruleVersion: string;
  ruleCitation?: string;
  category: EoaFindingCategory;
  severity: EoaFindingSeverity;
  status: EoaFindingStatus;
  title: string;
  explanation: string;
  sourceDocument?: string;
  pageNumber?: number;
  observedValue?: string;
  expectedValue?: string;
  recommendedAction?: string;
  validationMethod: 'statutory_checklist' | 'deterministic_forensics' | 'field_comparison' | 'heuristic_ocr';
  requiresManualReview: boolean;
  isBlocking: boolean;
}

export type ApplicationWorkflowStage =
  | 'document_uploaded'
  | 'extraction_completed'
  | 'automated_validation_completed'
  | 'institution_corrections_pending'
  | 'ready_for_internal_submission'
  | 'submitted_for_officer_review'
  | 'officer_review_completed';

export interface EoaValidationSummary {
  applicationId: string;
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  blockingIssues: number;
  needsReviewChecks: number;
  notVerifiableChecks: number;
  workflowStage: ApplicationWorkflowStage;
  isSubmissionReady: boolean;
  findings: EoaValidationFinding[];
  crossDocumentComparisons: FieldComparisonResult[];
  evaluatedAt: string;
}

/**
 * Statutory Document Definitions for AICTE EoA 2026-27
 */
export const STATUTORY_EOA_DOCUMENTS = [
  {
    key: 'statutory_declaration',
    name: 'Form 1 Compliance Affidavit',
    ruleId: 'AICTE-RULE-AFFIDAVIT-1',
    ruleCitation: 'AICTE Approval Process Handbook (APH) 2024–2027 Appendix 17',
    isMandatory: true,
    description: 'Sworn Affidavit on non-judicial stamp paper as prescribed in APH 2024–2027 Appendix 17.',
  },
  {
    key: 'utility_bill',
    name: 'Land & Built-up Area Certificate',
    ruleId: 'AICTE-RULE-LAND-BUILTUP',
    ruleCitation: 'AICTE Approval Process Handbook (APH) 2024–2027 Appendix 4',
    isMandatory: true,
    description: 'Architect completion certificate verifying instructional, administrative, and amenities area norms (Appendix 4).',
  },
  {
    key: 'faculty_statement',
    name: 'Faculty Cadre & Bio-data Statement',
    ruleId: 'AICTE-RULE-FACULTY-CADRE',
    ruleCitation: 'AICTE Approval Process Handbook (APH) 2024–2027 & 7th CPC Gazette',
    isMandatory: true,
    description: 'List of appointed faculty demonstrating prescribed 1:15 or 1:20 cadre ratio under 7th CPC Gazette notification.',
  },
  {
    key: 'incorporation_certificate',
    name: 'Audited Financial Statements with CA UDIN',
    ruleId: 'AICTE-RULE-FIN-UDIN',
    ruleCitation: 'ICAI Gazette Notification & AICTE APH 2024–2027 Chapter I',
    isMandatory: true,
    description: 'Balance sheet and P&L account certified by practicing Chartered Accountant carrying verifiable 18-digit UDIN.',
  },
];

/**
 * Run Comprehensive AICTE EoA Validation
 */
export function runEoaValidationEngine(params: {
  application: DbApplication;
  documents: ApplicationDocument[];
  extractions?: DocumentExtractionRecord[];
  fields?: ExtractedFieldRecord[];
  integrityResults?: Map<string, DocumentIntegrityResult>;
  institutionProfile?: {
    aictePermanentId?: string;
    institutionType?: string;
    state?: string;
    hasNbaAccreditation?: boolean;
  };
}): EoaValidationSummary {
  const {
    application,
    documents = [],
    extractions = [],
    fields = [],
    integrityResults = new Map(),
    institutionProfile,
  } = params;

  const findings: EoaValidationFinding[] = [];
  const crossComparisons: FieldComparisonResult[] = [];

  const claimedName = (application.organisation_name || '').trim();
  const claimedId = (
    institutionProfile?.aictePermanentId ||
    application.registration_number ||
    ''
  ).trim();

  // 0. INSTITUTION IDENTIFIER VERIFICATION (Rule AICTE-RULE-EOA-01)
  if (!claimedName) {
    findings.push({
      id: 'finding-missing-declared-name',
      ruleId: 'AICTE-RULE-EOA-01',
      ruleVersion: '2024-2027.1',
      ruleCitation: 'AICTE Approval Process Handbook (APH) 2024–2027 Chapter II',
      category: 'missing_fields',
      severity: 'blocking',
      status: 'FAIL',
      title: 'Missing Declared Institution Legal Name',
      explanation:
        'The application dossier lacks a declared institution legal name, preventing statutory identity verification.',
      expectedValue: 'Registered Institution Legal Name',
      observedValue: 'Missing / Not Declared',
      recommendedAction: 'Update application profile with the registered institution legal name.',
      validationMethod: 'statutory_checklist',
      requiresManualReview: false,
      isBlocking: true,
    });
  }

  if (!claimedId) {
    findings.push({
      id: 'finding-missing-declared-id',
      ruleId: 'AICTE-RULE-EOA-01',
      ruleVersion: '2024-2027.1',
      ruleCitation: 'AICTE Approval Process Handbook (APH) 2024–2027 Chapter II',
      category: 'missing_fields',
      severity: 'blocking',
      status: 'FAIL',
      title: 'Missing AICTE Permanent Institute ID',
      explanation:
        'The application record does not specify an AICTE Permanent Institute ID (e.g. 1-43289012), which is mandatory for Extension of Approval.',
      expectedValue: 'AICTE Permanent Institute ID (Format: 1-XXXXXXXX)',
      observedValue: 'Missing / Not Declared',
      recommendedAction: 'Provide your valid AICTE Permanent Institute ID in the institution profile.',
      validationMethod: 'statutory_checklist',
      requiresManualReview: false,
      isBlocking: true,
    });
  }

  // Parse conditional NBA accreditation claim
  let claimsNba = Boolean(institutionProfile?.hasNbaAccreditation);
  if (!claimsNba && application.description) {
    try {
      const parsed = JSON.parse(application.description);
      if (
        parsed.hasNbaAccreditation === true ||
        parsed.has_nba_accreditation === 'yes' ||
        parsed.hasNbaAccreditation === 'yes'
      ) {
        claimsNba = true;
      }
    } catch {
      if (application.description.toLowerCase().includes('nba accreditation claimed')) {
        claimsNba = true;
      }
    }
  }

  // Conditional NBA Accreditation Evaluation (Rule AICTE-RULE-NBA-ACCRED)
  if (claimsNba) {
    const matchingNbaDoc = documents.find((d) => {
      const docType = (d.document_type || '').toLowerCase();
      const fileName = (d.original_filename || '').toLowerCase();
      return (
        docType === 'nba_certificate' ||
        docType === 'nba_accreditation_letter' ||
        fileName.includes('nba') ||
        fileName.includes('accreditation')
      );
    });

    if (!matchingNbaDoc) {
      findings.push({
        id: 'finding-req-missing-nba',
        ruleId: 'AICTE-RULE-NBA-ACCRED',
        ruleVersion: '2024-2027.1',
        ruleCitation: 'AICTE Approval Process Handbook (APH) 2024–2027 Chapter II Clause 2.4',
        category: 'missing_documents',
        severity: 'blocking',
        status: 'FAIL',
        title: 'Mandatory Conditional Document Missing: NBA Accreditation Award Letter',
        explanation:
          'Under AICTE APH 2024–2027 Clause 2.4, institutions claiming NBA accreditation for multi-year approval or intake flexibility must submit valid NBA award letters with course validity dates.',
        expectedValue: 'Valid NBA Accreditation Notification Letter for eligible courses',
        observedValue: 'Accreditation claimed in application, but no NBA document uploaded',
        recommendedAction:
          'Upload the official NBA accreditation award letter specifying course names and validity academic years.',
        validationMethod: 'statutory_checklist',
        requiresManualReview: false,
        isBlocking: true,
      });
    } else {
      findings.push({
        id: 'finding-req-present-nba',
        ruleId: 'AICTE-RULE-NBA-ACCRED',
        ruleVersion: '2024-2027.1',
        ruleCitation: 'AICTE Approval Process Handbook (APH) 2024–2027 Chapter II Clause 2.4',
        category: 'regulatory_requirement_not_satisfied',
        severity: 'info',
        status: 'PASS',
        title: 'Conditional Document Present: NBA Accreditation Certificate',
        explanation: `Verified presence of NBA Accreditation Certificate (${matchingNbaDoc.original_filename}).`,
        sourceDocument: matchingNbaDoc.original_filename,
        expectedValue: 'NBA Accreditation Certificate',
        observedValue: `${matchingNbaDoc.original_filename} (${matchingNbaDoc.document_type})`,
        validationMethod: 'statutory_checklist',
        requiresManualReview: true,
        isBlocking: false,
      });
    }
  } else {
    findings.push({
      id: 'finding-cond-nba-not-applicable',
      ruleId: 'AICTE-RULE-NBA-ACCRED',
      ruleVersion: '2024-2027.1',
      ruleCitation: 'AICTE Approval Process Handbook (APH) 2024–2027 Chapter II Clause 2.4',
      category: 'regulatory_requirement_not_satisfied',
      severity: 'info',
      status: 'PASS',
      title: 'Conditional Requirement: NBA Accreditation (Standard Annual Approval)',
      explanation:
        'Application does not claim NBA-accredited multi-year approval. Processing continues under standard single-year Extension of Approval norms.',
      expectedValue: 'Optional conditional document',
      observedValue: 'Standard EoA route selected (No active NBA accreditation claimed)',
      validationMethod: 'statutory_checklist',
      requiresManualReview: false,
      isBlocking: false,
    });
  }

  // Helper map of extractions
  const extMap = new Map<string, DocumentExtractionRecord>();
  extractions.forEach((e) => extMap.set(e.document_id, e));

  // Helper map of fields by docId
  const fieldsByDoc = new Map<string, ExtractedFieldRecord[]>();
  fields.forEach((f) => {
    const list = fieldsByDoc.get(f.document_id) || [];
    list.push(f);
    fieldsByDoc.set(f.document_id, list);
  });

  // --------------------------------------------------------------------------
  // 1. STATUTORY CHECKLIST VERIFICATION (Rule AICTE-RULE-EOA-01 & Specific Rules)
  // --------------------------------------------------------------------------
  for (const statDoc of STATUTORY_EOA_DOCUMENTS) {
    const matchingDoc = documents.find((d) => {
      const docType = (d.document_type || '').toLowerCase();
      const fileName = (d.original_filename || '').toLowerCase();
      return (
        docType === statDoc.key.toLowerCase() ||
        fileName.includes(statDoc.key.toLowerCase()) ||
        fileName.includes(statDoc.name.toLowerCase().split(' ')[0])
      );
    });

    if (!matchingDoc) {
      findings.push({
        id: `finding-req-missing-${statDoc.key}`,
        ruleId: statDoc.ruleId,
        ruleVersion: '2024-2027.1',
        ruleCitation: statDoc.ruleCitation || 'AICTE Approval Process Handbook (APH) 2024–2027',
        category: 'missing_documents',
        severity: 'blocking',
        status: 'FAIL',
        title: `Mandatory Statutory Document Missing: ${statDoc.name}`,
        explanation: `Under AICTE APH 2024–2027 norms, "${statDoc.name}" is mandatory for Extension of Approval processing. ${statDoc.description}`,
        expectedValue: `Legible uploaded copy of ${statDoc.name} in PDF or image format`,
        observedValue: 'No document uploaded in dossier for this requirement',
        recommendedAction: `Upload a verified copy of ${statDoc.name}.`,
        validationMethod: 'statutory_checklist',
        requiresManualReview: false,
        isBlocking: true,
      });
    } else {
      findings.push({
        id: `finding-req-present-${statDoc.key}`,
        ruleId: statDoc.ruleId,
        ruleVersion: '2024-2027.1',
        ruleCitation: statDoc.ruleCitation || 'AICTE Approval Process Handbook (APH) 2024–2027',
        category: 'regulatory_requirement_not_satisfied',
        severity: 'info',
        status: 'PASS',
        title: `Statutory Document Present: ${statDoc.name}`,
        explanation: `Verified presence of "${statDoc.name}" (${matchingDoc.original_filename}).`,
        sourceDocument: matchingDoc.original_filename,
        expectedValue: statDoc.name,
        observedValue: `${matchingDoc.original_filename} (${matchingDoc.document_type})`,
        validationMethod: 'statutory_checklist',
        requiresManualReview: false,
        isBlocking: false,
      });

      // ----------------------------------------------------------------------
      // 2. DOCUMENT INTEGRITY & METADATA CHECKS FOR THIS DOCUMENT
      // ----------------------------------------------------------------------
      const integrity = integrityResults.get(matchingDoc.id);
      if (integrity) {
        if (!integrity.isValidFormat) {
          findings.push({
            id: `finding-integrity-${matchingDoc.id}`,
            ruleId: 'SEC-INTEG-FORMAT',
            ruleVersion: '2024-2027.1',
            category: 'potential_document_integrity_concern',
            severity: 'blocking',
            status: 'FAIL',
            title: `Corrupt or Unrecognized File Format: ${matchingDoc.original_filename}`,
            explanation: `File magic byte structure does not match standard valid PDF/image formats.`,
            sourceDocument: matchingDoc.original_filename,
            recommendedAction: 'Re-save and re-upload the document directly from its source scanner/export.',
            validationMethod: 'deterministic_forensics',
            requiresManualReview: true,
            isBlocking: true,
          });
        }

        if (integrity.integrityFindings) {
          integrity.integrityFindings.forEach((inf: any, idx: number) => {
            const findingBase = {
              sourceDocument: matchingDoc.original_filename,
              observedValue: `File SHA-256: ${integrity.sha256Hash?.slice(0, 16)}...`,
              validationMethod: 'deterministic_forensics' as const,
            };

            if (inf.code === 'CRYPTO_SIGNATURE_INTEGRITY_FAILED') {
              findings.push({
                ...findingBase,
                id: `finding-sig-fail-${matchingDoc.id}-${idx}`,
                ruleId: 'SEC-CRYPTO-SIG-FAIL',
                ruleVersion: '2024-2027.1',
                ruleCitation: inf.ruleCitation || 'RFC 5652 Cryptographic Message Syntax',
                category: 'potential_document_integrity_concern',
                severity: 'blocking',
                status: 'FAIL',
                title: `Cryptographic Signature Verification Failed: ${matchingDoc.original_filename}`,
                explanation: inf.message,
                expectedValue: 'Valid mathematical signature over document byte range',
                recommendedAction: 'Re-sign the statutory document using an authorized, valid cryptographic key and re-upload.',
                requiresManualReview: true,
                isBlocking: true,
              });
            } else if (inf.code === 'DOCUMENT_MODIFIED_AFTER_SIGNING') {
              findings.push({
                ...findingBase,
                id: `finding-sig-mod-${matchingDoc.id}-${idx}`,
                ruleId: 'SEC-PDF-MODIFIED',
                ruleVersion: '2024-2027.1',
                ruleCitation: inf.ruleCitation || 'ISO 32000-1 Clause 12.8',
                category: 'potential_document_integrity_concern',
                severity: 'blocking',
                status: 'FAIL',
                title: `Document Modified After Signing: ${matchingDoc.original_filename}`,
                explanation: inf.message,
                expectedValue: 'Unmodified document byte stream post-signature',
                recommendedAction: 'Upload the clean, signed version directly from the original export without post-signing edits.',
                requiresManualReview: true,
                isBlocking: true,
              });
            } else if (inf.code === 'CRYPTO_SIGNATURE_VERIFIED') {
              findings.push({
                ...findingBase,
                id: `finding-sig-ok-${matchingDoc.id}-${idx}`,
                ruleId: 'SEC-CRYPTO-SIG-VERIFIED',
                ruleVersion: '2024-2027.1',
                ruleCitation: inf.ruleCitation || 'RFC 5652 & ISO 32000-1',
                category: 'regulatory_requirement_not_satisfied',
                severity: 'info',
                status: 'PASS',
                title: `Cryptographic Signature Verified: ${matchingDoc.original_filename}`,
                explanation: inf.message,
                expectedValue: 'Cryptographically consistent signature',
                recommendedAction: 'Confirm signer authority against the institution authorization resolution.',
                requiresManualReview: false,
                isBlocking: false,
              });
            } else if (inf.code === 'CERTIFICATE_UNTRUSTED_OR_UNVERIFIABLE') {
              findings.push({
                ...findingBase,
                id: `finding-sig-untrusted-${matchingDoc.id}-${idx}`,
                ruleId: 'SEC-CRYPTO-CERT-UNTRUSTED',
                ruleVersion: '2024-2027.1',
                category: 'unsupported_signature_verification',
                severity: 'minor',
                status: 'NEEDS_REVIEW',
                title: `Signer Certificate Untrusted or Self-Signed: ${matchingDoc.original_filename}`,
                explanation: inf.message,
                expectedValue: 'Certificate anchored in official CCA India / AICTE approved root store',
                recommendedAction: 'Officer should review signer credentials manually if statutory certificate requires licensed DSC.',
                requiresManualReview: true,
                isBlocking: false,
              });
            } else if (inf.code === 'TIMESTAMP_NOT_VERIFIED') {
              findings.push({
                ...findingBase,
                id: `finding-sig-ts-${matchingDoc.id}-${idx}`,
                ruleId: 'SEC-CRYPTO-TIME-UNVERIFIED',
                ruleVersion: '2024-2027.1',
                category: 'unsupported_signature_verification',
                severity: 'info',
                status: 'NEEDS_REVIEW',
                title: `Certified Timestamp Not Verified: ${matchingDoc.original_filename}`,
                explanation: inf.message,
                expectedValue: 'RFC 3161 TSA cryptographic timestamp token',
                recommendedAction: 'Verify signing date against institution resolution records if date is contested.',
                requiresManualReview: true,
                isBlocking: false,
              });
            } else if (inf.code === 'PDF_ACTIVE_JAVASCRIPT_DETECTED') {
              findings.push({
                ...findingBase,
                id: `finding-forensic-js-${matchingDoc.id}-${idx}`,
                ruleId: 'SEC-PDF-ACTIVE-SCRIPT',
                ruleVersion: '2024-2027.1',
                category: 'potential_document_integrity_concern',
                severity: 'major',
                status: 'NEEDS_REVIEW',
                title: `Active JavaScript Action in PDF: ${matchingDoc.original_filename}`,
                explanation: inf.message,
                recommendedAction: 'Scrutinize document in static viewer with scripts neutralized.',
                requiresManualReview: true,
                isBlocking: false,
              });
            } else if (inf.code === 'PDF_METADATA_CHRONOLOGY_ANOMALY') {
              findings.push({
                ...findingBase,
                id: `finding-forensic-meta-${matchingDoc.id}-${idx}`,
                ruleId: 'SEC-PDF-METADATA',
                ruleVersion: '2024-2027.1',
                category: 'potential_metadata_anomaly',
                severity: 'minor',
                status: 'WARNING',
                title: `Metadata Chronology Inconsistency: ${matchingDoc.original_filename}`,
                explanation: inf.message,
                recommendedAction: 'Verify export and scanner date-time settings.',
                requiresManualReview: true,
                isBlocking: false,
              });
            } else if (inf.code === 'EMBEDDED_DIGITAL_SIGNATURE_DETECTED') {
              findings.push({
                ...findingBase,
                id: `finding-sig-${matchingDoc.id}-${idx}`,
                ruleId: 'SEC-SIG-EMBEDDED',
                ruleVersion: '2024-2027.1',
                category: 'unsupported_signature_verification',
                severity: 'info',
                status: 'NEEDS_REVIEW',
                title: `Digital Signature Detected: ${matchingDoc.original_filename}`,
                explanation: inf.message,
                expectedValue: 'Cryptographic validation requires root CA certificate chain validation',
                recommendedAction:
                  'Examine certificate trust chain manually if this signature carries statutory significance.',
                requiresManualReview: true,
                isBlocking: false,
              });
            }
          });
        }
      }

      // ----------------------------------------------------------------------
      // 3. DOCUMENT TEXT EXTRACTION QUALITY & READABILITY
      // ----------------------------------------------------------------------
      const ext = extMap.get(matchingDoc.id);
      if (ext) {
        if (ext.extraction_status === 'failed') {
          findings.push({
            id: `finding-ext-fail-${matchingDoc.id}`,
            ruleId: 'OCR-READABILITY-FAIL',
            ruleVersion: '2024-2027.1',
            category: 'unreadable_document',
            severity: 'major',
            status: 'NEEDS_REVIEW',
            title: `Text Extraction Incomplete: ${matchingDoc.original_filename}`,
            explanation: `Automated text extraction could not parse text streams: ${ext.error_message || 'Unreadable scan'}.`,
            sourceDocument: matchingDoc.original_filename,
            recommendedAction: 'Upload a higher-contrast scan (300 DPI) or a digital vector PDF.',
            validationMethod: 'heuristic_ocr',
            requiresManualReview: true,
            isBlocking: false,
          });
        } else if (ext.raw_text && ext.raw_text.trim().length < 25) {
          findings.push({
            id: `finding-ext-low-${matchingDoc.id}`,
            ruleId: 'OCR-READABILITY-LOW',
            ruleVersion: '2024-2027.1',
            category: 'unreadable_document',
            severity: 'minor',
            status: 'WARNING',
            title: `Low Text Density Warning: ${matchingDoc.original_filename}`,
            explanation: `Only ${ext.raw_text.trim().length} characters extracted. Ensure scan resolution allows optical recognition.`,
            sourceDocument: matchingDoc.original_filename,
            recommendedAction: 'Verify document content legibility.',
            validationMethod: 'heuristic_ocr',
            requiresManualReview: true,
            isBlocking: false,
          });
        }
      }

      // ----------------------------------------------------------------------
      // 4. SPECIFIC RULE VALIDATIONS
      // ----------------------------------------------------------------------
      // Check Audited Financial Statement for 18-digit UDIN
      if (statDoc.key === 'incorporation_certificate') {
        const docFields = fieldsByDoc.get(matchingDoc.id) || [];
        const udinField = docFields.find(
          (f) =>
            f.field_name.toLowerCase().includes('udin') ||
            f.field_name.toLowerCase().includes('registration')
        );

        if (!udinField || !udinField.extracted_value) {
          findings.push({
            id: `finding-udin-missing-${matchingDoc.id}`,
            ruleId: 'AICTE-RULE-FIN-UDIN',
            ruleVersion: '2024-2027.1',
            ruleCitation: 'ICAI Gazette Notification & APH 2024–2027 Chapter I',
            category: 'missing_fields',
            severity: 'major',
            status: 'WARNING',
            title: `CA UDIN Not Found on Audited Accounts: ${matchingDoc.original_filename}`,
            explanation:
              'Under ICAI mandates and AICTE financial verification norms, all Chartered Accountant certified statements must carry a verifiable 18-digit UDIN.',
            sourceDocument: matchingDoc.original_filename,
            expectedValue: '18-character ICAI UDIN number',
            observedValue: 'No UDIN detected in automated text extraction',
            recommendedAction:
              'Ensure the uploaded audit report contains the CA-stamped 18-digit UDIN on the attestation page.',
            validationMethod: 'field_comparison',
            requiresManualReview: true,
            isBlocking: false,
          });
        } else {
          const udinVal = validateUdinFormat(udinField.extracted_value);
          if (!udinVal.isValid) {
            findings.push({
              id: `finding-udin-invalid-${matchingDoc.id}`,
              ruleId: 'AICTE-RULE-FIN-UDIN',
              ruleVersion: '2024-2027.1',
              ruleCitation: 'ICAI Gazette Notification',
              category: 'invalid_or_malformed_value',
              severity: 'major',
              status: 'FAIL',
              title: `Invalid UDIN Syntax on Audited Accounts: ${matchingDoc.original_filename}`,
              explanation: udinVal.explanation,
              sourceDocument: matchingDoc.original_filename,
              expectedValue: '18-character alphanumeric UDIN',
              observedValue: udinField.extracted_value,
              recommendedAction: 'Confirm the UDIN with your auditor and ensure it is entered accurately.',
              validationMethod: 'field_comparison',
              requiresManualReview: true,
              isBlocking: false,
            });
          } else {
            findings.push({
              id: `finding-udin-pass-${matchingDoc.id}`,
              ruleId: 'AICTE-RULE-FIN-UDIN',
              ruleVersion: '2024-2027.1',
              ruleCitation: 'ICAI Gazette Notification',
              category: 'regulatory_requirement_not_satisfied',
              severity: 'info',
              status: 'PASS',
              title: `Valid CA UDIN Format Detected: ${matchingDoc.original_filename}`,
              explanation: udinVal.explanation,
              sourceDocument: matchingDoc.original_filename,
              observedValue: udinField.extracted_value,
              expectedValue: '18-character alphanumeric UDIN',
              validationMethod: 'field_comparison',
              requiresManualReview: false,
              isBlocking: false,
            });

            // Disclose that live issuing authority check is not performed
            findings.push({
              id: `finding-udin-live-disclosure-${matchingDoc.id}`,
              ruleId: 'AICTE-RULE-FIN-UDIN',
              ruleVersion: '2024-2027.1',
              category: 'external_verification_unavailable',
              severity: 'info',
              status: 'NOT_VERIFIABLE',
              title: 'ICAI Live Database Verification Unavailable',
              explanation:
                'UDIN syntax is valid. Direct API verification against the official live ICAI portal (udin.icai.org) was not performed in this offline environment.',
              sourceDocument: matchingDoc.original_filename,
              observedValue: 'Offline syntax validated',
              expectedValue: 'Live issuing authority verification',
              recommendedAction: 'Officer can manually verify on udin.icai.org if required.',
              validationMethod: 'field_comparison',
              requiresManualReview: true,
              isBlocking: false,
            });
          }
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 5. CROSS-DOCUMENT ENTITY AND IDENTIFIER COMPARISONS
  // --------------------------------------------------------------------------
  const nameExtractions = documents.map((doc) => {
    const docFields = fieldsByDoc.get(doc.id) || [];
    const nameField = docFields.find(
      (f) =>
        f.field_name.toLowerCase().includes('entity_name') ||
        f.field_name.toLowerCase().includes('company_name') ||
        f.field_name.toLowerCase().includes('organisation_name') ||
        f.field_name.toLowerCase().includes('institution_name')
    );
    return {
      documentId: doc.id,
      documentName: doc.original_filename,
      extractedName: nameField?.extracted_value || undefined,
      pageNumber: nameField?.page_number,
      evidenceSnippet: nameField?.evidence_snippet || undefined,
      confidence: nameField?.confidence_score ?? undefined,
    };
  });

  const nameComparison = compareInstitutionName(claimedName, nameExtractions);
  crossComparisons.push(nameComparison);

  if (nameComparison.outcome === 'genuine_discrepancy') {
    findings.push({
      id: 'finding-cross-name-discrepancy',
      ruleId: 'AICTE-RULE-EOA-01',
      ruleVersion: '2024-2027.1',
      category: 'inconsistent_information',
      severity: 'blocking',
      status: 'FAIL',
      title: 'Cross-Document Institution Name Discrepancy',
      explanation: nameComparison.explanation,
      expectedValue: claimedName,
      observedValue: nameComparison.comparedValues.map((v) => `"${v.extractedValue}" (${v.documentName})`).join(' vs '),
      recommendedAction: 'Verify that all uploaded certificates belong strictly to the registered institution.',
      validationMethod: 'field_comparison',
      requiresManualReview: true,
      isBlocking: true,
    });
  } else if (nameComparison.outcome === 'formatting_difference') {
    findings.push({
      id: 'finding-cross-name-formatting',
      ruleId: 'AICTE-RULE-EOA-01',
      ruleVersion: '2024-2027.1',
      category: 'inconsistent_information',
      severity: 'minor',
      status: 'WARNING',
      title: 'Minor Name Formatting Variation Across Documents',
      explanation: nameComparison.explanation,
      expectedValue: claimedName,
      observedValue: nameComparison.comparedValues.map((v) => `"${v.extractedValue}"`).join(' vs '),
      recommendedAction: 'Verify that naming variations are cosmetic abbreviations.',
      validationMethod: 'field_comparison',
      requiresManualReview: true,
      isBlocking: false,
    });
  }

  // Cross-compare AICTE Permanent ID
  const idExtractions = documents.map((doc) => {
    const docFields = fieldsByDoc.get(doc.id) || [];
    const idField = docFields.find(
      (f) =>
        f.field_name.toLowerCase().includes('permanent_id') ||
        f.field_name.toLowerCase().includes('registration_number') ||
        f.field_name.toLowerCase().includes('cin')
    );
    return {
      documentId: doc.id,
      documentName: doc.original_filename,
      extractedId: idField?.extracted_value || undefined,
      pageNumber: idField?.page_number,
      evidenceSnippet: idField?.evidence_snippet || undefined,
      confidence: idField?.confidence_score ?? undefined,
    };
  });

  const idComparison = comparePermanentId(claimedId, idExtractions);
  crossComparisons.push(idComparison);

  if (idComparison.outcome === 'genuine_discrepancy') {
    findings.push({
      id: 'finding-cross-id-discrepancy',
      ruleId: 'AICTE-RULE-EOA-01',
      ruleVersion: '2024-2027.1',
      category: 'inconsistent_information',
      severity: 'blocking',
      status: 'FAIL',
      title: 'Permanent Institute ID Mismatch',
      explanation: idComparison.explanation,
      expectedValue: claimedId,
      observedValue: idComparison.comparedValues.map((v) => `"${v.extractedValue}" (${v.documentName})`).join(' vs '),
      recommendedAction: 'Ensure supporting certificates cite your official Permanent Institute ID.',
      validationMethod: 'field_comparison',
      requiresManualReview: true,
      isBlocking: true,
    });
  }

  // --------------------------------------------------------------------------
  // 6. OVERALL WORKFLOW STAGE DETERMINATION
  // --------------------------------------------------------------------------
  const totalChecks = findings.length;
  const passedChecks = findings.filter((f) => f.status === 'PASS').length;
  const warningChecks = findings.filter((f) => f.status === 'WARNING').length;
  const blockingIssues = findings.filter((f) => f.isBlocking && f.status === 'FAIL').length;
  const needsReviewChecks = findings.filter((f) => f.requiresManualReview && f.status !== 'FAIL').length;
  const notVerifiableChecks = findings.filter((f) => f.status === 'NOT_VERIFIABLE').length;

  let workflowStage: ApplicationWorkflowStage = 'document_uploaded';

  if (documents.length === 0) {
    workflowStage = 'document_uploaded';
  } else if (extractions.length < documents.length) {
    workflowStage = 'document_uploaded';
  } else if (blockingIssues > 0) {
    workflowStage = 'institution_corrections_pending';
  } else {
    // If all mandatory statutory documents exist and no blocking issues:
    const missingMandatory = findings.some(
      (f) => f.category === 'missing_documents' && f.isBlocking
    );
    if (!missingMandatory) {
      workflowStage = 'ready_for_internal_submission';
    } else {
      workflowStage = 'institution_corrections_pending';
    }
  }

  if (application.status === 'under_review' || application.status === 'submitted') {
    workflowStage = 'submitted_for_officer_review';
  } else if (application.status === 'approved' || application.status === 'rejected') {
    workflowStage = 'officer_review_completed';
  }

  const isSubmissionReady = workflowStage === 'ready_for_internal_submission';

  return {
    applicationId: application.id,
    totalChecks,
    passedChecks,
    warningChecks,
    blockingIssues,
    needsReviewChecks,
    notVerifiableChecks,
    workflowStage,
    isSubmissionReady,
    findings,
    crossDocumentComparisons: crossComparisons,
    evaluatedAt: new Date().toISOString(),
  };
}
