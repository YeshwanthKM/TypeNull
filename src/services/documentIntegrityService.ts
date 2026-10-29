/**
 * TypeNull Deterministic Document Integrity, Structural Forensics & Cryptographic Verification Service
 *
 * Implements deterministic checks:
 * - Magic byte inspection (file signature vs extension vs MIME)
 * - Deep PDF structural forensics (header, trailer, EOF marker, incremental revisions, active scripts)
 * - Cryptographic digital signature verification over signed byte ranges (PKCS#7 / CMS / RSA / ECDSA)
 * - Certificate chain trust verification and RFC 3161 timestamp checking
 * - Modification and post-signing tampering detection
 * - Duplicate file detection via SHA-256 hash
 * - File-hash binding ensuring findings belong strictly to inspected file
 */

import {
  verifyPdfDigitalSignatures,
  PdfSignatureVerificationReport,
} from './crypto/pdfSignatureVerifier';
import {
  inspectPdfForensics,
  PdfForensicReport,
} from './forensics/pdfForensicsService';
import {
  inspectImageForensics,
  ImageForensicReport,
} from './forensics/imageForensicsService';

export interface DocumentIntegrityResult {
  isValidFormat: boolean;
  detectedFormat: 'pdf' | 'png' | 'jpeg' | 'unknown';
  mimeTypeMatch: boolean;
  extensionMatch: boolean;
  fileSizeBytes: number;
  sha256Hash: string;
  pdfStructure?: {
    hasValidHeader: boolean;
    hasValidEof: boolean;
    pageCountEstimate?: number;
    hasEmbeddedSignatureDictionary: boolean;
    isEncrypted: boolean;
    metadata?: {
      title?: string;
      creator?: string;
      producer?: string;
      creationDate?: string;
      modDate?: string;
    };
  };
  signatureReport?: PdfSignatureVerificationReport;
  forensicReport?: PdfForensicReport;
  imageForensicsReport?: ImageForensicReport;
  integrityFindings: IntegrityFinding[];
}

export interface IntegrityFinding {
  code: string;
  severity: 'info' | 'minor' | 'major' | 'blocking';
  message: string;
  technicalDetails?: string;
  ruleCitation?: string;
}

/**
 * Calculates SHA-256 hash of an ArrayBuffer in browser or Node
 */
export async function computeSha256(bufferInput: ArrayBuffer | Uint8Array | ArrayBufferView): Promise<string> {
  const subtle =
    (typeof globalThis !== 'undefined' ? globalThis.crypto?.subtle : undefined) ||
    (typeof crypto !== 'undefined' ? crypto.subtle : undefined);
  if (subtle) {
    const bytes =
      bufferInput instanceof Uint8Array
        ? new Uint8Array(bufferInput.buffer as ArrayBuffer, bufferInput.byteOffset, bufferInput.byteLength)
        : typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(bufferInput)
        ? new Uint8Array(bufferInput.buffer as ArrayBuffer, bufferInput.byteOffset, bufferInput.byteLength)
        : new Uint8Array(bufferInput as ArrayBuffer);
    const hashBuffer = await subtle.digest('SHA-256', bytes as unknown as BufferSource);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return 'sha256-hash-unavailable';
}

/**
 * Inspects magic bytes, deep structure, and cryptographic signatures of an uploaded file
 */
export async function inspectDocumentIntegrity(
  bufferInput: ArrayBuffer | Uint8Array | ArrayBufferView,
  declaredFilename: string,
  declaredMimeType: string
): Promise<DocumentIntegrityResult> {
  const bytes =
    bufferInput instanceof Uint8Array
      ? new Uint8Array(bufferInput.buffer as ArrayBuffer, bufferInput.byteOffset, bufferInput.byteLength)
      : typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(bufferInput)
      ? new Uint8Array(bufferInput.buffer as ArrayBuffer, bufferInput.byteOffset, bufferInput.byteLength)
      : new Uint8Array(bufferInput as ArrayBuffer);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const findings: IntegrityFinding[] = [];
  const fileSizeBytes = bytes.length;

  if (fileSizeBytes === 0) {
    return {
      isValidFormat: false,
      detectedFormat: 'unknown',
      mimeTypeMatch: false,
      extensionMatch: false,
      fileSizeBytes: 0,
      sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      integrityFindings: [
        {
          code: 'ZERO_BYTE_FILE',
          severity: 'blocking',
          message: 'The submitted file is zero bytes (empty).',
          technicalDetails: 'Buffer length is 0 bytes.',
        },
      ],
    };
  }

  // 1. Magic byte detection
  let detectedFormat: 'pdf' | 'png' | 'jpeg' | 'unknown' = 'unknown';

  // PDF: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    detectedFormat = 'pdf';
  }
  // PNG: \x89PNG\r\n\x1a\n (0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A)
  else if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    detectedFormat = 'png';
  }
  // JPEG: \xFF\xD8\xFF (0xFF 0xD8 0xFF)
  else if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    detectedFormat = 'jpeg';
  }

  // Check declared extension
  const ext = declaredFilename.split('.').pop()?.toLowerCase() || '';
  let extensionMatch = false;
  if (detectedFormat === 'pdf' && ext === 'pdf') extensionMatch = true;
  else if (detectedFormat === 'png' && ext === 'png') extensionMatch = true;
  else if (detectedFormat === 'jpeg' && (ext === 'jpg' || ext === 'jpeg')) extensionMatch = true;

  // Check declared MIME type
  let mimeTypeMatch = false;
  if (detectedFormat === 'pdf' && declaredMimeType.includes('pdf')) mimeTypeMatch = true;
  else if (detectedFormat === 'png' && declaredMimeType.includes('png')) mimeTypeMatch = true;
  else if (detectedFormat === 'jpeg' && (declaredMimeType.includes('jpeg') || declaredMimeType.includes('jpg'))) {
    mimeTypeMatch = true;
  }

  if (detectedFormat === 'unknown') {
    findings.push({
      code: 'UNRECOGNIZED_MAGIC_BYTES',
      severity: 'blocking',
      message: `File magic bytes do not match standard PDF, PNG, or JPEG format signatures.`,
      technicalDetails: `First 4 bytes: ${Array.from(bytes.slice(0, 4))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ')}`,
    });
  } else if (!extensionMatch || !mimeTypeMatch) {
    findings.push({
      code: 'EXTENSION_SIGNATURE_MISMATCH',
      severity: 'major',
      message: `File content format (${detectedFormat.toUpperCase()}) does not match the file extension (.${ext}) or declared MIME type (${declaredMimeType}).`,
      technicalDetails: `Detected: ${detectedFormat}, Declared Ext: ${ext}, Declared MIME: ${declaredMimeType}`,
    });
  }

  // Compute SHA-256 hash (file-hash binding)
  const sha256Hash = await computeSha256(buffer);

  let pdfStructure: DocumentIntegrityResult['pdfStructure'] = undefined;
  let signatureReport: PdfSignatureVerificationReport | undefined = undefined;
  let forensicReport: PdfForensicReport | undefined = undefined;
  let imageForensicsReport: ImageForensicReport | undefined = undefined;

  // 2. Deep PDF analysis & cryptographic signature verification
  if (detectedFormat === 'pdf') {
    // A. Forensic analysis
    forensicReport = inspectPdfForensics(buffer, declaredFilename);

    pdfStructure = {
      hasValidHeader: forensicReport.headerValid,
      hasValidEof: forensicReport.eofValid,
      hasEmbeddedSignatureDictionary: false,
      isEncrypted: forensicReport.isEncrypted,
      metadata: {
        title: forensicReport.metadata?.title,
        creator: forensicReport.metadata?.creator,
        producer: forensicReport.metadata?.producer,
        creationDate: forensicReport.metadata?.creationDate,
        modDate: forensicReport.metadata?.modificationDate,
      },
    };

    // Propagate structural findings
    for (const ff of forensicReport.findings) {
      findings.push({
        code: ff.code,
        severity: ff.severity,
        message: `${ff.title}: ${ff.explanation}`,
        technicalDetails: ff.technicalDetails,
        ruleCitation: ff.ruleCitation,
      });
    }

    // B. Cryptographic digital signature verification
    signatureReport = await verifyPdfDigitalSignatures(buffer);
    const hasSigDict = signatureReport.signaturesCount > 0;
    pdfStructure.hasEmbeddedSignatureDictionary = hasSigDict;

    if (hasSigDict) {
      for (const sig of signatureReport.signatures) {
        if (sig.status === 'signature_integrity_failed') {
          findings.push({
            code: 'CRYPTO_SIGNATURE_INTEGRITY_FAILED',
            severity: 'blocking',
            message: `Signature #${sig.signatureIndex} failed cryptographic verification: ${sig.technicalDetails}`,
            technicalDetails: `SubFilter: ${sig.subFilter}, ByteRange: [${sig.byteRange.join(', ')}]`,
            ruleCitation: 'RFC 5652 CMS Cryptographic Signature Standards',
          });
        } else if (sig.status === 'document_modified_after_signing') {
          findings.push({
            code: 'DOCUMENT_MODIFIED_AFTER_SIGNING',
            severity: 'blocking',
            message: `Document was modified after Signature #${sig.signatureIndex} was applied: ${sig.technicalDetails}`,
            technicalDetails: `Appended bytes: ${sig.appendedBytesLength} bytes after signed byte range.`,
            ruleCitation: 'ISO 32000-1 Digital Signature Modifications',
          });
        } else if (sig.status === 'signature_integrity_verified') {
          findings.push({
            code: 'CRYPTO_SIGNATURE_VERIFIED',
            severity: 'info',
            message: `Signature #${sig.signatureIndex} is cryptographically valid. Mathematical RSA/ECDSA integrity matches the signed byte ranges.`,
            technicalDetails: `Signer: ${sig.signerCertificate?.subjectName || 'Unknown'}, SubFilter: ${sig.subFilter}`,
            ruleCitation: 'RFC 5652 & ISO 32000-1',
          });
        } else if (sig.status === 'certificate_untrusted_or_unverifiable') {
          findings.push({
            code: 'CERTIFICATE_UNTRUSTED_OR_UNVERIFIABLE',
            severity: 'minor',
            message: `Signature #${sig.signatureIndex} is mathematically verified, but certificate issuer is untrusted or self-signed.`,
            technicalDetails: sig.technicalDetails,
            ruleCitation: 'AICTE Institutional Certificate Trust Norms',
          });
        } else if (sig.status === 'timestamp_not_verified') {
          findings.push({
            code: 'TIMESTAMP_NOT_VERIFIED',
            severity: 'info',
            message: `Signature #${sig.signatureIndex} verified mathematically, but lacks a certified RFC 3161 TSA timestamp.`,
            technicalDetails: 'Signing time is self-claimed by the client certificate.',
          });
        } else if (sig.status === 'signature_field_detected_unverified') {
          findings.push({
            code: 'EMBEDDED_DIGITAL_SIGNATURE_DETECTED',
            severity: 'info',
            message:
              'PDF contains an embedded digital signature dictionary. Note: Signature existence alone does NOT constitute verified cryptographic authentication (requires trusted CA certificate chain check).',
            technicalDetails: sig.technicalDetails,
          });
        }
      }
    }
  } else if (detectedFormat === 'jpeg' || detectedFormat === 'png') {
    // 3. Image manipulation analysis & visual forensics
    imageForensicsReport = inspectImageForensics(buffer, declaredFilename, declaredMimeType, {
      knownSha256Hash: sha256Hash,
      isRenderedPdfPage: false,
    });

    for (const imgFinding of imageForensicsReport.findings) {
      findings.push({
        code: imgFinding.code,
        severity: imgFinding.severity,
        message: `${imgFinding.title}: ${imgFinding.explanation}`,
        technicalDetails: imgFinding.technicalDetails,
      });
    }
  }

  const isValidFormat =
    detectedFormat !== 'unknown' && findings.every((f) => f.severity !== 'blocking');

  return {
    isValidFormat,
    detectedFormat,
    mimeTypeMatch,
    extensionMatch,
    fileSizeBytes,
    sha256Hash,
    pdfStructure,
    signatureReport,
    forensicReport,
    imageForensicsReport,
    integrityFindings: findings,
  };
}
