import assert from 'assert';
import {
  DEFAULT_REFERENCE_TEMPLATES,
  selectAppropriateReference,
  compareDocumentAgainstReference,
  normalizeFieldValue,
  resolveFieldCandidate,
  analyzeQrAndDigitalSignature,
  verifyWithIssuingAuthority,
  assessDocumentAuthenticity,
  resetInMemoryReferenceDataset,
} from '../src/services/documentAuthenticityService';

console.log('================================================================');
console.log('TYPENULL REAL-WORLD DOCUMENT COMPATIBILITY & TEST MATRIX SUITE');
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
// TEST GROUP 1: Digital PDFs with Selectable Text (PDF Text Stream)
// =============================================================================
console.log('TEST GROUP 1: Digital PDFs with Selectable Text (PDF Text Stream)');

const digitalPanAssessment = assessDocumentAuthenticity({
  documentId: 'doc-digital-pan-01',
  applicationId: 'app-compat-01',
  originalFilename: 'Director_PAN_Digital_Native.pdf',
  rawText: `
    INCOME TAX DEPARTMENT
    GOVT. OF INDIA
    Permanent Account Number Card
    ABCDE1234F
    Name: SURESH KUMAR
    Father's Name: RAMESH KUMAR
    Date of Birth: 12/04/1985
  `,
  extractedFields: {
    pan_number: 'ABCDE1234F',
    full_name: 'SURESH KUMAR',
    father_name: 'RAMESH KUMAR',
    dob: '12/04/1985',
  },
  readabilityStatus: 'digital_text',
  extractionConfidence: 0.99,
  pageCount: 1,
});

testAssert(digitalPanAssessment.readabilityStatus === 'digital_text', 'Digital PDF recognized as digital_text');
testAssert((digitalPanAssessment.extractionConfidence || 0) >= 0.95, 'High extraction confidence reported (>= 0.95)');
testAssert(digitalPanAssessment.statusDimensions.templateComparison === 'MATCH', 'Digital document matches reference template layout');
testAssert(digitalPanAssessment.statusDimensions.textConsistency === 'CONSISTENT', 'Digital document fields are consistent');
testAssert(digitalPanAssessment.statusDimensions.alterationIndicators === 'NO_ALTERATIONS_DETECTED', 'No alterations detected on clean digital PDF');
testAssert(digitalPanAssessment.statusDimensions.applicationCompliance === 'COMPLIANT', 'Clean digital document is COMPLIANT');

// =============================================================================
// TEST GROUP 2: Scanned PDFs & Image Document Ingestion (OCR Stream)
// =============================================================================
console.log('\nTEST GROUP 2: Scanned Documents & Image Ingestion (OCR Stream)');

const scannedGstAssessment = assessDocumentAuthenticity({
  documentId: 'doc-scanned-gst-01',
  applicationId: 'app-compat-02',
  originalFilename: 'GST_Certificate_Scan_300dpi.png',
  rawText: `
    [OCR] TESSERACT_OCR_STREAM
    Government of India
    Goods and Services Tax
    Registration Certificate
    Registration Number: 29ABCDE1234F1Z5
    Legal Name: NEXUS ENTERPRISES PRIVATE LIMITED
    Principal Place of Business: Bangalore
    Date of Issue: 15/07/2021
    qr-code: 29ABCDE1234F1Z5_VALID_TOKEN_PAYLOAD
  `,
  extractedFields: {
    gstin: '29ABCDE1234F1Z5',
    legal_name: 'NEXUS ENTERPRISES PRIVATE LIMITED',
    principal_place_of_business: 'Bangalore',
    date_of_issue: '15/07/2021',
  },
  readabilityStatus: 'scanned_ocr',
  extractionConfidence: 0.86,
  pageCount: 1,
});

testAssert(scannedGstAssessment.readabilityStatus === 'scanned_ocr', 'Scanned image correctly identified as scanned_ocr');
testAssert(scannedGstAssessment.ocrStatus === 'ocr_stream', 'OCR processing status recorded as ocr_stream');
testAssert(scannedGstAssessment.extractionConfidence === 0.86, 'OCR extraction confidence accurately recorded (0.86)');
testAssert(scannedGstAssessment.statusDimensions.templateComparison === 'MATCH', 'Scanned document structure matches Form GST REG-06');
testAssert(scannedGstAssessment.statusDimensions.qrAndSignatureVerification === 'VALID_SIGNATURE', 'Scanned GSTIN QR token successfully detected');

// =============================================================================
// TEST GROUP 3: Transparent Whitespace & Common OCR Error Normalization
// =============================================================================
console.log('\nTEST GROUP 3: Transparent Whitespace & Common OCR Error Normalization');

// 3.1 Normalization test: OCR letter 'O' instead of digit '0' + excess spaces
const rawPanWithOcrNoise = '  ABCDE  12O4F  ';
const normPanResult = normalizeFieldValue('pan_number', rawPanWithOcrNoise);

testAssert(normPanResult.normalizedValue === 'ABCDE1204F', 'Normalized value corrected letter O to digit 0 and removed whitespace');
testAssert(normPanResult.normalizationApplied?.includes('OCR character substitution') === true, 'Recorded character substitution in audit trail');
testAssert(normPanResult.normalizationApplied?.includes('whitespace') === true, 'Recorded whitespace removal in audit trail');
testAssert(!normPanResult.isIllegible, 'Cleanly disambiguated value is not marked illegible');

// 3.2 Evaluation of document containing noisy OCR fields
const noisyOcrAssessment = assessDocumentAuthenticity({
  documentId: 'doc-ocr-noisy-01',
  applicationId: 'app-compat-03',
  originalFilename: 'Director_PAN_Noisy_Scan.jpg',
  rawText: `
    INCOME TAX DEPARTMENT
    Permanent Account Number
    ABCDE 12O4F
    Name: SURESH KUMAR
    Father's Name: RAMESH KUMAR
    Date of Birth: 12-04-1985
  `,
  extractedFields: {
    pan_number: '  ABCDE  12O4F  ',
    full_name: 'SURESH KUMAR',
    father_name: 'RAMESH KUMAR',
    dob: '12-04-1985',
  },
  readabilityStatus: 'scanned_ocr',
  extractionConfidence: 0.82,
});

const panFinding = noisyOcrAssessment.fieldComparisonFindings.find((f) => f.fieldKey === 'pan_number');
testAssert(!!panFinding, 'PAN finding exists in assessment');
testAssert(panFinding?.rawObservedValue === '  ABCDE  12O4F  ', 'Raw observed value preserved exactly without silent modification');
testAssert(panFinding?.observedValue === 'ABCDE1204F', 'Observed candidate value normalized transparently');
testAssert(panFinding?.status === 'present_valid', 'Normalized PAN passes statutory regex validation');
testAssert(noisyOcrAssessment.normalizationNotes.length >= 2, 'Normalization notes record PAN substitution and Date delimiter');
testAssert(noisyOcrAssessment.statusDimensions.textConsistency === 'CONSISTENT', 'Document consistency is preserved after transparent correction');

// =============================================================================
// TEST GROUP 4: Form Layout Variations & Fuzzy Field Label Matching
// =============================================================================
console.log('\nTEST GROUP 4: Form Layout Variations & Fuzzy Field Label Matching');

// 4.1 Field alias matching: Form uses "Father's Name" instead of "father_name", "DOB" instead of "dob"
const nonStandardFields: Record<string, string> = {
  pan_code: 'XYZPQ9999Z',
  name_of_holder: 'ANITA SHARMA',
  "father's_name": 'MOHAN SHARMA',
  date_birth: '20/08/1990',
};

const resolvedFather = resolveFieldCandidate('father_name', nonStandardFields, '');
testAssert(resolvedFather?.value === 'MOHAN SHARMA', 'Resolved father_name from "father\'s_name" alias');
testAssert(resolvedFather?.source === 'alias', 'Resolution source correctly identified as alias');

const resolvedPan = resolveFieldCandidate('pan_number', nonStandardFields, '');
testAssert(resolvedPan?.value === 'XYZPQ9999Z', 'Resolved pan_number from "pan_code" alias');

// 4.2 Text stream fallback: Field absent from extractedFields but present in text stream
const textFallbackStream = 'Income Tax Department Certificate. Name: RAJESH. Permanent Account Number is ABCDE5555K. DOB: 01/01/1980';
const fallbackPan = resolveFieldCandidate('pan_number', {}, textFallbackStream);
testAssert(fallbackPan?.value === 'ABCDE5555K', 'Extracted PAN directly from text stream regex fallback');
testAssert(fallbackPan?.source === 'text_stream', 'Fallback source recorded as text_stream');

// =============================================================================
// TEST GROUP 5: Multi-Version Resolution (Historical vs Modern Statutory Proforma)
// =============================================================================
console.log('\nTEST GROUP 5: Multi-Version Resolution (Historical vs Modern Statutory Proforma)');

// 5.1 Claimed issue date 2024 selects modern active COI template
const modernSelection = selectAppropriateReference({
  rawText: 'Ministry of Corporate Affairs Certificate of Incorporation SPICe+ INC-32 CIN: U12345KA2024PTC189201',
  fileName: 'Incorporation_SPICe_Plus_2024.pdf',
  claimedIssueDate: '15/06/2024',
});
testAssert(modernSelection.selectedTemplate?.version?.startsWith('v2.0') === true, 'Issue date 15/06/2024 selects modern COI v2.0 template');
testAssert(modernSelection.selectedTemplate?.id !== 'tmpl-coi-v1', 'Retired template v1.0 is NEVER selected as trusted reference');

// 5.2 Provenance preference: Official Gazette selection
const officialGazetteSelection = selectAppropriateReference({
  rawText: 'Ministry of Corporate Affairs Certificate of Incorporation SPICe+ INC-32 CIN: U12345KA2024PTC189201',
  fileName: 'Incorporation_SPICe_Plus_2024.pdf',
  provenancePreference: 'official_gazette',
});
testAssert(officialGazetteSelection.selectedTemplate?.id === 'tmpl-official-spice-v2', 'Official gazette preference selects tmpl-official-spice-v2');
testAssert(officialGazetteSelection.selectedTemplate?.provenance === 'official_gazette', 'Selected template provenance is official_gazette');

// 5.3 Provenance preference: Synthetic Demo selection
const syntheticDemoSelection = selectAppropriateReference({
  rawText: 'Ministry of Corporate Affairs Certificate of Incorporation SPICe+ INC-32 CIN: U12345KA2024PTC189201',
  fileName: 'Incorporation_SPICe_Plus_2024.pdf',
  provenancePreference: 'synthetic_demo',
});
testAssert(syntheticDemoSelection.selectedTemplate?.id === 'tmpl-coi-v2', 'Synthetic preference selects tmpl-coi-v2');
testAssert(syntheticDemoSelection.selectedTemplate?.provenance === 'synthetic_demo', 'Selected template provenance is synthetic_demo');

// =============================================================================
// TEST GROUP 6: Legitimate Blank Official Proformas Handling
// =============================================================================
console.log('\nTEST GROUP 6: Legitimate Blank Official Proformas Handling');

// Applicant uploads a blank official proforma from MCA Gazette or CBIC
const blankOfficialProformaAssessment = assessDocumentAuthenticity({
  documentId: 'doc-blank-spice-01',
  applicationId: 'app-compat-04',
  originalFilename: 'MCA_SPICe_Plus_INC32_Official_Proforma_Blank.pdf',
  rawText: `
    Ministry of Corporate Affairs
    Certificate of Incorporation
    Corporate Identity Number (CIN): _____________________
    Name of Company: _____________________________________
    Date of Incorporation: __/__/____
    Registered Office Address: ___________________________
  `,
  extractedFields: {}, // Completely blank, no fields filled
  pageCount: 1,
});

testAssert(blankOfficialProformaAssessment.statusDimensions.templateComparison === 'MATCH', 'Blank official form matches expected structural headings');
testAssert(blankOfficialProformaAssessment.statusDimensions.textConsistency === 'FIELD_MISSING', 'Blank form correctly flagged as FIELD_MISSING');
testAssert(blankOfficialProformaAssessment.statusDimensions.applicationCompliance === 'INCOMPLETE', 'Blank form correctly flagged as INCOMPLETE compliance');
testAssert(blankOfficialProformaAssessment.statusDimensions.overallAuthenticity === 'UNABLE_TO_VERIFY', 'CRUCIAL: Blank proforma is NEVER marked authentic credential');
testAssert(blankOfficialProformaAssessment.recommendedNextAction.includes('Re-upload'), 'Recommends applicant re-upload with all fields filled');

// =============================================================================
// TEST GROUP 7: Damaged & Illegible Scan Handling
// =============================================================================
console.log('\nTEST GROUP 7: Damaged & Illegible Scan Handling');

// Document where a mandatory field is marked illegible due to water damage or low scan resolution
const damagedScanAssessment = assessDocumentAuthenticity({
  documentId: 'doc-damaged-pan-01',
  applicationId: 'app-compat-05',
  originalFilename: 'Damaged_PAN_Card_Low_DPI.jpg',
  rawText: `
    INCOME TAX DEPARTMENT
    Permanent Account Number
    ABCDE1234F
    Name: SURESH KUMAR
    Father's Name: [ILLEGIBLE]
    Date of Birth: 12/04/1985
  `,
  extractedFields: {
    pan_number: 'ABCDE1234F',
    full_name: 'SURESH KUMAR',
    father_name: '[ILLEGIBLE]',
    dob: '12/04/1985',
  },
  readabilityStatus: 'scanned_ocr',
  extractionConfidence: 0.65,
});

testAssert(damagedScanAssessment.unreadableFields.includes('Father\'s Name'), 'Identified Father\'s Name in unreadableFields list');
const fatherFinding = damagedScanAssessment.fieldComparisonFindings.find((f) => f.fieldKey === 'father_name');
testAssert(fatherFinding?.status === 'unreadable', 'Field status explicitly marked as "unreadable"');
testAssert(damagedScanAssessment.statusDimensions.applicationCompliance === 'INCOMPLETE', 'Damaged field results in INCOMPLETE compliance');
testAssert(damagedScanAssessment.statusDimensions.overallAuthenticity === 'UNABLE_TO_VERIFY', 'CRUCIAL: Damaged scan is UNABLE_TO_VERIFY, NOT falsely marked SUSPICIOUS');

// Completely empty/corrupted scan yielding 0 characters
const emptyScanAssessment = assessDocumentAuthenticity({
  documentId: 'doc-empty-scan-01',
  applicationId: 'app-compat-06',
  originalFilename: 'Blank_Corrupted_Scan.png',
  rawText: '',
  extractedFields: {},
  readabilityStatus: 'unreadable',
});

testAssert(emptyScanAssessment.readabilityStatus === 'unreadable', 'Empty scan recognized as unreadable');
testAssert(emptyScanAssessment.ocrStatus === 'empty_scan', 'OCR status recorded as empty_scan');
testAssert(emptyScanAssessment.statusDimensions.overallAuthenticity === 'UNABLE_TO_VERIFY', 'Zero-character scan yields UNABLE_TO_VERIFY');
testAssert(emptyScanAssessment.statusDimensions.alterationIndicators === 'INCONCLUSIVE', 'Alteration indicators inconclusive for empty scan');

// =============================================================================
// TEST GROUP 8: Password-Protected & Unsupported Container Handling
// =============================================================================
console.log('\nTEST GROUP 8: Password-Protected & Unsupported Container Handling');

// Password protected PDF
const encryptedAssessment = assessDocumentAuthenticity({
  documentId: 'doc-encrypted-01',
  applicationId: 'app-compat-07',
  originalFilename: 'Bank_Statement_Encrypted.pdf',
  rawText: '',
  extractedFields: {},
  isPasswordProtected: true,
});

testAssert(encryptedAssessment.readabilityStatus === 'password_protected', 'Recognized as password_protected');
testAssert(encryptedAssessment.ocrStatus === 'failed_encrypted', 'OCR status recorded as failed_encrypted');
testAssert(encryptedAssessment.statusDimensions.overallAuthenticity === 'UNABLE_TO_VERIFY', 'Password protected file yields UNABLE_TO_VERIFY');
testAssert(encryptedAssessment.recommendedNextAction.includes('unprotected PDF'), 'Recommends submitting unprotected copy');

// Unsupported archive container (.zip)
const archiveAssessment = assessDocumentAuthenticity({
  documentId: 'doc-archive-01',
  applicationId: 'app-compat-08',
  originalFilename: 'Applicant_Dossier_Bundle.zip',
  rawText: '',
  extractedFields: {},
  readabilityStatus: 'unsupported_format',
});

testAssert(archiveAssessment.readabilityStatus === 'unsupported_format', 'ZIP archive recognized as unsupported_format');
testAssert(archiveAssessment.statusDimensions.overallAuthenticity === 'UNABLE_TO_VERIFY', 'Unsupported format yields UNABLE_TO_VERIFY');
testAssert(archiveAssessment.recommendedNextAction.includes('PDF, PNG, or JPEG'), 'Recommends standard format upload');

// =============================================================================
// TEST GROUP 9: Real-World Security Features: QR & Digital Signatures
// =============================================================================
console.log('\nTEST GROUP 9: Real-World Security Features: QR & Digital Signatures');

// 9.1 Valid QR token
const validQrFinding = analyzeQrAndDigitalSignature('qr-code: 29ABCDE1234F1Z5_GOVT_GSTIN_VALID');
testAssert(validQrFinding.hasQr === true, 'Detected QR code in text stream');
testAssert(validQrFinding.qrValidationStatus === 'valid', 'QR validation status is valid');

// 9.2 Malformed QR token
const malformedQrFinding = analyzeQrAndDigitalSignature('qr-code: MALFORMED_CORRUPTED_GSTIN_TOKEN');
testAssert(malformedQrFinding.hasQr === true, 'Detected malformed QR token');
testAssert(malformedQrFinding.qrValidationStatus === 'malformed', 'QR validation status flagged as malformed');

// 9.3 Intact PKCS#7 Digital Signature in PDF byte stream
const fakePdfSignedIntact = new TextEncoder().encode(
  '%PDF-1.7\n1 0 obj\n<< /Type /Sig /ByteRange [0 100 200 300] /SubFilter /adbe.pkcs7.detached >>\nendobj\n%%EOF'
);
const intactSigFinding = analyzeQrAndDigitalSignature('', fakePdfSignedIntact);
testAssert(intactSigFinding.hasDigitalSignature === true, 'Detected PKCS#7 digital signature in PDF byte stream');
testAssert(intactSigFinding.signatureValid === true, 'Intact ByteRange signature evaluated as valid');

// 9.4 Tampered PKCS#7 Digital Signature in PDF byte stream
const fakePdfSignedTampered = new TextEncoder().encode(
  '%PDF-1.7\n1 0 obj\n<< /Type /Sig /ByteRange [0 100 200 300] /SubFilter /adbe.pkcs7.detached INVALID_SIGNATURE_TAMPERED >>\nendobj\n%%EOF'
);
const tamperedSigFinding = analyzeQrAndDigitalSignature('', fakePdfSignedTampered);
testAssert(tamperedSigFinding.hasDigitalSignature === true, 'Detected digital signature in tampered PDF');
testAssert(tamperedSigFinding.signatureValid === false, 'Tampered ByteRange hash flagged as signature invalid');

// =============================================================================
// TEST GROUP 10: Official Gazette Provenance vs Synthetic Demo Datasets
// =============================================================================
console.log('\nTEST GROUP 10: Official Gazette Provenance vs Synthetic Demo Datasets');

const officialSpiceTemplate = DEFAULT_REFERENCE_TEMPLATES.find((t) => t.id === 'tmpl-official-spice-v2');
testAssert(!!officialSpiceTemplate, 'Official SPICe+ template exists in catalogue');
testAssert(officialSpiceTemplate?.provenance === 'official_gazette', 'Official SPICe+ template provenance is official_gazette');
testAssert(officialSpiceTemplate?.isSynthetic === false, 'Official SPICe+ template isSynthetic is false');
testAssert(officialSpiceTemplate?.approvalNotes.includes('MCA Gazette Notification G.S.R. 128(E)') === true, 'Cites official MCA Gazette Notification G.S.R. 128(E)');

const officialGstTemplate = DEFAULT_REFERENCE_TEMPLATES.find((t) => t.id === 'tmpl-official-gst-reg06');
testAssert(!!officialGstTemplate, 'Official Form GST REG-06 template exists in catalogue');
testAssert(officialGstTemplate?.provenance === 'official_gazette', 'Official Form GST REG-06 provenance is official_gazette');
testAssert(officialGstTemplate?.isSynthetic === false, 'Official Form GST REG-06 isSynthetic is false');
testAssert(officialGstTemplate?.approvalNotes.includes('CBIC Notification No. 03/2017') === true, 'Cites official CBIC Notification No. 03/2017');

const syntheticPanTemplate = DEFAULT_REFERENCE_TEMPLATES.find((t) => t.id === 'tmpl-pan-v1');
testAssert(syntheticPanTemplate?.provenance === 'synthetic_demo', 'Synthetic PAN template provenance is synthetic_demo');
testAssert(syntheticPanTemplate?.isSynthetic === true, 'Synthetic PAN template isSynthetic is true');

// =============================================================================
// TEST GROUP 11: Three-Tier Architecture: Readability != Compliance != Authenticity
// =============================================================================
console.log('\nTEST GROUP 11: Three-Tier Architecture: Readability != Compliance != Authenticity');

// Scenario: Perfect digital readability + Perfect application compliance != Verified Authenticity
const cleanApplication = assessDocumentAuthenticity({
  documentId: 'doc-clean-pan-tier',
  applicationId: 'app-compat-09',
  originalFilename: 'Perfect_Readable_PAN.pdf',
  rawText: `
    INCOME TAX DEPARTMENT
    Permanent Account Number Card
    ABCDE1234F
    Name: SURESH KUMAR
    Father's Name: RAMESH KUMAR
    Date of Birth: 12/04/1985
  `,
  extractedFields: {
    pan_number: 'ABCDE1234F',
    full_name: 'SURESH KUMAR',
    father_name: 'RAMESH KUMAR',
    dob: '12/04/1985',
  },
  readabilityStatus: 'digital_text',
  extractionConfidence: 0.99,
});

testAssert(cleanApplication.readabilityStatus === 'digital_text', 'Tier 1 (Readability): Successfully read as digital_text');
testAssert(cleanApplication.statusDimensions.applicationCompliance === 'COMPLIANT', 'Tier 2 (Compliance): Meets application statutory requirements (COMPLIANT)');
testAssert(cleanApplication.statusDimensions.templateComparison === 'MATCH', 'Tier 2 (Structure): Matches reference template layout');
testAssert(cleanApplication.statusDimensions.issuingAuthorityVerification === 'UNABLE_TO_VERIFY', 'Tier 3 (Authority Gateway): Government statutory API not connected (UNABLE_TO_VERIFY)');
testAssert(cleanApplication.statusDimensions.overallAuthenticity === 'UNABLE_TO_VERIFY', 'CRUCIAL ARCHITECTURAL RULE: Template match NEVER implies legal verification. Overall status is UNABLE_TO_VERIFY');
testAssert(cleanApplication.checksNotPerformed.some((c) => c.includes('Live government issuing-authority')) === true, 'Discloses that live government issuing-authority database check was not performed');

console.log('\n================================================================');
console.log(`ALL COMPATIBILITY TESTS PASSED: ${totalAssertions} assertions passed across 11 test groups.`);
console.log('================================================================\n');
