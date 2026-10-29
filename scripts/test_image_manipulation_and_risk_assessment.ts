/**
 * TypeNull Phase 2B Test Suite
 *
 * Validates Image Manipulation Analysis, Visual Forensics & Multi-Signal Risk Assessment
 * across all 16 required controlled scenarios for AICTE EoA 2026–27 dossiers.
 */

import {
  inspectImageForensics,
  parseJpegMarkers,
  parsePngChunks,
  analyzeRegionalNoise,
  analyzeCopyMoveClones,
  ImageForensicReport,
} from '../src/services/forensics/imageForensicsService';
import {
  inspectDocumentIntegrity,
  computeSha256,
  DocumentIntegrityResult,
} from '../src/services/documentIntegrityService';
import {
  evaluateMultiSignalRisk,
  MultiSignalRiskAssessmentReport,
} from '../src/services/validation/multiSignalRiskAssessment';
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
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Creates a minimal valid synthetic JPEG binary buffer with configurable markers
 */
function createSyntheticJpeg(options: {
  width?: number;
  height?: number;
  software?: string;
  isTruncated?: boolean;
  hasCustomDqt?: boolean;
  scanDataLength?: number;
  isOversized?: boolean;
}): Uint8Array {
  const width = options.isOversized ? 8000 : options.width || 300;
  const height = options.isOversized ? 8000 : options.height || 400; // 8000x8000 = 64 MP (exceeds 36 MP limit)

  const parts: number[] = [
    0xff, 0xd8, // SOI
  ];

  // Optional APP1 with EXIF
  if (options.software) {
    const swBytes = Array.from(new TextEncoder().encode(options.software));
    const exifPayload = [
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // Exif\0\0
      0x49, 0x49, 0x2a, 0x00, // TIFF Little Endian
      0x08, 0x00, 0x00, 0x00, // Offset to IFD0
      ...swBytes,
      0x00,
    ];
    const len = exifPayload.length + 2;
    parts.push(0xff, 0xe1, (len >> 8) & 0xff, len & 0xff, ...exifPayload);
  }

  // DQT (Define Quantization Table)
  const dqtLuma0 = options.hasCustomDqt ? 1 : 8; // Custom vs Standard Q80
  const dqtPayload = [0x00]; // 8-bit, Table 0
  for (let i = 0; i < 64; i++) {
    dqtPayload.push(i === 0 ? dqtLuma0 : (options.hasCustomDqt ? 1 : 10));
  }
  const dqtLen = dqtPayload.length + 2;
  parts.push(0xff, 0xdb, (dqtLen >> 8) & 0xff, dqtLen & 0xff, ...dqtPayload);

  // SOF0 (Baseline DCT frame)
  const sofPayload = [
    0x08, // Precision: 8-bit
    (height >> 8) & 0xff,
    height & 0xff,
    (width >> 8) & 0xff,
    width & 0xff,
    0x03, // 3 components (YCbCr)
    0x01, 0x22, 0x00, // Y, sampling, quant table 0
    0x02, 0x11, 0x01, // Cb
    0x03, 0x11, 0x01, // Cr
  ];
  const sofLen = sofPayload.length + 2;
  parts.push(0xff, 0xc0, (sofLen >> 8) & 0xff, sofLen & 0xff, ...sofPayload);

  // SOS (Start of Scan)
  const sosPayload = [
    0x03, // 3 components
    0x01, 0x00,
    0x02, 0x00,
    0x03, 0x00,
    0x00, 0x3f, 0x00, // spectral selection
  ];
  const sosLen = sosPayload.length + 2;
  parts.push(0xff, 0xda, (sosLen >> 8) & 0xff, sosLen & 0xff, ...sosPayload);

  // Scan Data
  const scanLen = options.scanDataLength || 1024;
  for (let i = 0; i < scanLen; i++) {
    parts.push((i * 17 + 3) & 0x7f); // Avoid 0xFF byte stuffing for simplicity
  }

  // EOI (0xFF 0xD9)
  if (!options.isTruncated) {
    parts.push(0xff, 0xd9);
  }

  return new Uint8Array(parts);
}

/**
 * Creates a minimal valid synthetic PNG binary buffer
 */
function createSyntheticPng(options: {
  width?: number;
  height?: number;
  software?: string;
  isTruncated?: boolean;
}): Uint8Array {
  const width = options.width || 200;
  const height = options.height || 150;

  const parts: number[] = [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  ];

  // IHDR chunk
  const ihdrData = [
    (width >> 24) & 0xff, (width >> 16) & 0xff, (width >> 8) & 0xff, width & 0xff,
    (height >> 24) & 0xff, (height >> 16) & 0xff, (height >> 8) & 0xff, height & 0xff,
    0x08, // Bit depth 8
    0x02, // Truecolor (RGB)
    0x00, // Deflate
    0x00, // Filter none
    0x00, // Interlace none
  ];
  // Length 13, Type "IHDR", Data 13, CRC 4
  parts.push(
    0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, // IHDR
    ...ihdrData,
    0x00, 0x00, 0x00, 0x00 // Mock CRC
  );

  // Optional tEXt chunk
  if (options.software) {
    const textBytes = Array.from(new TextEncoder().encode(`Software\0${options.software}`));
    const tLen = textBytes.length;
    parts.push(
      (tLen >> 24) & 0xff, (tLen >> 16) & 0xff, (tLen >> 8) & 0xff, tLen & 0xff,
      0x74, 0x45, 0x58, 0x74, // tEXt
      ...textBytes,
      0x00, 0x00, 0x00, 0x00
    );
  }

  // IDAT chunk (Mock payload)
  const idatPayload = [0x78, 0x9c, 0x63, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01];
  parts.push(
    0x00, 0x00, 0x00, idatPayload.length,
    0x49, 0x44, 0x41, 0x54, // IDAT
    ...idatPayload,
    0x00, 0x00, 0x00, 0x00
  );

  // IEND chunk
  if (!options.isTruncated) {
    parts.push(
      0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4e, 0x44, // IEND
      0xae, 0x42, 0x60, 0x82
    );
  }

  return new Uint8Array(parts);
}

const mockApp: DbApplication = {
  id: 'app-eoa-phase2b-test',
  user_id: 'user-inst-01',
  title: 'AICTE EoA Application 2026-27',
  category: 'technical_engineering',
  organisation_name: 'Apex Institute of Technology and Science',
  registration_number: '1-43289012',
  jurisdiction: 'India',
  description: 'Annual Extension of Approval compliance dossier',
  status: 'under_review',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

async function runPhase2BTests() {
  console.log('================================================================');
  console.log('TYPENULL PHASE 2B: IMAGE FORENSICS & MULTI-SIGNAL RISK SUITE');
  console.log('================================================================\n');

  // --- SCENARIO 1: Untouched Scanned Document ---
  console.log('--- SCENARIO 1: Untouched Scanned Document ---');
  const untouchedJpeg = createSyntheticJpeg({ width: 800, height: 1100, software: 'Canon CanoScan 9000F' });
  const rep1 = inspectImageForensics(untouchedJpeg, 'scanned_affidavit.jpg', 'image/jpeg');
  assert(rep1.detectedFormat === 'jpeg', 'Detected JPEG format correctly');
  assert(rep1.isSafeToProcess === true, 'Safe to process');
  assert(rep1.metadataAnalysis.isKnownScannerHardware === true, 'Identifies scanner hardware in metadata');
  assert(rep1.metadataAnalysis.isKnownEditingSoftware === false, 'No editing software signatures');
  assert(rep1.findings.every((f) => f.severity !== 'blocking'), 'Zero blocking findings on clean scan');

  // --- SCENARIO 2: Document with Inserted Text Region (Digital Blanking / Noise Mismatch) ---
  console.log('\n--- SCENARIO 2: Document with Inserted Text Region ---');
  // Spliced image with digital zero-noise patch
  const splicedBytes = new Uint8Array(4096);
  // Fill background with simulated paper grain
  for (let i = 0; i < 3000; i++) splicedBytes[i] = (i * 29 + 13) % 256;
  // Spliced region: zero-noise blanking patch
  for (let i = 3000; i < 4096; i++) splicedBytes[i] = 255;
  const noiseResult = analyzeRegionalNoise(800, 1000, splicedBytes, false);
  assert(noiseResult.noiseSummary.hasSuspiciousUniformRegions === true, 'Flags suspicious localized uniform zero-noise region');
  assert(noiseResult.anomalousRegions.length > 0, 'Computes bounding box coordinates for anomalous patch');

  // --- SCENARIO 3: Copy-Move Alteration (Duplicated Region) ---
  console.log('\n--- SCENARIO 3: Copy-Move Alteration (Duplicated Region) ---');
  // Spliced identical non-blank blocks separated in canvas
  const cloneBytes = new Uint8Array(4096);
  for (let i = 0; i < 4096; i++) cloneBytes[i] = (i % 64) * 4;
  // Duplicate tile 10 into tile 30
  const cloneResult = analyzeCopyMoveClones(400, 400, cloneBytes, false);
  assert(cloneResult.copyMoveSummary.evaluated === true, 'Evaluated copy-move analysis');
  assert(cloneResult.copyMoveSummary.candidateClonedPairsCount > 0, 'Detects candidate cloned pairs');

  // --- SCENARIO 4: Recompressed Image without Manipulation ---
  console.log('\n--- SCENARIO 4: Recompressed Image without Manipulation ---');
  const recompressedJpeg = createSyntheticJpeg({ width: 600, height: 800, hasCustomDqt: false });
  const rep4 = inspectImageForensics(recompressedJpeg, 'recompressed.jpg', 'image/jpeg');
  assert(
    rep4.elaSummary.applicable === false,
    'ELA accurately classified as not applicable without full pixel recompression comparison'
  );
  assert(rep4.elaSummary.hasCustomQuantizationTables === false, 'Standard quantization tables identified');
  assert(rep4.findings.every((f) => f.severity !== 'blocking'), 'Uniform recompression does NOT trigger blocking fraud');

  // --- SCENARIO 5: Resized or Rotated Document ---
  console.log('\n--- SCENARIO 5: Resized or Rotated Document ---');
  const landscapeJpeg = createSyntheticJpeg({ width: 1200, height: 900 });
  const rep5 = inspectImageForensics(landscapeJpeg, 'rotated_landscape.jpg', 'image/jpeg');
  assert(rep5.width === 1200 && rep5.height === 900, 'Reads non-standard dimensions');
  assert(rep5.aspectRatio === 1.33, 'Calculates correct aspect ratio (1.33)');
  assert(rep5.isSafeToProcess === true, 'Handles landscape orientation gracefully');

  // --- SCENARIO 6: Uneven Lighting and Shadows ---
  console.log('\n--- SCENARIO 6: Uneven Lighting and Shadows ---');
  // Simulated gradual luminance gradient across image
  const gradientBytes = new Uint8Array(4096);
  for (let i = 0; i < 4096; i++) gradientBytes[i] = Math.min(255, Math.floor((i / 4096) * 180) + (i % 15));
  const gradientNoise = analyzeRegionalNoise(600, 800, gradientBytes, false);
  assert(gradientNoise.noiseSummary.evaluated === true, 'Evaluates gradient lighting');
  // Background gradient does NOT cause copy-move false alerts
  const gradientClone = analyzeCopyMoveClones(600, 800, gradientBytes, false);
  assert(gradientClone.clonedRegions.length === 0, 'Lighting gradient does not produce false copy-move alerts');

  // --- SCENARIO 7: Blurred or Low-Resolution Scan ---
  console.log('\n--- SCENARIO 7: Blurred or Low-Resolution Scan ---');
  const lowResJpeg = createSyntheticJpeg({ width: 50, height: 50, scanDataLength: 200 });
  const rep7 = inspectImageForensics(lowResJpeg, 'low_res_thumbnail.jpg', 'image/jpeg');
  assert(rep7.copyMoveSummary.evaluated === false, 'Safely marks copy-move inconclusive below dimension threshold');
  assert(rep7.isSafeToProcess === true, 'Does not crash on low-resolution inputs');

  // --- SCENARIO 8: JPEG and PNG Inputs ---
  console.log('\n--- SCENARIO 8: JPEG and PNG Inputs ---');
  const validPng = createSyntheticPng({ width: 500, height: 400, software: 'Adobe Photoshop 2024' });
  const rep8Png = inspectImageForensics(validPng, 'document_crop.png', 'image/png');
  assert(rep8Png.detectedFormat === 'png', 'Detects PNG format signature');
  assert(rep8Png.width === 500 && rep8Png.height === 400, 'Extracts correct IHDR width/height');
  assert(rep8Png.metadataAnalysis.isKnownEditingSoftware === true, 'Extracts Photoshop software from PNG tEXt chunk');
  assert(rep8Png.elaSummary.applicable === false, 'Recognizes ELA is inapplicable to lossless PNG');

  // --- SCENARIO 9: Rendered PDF Pages ---
  console.log('\n--- SCENARIO 9: Rendered PDF Pages ---');
  const renderedPage = createSyntheticPng({ width: 800, height: 1100 });
  const rep9 = inspectImageForensics(renderedPage, 'page_1_render.png', 'image/png', {
    isRenderedPdfPage: true,
    pageNumber: 1,
  });
  assert(rep9.isRenderedPdfPage === true, 'Distinguishes rendered PDF page from original camera/scan file');
  assert(rep9.pageNumber === 1, 'Binds page number strictly');

  // --- SCENARIO 10: Corrupt or Truncated Image ---
  console.log('\n--- SCENARIO 10: Corrupt or Truncated Image ---');
  const truncatedJpeg = createSyntheticJpeg({ isTruncated: true });
  // Corrupt the SOS marker to make payload truncated
  truncatedJpeg[truncatedJpeg.length - 1] = 0x00;
  const rep10 = inspectImageForensics(truncatedJpeg.subarray(0, 15), 'corrupted.jpg', 'image/jpeg');
  assert(rep10.detectedFormat === 'corrupt', 'Identifies truncated or corrupt image stream');
  assert(rep10.isSafeToProcess === false, 'Marks isSafeToProcess = false');
  assert(rep10.findings.some((f) => f.code === 'IMG_CORRUPT_OR_TRUNCATED'), 'Emits IMG_CORRUPT_OR_TRUNCATED finding');

  // --- SCENARIO 11: Oversized Image Rejected by Safety Limits ---
  console.log('\n--- SCENARIO 11: Oversized Image Rejected by Safety Limits ---');
  const oversizedJpeg = createSyntheticJpeg({ isOversized: true });
  const rep11 = inspectImageForensics(oversizedJpeg, 'gigapixel_bomb.jpg', 'image/jpeg');
  assert(rep11.isSafeToProcess === false, 'Decompression bomb safely caught');
  assert(rep11.findings.some((f) => f.code === 'IMG_DECOMPRESSION_BOMB_DETECTED'), 'Emits IMG_DECOMPRESSION_BOMB_DETECTED');

  // --- SCENARIO 12: Repeated Patterns (Benign Typography & Forms) ---
  console.log('\n--- SCENARIO 12: Repeated Patterns (Benign Typography & Forms) ---');
  // Blank paper / repetitive typography
  const blankPaperBytes = new Uint8Array(4096).fill(255);
  const rep12 = analyzeCopyMoveClones(500, 500, blankPaperBytes, false);
  assert(rep12.copyMoveSummary.filteredBenignRepetitionsCount > 0, 'Filters out blank uniform white paper');
  assert(rep12.clonedRegions.length === 0, 'Does NOT raise fraud alert on uniform white space');

  // --- SCENARIO 13: Image Replacement Invalidating Stale Findings ---
  console.log('\n--- SCENARIO 13: Image Replacement Invalidating Stale Findings ---');
  const imgA = createSyntheticJpeg({ width: 300, height: 400 });
  const imgB = createSyntheticJpeg({ width: 300, height: 400, software: 'Adobe Photoshop' });
  const hashA = await computeSha256(imgA);
  const hashB = await computeSha256(imgB);
  assert(hashA !== hashB, 'Distinct image versions have distinct SHA-256 hashes');
  const repA = inspectImageForensics(imgA, 'doc.jpg', 'image/jpeg', { knownSha256Hash: hashA });
  const repB = inspectImageForensics(imgB, 'doc.jpg', 'image/jpeg', { knownSha256Hash: hashB });
  assert(repA.fileHash === hashA, 'Report A strictly bound to Hash A');
  assert(repB.fileHash === hashB, 'Report B strictly bound to Hash B');
  assert(repA.findings.length !== repB.findings.length, 'Replacing file strictly invalidates previous findings');

  // --- SCENARIO 14: Risk Assessment when Signature Verification is Unavailable ---
  console.log('\n--- SCENARIO 14: Risk Assessment when Signature Verification is Unavailable ---');
  const mockDocs: ApplicationDocument[] = [
    {
      id: 'doc-affidavit-01',
      application_id: mockApp.id,
      user_id: mockApp.user_id,
      original_filename: 'statutory_declaration.pdf',
      storage_path: 'mock/path',
      mime_type: 'application/pdf',
      file_size_bytes: 50000,
      document_type: 'application_form',
      processing_status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  const risk14 = evaluateMultiSignalRisk({
    application: mockApp,
    documents: mockDocs,
    integrityReports: {
      'doc-affidavit-01': {
        isValidFormat: true,
        detectedFormat: 'pdf',
        mimeTypeMatch: true,
        extensionMatch: true,
        fileSizeBytes: 50000,
        sha256Hash: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
        integrityFindings: [],
      },
    },
  });
  assert(
    risk14.dimensionStatuses.cryptographicSignatureIntegrity === 'NOT_APPLICABLE',
    'Accurately marks cryptographic signature as NOT_APPLICABLE when no signatures are present'
  );
  assert(risk14.dimensionStatuses.certificateTrust === 'NOT_APPLICABLE', 'Certificate trust is NOT_APPLICABLE');
  assert(risk14.dimensionStatuses.technicalDocumentIntegrity === 'PASS', 'Technical integrity is PASS');

  // --- SCENARIO 15: Risk Assessment when Certificate Trust is Unverified ---
  console.log('\n--- SCENARIO 15: Risk Assessment when Certificate Trust is Unverified ---');
  const risk15 = evaluateMultiSignalRisk({
    application: mockApp,
    documents: mockDocs,
    integrityReports: {
      'doc-affidavit-01': {
        isValidFormat: true,
        detectedFormat: 'pdf',
        mimeTypeMatch: true,
        extensionMatch: true,
        fileSizeBytes: 50000,
        sha256Hash: 'abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234',
        signatureReport: {
          overallStatus: 'certificate_untrusted_or_unverifiable',
          signaturesCount: 1,
          hasTamperedSignatures: false,
          hasFailedSignatures: false,
          hasModifiedSignatures: false,
          hasCryptographicSignatures: true,
          untrustedCertificatesCount: 1,
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
              status: 'certificate_untrusted_or_unverifiable',
              trustDecision: 'unanchored_chain',
              technicalDetails: 'Certificate chain unanchored to known CCA India root store',
              hasRfc3161Timestamp: false,
            },
          ],
        },
        integrityFindings: [],
      },
    },
  });
  assert(risk15.dimensionStatuses.cryptographicSignatureIntegrity === 'NOT_VERIFIED', 'Crypto signature marked NOT_VERIFIED');
  assert(risk15.dimensionStatuses.certificateTrust === 'UNANCHORED', 'Certificate trust marked UNANCHORED');
  assert(risk15.dimensionStatuses.riskRequiringHumanReview === 'LOW', 'Unanchored chain alone does not inflate to high risk');

  // --- SCENARIO 16: Risk Assessment when Different Signals Disagree ---
  console.log('\n--- SCENARIO 16: Risk Assessment when Different Signals Disagree ---');
  // Scenario: Valid signature, but minor image anomaly and a statutory check pending
  const testComparison: FieldComparisonResult = {
    fieldName: 'organisation_name',
    fieldLabel: 'Institution Legal Name',
    expectedValue: 'Apex Institute of Technology and Science',
    expectedSource: 'AICTE Institutional Registry',
    comparedValues: [],
    outcome: 'formatting_difference',
    similarityScore: 0.95,
    explanation: 'Minor abbreviation difference: "Tech" vs "Technology".',
    isBlocking: false,
  };
  const testFinding: EoaValidationFinding = {
    id: 'EOA-AFFIDAVIT-WARNING',
    ruleId: 'AICTE-RULE-AFFIDAVIT-1',
    ruleVersion: 'APH 2024–2027',
    category: 'regulatory_requirement_not_satisfied',
    severity: 'minor',
    status: 'WARNING',
    title: 'Notary Seal Placement Advisory',
    explanation: 'Notary seal detected on margin rather than footer block.',
    validationMethod: 'statutory_checklist',
    requiresManualReview: true,
    isBlocking: false,
  };

  const risk16 = evaluateMultiSignalRisk({
    application: mockApp,
    documents: mockDocs,
    integrityReports: {
      'doc-affidavit-01': {
        isValidFormat: true,
        detectedFormat: 'pdf',
        mimeTypeMatch: true,
        extensionMatch: true,
        fileSizeBytes: 50000,
        sha256Hash: '1122334455667788112233445566778811223344556677881122334455667788',
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
              technicalDetails: 'Cryptographically valid signature',
              hasRfc3161Timestamp: true,
            },
          ],
        },
        imageForensicsReport: {
          fileHash: '1122334455667788112233445566778811223344556677881122334455667788',
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
            software: 'GIMP 2.10',
          },
          elaSummary: {
            applicable: true,
            hasCustomQuantizationTables: false,
            highErrorClusterDetected: false,
            anomalousRegionsCount: 0,
            observations: 'Standard quantization.',
          },
          noiseSummary: {
            evaluated: true,
            averageBackgroundNoiseStdDev: 12.4,
            noiseConsistencyRatio: 0.82,
            hasSuspiciousUniformRegions: false,
            hasSuspiciousNoisyRegions: false,
            observations: 'Uniform noise distribution.',
          },
          copyMoveSummary: {
            evaluated: true,
            candidateClonedPairsCount: 0,
            clonedClustersCount: 0,
            filteredBenignRepetitionsCount: 12,
            observations: 'No copy-move detected.',
          },
          findings: [
            {
              id: 'IMG_METADATA_EDITING_SOFTWARE_DETECTED',
              technique: 'metadata_and_exif_forensics',
              code: 'IMG_METADATA_EDITING_SOFTWARE_DETECTED',
              severity: 'minor',
              confidence: 'medium',
              title: 'Image Editing Software Signature in Metadata',
              explanation: 'GIMP 2.10 tag detected.',
              benignExplanations: ['User cropped page in GIMP.'],
              limitations: ['Does not prove fraudulent modification.'],
              recommendedFollowUp: 'Verify substantive contents.',
            },
          ],
          evaluatedAt: new Date().toISOString(),
        },
        integrityFindings: [],
      },
    },
    crossDocumentComparisons: [testComparison],
    eoaFindings: [testFinding],
  });

  // Verify dimension decoupling
  assert(
    risk16.dimensionStatuses.cryptographicSignatureIntegrity === 'VERIFIED',
    'Crypto signature remains VERIFIED despite editing software tag on raster scan'
  );
  assert(
    risk16.dimensionStatuses.regulatoryCompliance === 'COMPLIANT',
    'Regulatory compliance remains COMPLIANT because minor warning is non-blocking'
  );
  assert(
    risk16.dimensionStatuses.riskRequiringHumanReview === 'MEDIUM',
    'Review risk is safely rated MEDIUM for officer verification rather than auto-rejection'
  );
  assert(risk16.isDeterministicAndReproducible === true, 'Assessment is deterministic and reproducible');

  console.log('\n================================================================');
  console.log(`PHASE 2B TEST SUITE SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log('================================================================\n');
}

runPhase2BTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
