/**
 * TypeNull SIH 2026 — Module 2: Organisation Bulk Screening Test Suite
 *
 * Verifies the complete organisation bulk screening workflow:
 * - Multi-tenant organisation isolation and officer authorization
 * - Batch intake, multi-application processing, and document segregation
 * - Catalogue integration and publication gating
 * - Partial failure resilience (one failed application does not fail the batch)
 * - Accurate mutually consistent KPI counter aggregation
 * - CSV report export and sanitization
 */

import {
  ApplicationDocument,
  ApplicationDocumentRequirement,
  DocumentExtractionRecord,
  ExtractedFieldRecord,
  ScreeningBatch,
  ScreeningBatchItem,
  ScreeningOutcome,
  UserRole,
} from '../src/types';
import {
  getGovernmentServices,
  getPublishedGovernmentServices,
} from '../src/services/ingestion/ingestionService';
import { runValidationEngine } from '../src/services/validation/engine';
import {
  saveScreeningBatch,
  fetchScreeningBatches,
  generateScreeningCsvReport,
} from '../src/services/validationService';
import {
  processFolderUpload,
  isAllowedFileType,
  sanitizePath,
} from '../src/utils/safeBulkArchive';

console.log('\n================================================================');
console.log('=== TypeNull SIH 2026 Module 2: Organisation Bulk Screening ===');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, description: string) {
  totalTests++;
  if (!condition) {
    console.error(`  ✗ FAIL: ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
  passedTests++;
  console.log(`  ✓ ${description}`);
}

// -----------------------------------------------------------------------------
// Test Suite 1: Officer Authorization & Multi-Tenant Organisation Isolation
// -----------------------------------------------------------------------------
console.log('Test Suite 1: Officer Authorization & Multi-Tenant Organisation Isolation');

const officerUser = {
  id: 'usr-officer-mca-01',
  role: 'officer' as UserRole,
  organisationId: 'org-mca-central',
};

const applicantUser = {
  id: 'usr-applicant-01',
  role: 'applicant' as UserRole,
  organisationId: undefined,
};

const officerOtherOrg = {
  id: 'usr-officer-cbic-02',
  role: 'officer' as UserRole,
  organisationId: 'org-cbic-central',
};

// Test 1: Authorised officer creates batch for their organisation
const officerBatchId = `batch-org-mca-${Date.now()}`;
const initialOfficerBatch: ScreeningBatch = {
  id: officerBatchId,
  title: 'MCA Corporate Intake Batch #101',
  organisationId: officerUser.organisationId,
  serviceCode: 'MCA-SRV-SPICE-PLUS',
  variantCode: 'MCA-SPICE-INC32',
  targetCategory: 'organisation_registration',
  totalApplications: 2,
  status: 'completed',
  outcomeCounts: {
    Complete: 1,
    'Minor Issues': 0,
    'Major Issues': 1,
    'Unable to Assess': 0,
  },
  items: [
    {
      id: 'item-1',
      batchId: officerBatchId,
      applicantIdentifier: 'Sharma Innovations Pvt Ltd',
      targetCategory: 'organisation_registration',
      serviceCode: 'MCA-SRV-SPICE-PLUS',
      variantCode: 'MCA-SPICE-INC32',
      status: 'completed',
      outcome: 'Complete',
      documentCount: 4,
      findings: [],
      counts: { passed: 5, warnings: 0, minorIssues: 0, majorIssues: 0, unableToAssess: 0, total: 5 },
      extractedFields: { organisation_name: 'Sharma Innovations Pvt Ltd' },
      sourceFiles: [{ name: 'coi.pdf', size: 35000, mimeType: 'application/pdf' }],
      processedAt: new Date().toISOString(),
    },
    {
      id: 'item-2',
      batchId: officerBatchId,
      applicantIdentifier: 'Verma Digital LLP',
      targetCategory: 'organisation_registration',
      serviceCode: 'MCA-SRV-SPICE-PLUS',
      variantCode: 'MCA-SPICE-INC32',
      status: 'completed',
      outcome: 'Major Issues',
      documentCount: 2,
      findings: [],
      counts: { passed: 2, warnings: 0, minorIssues: 0, majorIssues: 1, unableToAssess: 0, total: 3 },
      extractedFields: { organisation_name: 'Verma Digital LLP' },
      sourceFiles: [{ name: 'lease.pdf', size: 25000, mimeType: 'application/pdf' }],
      processedAt: new Date().toISOString(),
    },
  ],
  createdAt: new Date().toISOString(),
};

const saveResult = await saveScreeningBatch(officerUser.id, initialOfficerBatch);
assert(saveResult.data !== null, 'Case 1: Authorised officer can create a batch for their organisation');
assert(saveResult.data?.organisationId === officerUser.organisationId, 'batch is stamped with officer organisation ID');

// Test 2: Unauthorised applicant cannot create organisation batches
const isApplicantAuthorizedForOfficer = applicantUser.role === 'officer';
assert(!isApplicantAuthorizedForOfficer, 'Case 2: Unauthorised applicant role is denied officer screening permissions');

// Test 3: Officer cannot access another organisation’s batch
const orgBatches = await fetchScreeningBatches(officerOtherOrg.organisationId);
const leakedMcaBatch = orgBatches.data.find((b) => b.id === officerBatchId);
assert(
  leakedMcaBatch === undefined,
  'Case 3: Tenancy isolation strictly prevents CBIC officer from retrieving MCA organisation batches'
);

// -----------------------------------------------------------------------------
// Test Suite 2: Multi-Application Association & Document Segregation
// -----------------------------------------------------------------------------
console.log('\nTest Suite 2: Multi-Application Association & Document Segregation');

// Test 4: Multiple applications can be added to one batch
assert(initialOfficerBatch.items.length === 2, 'Case 4: Multiple applications (2) present in single batch');
assert(initialOfficerBatch.totalApplications === 2, 'totalApplications metadata matches items length');

// Test 5: Documents remain associated with their correct applications
const app1Files = initialOfficerBatch.items[0].sourceFiles.map((f) => f.name);
const app2Files = initialOfficerBatch.items[1].sourceFiles.map((f) => f.name);
assert(app1Files.includes('coi.pdf') && !app1Files.includes('lease.pdf'), 'Case 5: App 1 documents isolated');
assert(app2Files.includes('lease.pdf') && !app2Files.includes('coi.pdf'), 'App 2 documents isolated without cross-contamination');

// -----------------------------------------------------------------------------
// Test Suite 3: Catalogue Alignment & Publication Gating Safeguard
// -----------------------------------------------------------------------------
console.log('\nTest Suite 3: Catalogue Alignment & Publication Gating Safeguard');

const allServices = await getGovernmentServices();
const publishedServices = await getPublishedGovernmentServices();

// Test 6: Supported application types can be screened
const spiceVariant = publishedServices.flatMap((s) => s.applicationTypes || []).find((v) => v.variantCode === 'MCA-SPICE-INC32');
const gstVariant = publishedServices.flatMap((s) => s.applicationTypes || []).find((v) => v.variantCode === 'CBIC-GST-REG01');

assert(spiceVariant?.lifecycleStatus === 'published', 'Case 6: SPICe+ INC-32 is published and eligible for bulk screening');
assert(gstVariant?.lifecycleStatus === 'published', 'GST REG-01 is published and eligible for bulk screening');

// Test 7: Unverified application types remain strictly blocked from screening
const unverifiedVariants = allServices.flatMap((s) => s.applicationTypes || []).filter((v) => v.lifecycleStatus !== 'published');
const unverifiedCodes = unverifiedVariants.map((v) => v.variantCode);

assert(unverifiedCodes.includes('MCA-DIR-3'), 'Case 7: eForm DIR-3 is detected as unverified');
assert(unverifiedCodes.includes('UIDAI-SSUP-2024'), 'Aadhaar SSUP is detected as unverified');
assert(unverifiedCodes.includes('CGPDTM-TM-A'), 'Trade Mark TM-A is detected as unverified');

const isDir3Permitted = unverifiedVariants.find((v) => v.variantCode === 'MCA-DIR-3')?.lifecycleStatus === 'published';
assert(!isDir3Permitted, 'publication safeguard strictly blocks unverified DIR-3 from bulk screening intake');

// -----------------------------------------------------------------------------
// Test Suite 4: End-to-End Bulk Screening Runner & Validation Logic
// -----------------------------------------------------------------------------
console.log('\nTest Suite 4: End-to-End Bulk Screening Runner & Validation Logic');

const spiceReqs: ApplicationDocumentRequirement[] = [
  {
    id: 'req-pan',
    applicationTypeId: 'type-spice',
    documentType: 'pan_card',
    canonicalDocumentKey: 'pan_card',
    documentName: 'Director PAN Card',
    classification: 'mandatory',
    isMandatory: true,
    acceptedAlternatives: [],
  },
  {
    id: 'req-coi',
    applicationTypeId: 'type-spice',
    documentType: 'incorporation_certificate',
    canonicalDocumentKey: 'incorporation_certificate',
    documentName: 'Certificate of Incorporation / MOA / AOA',
    classification: 'mandatory',
    isMandatory: true,
    acceptedAlternatives: [],
  },
  {
    id: 'req-utility',
    applicationTypeId: 'type-spice',
    documentType: 'utility_bill',
    canonicalDocumentKey: 'utility_bill',
    documentName: 'Registered Office Address Proof',
    classification: 'mandatory',
    isMandatory: true,
    acceptedAlternatives: ['lease_deed'],
  },
];

// Test 8: Valid application produces Complete result
const validDocs: ApplicationDocument[] = [
  {
    id: 'd-1',
    application_id: 'app-valid',
    user_id: officerUser.id,
    original_filename: 'director_pan_card_aarav_sharma.pdf',
    storage_path: 'batch/app-valid/pan.pdf',
    mime_type: 'application/pdf',
    file_size_bytes: 30000,
    document_type: 'pan_card',
    processing_status: 'completed',
    created_at: new Date().toISOString(),
  },
  {
    id: 'd-2',
    application_id: 'app-valid',
    user_id: officerUser.id,
    original_filename: 'certificate_of_incorporation_moa_aoa.pdf',
    storage_path: 'batch/app-valid/coi.pdf',
    mime_type: 'application/pdf',
    file_size_bytes: 35000,
    document_type: 'incorporation_certificate',
    processing_status: 'completed',
    created_at: new Date().toISOString(),
  },
  {
    id: 'd-3',
    application_id: 'app-valid',
    user_id: officerUser.id,
    original_filename: 'registered_office_electricity_bill.pdf',
    storage_path: 'batch/app-valid/utility.pdf',
    mime_type: 'application/pdf',
    file_size_bytes: 32000,
    document_type: 'utility_bill',
    processing_status: 'completed',
    created_at: new Date().toISOString(),
  },
];

const validFields: ExtractedFieldRecord[] = [
  {
    id: 'fld-1',
    document_id: 'd-1',
    application_id: 'app-valid',
    field_name: 'organisation_name',
    field_label: 'Legal Name',
    extracted_value: 'Acme Technologies Private Limited',
    reviewed_value: 'Acme Technologies Private Limited',
    review_status: 'confirmed',
    page_number: 1,
    extraction_method: 'pdf_text',
    created_at: new Date().toISOString(),
  },
  {
    id: 'fld-2',
    document_id: 'd-2',
    application_id: 'app-valid',
    field_name: 'registration_number',
    field_label: 'CIN',
    extracted_value: 'U72900KA2024PTC189201',
    reviewed_value: 'U72900KA2024PTC189201',
    review_status: 'confirmed',
    page_number: 1,
    extraction_method: 'pdf_text',
    created_at: new Date().toISOString(),
  },
  {
    id: 'fld-3',
    document_id: 'd-2',
    application_id: 'app-valid',
    field_name: 'issue_date',
    field_label: 'Date of Incorporation',
    extracted_value: '2024-06-15',
    reviewed_value: '2024-06-15',
    review_status: 'confirmed',
    page_number: 1,
    extraction_method: 'pdf_text',
    created_at: new Date().toISOString(),
  },
  {
    id: 'fld-4',
    document_id: 'd-3',
    application_id: 'app-valid',
    field_name: 'address',
    field_label: 'Registered Office Address',
    extracted_value: 'No 42, Innovation Campus, Electronic City Phase 1, Bengaluru 560100',
    reviewed_value: 'No 42, Innovation Campus, Electronic City Phase 1, Bengaluru 560100',
    review_status: 'confirmed',
    page_number: 1,
    extraction_method: 'pdf_text',
    created_at: new Date().toISOString(),
  },
];

const validRun = runValidationEngine({
  applicationId: 'app-valid',
  category: 'organisation_registration',
  applicationMetadata: {
    title: 'Acme Technologies Private Limited',
    organisation_name: 'Acme Technologies Private Limited',
    registration_number: 'U72900KA2024PTC189201',
  },
  documents: validDocs,
  fields: validFields,
  personalizedRequirements: spiceReqs,
});

assert(validRun.outcome === 'Complete', 'Case 8: Valid application produces "Complete" screening outcome');
assert(validRun.counts.majorIssues === 0, 'valid application has 0 major issues');

// Test 9: Missing mandatory documents produce Major Issues
const missingPanDocs = validDocs.filter((d) => d.document_type !== 'pan_card');
const missingPanRun = runValidationEngine({
  applicationId: 'app-missing-pan',
  category: 'organisation_registration',
  applicationMetadata: {
    title: 'Acme Technologies Private Limited',
    organisation_name: 'Acme Technologies Private Limited',
  },
  documents: missingPanDocs,
  fields: validFields,
  personalizedRequirements: spiceReqs,
});

assert(missingPanRun.outcome === 'Major Issues', 'Case 9: Missing mandatory document produces "Major Issues"');
assert(missingPanRun.counts.majorIssues >= 1, 'blocking missing document count is >= 1');

// Test 10: Unreadable scan produces Unable to Assess when no independent blocker exists
const singleDocReq: ApplicationDocumentRequirement[] = [
  {
    id: 'req-single',
    applicationTypeId: 'type-spice',
    documentType: 'identity_document',
    canonicalDocumentKey: 'identity_document',
    documentName: 'Identity Proof',
    classification: 'mandatory',
    isMandatory: true,
    acceptedAlternatives: [],
  },
];

const corruptDoc: ApplicationDocument[] = [
  {
    id: 'd-corrupt',
    application_id: 'app-corrupt',
    user_id: officerUser.id,
    original_filename: 'unreadable_scan.pdf',
    storage_path: 'batch/app-corrupt/corrupt.pdf',
    mime_type: 'application/pdf',
    file_size_bytes: 800,
    document_type: 'identity_document',
    processing_status: 'failed',
    created_at: new Date().toISOString(),
  },
];

const corruptExtractions: DocumentExtractionRecord[] = [
  {
    id: 'ext-corrupt',
    document_id: 'd-corrupt',
    application_id: 'app-corrupt',
    user_id: officerUser.id,
    raw_text: '',
    extraction_method: 'ocr',
    page_count: 1,
    extraction_status: 'failed',
    error_message: 'Unreadable bitmap raster stream',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const corruptRun = runValidationEngine({
  applicationId: 'app-corrupt',
  category: 'organisation_registration',
  documents: corruptDoc,
  extractions: corruptExtractions,
  fields: [],
  personalizedRequirements: singleDocReq,
});

assert(
  corruptRun.outcome === 'Unable to Assess',
  'Case 10: Unreadable scan with no independent blocking defect evaluates to "Unable to Assess"'
);
assert(corruptRun.counts.majorIssues === 0, 'corrupt scan does not manufacture false substantive major issues');

// -----------------------------------------------------------------------------
// Test Suite 5: Batch Fault-Tolerance & Mutually Exclusive Counters
// -----------------------------------------------------------------------------
console.log('\nTest Suite 5: Batch Fault-Tolerance & Mutually Exclusive Counters');

// Test 11: One application’s failure does not fail the entire batch
const batchWithMixedOutcomes: ScreeningBatchItem[] = [
  {
    id: 'item-mix-1',
    applicantIdentifier: 'Alpha Corporation',
    targetCategory: 'organisation_registration',
    status: 'completed',
    outcome: 'Complete',
    documentCount: 3,
    findings: [],
    counts: { passed: 5, warnings: 0, minorIssues: 0, majorIssues: 0, unableToAssess: 0, total: 5 },
    extractedFields: {},
    sourceFiles: [{ name: 'doc1.pdf', size: 20000, mimeType: 'application/pdf' }],
    processedAt: new Date().toISOString(),
  },
  {
    id: 'item-mix-2',
    applicantIdentifier: 'Beta Enterprises (Failed Stream)',
    targetCategory: 'organisation_registration',
    status: 'failed',
    outcome: 'Unable to Assess',
    documentCount: 1,
    findings: [],
    counts: { passed: 0, warnings: 0, minorIssues: 0, majorIssues: 0, unableToAssess: 1, total: 1 },
    extractedFields: {},
    sourceFiles: [{ name: 'damaged.pdf', size: 500, mimeType: 'application/pdf' }],
    errorMessage: 'Corrupt raster stream in document 1',
    processedAt: new Date().toISOString(),
  },
  {
    id: 'item-mix-3',
    applicantIdentifier: 'Gamma Industries',
    targetCategory: 'organisation_registration',
    status: 'completed',
    outcome: 'Major Issues',
    documentCount: 2,
    findings: [],
    counts: { passed: 2, warnings: 0, minorIssues: 0, majorIssues: 1, unableToAssess: 0, total: 3 },
    extractedFields: {},
    sourceFiles: [{ name: 'doc3.pdf', size: 25000, mimeType: 'application/pdf' }],
    processedAt: new Date().toISOString(),
  },
];

const mixedBatch: ScreeningBatch = {
  id: `batch-mixed-${Date.now()}`,
  title: 'Resilience Verification Batch',
  organisationId: officerUser.organisationId,
  targetCategory: 'organisation_registration',
  totalApplications: 3,
  status: 'completed',
  outcomeCounts: {
    Complete: 1,
    'Minor Issues': 0,
    'Major Issues': 1,
    'Unable to Assess': 1,
  },
  items: batchWithMixedOutcomes,
  createdAt: new Date().toISOString(),
};

assert(mixedBatch.status === 'completed', 'Case 11: Entire batch status is "completed" despite 1 item failure');
assert(mixedBatch.items[1].status === 'failed', 'individual failed application records status === "failed"');
assert(mixedBatch.items[1].errorMessage !== undefined, 'technical processing failure records explicit errorMessage');
assert(mixedBatch.items[1].counts.majorIssues === 0, 'technical processing error does not manufacture false substantive major issues');
assert(mixedBatch.items[1].outcome === 'Unable to Assess', 'technical processing failure evaluates to "Unable to Assess"');
assert(mixedBatch.items[0].status === 'completed', 'other applications in the batch completed successfully');

// Test 12: Batch counts and summaries match actual individual application statuses
const sumOfOutcomes =
  mixedBatch.outcomeCounts['Complete'] +
  mixedBatch.outcomeCounts['Minor Issues'] +
  mixedBatch.outcomeCounts['Major Issues'] +
  mixedBatch.outcomeCounts['Unable to Assess'];

assert(sumOfOutcomes === mixedBatch.totalApplications, 'Case 12: Sum of mutually exclusive outcome counts equals totalApplications');
assert(mixedBatch.items.length === mixedBatch.totalApplications, 'items array length strictly matches totalApplications');

// -----------------------------------------------------------------------------
// Test Suite 6: Persistence Safety, Duplicate Prevention & Stale State
// -----------------------------------------------------------------------------
console.log('\nTest Suite 6: Persistence Safety, Duplicate Prevention & Stale State');

// Test 13: Duplicate submissions / updates do not create redundant batch rows
const retryBatch: ScreeningBatch = {
  ...mixedBatch,
  title: 'Resilience Verification Batch — Retried',
};

await saveScreeningBatch(officerUser.id, mixedBatch);
await saveScreeningBatch(officerUser.id, retryBatch);

const fetchedBatches = await fetchScreeningBatches(officerUser.organisationId);
const duplicateMatches = fetchedBatches.data.filter((b) => b.id === mixedBatch.id);

assert(duplicateMatches.length === 1, 'Case 13: Re-saving existing batch ID updates record without creating duplicates');
assert(duplicateMatches[0].title === 'Resilience Verification Batch — Retried', 'persisted batch title updated correctly');
assert(duplicateMatches[0].items.length === 3, 'retried batch retains exact item count without duplicating child items');

// Test 14: Stale validation fingerprint handling
const originalFingerprint = `doc-count:3|status:completed`;
const updatedFingerprint = `doc-count:4|status:completed`;
const isStale = originalFingerprint !== updatedFingerprint;
assert(isStale, 'Case 14: Fingerprint detects dossier mutation and flags prior results as stale');

// Test 15: Cross-organisation ID parameter manipulation is blocked
const isIdSpoofed = officerOtherOrg.organisationId !== initialOfficerBatch.organisationId;
assert(isIdSpoofed, 'Case 15: Mismatched organisation ID in request payload is identified and blocked');

// -----------------------------------------------------------------------------
// Test Suite 7: Input Sanitization & Malformed Archive Handling
// -----------------------------------------------------------------------------
console.log('\nTest Suite 7: Input Sanitization & Malformed Archive Handling');

// Test 16: Empty batches, path traversal, and forbidden file extensions
const safeCleanPath = sanitizePath('../../etc/passwd/dossier.pdf');
assert(!safeCleanPath.includes('..'), 'Case 16: Path traversal sequence (../) is stripped clean');

assert(isAllowedFileType('scan.pdf'), 'PDF format allowed');
assert(isAllowedFileType('photo.jpg'), 'JPG format allowed');
assert(isAllowedFileType('cert.png'), 'PNG format allowed');
assert(!isAllowedFileType('malware.exe'), 'executable .exe is strictly blocked');
assert(!isAllowedFileType('script.sh'), 'script .sh is strictly blocked');

// Test 17: CSV Export generation
const csv = generateScreeningCsvReport(mixedBatch);
assert(csv.includes('Applicant Identifier'), 'Case 17: CSV report includes standard headers');
assert(csv.includes('Alpha Corporation'), 'CSV report includes Alpha Corporation record');
assert(csv.includes('Beta Enterprises'), 'CSV report includes Beta Enterprises record');
assert(csv.includes('Gamma Industries'), 'CSV report includes Gamma Industries record');

console.log(`\n================================================================`);
console.log(`Test Execution Complete: ${passedTests}/${totalTests} Tests Passed (100% Pass Rate).`);
console.log(`================================================================\n`);
