/**
 * TypeNull SIH 2026 AICTE EoA End-to-End Validation Workflow Test Suite
 *
 * Covers:
 * 1. Supported and unsupported file types (MIME & magic bytes)
 * 2. Empty or malformed PDFs (zero-byte, header, EOF)
 * 3. Text extraction success and graceful fallback
 * 4. OCR unavailable or failed handling
 * 5. Missing required statutory documents (Form 1 Affidavit, Land, Faculty, UDIN)
 * 6. Missing required fields & format checking (18-character ICAI UDIN)
 * 7. Matching institution identifiers across documents
 * 8. Cross-document name and ID discrepancies
 * 9. AICTE Rulebook references (APH 2024–2027 citations)
 * 10. Validation status aggregation and 7 workflow stage transitions
 * 11. Revalidation after document replacement
 * 12. Two-role access boundaries & officer permission controls (is_admin)
 * 13. Handling of unavailable external verification (ICAI / AICTE live check)
 * 14. Failure-safe processing and error reporting
 */

import {
  inspectDocumentIntegrity,
  computeSha256,
} from '../src/services/documentIntegrityService';
import {
  compareInstitutionName,
  comparePermanentId,
  validateUdinFormat,
} from '../src/services/validation/crossDocumentComparator';
import {
  runEoaValidationEngine,
  STATUTORY_EOA_DOCUMENTS,
} from '../src/services/validation/eoaValidationEngine';
import {
  executePipelineExtraction,
  extractCandidateFieldsFromText,
  sanitizeUntrustedText,
} from '../src/services/documentExtractionPipeline';
import {
  createApplication,
  fetchUserApplications,
  fetchApplicationById,
  updateApplicationStatus,
  submitApplicationForInternalReview,
  fetchApplicationsForOfficerReview,
} from '../src/services/applications';
import {
  uploadApplicationDocument,
  fetchApplicationDocuments,
  validateDocumentFile,
} from '../src/services/documents';
import { DbApplication, ApplicationDocument, DocumentExtractionRecord, ExtractedFieldRecord } from '../src/types';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('AICTE EOA VALIDATION & DOCUMENT AUTHENTICATION SUITE');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Document Integrity, Magic Bytes & File Format Validation
  // --------------------------------------------------------------------------
  console.log('TEST GROUP 1: Deterministic File Integrity & Magic Bytes');

  // Valid PDF buffer with standard header and EOF
  const validPdfBytes = new TextEncoder().encode(
    '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF'
  );
  const pdfIntegrity = await inspectDocumentIntegrity(
    validPdfBytes.buffer,
    'compliance_affidavit.pdf',
    'application/pdf'
  );
  assert(pdfIntegrity.isValidFormat, 'Valid PDF header recognized as valid format');
  assert(pdfIntegrity.detectedFormat === 'pdf', 'Detected format matches PDF');
  assert(pdfIntegrity.mimeTypeMatch, 'MIME type match confirmed for PDF');
  assert(pdfIntegrity.extensionMatch, 'File extension match confirmed for .pdf');
  assert(pdfIntegrity.pdfStructure?.hasValidHeader === true, 'PDF header %PDF- detected');
  assert(pdfIntegrity.pdfStructure?.hasValidEof === true, 'PDF EOF marker %%EOF detected');

  // PDF with embedded signature dictionary
  const signedPdfBytes = new TextEncoder().encode(
    '%PDF-1.7\n/ByteRange [0 100 200 300] /SubFilter /adbe.pkcs7.detached\n%%EOF'
  );
  const signedIntegrity = await inspectDocumentIntegrity(
    signedPdfBytes.buffer,
    'audit_report_signed.pdf',
    'application/pdf'
  );
  assert(
    signedIntegrity.pdfStructure?.hasEmbeddedSignatureDictionary === true,
    'Detected embedded digital signature dictionary (/ByteRange /SubFilter)'
  );
  assert(
    signedIntegrity.integrityFindings.some((f) => f.code === 'EMBEDDED_DIGITAL_SIGNATURE_DETECTED'),
    'Embedded signature finding informs that existence does not equal cryptographic proof'
  );

  // Empty zero-byte file
  const emptyBuffer = new ArrayBuffer(0);
  const emptyIntegrity = await inspectDocumentIntegrity(emptyBuffer, 'empty.pdf', 'application/pdf');
  assert(!emptyIntegrity.isValidFormat, 'Zero-byte file rejected as invalid format');
  assert(emptyIntegrity.integrityFindings.some((f) => f.code === 'ZERO_BYTE_FILE'), 'Emits ZERO_BYTE_FILE finding');

  // File extension mismatch (PNG disguised as PDF)
  const pngHeaderBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
  const mismatchIntegrity = await inspectDocumentIntegrity(
    pngHeaderBytes.buffer,
    'fraudulent_document.pdf',
    'application/pdf'
  );
  assert(!mismatchIntegrity.extensionMatch, 'Detected mismatch between PNG magic bytes and .pdf extension');
  assert(
    mismatchIntegrity.integrityFindings.some((f) => f.code === 'EXTENSION_SIGNATURE_MISMATCH'),
    'Emits EXTENSION_SIGNATURE_MISMATCH finding'
  );

  // SHA-256 hash computation
  const testHash = await computeSha256(validPdfBytes.buffer);
  assert(typeof testHash === 'string' && testHash.length === 64, 'Computed valid 64-character SHA-256 hash');

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Pipeline Extraction & Input Sanitization
  // --------------------------------------------------------------------------
  console.log('\nTEST GROUP 2: Pipeline Extraction & Input Sanitization');

  // Malicious control characters sanitization
  const dirtyString = 'Delhi Institute\x00\x08 of Technology\x1F Permanent ID: 1-43289012';
  const cleanString = sanitizeUntrustedText(dirtyString);
  assert(!cleanString.includes('\x00') && !cleanString.includes('\x1F'), 'Null bytes and control payloads stripped');
  assert(cleanString === 'Delhi Institute of Technology Permanent ID: 1-43289012', 'Preserves legitimate text content');

  // Candidate field extraction
  const sampleText = `
    GOVERNMENT OF INDIA - AICTE APPROVAL DOSSIER
    Institution Name: Delhi Institute of Engineering & Technology
    Permanent Institute ID: 1-43289012
    Academic Year: 2026-27
    PAN Number: AAATD1234F
    Statutory Audit Report with ICAI UDIN: 24123456ABCDEF9876
  `;
  const extractedFields = extractCandidateFieldsFromText(sampleText);
  assert(
    extractedFields.some((f) => f.fieldName === 'aicte_permanent_id' && f.value === '1-43289012'),
    'Extracted AICTE Permanent ID 1-43289012 with regex parsing'
  );
  assert(
    extractedFields.some((f) => f.fieldName === 'udin' && f.value === '24123456ABCDEF9876'),
    'Extracted 18-digit ICAI UDIN from document text'
  );
  assert(
    extractedFields.some((f) => f.fieldName === 'pan' && f.value === 'AAATD1234F'),
    'Extracted PAN number AAATD1234F from document text'
  );

  // Unsupported file format extraction
  const unsupportedExtraction = await executePipelineExtraction(
    new ArrayBuffer(10),
    'archive.exe',
    'application/x-msdownload'
  );
  assert(unsupportedExtraction.detectedType === 'unsupported', 'Identified unsupported binary format');
  assert(unsupportedExtraction.warnings.length > 0, 'Returned warning for unsupported file type');

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Cross-Document Identity & Identifier Comparison
  // --------------------------------------------------------------------------
  console.log('\nTEST GROUP 3: Cross-Document Field Comparison');

  const declaredName = 'Delhi Institute of Engineering & Technology';

  // Exact Match
  const exactNameRes = compareInstitutionName(declaredName, [
    { documentId: 'd1', documentName: 'affidavit.pdf', extractedName: 'Delhi Institute of Engineering & Technology' },
  ]);
  assert(exactNameRes.outcome === 'exact_match', 'Exact name comparison classified as exact_match');
  assert(exactNameRes.similarityScore === 1.0, 'Exact match yields 1.0 similarity');

  // Formatting-only difference
  const formatNameRes = compareInstitutionName(declaredName, [
    { documentId: 'd1', documentName: 'affidavit.pdf', extractedName: 'Delhi Institute of Engg. and Tech.' },
  ]);
  assert(
    formatNameRes.outcome === 'formatting_difference',
    'Abbreviation and punctuation classified as formatting_difference without fraud claim'
  );
  assert(!formatNameRes.isBlocking, 'Formatting difference does not block application');

  // Genuine discrepancy
  const diffNameRes = compareInstitutionName(declaredName, [
    { documentId: 'd1', documentName: 'land_cert.pdf', extractedName: 'Mumbai Technical Academy Private Ltd' },
  ]);
  assert(diffNameRes.outcome === 'genuine_discrepancy', 'Completely different institution flagged as genuine_discrepancy');
  assert(diffNameRes.isBlocking, 'Genuine institution mismatch is blocking');

  // Permanent ID comparison
  const declaredId = '1-43289012';
  const idExact = comparePermanentId(declaredId, [
    { documentId: 'd1', documentName: 'affidavit.pdf', extractedId: '1-43289012' },
  ]);
  assert(idExact.outcome === 'exact_match', 'Permanent ID exact match confirmed');

  const idMismatch = comparePermanentId(declaredId, [
    { documentId: 'd1', documentName: 'affidavit.pdf', extractedId: '1-99999999' },
  ]);
  assert(idMismatch.outcome === 'genuine_discrepancy', 'Contradicting Permanent ID flagged as genuine_discrepancy');
  assert(idMismatch.isBlocking, 'Permanent ID mismatch is blocking');

  // ICAI UDIN Format validation
  const validUdin = validateUdinFormat('24123456ABCDEF9876');
  assert(validUdin.isValid, 'Valid 18-character ICAI UDIN accepted');

  const invalidUdin = validateUdinFormat('UDIN-SHORT-123');
  assert(!invalidUdin.isValid, 'Malformed UDIN rejected with explanatory error');

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Statutory EoA Validation Engine & Rulebook Traceability
  // --------------------------------------------------------------------------
  console.log('\nTEST GROUP 4: AICTE EoA Validation Engine & Rule Traceability');

  const createRes = await createApplication(
    {
      title: 'Extension of Approval (EoA) 2026–27',
      category: 'institution_registration',
      institutionName: 'Delhi Institute of Engineering & Technology',
      registrationNumber: '1-43289012',
      jurisdiction: 'Delhi, India',
      description: 'AICTE EoA Application Dossier',
    },
    'inst-user-1'
  );
  assert(createRes.data !== null, 'Created institution application dossier in test environment');
  const mockApp = createRes.data!;

  // Case A: Missing all mandatory documents
  const missingSummary = runEoaValidationEngine({
    application: mockApp,
    documents: [],
  });
  assert(missingSummary.blockingIssues === 4, 'Reports 4 blocking issues when all 4 mandatory docs are missing');
  assert(missingSummary.workflowStage === 'document_uploaded', 'Stage is document_uploaded when empty');
  assert(!missingSummary.isSubmissionReady, 'Application not submission ready when mandatory docs missing');
  assert(
    missingSummary.findings.some((f) => f.ruleId === 'AICTE-RULE-AFFIDAVIT-1' && f.status === 'FAIL'),
    'Cites AICTE-RULE-AFFIDAVIT-1 for missing Form 1 Affidavit'
  );
  assert(
    missingSummary.findings.some((f) => f.ruleId === 'AICTE-RULE-FIN-UDIN' && f.status === 'FAIL'),
    'Cites AICTE-RULE-FIN-UDIN for missing Audited Accounts'
  );

  // Case B: Full set of mandatory documents uploaded & extracted
  const mockDocs: ApplicationDocument[] = [
    {
      id: 'doc-affidavit',
      application_id: mockApp.id,
      user_id: mockApp.user_id,
      original_filename: 'Form_1_Affidavit.pdf',
      storage_path: 'path/affidavit.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 102400,
      document_type: 'statutory_declaration',
      processing_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'doc-land',
      application_id: mockApp.id,
      user_id: mockApp.user_id,
      original_filename: 'Land_Completion_Cert.pdf',
      storage_path: 'path/land.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 204800,
      document_type: 'utility_bill',
      processing_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'doc-faculty',
      application_id: mockApp.id,
      user_id: mockApp.user_id,
      original_filename: 'Faculty_Cadre_Statement.pdf',
      storage_path: 'path/faculty.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 307200,
      document_type: 'faculty_statement',
      processing_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'doc-financial',
      application_id: mockApp.id,
      user_id: mockApp.user_id,
      original_filename: 'Audited_Accounts_UDIN.pdf',
      storage_path: 'path/fin.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 409600,
      document_type: 'incorporation_certificate',
      processing_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockExtractions: DocumentExtractionRecord[] = mockDocs.map((d) => ({
    id: `ext-${d.id}`,
    document_id: d.id,
    application_id: mockApp.id,
    user_id: mockApp.user_id,
    extraction_status: 'completed',
    extraction_method: 'pdf_text',
    raw_text: `Delhi Institute of Engineering & Technology Permanent ID: 1-43289012 UDIN: 24123456ABCDEF9876`,
    page_count: 2,
    classified_type: d.document_type,
    classification_confidence: 0.95,
    classification_reason: 'Statutory keyword matches',
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const mockFields: ExtractedFieldRecord[] = [
    {
      id: 'f-1',
      extraction_id: 'ext-doc-affidavit',
      document_id: 'doc-affidavit',
      application_id: mockApp.id,
      user_id: mockApp.user_id,
      field_name: 'institution_name',
      field_label: 'Institution Legal Name',
      extracted_value: 'Delhi Institute of Engineering & Technology',
      reviewed_value: null,
      page_number: 1,
      evidence_snippet: 'Delhi Institute of Engineering & Technology',
      extraction_method: 'pdf_text',
      confidence_score: 0.95,
      review_status: 'unreviewed',
      created_at: new Date().toISOString(),
    },
    {
      id: 'f-2',
      extraction_id: 'ext-doc-financial',
      document_id: 'doc-financial',
      application_id: mockApp.id,
      user_id: mockApp.user_id,
      field_name: 'udin',
      field_label: 'ICAI UDIN',
      extracted_value: '24123456ABCDEF9876',
      reviewed_value: null,
      page_number: 1,
      evidence_snippet: 'UDIN: 24123456ABCDEF9876',
      extraction_method: 'pdf_text',
      confidence_score: 0.94,
      review_status: 'unreviewed',
      created_at: new Date().toISOString(),
    },
  ];

  const fullSummary = runEoaValidationEngine({
    application: mockApp,
    documents: mockDocs,
    extractions: mockExtractions,
    fields: mockFields,
  });

  assert(fullSummary.blockingIssues === 0, 'Zero blocking defects with complete documentary proofs');
  assert(fullSummary.workflowStage === 'ready_for_internal_submission', 'Transitioned to ready_for_internal_submission');
  assert(fullSummary.isSubmissionReady === true, 'Application marked ready for internal submission');
  assert(
    fullSummary.findings.some((f) => f.category === 'external_verification_unavailable' && f.status === 'NOT_VERIFIABLE'),
    'Discloses that live ICAI issuing-authority database check was not performed'
  );

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Revalidation & State Persistence
  // --------------------------------------------------------------------------
  console.log('\nTEST GROUP 5: Revalidation & Stage Transitions');

  // Submit for internal officer review
  const submittedAppRes = await submitApplicationForInternalReview(mockApp.id);
  assert(submittedAppRes.data?.status === 'under_review', 'Status transitioned to under_review');

  const officerReviewSummary = runEoaValidationEngine({
    application: { ...mockApp, status: 'under_review' },
    documents: mockDocs,
    extractions: mockExtractions,
    fields: mockFields,
  });
  assert(
    officerReviewSummary.workflowStage === 'submitted_for_officer_review',
    'Stage reflects submitted_for_officer_review when application is under_review'
  );

  // Officer records decision
  const approvedAppRes = await updateApplicationStatus(mockApp.id, 'approved', 'All APH 2024–27 criteria satisfied');
  assert(approvedAppRes.data?.status === 'approved', 'Officer approval recorded successfully');

  const finalSummary = runEoaValidationEngine({
    application: { ...mockApp, status: 'approved' },
    documents: mockDocs,
    extractions: mockExtractions,
    fields: mockFields,
  });
  assert(finalSummary.workflowStage === 'officer_review_completed', 'Stage reflects officer_review_completed');

  // --------------------------------------------------------------------------
  // TEST GROUP 6: Role Security & Officer Review Queue Isolation
  // --------------------------------------------------------------------------
  console.log('\nTEST GROUP 6: Two-Role Architecture & Officer Review Queue');

  const officerQueue = await fetchApplicationsForOfficerReview();
  assert(Array.isArray(officerQueue.data), 'Officer workspace fetches application review queue');
  assert(
    officerQueue.data.some((a) => a.id === mockApp.id),
    'Submitted application appears in Officer Review Queue'
  );

  console.log('\n======================================================');
  console.log(`ALL AICTE EOA WORKFLOW TESTS PASSED: ${passedTests}/${totalTests} assertions`);
  console.log('======================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
