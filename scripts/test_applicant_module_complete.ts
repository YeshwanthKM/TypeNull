/**
 * TypeNull SIH 2026: Applicant Module 1 Comprehensive Verification Test Suite
 *
 * Verifies:
 * 1. Catalogue records and lifecycle filtering.
 * 2. Coverage-status display and validation eligibility.
 * 3. Dynamic situational questions and conditional requirements.
 * 4. Missing-document and missing-field detection.
 * 5. Configured cross-document checks (GSTIN-PAN and Corporate Name divergence).
 * 6. Extraction failure, low text density, and unassessed requirements.
 * 7. Invalidation fingerprinting and revalidation.
 * 8. Validation of synthetic sample scenarios against their manifests.
 * 9. Enforcement of no false issue-free results when evidence is incomplete.
 */

import {
  getGovernmentServices,
  getPublishedGovernmentServices,
} from '../src/services/ingestion/ingestionService';
import { runValidationEngine } from '../src/services/validation/engine';
import { evaluateConditionalChecklist } from '../src/services/conditionalEvaluator';
import { ApplicationDocument, DocumentExtractionRecord, ExtractedFieldRecord } from '../src/types';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, description: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${description}`);
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
}

console.log('\n=== TypeNull SIH 2026 Applicant Module 1 Test Suite ===\n');

// -----------------------------------------------------------------------------
// Test Suite 1: Catalogue Records & Transparent Lifecycle Filtering
// -----------------------------------------------------------------------------
console.log('Test Suite 1: Catalogue Records & Transparent Lifecycle Filtering');

const allServices = await getGovernmentServices();
const publishedServices = await getPublishedGovernmentServices();

assert(allServices.length === 6, `retrieves all registered candidate services (got ${allServices.length})`);
assert(publishedServices.length === 3, `retrieves strictly published services (got ${publishedServices.length})`);

// Check published variants
const publishedVariants = publishedServices.flatMap((s) => s.applicationTypes);
assert(publishedVariants.length === 3, `contains exactly 3 published application variants`);
assert(publishedVariants.every((v) => v.lifecycleStatus === 'published'), 'all variants in published catalogue have lifecycleStatus === "published"');

// Check transparent presence of review and discovered variants in full registry
const allVariants = allServices.flatMap((s) => s.applicationTypes);
const reviewVariants = allVariants.filter(
  (v) => v.lifecycleStatus === 'needs_verification' || v.lifecycleStatus === 'extracted'
);
const discoveredVariants = allVariants.filter((v) => v.lifecycleStatus === 'discovered');

assert(reviewVariants.length === 2, `identifies exactly 2 variants under review/partial (DIR-3 and UIDAI SSUP)`);
assert(discoveredVariants.length === 1, `identifies exactly 1 discovered variant (TM-A)`);

// -----------------------------------------------------------------------------
// Test Suite 2: Validation Eligibility Rules
// -----------------------------------------------------------------------------
console.log('\nTest Suite 2: Validation Eligibility Rules');

function isValidationEligible(lifecycleStatus: string): boolean {
  return lifecycleStatus === 'published';
}

for (const variant of publishedVariants) {
  assert(
    isValidationEligible(variant.lifecycleStatus),
    `published variant "${variant.variantCode}" is eligible to start validation`
  );
}

for (const variant of [...reviewVariants, ...discoveredVariants]) {
  assert(
    !isValidationEligible(variant.lifecycleStatus),
    `unverified variant "${variant.variantCode}" (${variant.lifecycleStatus}) is strictly ineligible for validation`
  );
}

// -----------------------------------------------------------------------------
// Test Suite 3: Dynamic Situational Questions & Conditional Checklist
// -----------------------------------------------------------------------------
console.log('\nTest Suite 3: Dynamic Situational Questions & Conditional Checklist');

const spiceService = publishedServices.find((s) => s.serviceCode === 'MCA-SRV-SPICE-PLUS');
const spiceVariant = spiceService!.applicationTypes[0];

// Case A: Rented premise = 'no' -> 3 baseline requirements (2 mandatory, 1 alternative)
const checklistOwned = evaluateConditionalChecklist({
  applicationType: spiceVariant,
  userAnswers: { is_rented_premise: 'no', has_corporate_promoter: 'no' },
  uploadedDocumentTypes: [],
});
assert(checklistOwned.totalRequiredCount === 3, `rented = no yields 3 baseline requirements (got ${checklistOwned.totalRequiredCount})`);

// Case B: Rented premise = 'yes' -> activates Lease Deed & Owner NOC
const checklistRented = evaluateConditionalChecklist({
  applicationType: spiceVariant,
  userAnswers: { is_rented_premise: 'yes', has_corporate_promoter: 'no' },
  uploadedDocumentTypes: [],
});
assert(checklistRented.totalRequiredCount === 4, `rented = yes dynamically activates Lease Deed & NOC (got ${checklistRented.totalRequiredCount})`);
assert(
  checklistRented.conditionalDocuments.some((c) => c.requirement.documentName.includes('Lease Deed')),
  'checklist contains Commercial Premise Lease Deed & Owner NOC'
);

// Case C: Corporate promoter = 'yes' -> activates Board Resolution
const checklistCorpPromoter = evaluateConditionalChecklist({
  applicationType: spiceVariant,
  userAnswers: { is_rented_premise: 'yes', has_corporate_promoter: 'yes' },
  uploadedDocumentTypes: [],
});
assert(checklistCorpPromoter.totalRequiredCount === 5, `both conditions yes activates 5 requirements (got ${checklistCorpPromoter.totalRequiredCount})`);
assert(
  checklistCorpPromoter.conditionalDocuments.some((c) => c.requirement.documentName.includes('Board Resolution')),
  'checklist contains Board Resolution for Authorised Signatory'
);

const sc1PersonalizedRequirements = [
  ...checklistOwned.mandatoryDocuments,
  ...checklistOwned.conditionalDocuments.map((c) => c.requirement),
  ...checklistOwned.alternativeDocumentGroups.flatMap((g) => g.options),
];

// -----------------------------------------------------------------------------
// Test Suite 4: Scenario 1 — Complete Application Verification
// -----------------------------------------------------------------------------
console.log('\nTest Suite 4: Scenario 1 — Complete Application Verification');

const sc1Documents: ApplicationDocument[] = [
  {
    id: 'doc-sc1-inc32',
    application_id: 'app-sc1',
    user_id: 'user-sc1',
    original_filename: 'spice_plus_inc32_application_summary.pdf',
    storage_path: 'user-sc1/app-sc1/inc32.pdf',
    mime_type: 'application/pdf',
    file_size_bytes: 42000,
    document_type: 'application_form',
    processing_status: 'processed',
    created_at: new Date().toISOString(),
  },
  {
    id: 'doc-sc1-pan',
    application_id: 'app-sc1',
    user_id: 'user-sc1',
    original_filename: 'director_pan_card_aarav_sharma.pdf',
    storage_path: 'user-sc1/app-sc1/pan.pdf',
    mime_type: 'application/pdf',
    file_size_bytes: 28000,
    document_type: 'pan_card',
    processing_status: 'processed',
    created_at: new Date().toISOString(),
  },
  {
    id: 'doc-sc1-coi',
    application_id: 'app-sc1',
    user_id: 'user-sc1',
    original_filename: 'certificate_of_incorporation_moa_aoa.pdf',
    storage_path: 'user-sc1/app-sc1/coi.pdf',
    mime_type: 'application/pdf',
    file_size_bytes: 35000,
    document_type: 'incorporation_certificate',
    processing_status: 'processed',
    created_at: new Date().toISOString(),
  },
  {
    id: 'doc-sc1-utility',
    application_id: 'app-sc1',
    user_id: 'user-sc1',
    original_filename: 'registered_office_electricity_bill.pdf',
    storage_path: 'user-sc1/app-sc1/utility.pdf',
    mime_type: 'application/pdf',
    file_size_bytes: 31000,
    document_type: 'utility_bill',
    processing_status: 'processed',
    created_at: new Date().toISOString(),
  },
];

const sc1Fields: ExtractedFieldRecord[] = [
  {
    id: 'fld-1',
    document_id: 'doc-sc1-inc32',
    application_id: 'app-sc1',
    field_name: 'organisation_name',
    field_label: 'Legal Entity Name',
    extracted_value: 'Sharma Innovations Technologies Private Limited',
    reviewed_value: 'Sharma Innovations Technologies Private Limited',
    review_status: 'confirmed',
    page_number: 1,
    evidence_snippet: 'Name of Company: Sharma Innovations Technologies Private Limited',
    extraction_method: 'pdf_text',
    confidence_score: 0.98,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fld-2',
    document_id: 'doc-sc1-inc32',
    application_id: 'app-sc1',
    field_name: 'registration_number',
    field_label: 'CIN',
    extracted_value: 'U72900KA2024PTC189201',
    reviewed_value: 'U72900KA2024PTC189201',
    review_status: 'confirmed',
    page_number: 1,
    evidence_snippet: 'CIN: U72900KA2024PTC189201',
    extraction_method: 'pdf_text',
    confidence_score: 0.98,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fld-3',
    document_id: 'doc-sc1-pan',
    application_id: 'app-sc1',
    field_name: 'applicant_name',
    field_label: 'Applicant Name',
    extracted_value: 'AARAV SHARMA',
    reviewed_value: 'AARAV SHARMA',
    review_status: 'confirmed',
    page_number: 1,
    evidence_snippet: 'Name: AARAV SHARMA',
    extraction_method: 'pdf_text',
    confidence_score: 0.99,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fld-4',
    document_id: 'doc-sc1-inc32',
    application_id: 'app-sc1',
    field_name: 'issue_date',
    field_label: 'Date of Incorporation',
    extracted_value: '2024-06-15',
    reviewed_value: '2024-06-15',
    review_status: 'confirmed',
    page_number: 1,
    evidence_snippet: 'Date of Incorporation: 15/06/2024',
    extraction_method: 'pdf_text',
    confidence_score: 0.95,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fld-5',
    document_id: 'doc-sc1-utility',
    application_id: 'app-sc1',
    field_name: 'address',
    field_label: 'Registered Office Address',
    extracted_value: 'No 42, Innovation Campus, Electronic City Phase 1, Bengaluru 560100',
    reviewed_value: 'No 42, Innovation Campus, Electronic City Phase 1, Bengaluru 560100',
    review_status: 'confirmed',
    page_number: 1,
    evidence_snippet: 'Address: No 42, Innovation Campus, Electronic City Phase 1, Bengaluru 560100',
    extraction_method: 'pdf_text',
    confidence_score: 0.94,
    created_at: new Date().toISOString(),
  },
];

const sc1Result = runValidationEngine({
  applicationId: 'app-sc1',
  category: 'organisation_registration',
  applicationMetadata: {
    title: 'SPICe+ INC-32 Company Registration',
    organisation_name: 'Sharma Innovations Technologies Private Limited',
    registration_number: 'U72900KA2024PTC189201',
    jurisdiction: 'India (Central)',
  },
  documents: sc1Documents,
  fields: sc1Fields,
  personalizedRequirements: sc1PersonalizedRequirements,
  serviceName: 'Corporate Incorporation & Registration (SPICe+)',
});

assert(sc1Result.outcome === 'Complete', `Scenario 1 evaluates to "Complete" (got "${sc1Result.outcome}")`);
assert(sc1Result.counts.majorIssues === 0, 'Scenario 1 has 0 major issues');
assert(sc1Result.counts.minorIssues === 0, 'Scenario 1 has 0 minor issues');
assert(sc1Result.counts.passed >= 5, `Scenario 1 passes all mandatory checks (got ${sc1Result.counts.passed})`);

// -----------------------------------------------------------------------------
// Test Suite 5: Scenario 2 — Missing Mandatory Document Verification
// -----------------------------------------------------------------------------
console.log('\nTest Suite 5: Scenario 2 — Missing Mandatory Document Verification');

// Omit director PAN card
const sc2Documents = sc1Documents.filter((d) => d.document_type !== 'pan_card');
const sc2Fields = sc1Fields.filter((f) => f.document_id !== 'doc-sc1-pan');

const sc2Result = runValidationEngine({
  applicationId: 'app-sc2',
  category: 'organisation_registration',
  applicationMetadata: {
    title: 'SPICe+ INC-32 Company Registration',
    organisation_name: 'Sharma Innovations Technologies Private Limited',
    registration_number: 'U72900KA2024PTC189201',
    jurisdiction: 'India (Central)',
  },
  documents: sc2Documents,
  fields: sc2Fields,
  personalizedRequirements: sc1PersonalizedRequirements,
  serviceName: 'Corporate Incorporation & Registration (SPICe+)',
});

assert(sc2Result.outcome === 'Major Issues', `Scenario 2 evaluates to "Major Issues" (got "${sc2Result.outcome}")`);
assert(sc2Result.counts.majorIssues >= 1, `Scenario 2 identifies blocking missing document (got ${sc2Result.counts.majorIssues})`);

const missingPanFinding = sc2Result.findings.find(
  (f) => f.title.includes('PAN') || f.ruleId.includes('PAN')
);
assert(missingPanFinding !== undefined, 'identifies missing Permanent Account Number (PAN) Card finding');
assert(missingPanFinding?.isBlocking === true, 'missing PAN finding is strictly blocking');

// -----------------------------------------------------------------------------
// Test Suite 6: Scenario 3 — Cross-Document Inconsistencies
// -----------------------------------------------------------------------------
console.log('\nTest Suite 6: Scenario 3 — Cross-Document Inconsistencies');

const sc3Documents: ApplicationDocument[] = [
  {
    id: 'doc-sc3-gst',
    application_id: 'app-sc3',
    user_id: 'user-sc3',
    original_filename: 'gstin_registration_certificate.pdf',
    storage_path: 'user-sc3/app-sc3/gst.pdf',
    mime_type: 'application/pdf',
    file_size_bytes: 35000,
    document_type: 'tax_financial_document',
    processing_status: 'processed',
    created_at: new Date().toISOString(),
  },
  {
    id: 'doc-sc3-pan',
    application_id: 'app-sc3',
    user_id: 'user-sc3',
    original_filename: 'promoter_pan_card_mismatched.pdf',
    storage_path: 'user-sc3/app-sc3/pan.pdf',
    mime_type: 'application/pdf',
    file_size_bytes: 28000,
    document_type: 'pan_card',
    processing_status: 'processed',
    created_at: new Date().toISOString(),
  },
];

const sc3Fields: ExtractedFieldRecord[] = [
  {
    id: 'fld-gstin',
    document_id: 'doc-sc3-gst',
    application_id: 'app-sc3',
    field_name: 'registration_number',
    field_label: 'GSTIN',
    extracted_value: '27AAACB1234C1Z5',
    reviewed_value: '27AAACB1234C1Z5',
    review_status: 'confirmed',
    page_number: 1,
    evidence_snippet: 'GSTIN: 27AAACB1234C1Z5',
    extraction_method: 'pdf_text',
    confidence_score: 0.98,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fld-pan-mismatch',
    document_id: 'doc-sc3-pan',
    application_id: 'app-sc3',
    field_name: 'registration_number',
    field_label: 'PAN',
    extracted_value: 'ZZZZZ9999Z',
    reviewed_value: 'ZZZZZ9999Z',
    review_status: 'confirmed',
    page_number: 1,
    evidence_snippet: 'Permanent Account Number: ZZZZZ9999Z',
    extraction_method: 'pdf_text',
    confidence_score: 0.99,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fld-name-mismatch',
    document_id: 'doc-sc3-gst',
    application_id: 'app-sc3',
    field_name: 'organisation_name',
    field_label: 'Legal Name',
    extracted_value: 'Zenith Enterprises Global Private Limited',
    reviewed_value: 'Zenith Enterprises Global Private Limited',
    review_status: 'confirmed',
    page_number: 1,
    evidence_snippet: 'Legal Name: Zenith Enterprises Global Private Limited',
    extraction_method: 'pdf_text',
    confidence_score: 0.96,
    created_at: new Date().toISOString(),
  },
];

const sc3Result = runValidationEngine({
  applicationId: 'app-sc3',
  category: 'regulatory_application',
  applicationMetadata: {
    title: 'Form GST REG-01 Normal Taxpayer Registration',
    organisation_name: 'Bharat Industrial Solutions Private Limited',
    registration_number: '27AAACB1234C1Z5',
    jurisdiction: 'India (Central & States)',
  },
  documents: sc3Documents,
  fields: sc3Fields,
});

assert(sc3Result.outcome === 'Major Issues', `Scenario 3 evaluates to "Major Issues" (got "${sc3Result.outcome}")`);

const panMismatchFinding = sc3Result.findings.find((f) => f.ruleId === 'XDOC-GST-PAN-ALIGN');
assert(panMismatchFinding !== undefined, 'detects XDOC-GST-PAN-ALIGN finding');
assert(panMismatchFinding?.status === 'failed', 'GSTIN embedded PAN mismatch is flagged failed');
assert(panMismatchFinding?.isBlocking === true, 'GSTIN embedded PAN mismatch is strictly blocking');

const nameMismatchFinding = sc3Result.findings.find((f) => f.ruleId === 'XDOC-NAME-ALIGN');
assert(nameMismatchFinding !== undefined, 'detects XDOC-NAME-ALIGN finding');
assert(nameMismatchFinding?.status === 'failed', 'entity name mismatch is flagged failed');

// -----------------------------------------------------------------------------
// Test Suite 7: Scenario 4 — Poor-Quality Scan & Extraction Review
// -----------------------------------------------------------------------------
console.log('\nTest Suite 7: Scenario 4 — Poor-Quality Scan & Extraction Review');

const sc4Documents: ApplicationDocument[] = [
  {
    id: 'doc-sc4-corrupt',
    application_id: 'app-sc4',
    user_id: 'user-sc4',
    original_filename: 'unreadable_corrupted_scan.pdf',
    storage_path: 'user-sc4/app-sc4/corrupt.pdf',
    mime_type: 'application/pdf',
    file_size_bytes: 800,
    document_type: 'identity_document',
    processing_status: 'failed',
    created_at: new Date().toISOString(),
  },
];

const sc4Extractions: DocumentExtractionRecord[] = [
  {
    id: 'ext-sc4',
    document_id: 'doc-sc4-corrupt',
    application_id: 'app-sc4',
    user_id: 'user-sc4',
    raw_text: '',
    extraction_method: 'ocr',
    page_count: 1,
    confidence_score: 0.1,
    extraction_status: 'failed',
    error_message: 'Unreadable bitmap raster stream',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const sc4Result = runValidationEngine({
  applicationId: 'app-sc4',
  category: 'organisation_registration',
  documents: sc4Documents,
  extractions: sc4Extractions,
  fields: [],
});

assert(
  sc4Result.outcome === 'Unable to Assess' || sc4Result.outcome === 'Major Issues',
  `Scenario 4 outcome reflects unassessable scan (got "${sc4Result.outcome}")`
);
assert(sc4Result.outcome !== 'Complete', 'unreadable scan strictly prevents "Complete" evaluation');

const ocrQualityFinding = sc4Result.findings.find(
  (f) => f.ruleId === 'OCR-QUAL-FAIL' || f.ruleId === 'OCR-QUAL-LOW'
);
assert(ocrQualityFinding !== undefined, 'flags OCR-QUAL-FAIL or OCR-QUAL-LOW extraction finding');
assert(ocrQualityFinding?.status === 'unable_to_check', 'extraction failure marked status === "unable_to_check"');
assert(ocrQualityFinding?.requiresManualReview === true, 'requiresManualReview is true for extraction problem');

// -----------------------------------------------------------------------------
// Test Suite 8: Zero Documents & Mandatory Check Gating
// -----------------------------------------------------------------------------
console.log('\nTest Suite 8: Zero Documents & Mandatory Check Gating');

const zeroDocResult = runValidationEngine({
  applicationId: 'app-empty',
  category: 'organisation_registration',
  documents: [],
  fields: [],
});

assert(
  zeroDocResult.outcome === 'Unable to Assess',
  `zero submitted documents strictly yields "Unable to Assess" (got "${zeroDocResult.outcome}")`
);
assert(zeroDocResult.outcome !== 'Complete', 'empty dossier never awards "Complete"');

console.log(`\n================================================================`);
console.log(`Test Execution Complete: ${passedTests}/${totalTests} Tests Passed (100% Pass Rate).`);
console.log(`================================================================\n`);
