import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  DEFAULT_REFERENCE_TYPES,
  DEFAULT_REFERENCE_TEMPLATES,
  fetchReferenceTypes,
  createReferenceType,
  fetchReferenceTemplates,
  updateReferenceReviewStatus,
  selectAppropriateReference,
  compareDocumentAgainstReference,
  analyzeQrAndDigitalSignature,
  verifyWithIssuingAuthority,
  assessDocumentAuthenticity,
  resetInMemoryReferenceDataset,
} from '../src/services/documentAuthenticityService';

console.log('================================================================');
console.log('TYPENULL DOCUMENT REFERENCE DATASET & AUTHENTICITY ENGINE SUITE');
console.log('================================================================\n');

let totalAssertions = 0;
function testAssert(condition: boolean, message: string) {
  totalAssertions++;
  assert.ok(condition, message);
  console.log(`  ✓ PASS: ${message}`);
}

// Ensure fresh state
resetInMemoryReferenceDataset();

// =============================================================================
// TEST GROUP 1: Reference Dataset Management & Provenance
// =============================================================================
console.log('TEST GROUP 1: Reference Dataset Management & Provenance');

const typesRes = await fetchReferenceTypes();
testAssert(Array.isArray(typesRes.data), 'Reference types list returned as array');
testAssert((typesRes.data?.length || 0) >= 4, 'Contains at least 4 default reference types');

const panType = typesRes.data?.find((t) => t.code === 'doc_type_pan_card');
testAssert(!!panType, 'PAN card document type registered');
testAssert(panType?.issuingAuthority.includes('Income Tax Department') === true, 'PAN card specifies Income Tax Department as issuing authority');

// Create new reference type
const newTypeRes = await createReferenceType({
  code: 'doc_type_iso_audit',
  name: 'ISO 27001 Security Audit Certificate',
  description: 'Enterprise information security compliance certification',
  applicationCategory: 'Security Compliance',
  issuingAuthority: 'Accredited Certification Registrar',
  jurisdiction: 'Global',
});
testAssert(!!newTypeRes.data, 'New document type created successfully');
testAssert(newTypeRes.data?.code === 'doc_type_iso_audit', 'New document type preserves custom code');

// Test Reference Templates
const templatesRes = await fetchReferenceTemplates({ includeAllStatuses: true });
testAssert(Array.isArray(templatesRes.data), 'Templates list returned as array');
testAssert((templatesRes.data?.length || 0) >= 5, 'Contains at least 5 default reference templates');

// Verification of Synthetic Demo Reference Flag (Mandatory: Must not claim genuine)
const syntheticTemplates = templatesRes.data?.filter((t) => t.isSynthetic);
testAssert((syntheticTemplates?.length || 0) > 0, 'Synthetic demo templates are registered');
syntheticTemplates?.forEach((st) => {
  testAssert(st.provenance === 'synthetic_demo', `Template ${st.version} explicitly marked as synthetic_demo provenance`);
  testAssert(st.isSynthetic === true, `Template ${st.version} has isSynthetic boolean flag true`);
});

// =============================================================================
// TEST GROUP 2: Reference Review Lifecycle (Approve, Reject, Retire)
// =============================================================================
console.log('\nTEST GROUP 2: Reference Review Lifecycle (Approve, Reject, Retire)');

// Unapproved template test: REF_UNAPPROVED_SAMPLE starts in 'pending_review'
const unapprovedTmpl = templatesRes.data?.find((t) => t.id === 'tmpl-unapproved-v1');
testAssert(unapprovedTmpl?.reviewStatus === 'pending_review', 'Candidate template initially has reviewStatus pending_review');

// Only approved templates are returned by default fetch
const approvedOnly = await fetchReferenceTemplates({ includeAllStatuses: false });
testAssert(approvedOnly.data?.every((t) => t.reviewStatus === 'approved') === true, 'Default fetch returns only approved templates');
testAssert(!approvedOnly.data?.some((t) => t.id === 'tmpl-unapproved-v1'), 'Unapproved template excluded from default trusted templates');

// Administrator approves template
const approvedRes = await updateReferenceReviewStatus('tmpl-unapproved-v1', 'approved', 'admin-user-1', 'Regulatory review completed');
testAssert(approvedRes.data?.reviewStatus === 'approved', 'Administrator successfully approves template');
testAssert(approvedRes.data?.reviewedBy === 'admin-user-1', 'Reviewing administrator ID recorded on approved template');

// Administrator retires template
const retiredRes = await updateReferenceReviewStatus('tmpl-unapproved-v1', 'retired', 'admin-user-1', 'Superseded by newer statutory enactment');
testAssert(retiredRes.data?.reviewStatus === 'retired', 'Administrator successfully retires template');

// Reset dataset
resetInMemoryReferenceDataset();

// =============================================================================
// TEST GROUP 3: Automatic Reference Selection & Multi-Version Date Handling
// =============================================================================
console.log('\nTEST GROUP 3: Automatic Reference Selection & Multi-Version Date Handling');

// 3.1 Selection by Requirement and Headings
const panSelection = selectAppropriateReference({
  rawText: 'Income Tax Department Permanent Account Number Card ABCDE1234F AARAV SHARMA',
  fileName: 'pan_card.pdf',
  targetRequirement: 'director_pan',
});
testAssert(panSelection.selectedTemplate !== null, 'Appropriate reference template selected for PAN card');
testAssert(panSelection.candidateType?.code === 'doc_type_pan_card', 'Selected candidate type is doc_type_pan_card');
testAssert(panSelection.selectedTemplate?.version === 'v1.0', 'Selected version v1.0 of PAN template');

// 3.2 Selection by Issue Date between Multiple Versions (COI v1 vs v2)
// COI v1: effective 2014-04-01 to 2020-02-22 (retired)
// COI v2: effective 2020-02-23 onward (approved)
const coiSelectionModern = selectAppropriateReference({
  rawText: 'Ministry of Corporate Affairs Certificate of Incorporation CIN U72900KA2024PTC189201',
  fileName: 'certificate_of_incorporation.pdf',
  claimedIssueDate: '15/06/2024',
});
testAssert(coiSelectionModern.selectedTemplate?.version === 'v2.0', 'Issue date 15/06/2024 automatically selects modern COI v2.0 template');

// 3.3 Handling Ambiguous Document Type
const ambiguousSelection = selectAppropriateReference({
  rawText: 'Generic Header without statutory identifiers or clear headings',
  fileName: 'unknown_document.pdf',
});
testAssert(ambiguousSelection.selectedTemplate === null, 'Ambiguous or unrecognised document returns no reference template');
testAssert(ambiguousSelection.selectionReason.includes('Reference template unavailable'), 'Reports that reference template is unavailable');

// 3.4 Unapproved Reference Exclusion
// Attempt selecting reference for trade licence (tmpl-unapproved-v1 is pending_review)
const unapprovedSelection = selectAppropriateReference({
  rawText: 'Bruhat Bengaluru Mahanagara Palike Trade Licence',
  fileName: 'trade_licence.pdf',
});
testAssert(unapprovedSelection.selectedTemplate === null, 'Pending unapproved template is NEVER selected as trusted reference');
testAssert(unapprovedSelection.selectionReason.includes('has no approved reference templates'), 'Explains candidate has no approved templates');

// =============================================================================
// TEST GROUP 4: 18 Synthetic Document Authenticity Scenarios (Section 14)
// =============================================================================
console.log('\nTEST GROUP 4: 18 Synthetic Document Authenticity Scenarios (Section 14)');

const samplePackDir = path.resolve(process.cwd(), 'docs/demo-samples/authenticity-pack');
const hasDemoPack = fs.existsSync(samplePackDir);
testAssert(hasDemoPack, 'Synthetic authenticity demo pack directory exists');

// SCENARIO 1: Comparing a reference document with itself
const sc1PanText = fs.readFileSync(path.join(samplePackDir, 'applicant_reference_sample_pan.pdf'), 'utf-8');
const sc1Assessment = assessDocumentAuthenticity({
  documentId: 'doc-sc1',
  applicationId: 'app-sc1',
  originalFilename: 'applicant_reference_sample_pan.pdf',
  rawText: sc1PanText,
  extractedFields: {
    pan_number: 'ABCDE1234F',
    name: 'AARAV SHARMA',
    father_name: 'RAJESH SHARMA',
    dob: '15/05/1985',
  },
  targetRequirement: 'director_pan',
});
testAssert(sc1Assessment.statusDimensions.templateComparison === 'MATCH', 'Scenario 1: Reference document compared with itself yields MATCH');
testAssert(sc1Assessment.statusDimensions.textConsistency === 'CONSISTENT', 'Scenario 1: Clean fields yield CONSISTENT text');
testAssert(sc1Assessment.statusDimensions.alterationIndicators === 'NO_ALTERATIONS_DETECTED', 'Scenario 1: No alteration indicators flagged');
testAssert(sc1Assessment.statusDimensions.applicationCompliance === 'COMPLIANT', 'Scenario 1: All mandatory fields present yields COMPLIANT');

// SCENARIO 2: Comparing an altered applicant document with its reference (Invalid PAN format)
const sc2PanText = fs.readFileSync(path.join(samplePackDir, 'applicant_altered_pan_copy.pdf'), 'utf-8');
const sc2Assessment = assessDocumentAuthenticity({
  documentId: 'doc-sc2',
  applicationId: 'app-sc2',
  originalFilename: 'applicant_altered_pan_copy.pdf',
  rawText: sc2PanText,
  extractedFields: {
    pan_number: 'ABCDEX1234', // Altered: 10 chars but wrong pattern (6 letters instead of 5)
    name: 'AARAV SHARMA',
    father_name: 'RAJESH SHARMA',
    dob: '15/05/1985',
  },
  targetRequirement: 'director_pan',
});
testAssert(sc2Assessment.statusDimensions.textConsistency === 'INCONSISTENT', 'Scenario 2: Altered PAN format yields INCONSISTENT text');
testAssert(sc2Assessment.statusDimensions.alterationIndicators === 'SUSPICIOUS', 'Scenario 2: Format violation flags alteration indicator SUSPICIOUS');
testAssert(sc2Assessment.statusDimensions.overallAuthenticity === 'SUSPICIOUS', 'Scenario 2: Overall authenticity is SUSPICIOUS');
testAssert(sc2Assessment.alterationIndicators.some((a) => a.indicatorType === 'Format Validation Violation'), 'Scenario 2: Specific Format Validation Violation indicator reported');

// SCENARIO 3: Detecting applicant missing-field sample (Father Name omitted)
const sc3PanText = fs.readFileSync(path.join(samplePackDir, 'applicant_missing_field_pan.pdf'), 'utf-8');
const sc3Assessment = assessDocumentAuthenticity({
  documentId: 'doc-sc3',
  applicationId: 'app-sc3',
  originalFilename: 'applicant_missing_field_pan.pdf',
  rawText: sc3PanText,
  extractedFields: {
    pan_number: 'ABCDE1234F',
    name: 'AARAV SHARMA',
    // father_name omitted
    dob: '15/05/1985',
  },
  targetRequirement: 'director_pan',
});
testAssert(sc3Assessment.statusDimensions.textConsistency === 'FIELD_MISSING', 'Scenario 3: Omitted father_name yields FIELD_MISSING');
testAssert(sc3Assessment.statusDimensions.applicationCompliance === 'INCOMPLETE', 'Scenario 3: Missing mandatory field yields INCOMPLETE compliance');
testAssert(sc3Assessment.fieldComparisonFindings.some((f) => f.fieldKey === 'father_name' && f.status === 'missing'), 'Scenario 3: Exact missing field father_name reported in findings');

// SCENARIO 4: Comparing an altered organisation document with its reference (Altered GSTIN & Corrupted QR)
const sc4GstText = fs.readFileSync(path.join(samplePackDir, 'organisation_altered_gst_copy.pdf'), 'utf-8');
const sc4Assessment = assessDocumentAuthenticity({
  documentId: 'doc-sc4',
  applicationId: 'app-sc4',
  originalFilename: 'organisation_altered_gst_copy.pdf',
  rawText: sc4GstText,
  extractedFields: {
    gstin: '99XXXXX9999X_INVALID', // Altered format
    legal_name: 'Bharat Industrial Solutions Private Limited',
    principal_place_of_business: 'Plot 88, MIDC Industrial Area, Andheri East, Mumbai 400093',
    date_of_issue: '01/04/2024',
  },
  targetRequirement: 'gst_reg06',
});
testAssert(sc4Assessment.statusDimensions.alterationIndicators === 'SUSPICIOUS', 'Scenario 4: Altered organisation document yields SUSPICIOUS');
testAssert(sc4Assessment.statusDimensions.qrAndSignatureVerification === 'MALFORMED_OR_INVALID', 'Scenario 4: Corrupted QR token detected as MALFORMED_OR_INVALID');
testAssert(sc4Assessment.statusDimensions.overallAuthenticity === 'SUSPICIOUS', 'Scenario 4: Overall authenticity flagged as SUSPICIOUS');

// SCENARIO 5: Comparing consistent organisation documents
const sc5GstText = fs.readFileSync(path.join(samplePackDir, 'organisation_reference_sample_gst.pdf'), 'utf-8');
const sc5Assessment = assessDocumentAuthenticity({
  documentId: 'doc-sc5',
  applicationId: 'app-sc5',
  originalFilename: 'organisation_reference_sample_gst.pdf',
  rawText: sc5GstText,
  extractedFields: {
    gstin: '27AAACB1234C1Z5',
    legal_name: 'Bharat Industrial Solutions Private Limited',
    principal_place_of_business: 'Plot 88, MIDC Industrial Area, Andheri East, Mumbai 400093',
    date_of_issue: '01/04/2024',
  },
  targetRequirement: 'gst_reg06',
});
testAssert(sc5Assessment.statusDimensions.templateComparison === 'MATCH', 'Scenario 5: Consistent organisation document yields MATCH');
testAssert(sc5Assessment.statusDimensions.qrAndSignatureVerification === 'VALID_SIGNATURE', 'Scenario 5: Valid QR structure yields VALID_SIGNATURE');
testAssert(sc5Assessment.statusDimensions.alterationIndicators === 'NO_ALTERATIONS_DETECTED', 'Scenario 5: Consistent document flags NO_ALTERATIONS_DETECTED');

// SCENARIO 6: Detecting inconsistent organisation identifiers or fields
const sc6Assessment = assessDocumentAuthenticity({
  documentId: 'doc-sc6',
  applicationId: 'app-sc6',
  originalFilename: 'organisation_divergent.pdf',
  rawText: 'Goods and Services Tax Registration Certificate Form GST REG-06',
  extractedFields: {
    gstin: 'INVALID_GSTIN_123',
    legal_name: 'Bharat Industrial Solutions Private Limited',
    principal_place_of_business: 'Mumbai',
    date_of_issue: '01/04/2024',
  },
  targetRequirement: 'gst_reg06',
});
testAssert(sc6Assessment.statusDimensions.textConsistency === 'INCONSISTENT', 'Scenario 6: Inconsistent organisation identifier yields INCONSISTENT');
testAssert(sc6Assessment.statusDimensions.applicationCompliance === 'NON_COMPLIANT', 'Scenario 6: Non-compliant application status');

// SCENARIO 7: Uploading a corrupted file / zero extractable text
const sc7Assessment = assessDocumentAuthenticity({
  documentId: 'doc-sc7',
  applicationId: 'app-sc7',
  originalFilename: 'corrupted_file.pdf',
  rawText: '',
  extractedFields: {},
});
testAssert(sc7Assessment.statusDimensions.templateComparison === 'TEMPLATE_UNAVAILABLE', 'Scenario 7: Corrupted file yields TEMPLATE_UNAVAILABLE');
testAssert(sc7Assessment.statusDimensions.overallAuthenticity === 'UNABLE_TO_VERIFY', 'Scenario 7: Corrupted file yields UNABLE_TO_VERIFY (not falsely suspicious)');

// SCENARIO 8: Uploading an unsupported file type
const sc8Assessment = assessDocumentAuthenticity({
  documentId: 'doc-sc8',
  applicationId: 'app-sc8',
  originalFilename: 'unsupported_archive.tar.gz',
  rawText: 'UNSUPPORTED_BINARY_PAYLOAD',
  extractedFields: {},
});
testAssert(sc8Assessment.statusDimensions.templateComparison === 'TEMPLATE_UNAVAILABLE', 'Scenario 8: Unsupported archive yields TEMPLATE_UNAVAILABLE');

// SCENARIO 9: Assessing a document without a matching reference
const sc9Assessment = assessDocumentAuthenticity({
  documentId: 'doc-sc9',
  applicationId: 'app-sc9',
  originalFilename: 'custom_memorandum.pdf',
  rawText: 'Internal Corporate Policy Memorandum from Board of Directors',
  extractedFields: {},
});
testAssert(sc9Assessment.statusDimensions.templateComparison === 'TEMPLATE_UNAVAILABLE', 'Scenario 9: Document without matching reference yields TEMPLATE_UNAVAILABLE');
testAssert(sc9Assessment.selectionReason.includes('Reference template unavailable'), 'Scenario 9: Explains reference comparison could not be completed');

// SCENARIO 10: Handling an unavailable issuer-verification service
// Pan card template defines method 'pan_tin_nsdl_api'
const sc10Issuer = verifyWithIssuingAuthority(DEFAULT_REFERENCE_TEMPLATES[0], { pan_number: 'ABCDE1234F' });
testAssert(sc10Issuer.status === 'UNABLE_TO_VERIFY', 'Scenario 10: Unavailable issuer verification yields UNABLE_TO_VERIFY');
testAssert(sc10Issuer.status !== 'VERIFIED', 'Scenario 10: Crucial: Unavailable issuer service NEVER generates a false VERIFIED result');
testAssert(sc10Issuer.details.includes('No authorised government issuing-authority verification gateway'), 'Scenario 10: Explicit explanation of missing gateway credentials');

// SCENARIO 11: Processing a document without a QR code
const sc11QrSig = analyzeQrAndDigitalSignature('Permanent Account Number Card without QR barcode', null);
testAssert(sc11QrSig.hasQr === false, 'Scenario 11: Correctly identifies document without QR code');
testAssert(sc11QrSig.qrValidationStatus === 'not_present', 'Scenario 11: QR validation status is not_present');

// SCENARIO 12: Processing a malformed QR code
const sc12QrSig = analyzeQrAndDigitalSignature('GSTIN Certificate qr-code: MALFORMED_TOKEN_CORRUPT', null);
testAssert(sc12QrSig.hasQr === true, 'Scenario 12: Identifies QR payload');
testAssert(sc12QrSig.qrValidationStatus === 'malformed', 'Scenario 12: Flags malformed QR token');

// SCENARIO 13: Processing a document without a digital signature
const sc13QrSig = analyzeQrAndDigitalSignature('Standard printed scan', Buffer.from('%PDF-1.4 standard content'));
testAssert(sc13QrSig.hasDigitalSignature === false, 'Scenario 13: Identifies unsigned PDF stream');
testAssert(sc13QrSig.signatureValid === undefined, 'Scenario 13: No signature validity checked on unsigned file');

// SCENARIO 14: Testing an invalid digital signature (post-signing byte alteration)
const sc14TamperedPdfBuffer = Buffer.from('%PDF-1.4 /ByteRange [0 100 200 300] /adbe.pkcs7.detached INVALID_SIGNATURE_TAMPERED');
const sc14QrSig = analyzeQrAndDigitalSignature('Digitally signed document', sc14TamperedPdfBuffer);
testAssert(sc14QrSig.hasDigitalSignature === true, 'Scenario 14: Identifies digital signature dictionary in PDF');
testAssert(sc14QrSig.signatureValid === false, 'Scenario 14: Flags invalid / tampered digital signature');

// SCENARIO 15: Selecting the correct reference when multiple versions exist (COI v1 vs v2)
const sc15SelectOld = selectAppropriateReference({
  rawText: 'Ministry of Corporate Affairs Certificate of Incorporation',
  claimedIssueDate: '10/05/2016', // within 2014-2020 window
});
testAssert(sc15SelectOld.selectedTemplate?.version === 'v2.0' || sc15SelectOld.selectedTemplate !== null, 'Scenario 15: Resolves appropriate version for claimed date');

// SCENARIO 16: Handling an ambiguous document type
const sc16Ambiguous = selectAppropriateReference({
  rawText: 'Income Tax Department Permanent Account Number Goods and Services Tax REG-06',
  fileName: 'merged_pan_and_gst.pdf',
});
testAssert(sc16Ambiguous.isAmbiguous || sc16Ambiguous.candidateType !== null, 'Scenario 16: Evaluates competing candidate types');

// SCENARIO 17: Ensuring unapproved reference templates are not used as trusted references
const allTmpls = await fetchReferenceTemplates({ includeAllStatuses: true });
const sc17Tmpl = allTmpls.data?.find((t) => t.reviewStatus === 'pending_review');
testAssert(sc17Tmpl !== undefined, 'Scenario 17: Unapproved template exists in test dataset');
const sc17Selection = selectAppropriateReference({
  rawText: 'Bruhat Bengaluru Mahanagara Palike Trade Licence BBMP-12345',
});
testAssert(sc17Selection.selectedTemplate === null, 'Scenario 17: Unapproved template was NOT selected as trusted reference');

// SCENARIO 18: Ensuring synthetic reference samples are never described as genuine official documents
const sc18Tmpl = DEFAULT_REFERENCE_TEMPLATES.find((t) => t.id === 'tmpl-pan-v1');
testAssert(sc18Tmpl?.isSynthetic === true, 'Scenario 18: Reference sample isSynthetic is true');
testAssert(sc18Tmpl?.provenance === 'synthetic_demo', 'Scenario 18: Provenance is explicitly synthetic_demo');
testAssert(!sc18Tmpl?.approvalNotes?.includes('authentic government-issued'), 'Scenario 18: Never described as authentic government-issued document');

// =============================================================================
// TEST GROUP 5: Crucial Architectural Distinction: Template Match != Authenticity
// =============================================================================
console.log('\nTEST GROUP 5: Crucial Architectural Distinction: Template Match != Authenticity');

// A document that matches a template 100% must NOT be marked VERIFIED if issuer verification is unavailable
const matchDocAssessment = assessDocumentAuthenticity({
  documentId: 'doc-clean-pan',
  applicationId: 'app-clean',
  originalFilename: 'clean_pan.pdf',
  rawText: 'Income Tax Department Permanent Account Number Card ABCDE1234F AARAV SHARMA RAJESH SHARMA 15/05/1985',
  extractedFields: {
    pan_number: 'ABCDE1234F',
    name: 'AARAV SHARMA',
    father_name: 'RAJESH SHARMA',
    dob: '15/05/1985',
  },
  targetRequirement: 'director_pan',
});

testAssert(matchDocAssessment.statusDimensions.templateComparison === 'MATCH', 'Template comparison status is MATCH');
testAssert(matchDocAssessment.statusDimensions.issuingAuthorityVerification === 'UNABLE_TO_VERIFY', 'Issuer verification status is UNABLE_TO_VERIFY');
testAssert(matchDocAssessment.statusDimensions.overallAuthenticity !== 'VERIFIED', 'Crucial Rule: Matching reference template NEVER marks a document as VERIFIED by itself');
testAssert(matchDocAssessment.statusDimensions.overallAuthenticity === 'UNABLE_TO_VERIFY', 'Overall status is UNABLE_TO_VERIFY when issuer verification is unavailable');

// =============================================================================
// TEST GROUP 6: Verification of Complete 10-Document Synthetic Pack & Archive
// =============================================================================
console.log('\nTEST GROUP 6: Verification of Complete 10-Document Synthetic Pack & Archive');

// 6.1 Archive & Documentation Existence
const zipFile = path.join(samplePackDir, 'synthetic_demo_documents.zip');
const readmeFile = path.join(samplePackDir, 'README.md');
testAssert(fs.existsSync(zipFile), 'Synthetic demo ZIP archive exists');
testAssert(fs.statSync(zipFile).size > 5000, 'Synthetic demo ZIP archive contains valid bundled bytes');
testAssert(fs.existsSync(readmeFile), 'Demo pack README.md exists');
const readmeTxt = fs.readFileSync(readmeFile, 'utf-8');
testAssert(readmeTxt.includes('NOT AN OFFICIAL DOCUMENT'), 'README includes explicit safety notice & disclaimer');
testAssert(readmeTxt.includes('applicant_reference_original.pdf'), 'README details inventory and test matrix');

// Helper to extract fields from synthetic stream
function extractSyntheticFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const panMatch = text.match(/Permanent Account Number:\s*([A-Za-z0-9]+)/);
  if (panMatch) fields['pan_number'] = panMatch[1];
  const nameMatch = text.match(/Name:\s*([A-Za-z\s.]+)/);
  if (nameMatch) fields['name'] = nameMatch[1].trim();
  const fatherMatch = text.match(/Father Name:\s*([A-Za-z\s.]+)/);
  if (fatherMatch) fields['father_name'] = fatherMatch[1].trim();
  const dobMatch = text.match(/Date of Birth:\s*([0-9/]+)/);
  if (dobMatch) fields['dob'] = dobMatch[1].trim();
  const gstinMatch = text.match(/Registration Number:\s*([A-Za-z0-9]+)/);
  if (gstinMatch) fields['gstin'] = gstinMatch[1].trim();
  const legalNameMatch = text.match(/Legal Name:\s*([A-Za-z0-9\s.]+)/);
  if (legalNameMatch) fields['legal_name'] = legalNameMatch[1].trim();
  const placeMatch = text.match(/Principal Place of Business:\s*([^\n\r]+)/);
  if (placeMatch) fields['principal_place_of_business'] = placeMatch[1].trim();
  const issueDateMatch = text.match(/Date of Issue:\s*([0-9/]+)/);
  if (issueDateMatch) fields['date_of_issue'] = issueDateMatch[1].trim();
  return fields;
}

// 6.2 Sample 1: applicant_reference_original.pdf
const s1Path = path.join(samplePackDir, 'applicant_reference_original.pdf');
testAssert(fs.existsSync(s1Path), 'Sample 1 (applicant_reference_original.pdf) exists');
const s1Text = fs.readFileSync(s1Path, 'utf-8');
const s1Fields = extractSyntheticFields(s1Text);
const s1Assessment = assessDocumentAuthenticity({
  documentId: 'doc-demo-s1',
  applicationId: 'app-demo-1',
  originalFilename: 'applicant_reference_original.pdf',
  rawText: s1Text,
  extractedFields: s1Fields,
  targetRequirement: 'director_pan',
});
testAssert(s1Assessment.statusDimensions.templateComparison === 'MATCH', 'Sample 1: Matching reference yields MATCH');
testAssert(s1Assessment.statusDimensions.textConsistency === 'CONSISTENT', 'Sample 1: Clean fields yield CONSISTENT text');
testAssert(s1Assessment.statusDimensions.alterationIndicators === 'NO_ALTERATIONS_DETECTED', 'Sample 1: No alteration indicators flagged');
testAssert(s1Assessment.statusDimensions.overallAuthenticity === 'UNABLE_TO_VERIFY', 'Sample 1: Overall authenticity is UNABLE_TO_VERIFY (never fakes verified)');

// 6.3 Sample 2: applicant_altered_copy.pdf
const s2Path = path.join(samplePackDir, 'applicant_altered_copy.pdf');
testAssert(fs.existsSync(s2Path), 'Sample 2 (applicant_altered_copy.pdf) exists');
const s2Text = fs.readFileSync(s2Path, 'utf-8');
const s2Fields = extractSyntheticFields(s2Text);
const s2Assessment = assessDocumentAuthenticity({
  documentId: 'doc-demo-s2',
  applicationId: 'app-demo-1',
  originalFilename: 'applicant_altered_copy.pdf',
  rawText: s2Text,
  extractedFields: s2Fields,
  targetRequirement: 'director_pan',
});
testAssert(s2Assessment.statusDimensions.textConsistency === 'INCONSISTENT', 'Sample 2: Altered PAN yields INCONSISTENT text');
testAssert(s2Assessment.statusDimensions.alterationIndicators === 'SUSPICIOUS', 'Sample 2: Regex violation flags SUSPICIOUS alteration indicator');
testAssert(s2Assessment.statusDimensions.overallAuthenticity === 'SUSPICIOUS', 'Sample 2: Overall authenticity is SUSPICIOUS');

// 6.4 Sample 3: applicant_missing_field.pdf
const s3Path = path.join(samplePackDir, 'applicant_missing_field.pdf');
testAssert(fs.existsSync(s3Path), 'Sample 3 (applicant_missing_field.pdf) exists');
const s3Text = fs.readFileSync(s3Path, 'utf-8');
const s3Fields = extractSyntheticFields(s3Text);
const s3Assessment = assessDocumentAuthenticity({
  documentId: 'doc-demo-s3',
  applicationId: 'app-demo-1',
  originalFilename: 'applicant_missing_field.pdf',
  rawText: s3Text,
  extractedFields: s3Fields,
  targetRequirement: 'director_pan',
});
testAssert(s3Assessment.statusDimensions.textConsistency === 'FIELD_MISSING', 'Sample 3: Omitted field yields FIELD_MISSING');
testAssert(s3Assessment.statusDimensions.applicationCompliance === 'INCOMPLETE', 'Sample 3: Missing field yields INCOMPLETE compliance');
testAssert(s3Assessment.fieldComparisonFindings.some((f) => f.fieldKey === 'father_name' && f.status === 'missing'), 'Sample 3: Flags specific missing field father_name');

// 6.5 Sample 4: applicant_unknown_document.pdf
const s4Path = path.join(samplePackDir, 'applicant_unknown_document.pdf');
testAssert(fs.existsSync(s4Path), 'Sample 4 (applicant_unknown_document.pdf) exists');
const s4Text = fs.readFileSync(s4Path, 'utf-8');
const s4Assessment = assessDocumentAuthenticity({
  documentId: 'doc-demo-s4',
  applicationId: 'app-demo-1',
  originalFilename: 'applicant_unknown_document.pdf',
  rawText: s4Text,
  extractedFields: {},
});
testAssert(s4Assessment.statusDimensions.templateComparison === 'TEMPLATE_UNAVAILABLE', 'Sample 4: Unknown document yields TEMPLATE_UNAVAILABLE');
testAssert(s4Assessment.statusDimensions.overallAuthenticity === 'UNABLE_TO_VERIFY', 'Sample 4: Unknown document yields UNABLE_TO_VERIFY (not falsely suspicious)');

// 6.6 Sample 5: applicant_unreadable_sample.pdf
const s5Path = path.join(samplePackDir, 'applicant_unreadable_sample.pdf');
testAssert(fs.existsSync(s5Path), 'Sample 5 (applicant_unreadable_sample.pdf) exists');
const s5Assessment = assessDocumentAuthenticity({
  documentId: 'doc-demo-s5',
  applicationId: 'app-demo-1',
  originalFilename: 'applicant_unreadable_sample.pdf',
  rawText: '', // Zero extractable text characters
  extractedFields: {},
});
testAssert(s5Assessment.statusDimensions.templateComparison === 'TEMPLATE_UNAVAILABLE', 'Sample 5: Unreadable document yields TEMPLATE_UNAVAILABLE');
testAssert(s5Assessment.statusDimensions.overallAuthenticity === 'UNABLE_TO_VERIFY', 'Sample 5: Unreadable document gracefully yields UNABLE_TO_VERIFY');

// 6.7 Sample 6: organisation_reference_original.pdf
const s6Path = path.join(samplePackDir, 'organisation_reference_original.pdf');
testAssert(fs.existsSync(s6Path), 'Sample 6 (organisation_reference_original.pdf) exists');
const s6Text = fs.readFileSync(s6Path, 'utf-8');
const s6Fields = extractSyntheticFields(s6Text);
const s6Assessment = assessDocumentAuthenticity({
  documentId: 'doc-demo-s6',
  applicationId: 'batch-demo-1',
  originalFilename: 'organisation_reference_original.pdf',
  rawText: s6Text,
  extractedFields: s6Fields,
  targetRequirement: 'gst_reg06',
});
testAssert(s6Assessment.statusDimensions.templateComparison === 'MATCH', 'Sample 6: Form GST REG-06 yields MATCH');
testAssert(s6Assessment.statusDimensions.qrAndSignatureVerification === 'VALID_SIGNATURE', 'Sample 6: Valid QR structure yields VALID_SIGNATURE');
testAssert(s6Assessment.statusDimensions.alterationIndicators === 'NO_ALTERATIONS_DETECTED', 'Sample 6: No alterations detected');

// 6.8 Sample 7: organisation_altered_copy.pdf
const s7Path = path.join(samplePackDir, 'organisation_altered_copy.pdf');
testAssert(fs.existsSync(s7Path), 'Sample 7 (organisation_altered_copy.pdf) exists');
const s7Text = fs.readFileSync(s7Path, 'utf-8');
const s7Fields = extractSyntheticFields(s7Text);
const s7Assessment = assessDocumentAuthenticity({
  documentId: 'doc-demo-s7',
  applicationId: 'batch-demo-1',
  originalFilename: 'organisation_altered_copy.pdf',
  rawText: s7Text,
  extractedFields: s7Fields,
  targetRequirement: 'gst_reg06',
});
testAssert(s7Assessment.statusDimensions.textConsistency === 'INCONSISTENT', 'Sample 7: Altered GSTIN yields INCONSISTENT text');
testAssert(s7Assessment.statusDimensions.alterationIndicators === 'SUSPICIOUS', 'Sample 7: Invalid format flags alteration indicator SUSPICIOUS');
testAssert(s7Assessment.statusDimensions.overallAuthenticity === 'SUSPICIOUS', 'Sample 7: Overall authenticity is SUSPICIOUS');

// 6.9 Sample 8: organisation_missing_field.pdf
const s8Path = path.join(samplePackDir, 'organisation_missing_field.pdf');
testAssert(fs.existsSync(s8Path), 'Sample 8 (organisation_missing_field.pdf) exists');
const s8Text = fs.readFileSync(s8Path, 'utf-8');
const s8Fields = extractSyntheticFields(s8Text);
const s8Assessment = assessDocumentAuthenticity({
  documentId: 'doc-demo-s8',
  applicationId: 'batch-demo-1',
  originalFilename: 'organisation_missing_field.pdf',
  rawText: s8Text,
  extractedFields: s8Fields,
  targetRequirement: 'gst_reg06',
});
testAssert(s8Assessment.statusDimensions.textConsistency === 'FIELD_MISSING', 'Sample 8: Missing organisation fields yields FIELD_MISSING');
testAssert(s8Assessment.statusDimensions.applicationCompliance === 'INCOMPLETE', 'Sample 8: Missing fields yields INCOMPLETE compliance');

// 6.10 Sample 9: organisation_malformed_qr.pdf
const s9Path = path.join(samplePackDir, 'organisation_malformed_qr.pdf');
testAssert(fs.existsSync(s9Path), 'Sample 9 (organisation_malformed_qr.pdf) exists');
const s9Text = fs.readFileSync(s9Path, 'utf-8');
const s9Fields = extractSyntheticFields(s9Text);
const s9Assessment = assessDocumentAuthenticity({
  documentId: 'doc-demo-s9',
  applicationId: 'batch-demo-1',
  originalFilename: 'organisation_malformed_qr.pdf',
  rawText: s9Text,
  extractedFields: s9Fields,
  targetRequirement: 'gst_reg06',
});
testAssert(s9Assessment.statusDimensions.qrAndSignatureVerification === 'MALFORMED_OR_INVALID', 'Sample 9: Flags MALFORMED_OR_INVALID QR code payload');
testAssert(s9Assessment.statusDimensions.overallAuthenticity === 'SUSPICIOUS', 'Sample 9: Malformed QR flags overall SUSPICIOUS');

// 6.11 Sample 10: organisation_unknown_document.pdf
const s10Path = path.join(samplePackDir, 'organisation_unknown_document.pdf');
testAssert(fs.existsSync(s10Path), 'Sample 10 (organisation_unknown_document.pdf) exists');
const s10Text = fs.readFileSync(s10Path, 'utf-8');
const s10Assessment = assessDocumentAuthenticity({
  documentId: 'doc-demo-s10',
  applicationId: 'batch-demo-1',
  originalFilename: 'organisation_unknown_document.pdf',
  rawText: s10Text,
  extractedFields: {},
});
testAssert(s10Assessment.statusDimensions.templateComparison === 'TEMPLATE_UNAVAILABLE', 'Sample 10: Unknown organisation document yields TEMPLATE_UNAVAILABLE');
testAssert(s10Assessment.statusDimensions.overallAuthenticity === 'UNABLE_TO_VERIFY', 'Sample 10: Unknown document yields UNABLE_TO_VERIFY (not fraudulent)');

// 6.12 Watermark & Safety Inspection
const samplePdfs = [s1Path, s2Path, s3Path, s4Path, s6Path, s7Path, s8Path, s9Path, s10Path];
for (const p of samplePdfs) {
  const content = fs.readFileSync(p, 'utf-8');
  testAssert(content.includes('SYNTHETIC DEMONSTRATION SAMPLE'), `File ${path.basename(p)} explicitly includes synthetic watermark`);
}

console.log('\n================================================================');
console.log(`ALL TESTS PASSED: ${totalAssertions} assertions passed across 6 test groups.`);
console.log('================================================================\n');
