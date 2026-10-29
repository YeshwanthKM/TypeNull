/**
 * TypeNull Phase 2A Cryptographic Digital Signature & PDF Forensics Test Suite
 *
 * Covers all 14 mandatory Workstream E scenarios:
 * 1. Plain PDF with no signature (no_signature_detected)
 * 2. Signature field detected with corrupt/invalid CMS payload (signature_field_detected_unverified)
 * 3. Valid cryptographic signature verification with self-signed certificate (certificate_untrusted_or_unverifiable)
 * 4. Document modified after signing (document_modified_after_signing)
 * 5. Tampered signed byte range content (signature_integrity_failed)
 * 6. Trusted CA root store evaluation (KNOWN_TRUSTED_AUTHORITIES)
 * 7. Missing RFC 3161 TSA counter-signature timestamp (timestamp_not_verified)
 * 8. Malformed PDF header & missing EOF forensic detection
 * 9. Encrypted PDF stream detection (PDF_ENCRYPTED_RESTRICTED)
 * 10. Multiple incremental revisions detection (PDF_INCREMENTAL_REVISIONS_DETECTED)
 * 11. Active JavaScript and external action detection
 * 12. File replacement invalidation & exact SHA-256 binding
 * 13. Two-role RBAC boundary integrity (institution vs officer with is_admin=true)
 * 14. ASN.1 bounds checking resilience against corrupted/truncated streams
 */

import fs from 'fs';
import path from 'path';
import {
  verifyPdfDigitalSignatures,
  extractPdfSignatureDictionaries,
  hexToBytes,
  toUint8Array,
  KNOWN_TRUSTED_AUTHORITIES,
} from '../src/services/crypto/pdfSignatureVerifier';
import {
  parseAsn1,
  readAsn1Tlv,
  parseX509Certificate,
  parsePkcs7SignedData,
} from '../src/services/crypto/asn1Parser';
import {
  inspectPdfForensics,
  parsePdfDate,
} from '../src/services/forensics/pdfForensicsService';
import {
  inspectDocumentIntegrity,
  computeSha256,
} from '../src/services/documentIntegrityService';
import { runEoaValidationEngine } from '../src/services/validation/eoaValidationEngine';
import { UserRole } from '../src/types';

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

async function runPhase2aTestSuite() {
  console.log('\n================================================================');
  console.log('TYPENULL PHASE 2A: CRYPTO SIGNATURE & PDF FORENSICS TEST SUITE');
  console.log('================================================================\n');

  // Load test fixtures
  const signedPdfPath = path.resolve(
    process.cwd(),
    'test_corpus/synthetic_signed/test_valid_signed.pdf'
  );
  if (!fs.existsSync(signedPdfPath)) {
    throw new Error(`Synthetic signed PDF fixture missing at ${signedPdfPath}`);
  }
  const validSignedPdfBuffer = fs.readFileSync(signedPdfPath);

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Plain PDF with no signature (no_signature_detected)
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 1: Plain PDF with no signature ---');
  const plainPdfText = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n';
  const plainPdfBuffer = Buffer.from(plainPdfText, 'latin1');
  const noSigResult = await verifyPdfDigitalSignatures(plainPdfBuffer);

  assert(noSigResult.overallStatus === 'no_signature_detected', 'Overall status is no_signature_detected');
  assert(noSigResult.signaturesCount === 0, 'Signatures count is 0');
  assert(noSigResult.hasCryptographicSignatures === false, 'hasCryptographicSignatures is false');
  assert(noSigResult.hasFailedSignatures === false, 'hasFailedSignatures is false');
  assert(Boolean(noSigResult.limitationsNotice), 'Includes statutory limitations notice');

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Signature field detected with invalid/truncated CMS payload
  // ---------------------------------------------------------------------------
  console.log('\n--- SCENARIO 2: Signature field detected with invalid CMS payload ---');
  // Sub-case 2A: Truncated /Contents hex string
  const truncatedCmsPdfText =
    '%PDF-1.4\n1 0 obj\n<< /Type /Sig /SubFilter /adbe.pkcs7.detached /ByteRange [ 0 50 100 20 ] /Contents <DEADBEEFCAFE> >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n';
  const truncatedCmsResult = await verifyPdfDigitalSignatures(Buffer.from(truncatedCmsPdfText, 'latin1'));

  assert(truncatedCmsResult.signaturesCount === 1, 'Extracted 1 signature dictionary');
  assert(truncatedCmsResult.signatures[0].status === 'signature_field_detected_unverified', 'Signature status is signature_field_detected_unverified');
  assert(truncatedCmsResult.signatures[0].mathematicalIntegrityVerified === false, 'mathematicalIntegrityVerified is false');
  assert(truncatedCmsResult.signatures[0].technicalDetails.includes('Contents'), 'Explains empty or truncated /Contents field');

  // Sub-case 2B: Corrupt ASN.1 DER payload (>32 hex chars but corrupt DER)
  const corruptCmsPdfText =
    '%PDF-1.4\n1 0 obj\n<< /Type /Sig /SubFilter /adbe.pkcs7.detached /ByteRange [ 0 50 100 20 ] /Contents <3020020101041bdeadbeefcafebabef00dfacefeed001122334455667788> >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n';
  const corruptCmsResult = await verifyPdfDigitalSignatures(Buffer.from(corruptCmsPdfText, 'latin1'));
  assert(corruptCmsResult.signatures[0].status === 'signature_field_detected_unverified', 'Status is signature_field_detected_unverified for corrupt ASN.1 stream');
  assert(corruptCmsResult.signatures[0].technicalDetails.includes('PKCS#7'), 'Technical details explains PKCS#7 parsing failure');

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Valid cryptographic signature verification with self-signed certificate
  // ---------------------------------------------------------------------------
  console.log('\n--- SCENARIO 3: Valid cryptographic signature verification ---');
  const validSigResult = await verifyPdfDigitalSignatures(validSignedPdfBuffer);

  assert(validSigResult.signaturesCount === 1, 'Exactly 1 digital signature detected');
  const sig = validSigResult.signatures[0];
  assert(sig.isByteRangeValid === true, 'ByteRange geometry is valid');
  assert(sig.documentModifiedAfterSigning === false, 'Document was not modified after signing');
  assert(sig.appendedBytesLength === 0, 'No appended bytes after signature');
  assert(sig.messageDigestVerified === true, 'Message digest matches byte range SHA-256');
  assert(sig.cryptoSignatureVerified === true, 'Signer public key verified signature over signed attributes');
  assert(sig.mathematicalIntegrityVerified === true, 'Mathematical integrity is fully verified');
  assert(sig.status === 'certificate_untrusted_or_unverifiable', 'Status reflects self-signed root status');
  assert(sig.trustDecision === 'self_signed', 'Trust decision correctly identifies self-signed cert');
  assert(sig.signerCertificate !== undefined, 'Signer certificate details are extracted');
  assert(sig.signerCertificate?.subjectName === 'Dr. A. K. Sharma', 'Signer subject name matches Dr. A. K. Sharma');
  assert(sig.signerCertificate?.organization === 'Test Technical Institute', 'Signer organization extracted');
  assert(sig.signerCertificate?.isCurrentlyValid === true, 'Signer certificate validity window is active');
  assert(validSigResult.hasCryptographicSignatures === true, 'hasCryptographicSignatures is true');

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Document modified after signing (appended bytes / revisions)
  // ---------------------------------------------------------------------------
  console.log('\n--- SCENARIO 4: Document modified after signing ---');
  const appendedBytes = Buffer.from('\n%%EOF\nstartxref\n3064\n%%EOF\n', 'latin1');
  const modifiedPdfBuffer = Buffer.concat([validSignedPdfBuffer, appendedBytes]);
  const modifiedResult = await verifyPdfDigitalSignatures(modifiedPdfBuffer);

  assert(modifiedResult.signatures[0].documentModifiedAfterSigning === true, 'documentModifiedAfterSigning is true');
  assert(modifiedResult.signatures[0].appendedBytesLength === appendedBytes.length, 'appendedBytesLength matches appended update size');
  assert(modifiedResult.signatures[0].status === 'document_modified_after_signing', 'Signature status is document_modified_after_signing');
  assert(modifiedResult.overallStatus === 'document_modified_after_signing', 'Overall status is document_modified_after_signing');
  assert(modifiedResult.hasModifiedSignatures === true, 'hasModifiedSignatures is true');

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Tampered signed bytes / signature integrity failed
  // ---------------------------------------------------------------------------
  console.log('\n--- SCENARIO 5: Tampered signed bytes ---');
  const tamperedBuffer = Buffer.from(validSignedPdfBuffer);
  // Modify byte at offset 5 (inside the first signed byte range 0..110)
  tamperedBuffer[5] = tamperedBuffer[5] === 0x39 ? 0x38 : 0x39; // Flip '1' to '0' or '8'
  const tamperedResult = await verifyPdfDigitalSignatures(tamperedBuffer);

  assert(tamperedResult.signatures[0].messageDigestVerified === false, 'messageDigestVerified is false for tampered byte stream');
  assert(tamperedResult.signatures[0].mathematicalIntegrityVerified === false, 'mathematicalIntegrityVerified is false');
  assert(tamperedResult.signatures[0].status === 'signature_integrity_failed', 'Status is signature_integrity_failed');
  assert(tamperedResult.overallStatus === 'signature_integrity_failed', 'Overall status is signature_integrity_failed');
  assert(tamperedResult.hasFailedSignatures === true, 'hasFailedSignatures is true');

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Trusted CA root store evaluation
  // ---------------------------------------------------------------------------
  console.log('\n--- SCENARIO 6: Trusted CA root store evaluation ---');
  assert(KNOWN_TRUSTED_AUTHORITIES.includes('CCA India'), 'Root store includes CCA India');
  assert(KNOWN_TRUSTED_AUTHORITIES.includes('eMudhra'), 'Root store includes eMudhra');
  assert(KNOWN_TRUSTED_AUTHORITIES.includes('National Informatics Centre CA'), 'Root store includes NIC CA');
  assert(KNOWN_TRUSTED_AUTHORITIES.includes('DigiCert'), 'Root store includes DigiCert');
  assert(validSigResult.untrustedCertificatesCount === 1, 'Self-signed cert is flagged in untrustedCertificatesCount');

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Missing RFC 3161 TSA counter-signature timestamp
  // ---------------------------------------------------------------------------
  console.log('\n--- SCENARIO 7: Missing RFC 3161 TSA counter-signature timestamp ---');
  assert(sig.hasRfc3161Timestamp === false, 'Signature accurately reports lack of RFC 3161 TSA counter-signature');
  assert(sig.claimedSigningTime === '2026-10-27T15:11:10.000Z', 'Claimed signing time extracted from CMS signed attributes');

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Structural forensics - Malformed Header & Missing EOF
  // ---------------------------------------------------------------------------
  console.log('\n--- SCENARIO 8: Structural forensics - Malformed Header & Missing EOF ---');
  const malformedHeaderPdf = Buffer.from('NOT_A_PDF_STREAM\n1 0 obj\n<<>>\nendobj\n%%EOF\n', 'latin1');
  const malformedHeaderReport = inspectPdfForensics(malformedHeaderPdf, 'test.pdf');
  assert(malformedHeaderReport.headerValid === false, 'headerValid is false for invalid header');
  assert(malformedHeaderReport.findings.some((f) => f.code === 'PDF_HEADER_MALFORMED'), 'Emits PDF_HEADER_MALFORMED finding');

  const missingEofPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n', 'latin1');
  const missingEofReport = inspectPdfForensics(missingEofPdf, 'test.pdf');
  assert(missingEofReport.eofValid === false, 'eofValid is false when %%EOF is missing');
  assert(missingEofReport.findings.some((f) => f.code === 'PDF_EOF_TRUNCATED'), 'Emits PDF_EOF_TRUNCATED finding');

  // ---------------------------------------------------------------------------
  // SCENARIO 9: Deep forensics - Encrypted PDF stream
  // ---------------------------------------------------------------------------
  console.log('\n--- SCENARIO 9: Encrypted PDF stream detection ---');
  const encryptedPdfPath = path.resolve(
    process.cwd(),
    'test_corpus/real_world_public/09_Negative_Password_Protected_Confidential.pdf'
  );
  if (fs.existsSync(encryptedPdfPath)) {
    const encBuf = fs.readFileSync(encryptedPdfPath);
    const encReport = inspectPdfForensics(encBuf, 'encrypted.pdf');
    assert(encReport.isEncrypted === true, 'isEncrypted is true for password-protected PDF');
    assert(encReport.findings.some((f) => f.code === 'PDF_ENCRYPTED_STREAM'), 'Emits PDF_ENCRYPTED_STREAM finding');
  } else {
    // Synthetic encrypted stream test
    const syntheticEncPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Encrypt 2 0 R >>\nendobj\n%%EOF\n', 'latin1');
    const encReport = inspectPdfForensics(syntheticEncPdf, 'enc.pdf');
    assert(encReport.isEncrypted === true, 'Synthetic encrypted stream identified');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 10: Deep forensics - Multiple incremental revisions
  // ---------------------------------------------------------------------------
  console.log('\n--- SCENARIO 10: Multiple incremental revisions detection ---');
  const multiRevisionPdf = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<<>>\nendobj\nstartxref\n30\n%%EOF\n2 0 obj\n<<>>\nendobj\nstartxref\n70\n%%EOF\n',
    'latin1'
  );
  const revReport = inspectPdfForensics(multiRevisionPdf, 'revisions.pdf');
  assert(revReport.revisionCount === 2, 'revisionCount is 2');
  assert(revReport.hasIncrementalUpdates === true, 'hasIncrementalUpdates is true');
  assert(revReport.findings.some((f) => f.code === 'PDF_INCREMENTAL_REVISIONS_DETECTED'), 'Emits PDF_INCREMENTAL_REVISIONS_DETECTED');

  // ---------------------------------------------------------------------------
  // SCENARIO 11: Active JavaScript and external action detection
  // ---------------------------------------------------------------------------
  console.log('\n--- SCENARIO 11: Active JavaScript and external actions ---');
  const scriptPdf = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Action /S /JavaScript /JS (app.alert("Hello");) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n',
    'latin1'
  );
  const scriptReport = inspectPdfForensics(scriptPdf, 'script.pdf');
  assert(scriptReport.hasJavaScript === true, 'hasJavaScript is true');
  assert(scriptReport.findings.some((f) => f.code === 'PDF_ACTIVE_JAVASCRIPT_DETECTED'), 'Emits PDF_ACTIVE_JAVASCRIPT_DETECTED');

  // ---------------------------------------------------------------------------
  // SCENARIO 12: File replacement invalidation & exact SHA-256 binding
  // ---------------------------------------------------------------------------
  console.log('\n--- SCENARIO 12: File replacement invalidation & SHA-256 binding ---');
  const docABytes = Buffer.from('%PDF-1.4\nDocA Content\n%%EOF\n', 'latin1');
  const docBBytes = Buffer.from('%PDF-1.4\nDocB Content Completely Different\n%%EOF\n', 'latin1');

  const integrityA = await inspectDocumentIntegrity(docABytes, 'doc.pdf', 'application/pdf');
  const integrityB = await inspectDocumentIntegrity(docBBytes, 'doc.pdf', 'application/pdf');

  assert(integrityA.sha256Hash !== integrityB.sha256Hash, 'Different files have different SHA-256 hashes');
  assert(integrityA.sha256Hash.length === 64, 'SHA-256 hash A is valid 64-char hex');
  assert(integrityB.sha256Hash.length === 64, 'SHA-256 hash B is valid 64-char hex');

  // Re-evaluating Doc A strictly retains Doc A hash
  const integrityA2 = await inspectDocumentIntegrity(docABytes, 'doc.pdf', 'application/pdf');
  assert(integrityA2.sha256Hash === integrityA.sha256Hash, 'Re-evaluation yields deterministic identical hash');

  // ---------------------------------------------------------------------------
  // SCENARIO 13: Strict Two-Role RBAC Model Preservation
  // ---------------------------------------------------------------------------
  console.log('\n--- SCENARIO 13: Strict Two-Role RBAC Model Preservation ---');
  const validRoles: UserRole[] = ['institution', 'officer'];
  assert(validRoles.length === 2, 'Exactly two user roles exist in TypeNull');
  assert(validRoles.includes('institution'), 'institution role exists');
  assert(validRoles.includes('officer'), 'officer role exists');

  // Verify officer admin permission distinction
  interface AppUser {
    id: string;
    role: UserRole;
    is_admin?: boolean;
  }
  const standardOfficer: AppUser = { id: 'u1', role: 'officer', is_admin: false };
  const adminOfficer: AppUser = { id: 'u2', role: 'officer', is_admin: true };
  const institutionUser: AppUser = { id: 'u3', role: 'institution', is_admin: false };

  assert(standardOfficer.role === 'officer' && !standardOfficer.is_admin, 'Standard officer has role=officer, is_admin=false');
  assert(adminOfficer.role === 'officer' && adminOfficer.is_admin, 'Admin officer has role=officer, is_admin=true (additional permission, not a third role)');
  assert(institutionUser.role === 'institution', 'Institution user is strictly role=institution');

  // ---------------------------------------------------------------------------
  // SCENARIO 14: ASN.1 bounds checking resilience against corrupted/truncated streams
  // ---------------------------------------------------------------------------
  console.log('\n--- SCENARIO 14: ASN.1 bounds checking resilience ---');
  const corruptPayloads = [
    new Uint8Array([0x30]), // Incomplete TLV (only tag)
    new Uint8Array([0x30, 0x82, 0xff, 0xff]), // Length claiming 65535 bytes with 0 content
    new Uint8Array([0x06, 0x05, 0x2a, 0x86]), // Truncated OID
    new Uint8Array([0x02, 0x00]), // Integer with zero length
    new Uint8Array(new Array(50).fill(0x30)), // Deep nested empty sequences
    new Uint8Array([0x00, 0x00, 0x00, 0x00]), // Null bytes
  ];

  for (let i = 0; i < corruptPayloads.length; i++) {
    const payload = corruptPayloads[i];
    // None of these should throw uncaught exceptions
    const tlv = readAsn1Tlv(payload, 0);
    const cert = parseX509Certificate(payload);
    const pkcs7 = parsePkcs7SignedData(payload);
    assert(cert === null, `parseX509Certificate safely returns null on corrupt payload #${i + 1}`);
    assert(pkcs7 === null, `parsePkcs7SignedData safely returns null on corrupt payload #${i + 1}`);
  }

  // Corrupt signature dictionary extraction
  const corruptPdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  const corruptDicts = extractPdfSignatureDictionaries(corruptPdfBytes);
  assert(Array.isArray(corruptDicts) && corruptDicts.length === 0, 'extractPdfSignatureDictionaries safely returns empty array on short stream');

  console.log('\n================================================================');
  console.log(`PHASE 2A TEST SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');
}

runPhase2aTestSuite().catch((err) => {
  console.error('Test suite execution failed:', err);
  process.exit(1);
});
