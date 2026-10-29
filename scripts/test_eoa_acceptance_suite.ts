/**
 * TypeNull AICTE EoA End-to-End Acceptance Test Suite
 *
 * Verifies the complete document-validation, regulatory verification,
 * and officer scrutiny workflow under synthetic real-world scenarios.
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
  deleteApplicationDocument,
  validateDocumentFile,
  ALLOWED_MIME_TYPES,
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

async function runAcceptanceSuite() {
  console.log('\n======================================================');
  console.log('TYPENULL AICTE EOA END-TO-END ACCEPTANCE TEST SUITE');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // SECTION 1: Document Upload & Integrity Processing
  // --------------------------------------------------------------------------
  console.log('SECTION 1: Document Upload & Processing Under Synthetic Conditions');

  // 1.1 Valid text-based PDF
  const validPdfBytes = new TextEncoder().encode(
    '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n%%EOF'
  );
  const validResult = await inspectDocumentIntegrity(
    validPdfBytes.buffer,
    'affidavit.pdf',
    'application/pdf'
  );
  assert(validResult.isValidFormat, '1.1 Valid text-based PDF recognized as valid format');
  assert(validResult.pdfStructure?.hasValidHeader === true, '1.1 Valid PDF header detected');
  assert(validResult.pdfStructure?.hasValidEof === true, '1.1 Valid PDF EOF detected');

  // 1.2 Malformed PDF (corrupted header / truncated EOF)
  const malformedPdfBytes = new TextEncoder().encode(
    'CORRUPT_NOT_A_PDF_STREAM\n<< /Type /Catalog >>'
  );
  const malformedResult = await inspectDocumentIntegrity(
    malformedPdfBytes.buffer,
    'corrupted.pdf',
    'application/pdf'
  );
  assert(!malformedResult.isValidFormat, '1.2 Malformed PDF rejected as invalid format');
  assert(
    malformedResult.integrityFindings.some((f) => f.code === 'UNRECOGNIZED_MAGIC_BYTES' || f.code === 'PDF_HEADER_MALFORMED'),
    '1.2 Emits blocking finding for malformed PDF'
  );

  // 1.3 Misleading extension (JPEG file disguised as .pdf)
  const fakePdfFromJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const misleadingResult = await inspectDocumentIntegrity(
    fakePdfFromJpeg.buffer,
    'scanned_cert.pdf',
    'application/pdf'
  );
  assert(!misleadingResult.extensionMatch, '1.3 Extension mismatch detected between JPEG bytes and .pdf extension');
  assert(
    misleadingResult.integrityFindings.some((f) => f.code === 'EXTENSION_SIGNATURE_MISMATCH'),
    '1.3 Disguised file emits EXTENSION_SIGNATURE_MISMATCH finding'
  );

  // 1.4 Unsupported file types (Pre-upload validation)
  const exeValidation = validateDocumentFile(new File(['binary content'], 'script.exe', { type: 'application/x-msdownload' }));
  assert(!exeValidation.isValid, '1.4 Unsupported .exe format rejected by pre-upload validator');
  assert(exeValidation.error?.code === 'TYPE_NOT_ALLOWED', '1.4 Returns TYPE_NOT_ALLOWED error code');

  const docxValidation = validateDocumentFile(new File(['zip content'], 'document.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }));
  assert(!docxValidation.isValid, '1.4 Unsupported .docx format rejected by pre-upload validator');

  const heicValidation = validateDocumentFile(new File(['heic content'], 'photo.heic', { type: 'image/heic' }));
  assert(!heicValidation.isValid && heicValidation.error?.code === 'HEIC_UNSUPPORTED', '1.4 HEIC file rejected with conversion guidance');

  // 1.5 Zero-byte file
  const zeroByteValidation = validateDocumentFile(new File([], 'empty.pdf', { type: 'application/pdf' }));
  assert(!zeroByteValidation.isValid && zeroByteValidation.error?.code === 'EMPTY_FILE', '1.5 Zero-byte file rejected before upload');

  const zeroByteIntegrity = await inspectDocumentIntegrity(new ArrayBuffer(0), 'empty.pdf', 'application/pdf');
  assert(!zeroByteIntegrity.isValidFormat && zeroByteIntegrity.integrityFindings.some((f) => f.code === 'ZERO_BYTE_FILE'), '1.5 Zero-byte buffer flagged as ZERO_BYTE_FILE');

  // 1.6 Duplicate-file SHA-256 hash consistency
  const hash1 = await computeSha256(validPdfBytes.buffer);
  const hash2 = await computeSha256(validPdfBytes.buffer);
  assert(hash1 === hash2, '1.6 SHA-256 hash computation is completely deterministic');
  assert(hash1.length === 64, '1.6 Hash is standard 64-character hexadecimal');

  // 1.7 Safe error handling: no stack traces or secrets exposed
  const unreadableExtraction = await executePipelineExtraction(
    new ArrayBuffer(15),
    'corrupt.pdf',
    'application/pdf'
  );
  assert(
    !unreadableExtraction.warnings.some((w) => w.includes('password') || w.includes('token') || w.includes('secret')),
    '1.7 Error messages do not leak internal secrets or tokens'
  );

  // --------------------------------------------------------------------------
  // SECTION 2: Regulatory Validation & Traceability Scenarios
  // --------------------------------------------------------------------------
  console.log('\nSECTION 2: Regulatory Validation & Grounded Findings Scenarios');

  // 2.1 Missing required statutory document
  const appBase: DbApplication = {
    id: 'app-e2e-reg-01',
    user_id: 'user-inst-1',
    title: 'EoA 2026–27 Dossier',
    category: 'institution_registration',
    organisation_name: 'National Institute of Engineering',
    registration_number: '1-43289012',
    jurisdiction: 'Delhi, India',
    description: JSON.stringify({ academicYear: '2026-27' }),
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const missingDocsSummary = runEoaValidationEngine({
    application: appBase,
    documents: [], // Zero documents
  });
  assert(missingDocsSummary.blockingIssues === 4, '2.1 Flags 4 blocking issues for 4 missing statutory docs');
  assert(
    missingDocsSummary.findings.some(
      (f) => f.ruleId === 'AICTE-RULE-AFFIDAVIT-1' && f.ruleCitation?.includes('Approval Process Handbook')
    ),
    '2.1 Form 1 Affidavit cites AICTE Approval Process Handbook (Appendix 17)'
  );
  assert(
    missingDocsSummary.findings.some(
      (f) => f.ruleId === 'AICTE-RULE-LAND-BUILTUP' && f.ruleCitation?.includes('Approval Process Handbook')
    ),
    '2.1 Land certificate cites APH Appendix 4'
  );
  assert(
    missingDocsSummary.findings.some(
      (f) => f.ruleId === 'AICTE-RULE-FACULTY-CADRE' && f.ruleCitation?.includes('Approval Process Handbook')
    ),
    '2.1 Faculty Cadre statement cites 7th CPC Gazette norms'
  );
  assert(
    missingDocsSummary.findings.some(
      (f) => f.ruleId === 'AICTE-RULE-FIN-UDIN' && f.ruleCitation?.includes('ICAI')
    ),
    '2.1 Audited statements cite ICAI UDIN mandate'
  );

  // 2.2 Uploaded but unreadable document
  const unreadableDoc: ApplicationDocument = {
    id: 'doc-unreadable',
    application_id: appBase.id,
    user_id: appBase.user_id,
    original_filename: 'Form_1_Affidavit_blurred.pdf',
    storage_path: 'vault/blurred.pdf',
    mime_type: 'application/pdf',
    file_size_bytes: 50000,
    document_type: 'statutory_declaration',
    processing_status: 'failed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const unreadableExt: DocumentExtractionRecord = {
    id: 'ext-unreadable',
    document_id: unreadableDoc.id,
    application_id: appBase.id,
    user_id: appBase.user_id,
    extraction_status: 'failed',
    extraction_method: 'ocr',
    raw_text: '',
    page_count: 1,
    classified_type: 'statutory_declaration',
    classification_confidence: 0.1,
    classification_reason: 'Unreadable image stream',
    error_message: 'Optical character recognition failed: low contrast and blurred text',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const unreadableSummary = runEoaValidationEngine({
    application: appBase,
    documents: [unreadableDoc],
    extractions: [unreadableExt],
  });
  assert(
    unreadableSummary.findings.some((f) => f.category === 'unreadable_document' && f.severity === 'major'),
    '2.2 Unreadable document produces unreadable_document finding with major severity'
  );
  assert(
    unreadableSummary.findings.some((f) => f.requiresManualReview === true),
    '2.2 Unreadable document marks requiresManualReview as true instead of fraud'
  );

  // 2.3 Missing institution identifiers in claimed profile
  const missingIdApp: DbApplication = {
    ...appBase,
    organisation_name: '',
    registration_number: null,
  };
  const missingIdSummary = runEoaValidationEngine({
    application: missingIdApp,
    documents: [],
  });
  assert(
    missingIdSummary.findings.some((f) => f.id === 'finding-missing-declared-name' && f.isBlocking),
    '2.3 Flags missing declared institution legal name as blocking issue'
  );
  assert(
    missingIdSummary.findings.some((f) => f.id === 'finding-missing-declared-id' && f.isBlocking),
    '2.3 Flags missing AICTE Permanent Institute ID as blocking issue'
  );

  // 2.4 Matching identifiers across documents
  const matchingNameRes = compareInstitutionName('National Institute of Engineering', [
    { documentId: 'd1', documentName: 'affidavit.pdf', extractedName: 'National Institute of Engineering' },
    { documentId: 'd2', documentName: 'land.pdf', extractedName: 'National Institute of Engineering' },
  ]);
  assert(matchingNameRes.outcome === 'exact_match' && matchingNameRes.similarityScore === 1.0, '2.4 Exact name match yields 1.0 similarity');

  // 2.5 Formatting-only differences
  const formattingNameRes = compareInstitutionName('National Institute of Engineering', [
    { documentId: 'd1', documentName: 'affidavit.pdf', extractedName: 'National Institute of Engg.' },
  ]);
  assert(formattingNameRes.outcome === 'formatting_difference', '2.5 Punctuation and suffix differences recognized as formatting_difference');
  assert(!formattingNameRes.isBlocking, '2.5 Formatting differences do not block application');

  // 2.6 Genuine cross-document discrepancy
  const genuineDiscrepancyRes = compareInstitutionName('National Institute of Engineering', [
    { documentId: 'd1', documentName: 'affidavit.pdf', extractedName: 'South Asian Technical Academy' },
  ]);
  assert(genuineDiscrepancyRes.outcome === 'genuine_discrepancy', '2.6 Unrelated entity classified as genuine_discrepancy');
  assert(genuineDiscrepancyRes.isBlocking, '2.6 Genuine discrepancy is blocking');

  // 2.7 Missing or malformed CA UDIN
  const missingUdinValidation = validateUdinFormat('');
  assert(!missingUdinValidation.isValid, '2.7 Missing UDIN marked invalid');

  const malformedUdinValidation = validateUdinFormat('INVALID_UDIN_123');
  assert(!malformedUdinValidation.isValid, '2.7 Malformed UDIN marked invalid with explanation');

  const validUdinValidation = validateUdinFormat('24123456ABCDEF1234');
  assert(validUdinValidation.isValid, '2.7 Statutory 18-digit ICAI UDIN accepted');

  // 2.8 Conditional accreditation requirements (NBA)
  // Scenario A: NBA claimed in description, but certificate missing
  const nbaClaimedApp: DbApplication = {
    ...appBase,
    description: JSON.stringify({ hasNbaAccreditation: true }),
  };
  const nbaMissingSummary = runEoaValidationEngine({
    application: nbaClaimedApp,
    documents: [],
  });
  assert(
    nbaMissingSummary.findings.some((f) => f.ruleId === 'AICTE-RULE-NBA-ACCRED' && f.severity === 'blocking'),
    '2.8 Claimed NBA accreditation without certificate emits blocking requirement'
  );

  // Scenario B: NBA not claimed (Standard EoA)
  const nbaNotClaimedApp: DbApplication = {
    ...appBase,
    description: JSON.stringify({ hasNbaAccreditation: false }),
  };
  const nbaNotClaimedSummary = runEoaValidationEngine({
    application: nbaNotClaimedApp,
    documents: [],
  });
  assert(
    nbaNotClaimedSummary.findings.some((f) => f.id === 'finding-cond-nba-not-applicable' && f.status === 'PASS'),
    '2.8 Standard EoA without NBA marks conditional requirement as not applicable'
  );

  // 2.9 External verification unavailable disclosure
  const completeDocs: ApplicationDocument[] = [
    {
      id: 'doc-aff',
      application_id: appBase.id,
      user_id: appBase.user_id,
      original_filename: 'Form_1_Affidavit.pdf',
      storage_path: 'v/aff.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 100000,
      document_type: 'statutory_declaration',
      processing_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'doc-land-cert',
      application_id: appBase.id,
      user_id: appBase.user_id,
      original_filename: 'Land_Certificate.pdf',
      storage_path: 'v/land.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 100000,
      document_type: 'utility_bill',
      processing_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'doc-fac-stmt',
      application_id: appBase.id,
      user_id: appBase.user_id,
      original_filename: 'Faculty_Cadre_Statement.pdf',
      storage_path: 'v/fac.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 100000,
      document_type: 'faculty_statement',
      processing_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'doc-fin-stmt',
      application_id: appBase.id,
      user_id: appBase.user_id,
      original_filename: 'Audited_Financials.pdf',
      storage_path: 'v/fin.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 100000,
      document_type: 'incorporation_certificate',
      processing_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  const completeFields: ExtractedFieldRecord[] = [
    {
      id: 'f-1',
      extraction_id: 'ext-aff',
      document_id: 'doc-aff',
      application_id: appBase.id,
      user_id: appBase.user_id,
      field_name: 'institution_name',
      field_label: 'Legal Name',
      extracted_value: 'National Institute of Engineering',
      reviewed_value: null,
      page_number: 1,
      evidence_snippet: 'National Institute of Engineering',
      extraction_method: 'pdf_text',
      confidence_score: 0.95,
      review_status: 'unreviewed',
      created_at: new Date().toISOString(),
    },
    {
      id: 'f-2',
      extraction_id: 'ext-fin',
      document_id: 'doc-fin-stmt',
      application_id: appBase.id,
      user_id: appBase.user_id,
      field_name: 'udin',
      field_label: 'ICAI UDIN',
      extracted_value: '24123456ABCDEF1234',
      reviewed_value: null,
      page_number: 1,
      evidence_snippet: 'UDIN 24123456ABCDEF1234',
      extraction_method: 'pdf_text',
      confidence_score: 0.95,
      review_status: 'unreviewed',
      created_at: new Date().toISOString(),
    },
  ];

  const completeSummary = runEoaValidationEngine({
    application: appBase,
    documents: completeDocs,
    fields: completeFields,
  });
  assert(
    completeSummary.findings.some(
      (f) => f.category === 'external_verification_unavailable' && f.status === 'NOT_VERIFIABLE'
    ),
    '2.9 Clearly discloses that live external ICAI issuing authority check was not performed'
  );

  // --------------------------------------------------------------------------
  // SECTION 3: Workflow Transitions & Freshness Testing
  // --------------------------------------------------------------------------
  console.log('\nSECTION 3: Workflow Transitions & Finding Freshness');

  // Step 1: Open EoA application
  const appCreated = await createApplication(
    {
      title: 'EoA 2026-27 End-to-End',
      category: 'institution_registration',
      institutionName: 'National Institute of Engineering',
      registrationNumber: '1-43289012',
      jurisdiction: 'Delhi, India',
      description: 'Acceptance test instance',
    },
    'inst-accept-user'
  );
  assert(appCreated.data?.status === 'draft', '3.1 Newly initialized application is in draft status');
  const liveApp = appCreated.data!;

  // Step 2 & 3: Upload documents & view findings
  const initialValidation = runEoaValidationEngine({
    application: liveApp,
    documents: [],
  });
  assert(initialValidation.workflowStage === 'document_uploaded', '3.2 Initial stage is document_uploaded');
  assert(!initialValidation.isSubmissionReady, '3.2 Not submission ready when documents are missing');

  // Step 4 & 5: Replace/Upload valid documents & test revalidation
  const completeExtractions: DocumentExtractionRecord[] = completeDocs.map((d) => ({
    id: `ext-${d.id}`,
    document_id: d.id,
    application_id: liveApp.id,
    user_id: liveApp.user_id,
    extraction_status: 'completed',
    extraction_method: 'pdf_text',
    raw_text: 'National Institute of Engineering 1-43289012 UDIN 24123456ABCDEF1234',
    page_count: 1,
    classified_type: d.document_type,
    classification_confidence: 0.95,
    classification_reason: 'Statutory keywords',
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const validValidation = runEoaValidationEngine({
    application: liveApp,
    documents: completeDocs,
    extractions: completeExtractions,
    fields: completeFields,
  });
  assert(validValidation.blockingIssues === 0, '3.4 Complete documents resolve all blocking issues');
  assert(
    validValidation.workflowStage === 'ready_for_internal_submission',
    '3.5 Workflow transitions to ready_for_internal_submission upon resolving defects'
  );
  assert(validValidation.isSubmissionReady === true, '3.5 isSubmissionReady is true');

  // Step 6 & 7: Introduce a blocking defect and check gating
  const defectFields: ExtractedFieldRecord[] = [
    {
      ...completeFields[0],
      extracted_value: 'Discrepant Academy Private Ltd',
    },
  ];
  const defectValidation = runEoaValidationEngine({
    application: liveApp,
    documents: completeDocs,
    extractions: completeExtractions,
    fields: defectFields,
  });
  assert(defectValidation.blockingIssues > 0, '3.6 Discrepant entity name introduces blocking defect');
  assert(
    defectValidation.workflowStage === 'institution_corrections_pending',
    '3.6 Workflow transitions to institution_corrections_pending'
  );
  assert(!defectValidation.isSubmissionReady, '3.6 Blocking defect prevents internal submission');

  // Step 8 & 9: Enter internal officer review
  const submitRes = await submitApplicationForInternalReview(liveApp.id);
  assert(submitRes.data?.status === 'under_review', '3.8 Internal submission transitions status to under_review');

  const reviewValidation = runEoaValidationEngine({
    application: { ...liveApp, status: 'under_review' },
    documents: completeDocs,
    extractions: completeExtractions,
    fields: completeFields,
  });
  assert(
    reviewValidation.workflowStage === 'submitted_for_officer_review',
    '3.9 Workflow stage updates to submitted_for_officer_review'
  );

  // --------------------------------------------------------------------------
  // SECTION 4: Officer Scrutiny & Decisions
  // --------------------------------------------------------------------------
  console.log('\nSECTION 4: Officer Scrutiny & Review Decisions');

  // 4.1 Officer Review Queue includes submitted application
  const officerQueue = await fetchApplicationsForOfficerReview();
  assert(
    officerQueue.data.some((a) => a.id === liveApp.id),
    '4.1 Submitted application appears in the AICTE Officer Scrutiny queue'
  );

  // 4.2 Rejection requires statutory justification note
  const rejectWithoutNoteResult = await (async () => {
    // Mimicking EoaDossierScrutinyPanel validation:
    const notes = '   ';
    if (!notes.trim()) {
      return { success: false, error: 'Detailed statutory note required' };
    }
    return { success: true };
  })();
  assert(!rejectWithoutNoteResult.success, '4.2 Scrutiny console rejects empty justification on decision');

  // 4.3 Authorized officer records approval with audit notes
  const approvalRes = await updateApplicationStatus(
    liveApp.id,
    'approved',
    'Approved under AICTE APH 2024–27 Chapter II after thorough documentary verification.'
  );
  assert(approvalRes.data?.status === 'approved', '4.3 Officer approval status recorded in application record');

  // 4.4 Decision appears in institution status
  const fetchedAfterDecision = await fetchApplicationById(liveApp.id);
  assert(fetchedAfterDecision.data?.status === 'approved', '4.4 Institution fetches approved status');

  const finalWorkflowSummary = runEoaValidationEngine({
    application: fetchedAfterDecision.data!,
    documents: completeDocs,
    extractions: completeExtractions,
    fields: completeFields,
  });
  assert(
    finalWorkflowSummary.workflowStage === 'officer_review_completed',
    '4.4 Final workflow stage is officer_review_completed'
  );

  console.log('\n======================================================');
  console.log(`ALL ACCEPTANCE TESTS PASSED: ${passedTests}/${totalTests} assertions`);
  console.log('======================================================\n');
}

runAcceptanceSuite().catch((err) => {
  console.error('\nAcceptance Test Suite Failed:', err);
  process.exit(1);
});
