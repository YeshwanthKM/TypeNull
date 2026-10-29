/**
 * TypeNull Phase 2B.1 Independent Security, Correctness & Reliability Audit Suite
 *
 * Validates:
 * 1. PNG parser integer safety, bounds checking, and chunk validation.
 * 2. JPEG marker traversal, bounds checking, and truncated stream handling.
 * 3. ELA vs DQT quantization truthfulness and non-defamatory categorization.
 * 4. Denial-of-service resistance (20 MB and 36 Megapixel bounds).
 * 5. Non-circular cross-domain signal corroboration.
 * 6. Decoupled 5-dimension regulatory model under adversarial conditions.
 * 7. Exact SHA-256 hash binding and stale finding invalidation.
 */

import {
  parsePngChunks,
  parseJpegMarkers,
  inspectImageForensics,
} from '../src/services/forensics/imageForensicsService';
import {
  evaluateMultiSignalRisk,
} from '../src/services/validation/multiSignalRiskAssessment';
import { computeSha256 } from '../src/services/documentIntegrityService';
import { DbApplication, ApplicationDocument } from '../src/types';
import { FieldComparisonResult } from '../src/services/validation/crossDocumentComparator';
import { EoaValidationFinding } from '../src/services/validation/eoaValidationEngine';

let passed = 0;
let total = 0;

function assert(condition: boolean, message: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Audit check failed: ${message}`);
  }
}

const mockApp: DbApplication = {
  id: 'app-audit-phase2b1',
  user_id: 'user-audit-inst',
  title: 'AICTE EoA Regulatory Audit Dossier',
  category: 'technical_engineering',
  organisation_name: 'National College of Engineering',
  registration_number: '1-99887766',
  jurisdiction: 'India',
  description: 'AICTE EoA Scrutiny Audit Dossier',
  status: 'under_review',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockDoc: ApplicationDocument = {
  id: 'doc-affidavit-audit',
  application_id: mockApp.id,
  user_id: mockApp.user_id,
  original_filename: 'statutory_declaration.jpg',
  storage_path: 'mock/path',
  mime_type: 'image/jpeg',
  file_size_bytes: 4096,
  document_type: 'application_form',
  processing_status: 'completed',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

async function runPhase2B1Audit() {
  console.log('================================================================');
  console.log('TYPENULL PHASE 2B.1 INDEPENDENT AUDIT VERIFICATION SUITE');
  console.log('================================================================\n');

  // --- AUDIT 1: PNG Parser Integer Safety & Bounds Checking ---
  console.log('--- AUDIT 1: PNG Parser Integer Safety & Bounds Checking ---');
  // A. Empty & short buffer
  const emptyPng = new Uint8Array(0);
  const resEmptyPng = parsePngChunks(emptyPng);
  assert(resEmptyPng.isValid === false, 'Safely rejects empty buffer');

  const shortPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  const resShortPng = parsePngChunks(shortPng);
  assert(resShortPng.isValid === false, 'Safely rejects incomplete PNG magic bytes');

  // B. Chunk with high bit set in length (signed 32-bit overflow test)
  const overflowPng = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // Valid PNG signature
    0x80, 0x00, 0x00, 0x10, // Chunk length: 0x80000010 (negative if signed 32-bit)
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x00,
  ]);
  const resOverflow = parsePngChunks(overflowPng);
  assert(resOverflow.isCorrupt === true, 'Rejects chunk length exceeding 31-bit unsigned limit');

  // C. Valid minimal PNG without IEND
  const noIendPng = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, // Length 13
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x01, 0x00, // Width: 256
    0x00, 0x00, 0x01, 0x00, // Height: 256
    0x08, 0x02, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, // Mock CRC
  ]);
  const resNoIend = parsePngChunks(noIendPng);
  assert(resNoIend.isValid === true, 'Parses IHDR dimensions correctly (256x256)');
  assert(resNoIend.hasIend === false, 'Accurately reports missing IEND chunk');

  // --- AUDIT 2: JPEG Marker Traversal & Bounds Safety ---
  console.log('\n--- AUDIT 2: JPEG Marker Traversal & Bounds Safety ---');
  // A. Short buffer
  const shortJpeg = new Uint8Array([0xff, 0xd8]);
  const resShortJpeg = parseJpegMarkers(shortJpeg);
  assert(resShortJpeg.isValid === false, 'Safely rejects 2-byte truncated JPEG');

  // B. Marker with length exceeding buffer boundary
  const truncatedPayloadJpeg = new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xe1, // APP1
    0x00, 0x50, // Length: 80 bytes (but buffer only has 8 bytes!)
    0x45, 0x78,
  ]);
  const resTruncPayload = parseJpegMarkers(truncatedPayloadJpeg);
  assert(resTruncPayload.isCorrupt === true, 'Safely catches marker length exceeding stream boundary');

  // C. Valid JPEG headers without SOS
  const noSosJpeg = new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xc0, // SOF0
    0x00, 0x0b, // Length: 11
    0x08, // 8-bit
    0x01, 0x2c, // Height: 300
    0x01, 0x90, // Width: 400
    0x01, 0x01, 0x11, 0x00,
    0xff, 0xd9, // EOI
  ]);
  const resNoSos = parseJpegMarkers(noSosJpeg);
  assert(resNoSos.isValid === true, 'Parses valid SOF0 dimensions (400x300)');
  assert(resNoSos.width === 400 && resNoSos.height === 300, 'Dimensions match exact header');
  assert(resNoSos.hasSos === false, 'Reports absent SOS scan header');
  assert(resNoSos.hasEoi === true, 'Identifies EOI marker');

  // --- AUDIT 3: ELA & Quantization Truthfulness ---
  console.log('\n--- AUDIT 3: ELA & Quantization Truthfulness ---');
  // Verify that ELA is explicitly marked inapplicable when only DQT inspection is performed
  const reportJpeg = inspectImageForensics(noSosJpeg, 'document.jpg', 'image/jpeg');
  assert(
    reportJpeg.elaSummary.applicable === false,
    'ELA is strictly marked inapplicable when full recompression error map is not computed'
  );
  assert(
    reportJpeg.elaSummary.reasonIfNotApplicable?.includes('recompression error comparison'),
    'Explains why ELA is not applicable (DQT parameter analysis performed)'
  );

  // --- AUDIT 4: Denial-of-Service & Decompression Bomb Protection ---
  console.log('\n--- AUDIT 4: Denial-of-Service & Decompression Bomb Protection ---');
  // Construct header with 9000x9000 pixels (81 Megapixels > 36 Megapixel limit)
  const bombJpeg = new Uint8Array([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x0b,
    0x08,
    0x23, 0x28, // Height: 9000
    0x23, 0x28, // Width: 9000
    0x01, 0x01, 0x11, 0x00,
    0xff, 0xd9,
  ]);
  const repBomb = inspectImageForensics(bombJpeg, 'bomb.jpg', 'image/jpeg');
  assert(repBomb.isSafeToProcess === false, 'Decompression bomb rejected before pixel memory allocation');
  assert(
    repBomb.findings.some((f) => f.code === 'IMG_DECOMPRESSION_BOMB_DETECTED'),
    'Emits IMG_DECOMPRESSION_BOMB_DETECTED finding'
  );

  // --- AUDIT 5: Non-Circular Signal Corroboration ---
  console.log('\n--- AUDIT 5: Non-Circular Signal Corroboration ---');
  // Scenario A: Two image findings on the SAME document (EXIF tag + noise patch)
  // These should NOT circularly corroborate each other!
  const circularRisk = evaluateMultiSignalRisk({
    application: mockApp,
    documents: [mockDoc],
    integrityReports: {
      'doc-affidavit-audit': {
        isValidFormat: true,
        detectedFormat: 'jpeg',
        mimeTypeMatch: true,
        extensionMatch: true,
        fileSizeBytes: 4096,
        sha256Hash: '1111222233334444111122223333444411112222333344441111222233334444',
        imageForensicsReport: {
          fileHash: '1111222233334444111122223333444411112222333344441111222233334444',
          detectedFormat: 'jpeg',
          isRenderedPdfPage: false,
          width: 800,
          height: 1100,
          aspectRatio: 0.73,
          isSafeToProcess: true,
          metadataAnalysis: {
            hasExif: true,
            hasPhotoshopIptc: false,
            hasAdobeApp14: false,
            isKnownEditingSoftware: true,
            isKnownScannerHardware: false,
            hasChronologyAnomaly: false,
            software: 'Photoshop 2024',
          },
          elaSummary: { applicable: false, hasCustomQuantizationTables: false, highErrorClusterDetected: false, anomalousRegionsCount: 0, observations: '' },
          noiseSummary: { evaluated: true, averageBackgroundNoiseStdDev: 10, noiseConsistencyRatio: 0.2, hasSuspiciousUniformRegions: true, hasSuspiciousNoisyRegions: false, observations: '' },
          copyMoveSummary: { evaluated: true, candidateClonedPairsCount: 0, clonedClustersCount: 0, filteredBenignRepetitionsCount: 0, observations: '' },
          findings: [
            {
              id: 'IMG_METADATA_EDITING_SOFTWARE_DETECTED',
              technique: 'metadata_and_exif_forensics',
              code: 'IMG_METADATA_EDITING_SOFTWARE_DETECTED',
              severity: 'minor',
              confidence: 'medium',
              title: 'Editing Software Detected',
              explanation: 'Photoshop tag present.',
              benignExplanations: [],
              limitations: [],
              recommendedFollowUp: '',
            },
            {
              id: 'IMG_NOISE_LOCAL_UNIFORMITY_PATCH',
              technique: 'noise_and_texture_consistency',
              code: 'IMG_NOISE_LOCAL_UNIFORMITY_PATCH',
              severity: 'minor',
              confidence: 'medium',
              title: 'Uniform Noise Patch',
              explanation: 'Zero-noise region.',
              benignExplanations: [],
              limitations: [],
              recommendedFollowUp: '',
            },
          ],
          evaluatedAt: new Date().toISOString(),
        },
        integrityFindings: [],
      },
    },
  });

  assert(
    circularRisk.corroboratedSignalsCount === 0,
    'Two findings from the same image manipulation domain do NOT circularly corroborate each other'
  );
  assert(
    circularRisk.contributingSignals.every((s) => s.isCorroborated === false),
    'Intra-domain findings remain uncorroborated'
  );

  // Scenario B: Independent Cross-Domain Corroboration
  // An image anomaly on document A coincident with a cross-document discrepancy on document A
  const independentRisk = evaluateMultiSignalRisk({
    application: mockApp,
    documents: [mockDoc],
    integrityReports: {
      'doc-affidavit-audit': {
        isValidFormat: true,
        detectedFormat: 'jpeg',
        mimeTypeMatch: true,
        extensionMatch: true,
        fileSizeBytes: 4096,
        sha256Hash: '1111222233334444111122223333444411112222333344441111222233334444',
        imageForensicsReport: {
          fileHash: '1111222233334444111122223333444411112222333344441111222233334444',
          detectedFormat: 'jpeg',
          isRenderedPdfPage: false,
          width: 800,
          height: 1100,
          aspectRatio: 0.73,
          isSafeToProcess: true,
          metadataAnalysis: {
            hasExif: true,
            hasPhotoshopIptc: false,
            hasAdobeApp14: false,
            isKnownEditingSoftware: false,
            isKnownScannerHardware: false,
            hasChronologyAnomaly: false,
          },
          elaSummary: { applicable: false, hasCustomQuantizationTables: false, highErrorClusterDetected: false, anomalousRegionsCount: 0, observations: '' },
          noiseSummary: { evaluated: true, averageBackgroundNoiseStdDev: 10, noiseConsistencyRatio: 0.2, hasSuspiciousUniformRegions: true, hasSuspiciousNoisyRegions: false, observations: '' },
          copyMoveSummary: { evaluated: true, candidateClonedPairsCount: 0, clonedClustersCount: 0, filteredBenignRepetitionsCount: 0, observations: '' },
          findings: [
            {
              id: 'IMG_NOISE_LOCAL_UNIFORMITY_PATCH',
              technique: 'noise_and_texture_consistency',
              code: 'IMG_NOISE_LOCAL_UNIFORMITY_PATCH',
              severity: 'major',
              confidence: 'high',
              title: 'Altered Stamp Region',
              explanation: 'Zero-noise region over official endorsement block.',
              benignExplanations: [],
              limitations: [],
              recommendedFollowUp: '',
            },
          ],
          evaluatedAt: new Date().toISOString(),
        },
        integrityFindings: [],
      },
    },
    crossDocumentComparisons: [
      {
        fieldName: 'organisation_name',
        fieldLabel: 'Institution Legal Name',
        expectedValue: 'National College of Engineering',
        expectedSource: 'AICTE Registry',
        comparedValues: [
          {
            documentId: 'doc-affidavit-audit',
            documentName: 'statutory_declaration.jpg',
            extractedValue: 'National Institute of Tech',
          },
        ],
        outcome: 'genuine_discrepancy',
        similarityScore: 0.6,
        explanation: 'Deed lists different institution name.',
        isBlocking: false,
      },
    ],
  });

  assert(
    independentRisk.corroboratedSignalsCount === 1,
    'Independent cross-domain anomaly (image noise + cross-document discrepancy) is successfully corroborated'
  );
  assert(
    independentRisk.contributingSignals.some((s) => s.isCorroborated === true),
    'Signals are marked isCorroborated = true'
  );
  assert(
    independentRisk.dimensionStatuses.riskRequiringHumanReview === 'HIGH',
    'Corroborated major multi-domain anomalies appropriately elevate human review risk to HIGH'
  );

  // --- AUDIT 6: Multi-Signal Regulatory Decoupling ---
  console.log('\n--- AUDIT 6: Multi-Signal Regulatory Decoupling ---');
  // Test that valid crypto signature DOES NOT automatically grant regulatory compliance
  const missingAffidavitFinding: EoaValidationFinding = {
    id: 'EOA-MISSING-AFFIDAVIT',
    ruleId: 'AICTE-RULE-AFFIDAVIT-1',
    ruleVersion: 'APH 2024–2027',
    category: 'missing_documents',
    severity: 'blocking',
    status: 'FAIL',
    title: 'Missing Mandatory Form 1 Affidavit',
    explanation: 'Statutory affidavit under APH 2024–2027 Appendix 17 is missing.',
    validationMethod: 'statutory_checklist',
    requiresManualReview: true,
    isBlocking: true,
  };

  const decoupledRisk = evaluateMultiSignalRisk({
    application: mockApp,
    documents: [mockDoc],
    integrityReports: {
      'doc-affidavit-audit': {
        isValidFormat: true,
        detectedFormat: 'pdf',
        mimeTypeMatch: true,
        extensionMatch: true,
        fileSizeBytes: 10000,
        sha256Hash: '9999888877776666999988887777666699998888777766669999888877776666',
        signatureReport: {
          overallStatus: 'signature_integrity_verified',
          signaturesCount: 1,
          hasTamperedSignatures: false,
          hasFailedSignatures: false,
          hasModifiedSignatures: false,
          hasCryptographicSignatures: true,
          untrustedCertificatesCount: 0,
          signatures: [
            {
              signatureIndex: 1,
              subFilter: 'adbe.pkcs7.detached',
              byteRange: [0, 100, 200, 300],
              isByteRangeValid: true,
              documentModifiedAfterSigning: false,
              appendedBytesLength: 0,
              mathematicalIntegrityVerified: true,
              messageDigestVerified: true,
              cryptoSignatureVerified: true,
              status: 'signature_integrity_verified',
              trustDecision: 'trusted',
              technicalDetails: 'Valid signature',
              hasRfc3161Timestamp: true,
            },
          ],
        },
        integrityFindings: [],
      },
    },
    eoaFindings: [missingAffidavitFinding],
  });

  assert(
    decoupledRisk.dimensionStatuses.cryptographicSignatureIntegrity === 'VERIFIED',
    'Signature integrity is VERIFIED'
  );
  assert(
    decoupledRisk.dimensionStatuses.regulatoryCompliance === 'DEFICIENT',
    'Regulatory compliance remains DEFICIENT despite valid cryptographic signature'
  );
  assert(
    decoupledRisk.dimensionStatuses.riskRequiringHumanReview === 'HIGH',
    'Missing statutory document requires HIGH human review'
  );

  // --- AUDIT 7: SHA-256 Hash Binding & Stale Result Invalidation ---
  console.log('\n--- AUDIT 7: SHA-256 Hash Binding & Stale Result Invalidation ---');
  const bufferA = new Uint8Array([0xff, 0xd8, 0xff, 0xd9, 0x01]);
  const bufferB = new Uint8Array([0xff, 0xd8, 0xff, 0xd9, 0x02]);
  const hashA = await computeSha256(bufferA);
  const hashB = await computeSha256(bufferB);
  assert(hashA !== hashB, 'One-byte modification changes SHA-256 hash');
  const repA = inspectImageForensics(bufferA, 'file.jpg', 'image/jpeg', { knownSha256Hash: hashA });
  const repB = inspectImageForensics(bufferB, 'file.jpg', 'image/jpeg', { knownSha256Hash: hashB });
  assert(repA.fileHash === hashA && repB.fileHash === hashB, 'Reports strictly bound to respective SHA-256 hashes');
  assert(repA.fileHash !== repB.fileHash, 'Replacing file strictly invalidates hash binding');

  console.log('\n================================================================');
  console.log(`PHASE 2B.1 AUDIT SUITE SUMMARY: ${passed}/${total} AUDIT CHECKS PASSED`);
  console.log('================================================================\n');
}

runPhase2B1Audit().catch((err) => {
  console.error('Fatal audit check failure:', err);
  process.exit(1);
});
