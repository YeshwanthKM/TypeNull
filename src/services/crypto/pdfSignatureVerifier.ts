/**
 * TypeNull Cryptographic PDF Digital Signature Verification Service
 *
 * Implements rigorous cryptographic digital signature verification for AICTE EoA
 * institutional applications, adhering to ISO 32000-1 (PDF) and RFC 5652 (CMS).
 *
 * Core Distinctions:
 * 1. no_signature_detected: Document contains zero digital signature fields.
 * 2. signature_field_detected_unverified: PDF signature field present, but unverified.
 * 3. signature_integrity_verified: Mathematical RSA/ECDSA signature matches byte range.
 * 4. signature_integrity_failed: Cryptographic check or message digest mismatch.
 * 5. certificate_untrusted_or_unverifiable: Valid math signature, but certificate chain untrusted.
 * 6. timestamp_not_verified: Self-claimed signing time without RFC 3161 TSA token.
 * 7. document_modified_after_signing: Bytes or objects altered after the signed byte range.
 * 8. verification_unavailable: Missing verification capability or malformed ASN.1 payload.
 */

import {
  parsePkcs7SignedData,
} from './asn1Parser';
import {
  CertificateTrustState,
  CertificateChainValidationResult,
} from './certificateTrustTypes';
import { validateCertificateChain } from './x509PathValidator';

export type SignatureOverallStatus =
  | 'no_signature_detected'
  | 'signature_field_detected_unverified'
  | 'signature_integrity_verified'
  | 'signature_integrity_failed'
  | 'certificate_untrusted_or_unverifiable'
  | 'timestamp_not_verified'
  | 'document_modified_after_signing'
  | 'verification_unavailable';

export interface SingleSignatureVerificationResult {
  signatureIndex: number;
  subFilter: string;
  byteRange: [number, number, number, number];
  isByteRangeValid: boolean;
  documentModifiedAfterSigning: boolean;
  appendedBytesLength: number;
  mathematicalIntegrityVerified: boolean;
  messageDigestVerified: boolean;
  cryptoSignatureVerified: boolean;
  status: SignatureOverallStatus;
  signerCertificate?: {
    subjectName: string;
    organization?: string;
    issuerName: string;
    serialNumber: string;
    validFrom: string;
    validTo: string;
    isCurrentlyValid: boolean;
  };
  claimedSigningTime?: string;
  hasRfc3161Timestamp: boolean;
  isTimestampTokenVerified: boolean;
  trustDecision: 'trusted' | 'untrusted_chain' | 'self_signed' | 'unverifiable' | 'unanchored_chain' | 'expired';
  certificateTrustState?: CertificateTrustState;
  chainValidationResult?: CertificateChainValidationResult;
  technicalDetails: string;
}

export interface PdfSignatureVerificationReport {
  overallStatus: SignatureOverallStatus;
  signaturesCount: number;
  signatures: SingleSignatureVerificationResult[];
  hasCryptographicSignatures: boolean;
  hasFailedSignatures: boolean;
  hasModifiedSignatures: boolean;
  untrustedCertificatesCount: number;
  evaluatedAt: string;
  limitationsNotice: string;
}

/**
 * Known trusted root authorities (e.g. Controller of Certifying Authorities CCA India)
 */
export const KNOWN_TRUSTED_AUTHORITIES = [
  'CCA India',
  'eMudhra',
  'Capricorn',
  'SafeScrypt',
  'IDSign',
  'Verisys',
  'National Informatics Centre CA',
  'DigiCert',
];

/**
 * Normalizes ArrayBuffer or ArrayBufferView to an exact Uint8Array slice
 */
export function toUint8Array(input: ArrayBuffer | Uint8Array | ArrayBufferView): Uint8Array {
  if (input instanceof Uint8Array) {
    return new Uint8Array(input.buffer as ArrayBuffer, input.byteOffset, input.byteLength);
  }
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer as ArrayBuffer, input.byteOffset, input.byteLength);
  }
  return new Uint8Array(input as ArrayBuffer);
}

/**
 * Converts ASN.1 DER ECDSA signature (SEQUENCE { r INTEGER, s INTEGER }) to IEEE P1363 (64 bytes raw r || s)
 */
export function derSignatureToP1363(derSig: Uint8Array): Uint8Array | null {
  try {
    if (derSig.length < 8 || derSig[0] !== 0x30) return null;
    let offset = 2;
    if (derSig[1] & 0x80) {
      offset += (derSig[1] & 0x7f);
    }
    if (offset >= derSig.length || derSig[offset] !== 0x02) return null;
    const rLen = derSig[offset + 1];
    let r = derSig.subarray(offset + 2, offset + 2 + rLen);
    offset += 2 + rLen;
    if (offset >= derSig.length || derSig[offset] !== 0x02) return null;
    const sLen = derSig[offset + 1];
    let s = derSig.subarray(offset + 2, offset + 2 + sLen);
    if (r[0] === 0x00 && r.length > 32) r = r.subarray(1);
    if (s[0] === 0x00 && s.length > 32) s = s.subarray(1);
    if (r.length > 32 || s.length > 32) return null;
    const out = new Uint8Array(64);
    out.set(r, 32 - r.length);
    out.set(s, 64 - s.length);
    return out;
  } catch {
    return null;
  }
}

/**
 * Extracts raw PDF signature dictionaries (/ByteRange and /Contents)
 */
export function extractPdfSignatureDictionaries(buffer: ArrayBuffer | Uint8Array | ArrayBufferView): Array<{
  byteRange: [number, number, number, number];
  contentsHex: string;
  subFilter: string;
  claimedSigningTime?: string;
  rawDictSnippet: string;
}> {
  const bytes = toUint8Array(buffer);
  const textDecoder = new TextDecoder('latin1');
  const pdfText = textDecoder.decode(bytes);

  const results: Array<{
    byteRange: [number, number, number, number];
    contentsHex: string;
    subFilter: string;
    claimedSigningTime?: string;
    rawDictSnippet: string;
  }> = [];

  // Match /ByteRange\s*\[\s*([^\]]+)\]
  const byteRangeRegex = /\/ByteRange\s*\[\s*([^\]]+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = byteRangeRegex.exec(pdfText)) !== null) {
    const rawCoords = match[1].trim().split(/\s+/);
    const parsedCoords = rawCoords.map((c) => Number(c));
    const isCoordinateSyntaxValid =
      parsedCoords.length === 4 &&
      parsedCoords.every((c) => Number.isInteger(c) && c >= 0);

    const o1 = isCoordinateSyntaxValid ? parsedCoords[0] : NaN;
    const l1 = isCoordinateSyntaxValid ? parsedCoords[1] : NaN;
    const o2 = isCoordinateSyntaxValid ? parsedCoords[2] : NaN;
    const l2 = isCoordinateSyntaxValid ? parsedCoords[3] : NaN;

    // Look around for /Contents <...> and /SubFilter
    // Search window up to 64KB around byte range to accommodate large PKCS#7 signatures
    const windowStart = Math.max(0, match.index - 1000);
    const windowEnd = Math.min(pdfText.length, match.index + 65536);
    const snippet = pdfText.slice(windowStart, windowEnd);

    // Extract /Contents <HEX> dynamically without fixed length clipping
    let contentsHex = '';
    const contentsIdx = snippet.indexOf('/Contents');
    if (contentsIdx !== -1) {
      const openBracket = snippet.indexOf('<', contentsIdx);
      if (openBracket !== -1) {
        const closeBracket = snippet.indexOf('>', openBracket);
        if (closeBracket !== -1) {
          contentsHex = snippet.slice(openBracket + 1, closeBracket).replace(/[\s\n\r]/g, '');
        }
      }
    }

    // Extract /SubFilter
    const subFilterMatch = snippet.match(/\/SubFilter\s*\/([A-Za-z0-9._]+)/);
    const subFilter = subFilterMatch ? subFilterMatch[1] : 'unknown';

    // Extract claimed signing date /M (D:...)
    const dateMatch = snippet.match(/\/M\s*\((D:[^)]+)\)/);
    const claimedSigningTime = dateMatch ? dateMatch[1] : undefined;

    results.push({
      byteRange: [o1, l1, o2, l2],
      contentsHex,
      subFilter,
      claimedSigningTime,
      rawDictSnippet: snippet.slice(0, 300),
    });
  }

  return results;
}

/**
 * Converts hexadecimal string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace(/[\s\n\r]/g, '');
  const bytes = new Uint8Array(Math.floor(cleanHex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Universal crypto.subtle digest helper
 */
async function computeDigest(algorithm: string, data: Uint8Array): Promise<Uint8Array> {
  const subtle =
    (typeof globalThis !== 'undefined' ? globalThis.crypto?.subtle : undefined) ||
    (typeof crypto !== 'undefined' ? crypto.subtle : undefined);

  if (!subtle) {
    throw new Error('WebCrypto subtle digest capability is unavailable');
  }

  const hashBuffer = await subtle.digest(algorithm, data as unknown as BufferSource);
  return new Uint8Array(hashBuffer);
}

/**
 * Compares two byte arrays for exact equality
 */
function areBytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Verifies all digital signatures within a PDF document cryptographically
 */
export async function verifyPdfDigitalSignatures(
  pdfBuffer: ArrayBuffer | Uint8Array | ArrayBufferView
): Promise<PdfSignatureVerificationReport> {
  const fileBytes = toUint8Array(pdfBuffer);
  const sigDicts = extractPdfSignatureDictionaries(fileBytes);

  const limitationsNotice =
    'Cryptographic integrity verifies mathematical consistency over signed byte ranges. Statutory legal validity and official AICTE acceptance require human officer review and trusted CA chain anchoring.';

  if (sigDicts.length === 0) {
    return {
      overallStatus: 'no_signature_detected',
      signaturesCount: 0,
      signatures: [],
      hasCryptographicSignatures: false,
      hasFailedSignatures: false,
      hasModifiedSignatures: false,
      untrustedCertificatesCount: 0,
      evaluatedAt: new Date().toISOString(),
      limitationsNotice,
    };
  }

  const signatures: SingleSignatureVerificationResult[] = [];
  let hasFailedSignatures = false;
  let hasModifiedSignatures = false;
  let untrustedCertificatesCount = 0;

  for (let i = 0; i < sigDicts.length; i++) {
    const sig = sigDicts[i];
    const [o1, l1, o2, l2] = sig.byteRange;

    // 1. Validate byte range geometry
    const isByteRangeValid =
      Number.isFinite(o1) &&
      o1 === 0 &&
      Number.isFinite(l1) &&
      l1 > 0 &&
      Number.isFinite(o2) &&
      o2 > l1 &&
      Number.isFinite(l2) &&
      l2 > 0 &&
      o2 + l2 <= fileBytes.length;

    if (!isByteRangeValid) {
      signatures.push({
        signatureIndex: i + 1,
        subFilter: sig.subFilter,
        byteRange: sig.byteRange,
        isByteRangeValid: false,
        documentModifiedAfterSigning: false,
        appendedBytesLength: 0,
        mathematicalIntegrityVerified: false,
        messageDigestVerified: false,
        cryptoSignatureVerified: false,
        status: 'signature_field_detected_unverified',
        trustDecision: 'unverifiable',
        hasRfc3161Timestamp: false,
        isTimestampTokenVerified: false,
        technicalDetails: `Invalid /ByteRange coordinates [${sig.byteRange.join(', ')}]. Coordinates must be valid non-negative offsets within physical file length ${fileBytes.length} bytes.`,
      });
      continue;
    }

    // 2. Check for appended bytes or modifications after signing
    const signedRangeEnd = o2 + l2;
    const appendedBytesLength = fileBytes.length - signedRangeEnd;
    let documentModifiedAfterSigning = false;
    let isSubsequentSignatureRevision = false;

    if (appendedBytesLength > 0) {
      // Check if appended bytes belong to a subsequent valid signature revision
      isSubsequentSignatureRevision = sigDicts.slice(i + 1).some((nextSig) => {
        const [no1, nl1, no2, nl2] = nextSig.byteRange;
        return Number.isFinite(no1) && no1 === 0 && nl1 >= signedRangeEnd && no2 + nl2 <= fileBytes.length;
      });

      if (!isSubsequentSignatureRevision) {
        const trailingBytes = fileBytes.subarray(signedRangeEnd);
        const trailingText = new TextDecoder('latin1').decode(trailingBytes);
        if (trailingText.includes('%%EOF') || trailingText.includes('startxref') || trailingText.includes('/Type /Catalog')) {
          documentModifiedAfterSigning = true;
          hasModifiedSignatures = true;
        }
      }
    }

    // 3. Extract signed byte ranges
    const signedBytes = new Uint8Array(l1 + l2);
    signedBytes.set(fileBytes.subarray(o1, o1 + l1), 0);
    signedBytes.set(fileBytes.subarray(o2, o2 + l2), l1);

    // 4. Decode /Contents hex string
    if (!sig.contentsHex || sig.contentsHex.length < 32) {
      signatures.push({
        signatureIndex: i + 1,
        subFilter: sig.subFilter,
        byteRange: sig.byteRange,
        isByteRangeValid: true,
        documentModifiedAfterSigning,
        appendedBytesLength,
        mathematicalIntegrityVerified: false,
        messageDigestVerified: false,
        cryptoSignatureVerified: false,
        status: 'signature_field_detected_unverified',
        trustDecision: 'unverifiable',
        hasRfc3161Timestamp: false,
        isTimestampTokenVerified: false,
        technicalDetails: 'Signature dictionary has empty or truncated /Contents field.',
      });
      continue;
    }

    const derBytes = hexToBytes(sig.contentsHex);
    const parsedPkcs7 = parsePkcs7SignedData(derBytes);

    if (!parsedPkcs7) {
      signatures.push({
        signatureIndex: i + 1,
        subFilter: sig.subFilter,
        byteRange: sig.byteRange,
        isByteRangeValid: true,
        documentModifiedAfterSigning,
        appendedBytesLength,
        mathematicalIntegrityVerified: false,
        messageDigestVerified: false,
        cryptoSignatureVerified: false,
        status: 'signature_field_detected_unverified',
        trustDecision: 'unverifiable',
        hasRfc3161Timestamp: false,
        isTimestampTokenVerified: false,
        technicalDetails: 'PKCS#7 SignedData payload could not be parsed. Corrupt ASN.1 DER stream.',
      });
      continue;
    }

    // 5. Cryptographic verification of digest & signature
    let messageDigestVerified = false;
    let cryptoSignatureVerified = false;
    let technicalDetails = '';

    // Step A: Determine digest algorithm safely
    let digestAlgo: 'SHA-256' | 'SHA-384' | 'SHA-512' | 'SHA-1' | null = null;
    if (parsedPkcs7.digestAlgorithmOid === '2.16.840.1.101.3.4.2.1') digestAlgo = 'SHA-256';
    else if (parsedPkcs7.digestAlgorithmOid === '2.16.840.1.101.3.4.2.2') digestAlgo = 'SHA-384';
    else if (parsedPkcs7.digestAlgorithmOid === '2.16.840.1.101.3.4.2.3') digestAlgo = 'SHA-512';
    else if (parsedPkcs7.digestAlgorithmOid === '1.3.14.3.2.26') digestAlgo = 'SHA-1';

    if (!digestAlgo) {
      signatures.push({
        signatureIndex: i + 1,
        subFilter: sig.subFilter,
        byteRange: sig.byteRange,
        isByteRangeValid: true,
        documentModifiedAfterSigning: false,
        appendedBytesLength: 0,
        mathematicalIntegrityVerified: false,
        messageDigestVerified: false,
        cryptoSignatureVerified: false,
        status: 'verification_unavailable',
        trustDecision: 'unverifiable',
        hasRfc3161Timestamp: false,
        isTimestampTokenVerified: false,
        technicalDetails: `Unsupported digest algorithm (OID: ${parsedPkcs7.digestAlgorithmOid}).`,
      });
      continue;
    }

    // Step B: Determine signature algorithm
    const signerCert = parsedPkcs7.certificates[0];
    const sigAlgOid = parsedPkcs7.signerInfo.signatureAlgorithmOid;
    const certKeyOid = signerCert?.algorithmOid;

    const isRsa =
      sigAlgOid.startsWith('1.2.840.113549.1.1') ||
      certKeyOid === '1.2.840.113549.1.1.1';
    const isEcdsa =
      sigAlgOid === '1.2.840.10045.4.3.2' ||
      certKeyOid === '1.2.840.10045.2.1' ||
      certKeyOid === '1.2.840.10045.4.3.2';

    if (!isRsa && !isEcdsa) {
      signatures.push({
        signatureIndex: i + 1,
        subFilter: sig.subFilter,
        byteRange: sig.byteRange,
        isByteRangeValid: true,
        documentModifiedAfterSigning: false,
        appendedBytesLength: 0,
        mathematicalIntegrityVerified: false,
        messageDigestVerified: false,
        cryptoSignatureVerified: false,
        status: 'verification_unavailable',
        trustDecision: 'unverifiable',
        hasRfc3161Timestamp: false,
        isTimestampTokenVerified: false,
        technicalDetails: `Unsupported signature algorithm (OID: ${sigAlgOid}). Only RSA and ECDSA P-256 are currently supported.`,
      });
      continue;
    }

    try {
      const computedHash = await computeDigest(digestAlgo, signedBytes);

      if (parsedPkcs7.signerInfo.messageDigest) {
        messageDigestVerified = areBytesEqual(computedHash, parsedPkcs7.signerInfo.messageDigest);
      } else {
        messageDigestVerified = false;
      }

      if (signerCert && signerCert.subjectPublicKeyInfo) {
        const subtle =
          (typeof globalThis !== 'undefined' ? globalThis.crypto?.subtle : undefined) ||
          (typeof crypto !== 'undefined' ? crypto.subtle : undefined);

        if (subtle) {
          const bytesToVerify =
            parsedPkcs7.signerInfo.setOfSignedAttributes ||
            signedBytes;

          if (isRsa) {
            const importedKey = await subtle.importKey(
              'spki',
              signerCert.subjectPublicKeyInfo as unknown as BufferSource,
              { name: 'RSASSA-PKCS1-v1_5', hash: digestAlgo },
              true,
              ['verify']
            );

            cryptoSignatureVerified = await subtle.verify(
              'RSASSA-PKCS1-v1_5',
              importedKey,
              parsedPkcs7.signerInfo.signatureBytes as unknown as BufferSource,
              bytesToVerify as unknown as BufferSource
            );
          } else if (isEcdsa) {
            const importedKey = await subtle.importKey(
              'spki',
              signerCert.subjectPublicKeyInfo as unknown as BufferSource,
              { name: 'ECDSA', namedCurve: 'P-256' },
              true,
              ['verify']
            );

            const p1363Sig = derSignatureToP1363(parsedPkcs7.signerInfo.signatureBytes);
            if (p1363Sig) {
              cryptoSignatureVerified = await subtle.verify(
                { name: 'ECDSA', hash: digestAlgo },
                importedKey,
                p1363Sig as unknown as BufferSource,
                bytesToVerify as unknown as BufferSource
              );
            }
          }
        }
      }
    } catch (cryptoErr) {
      technicalDetails = `Cryptographic operation failed: ${cryptoErr}`;
    }

    const mathematicalIntegrityVerified = messageDigestVerified && cryptoSignatureVerified;

    // 6. Evaluate certificate trust via RFC 5280 Path Validation
    let trustDecision: SingleSignatureVerificationResult['trustDecision'] = 'untrusted_chain';
    let certificateTrustState: CertificateTrustState = 'UNTRUSTED';
    let chainValidationResult: CertificateChainValidationResult | undefined = undefined;

    if (signerCert) {
      chainValidationResult = await validateCertificateChain(
        signerCert,
        parsedPkcs7.certificates.slice(1)
      );
      certificateTrustState = chainValidationResult.trustStatus;

      if (!signerCert.validity.isCurrentlyValid || certificateTrustState === 'EXPIRED') {
        trustDecision = 'expired';
      } else if (
        chainValidationResult.diagnosticCode === 'SELF_SIGNED_UNTRUSTED' ||
        (signerCert.issuer.commonName === signerCert.subject.commonName &&
          (!signerCert.issuer.organization || signerCert.issuer.organization === signerCert.subject.organization))
      ) {
        trustDecision = 'self_signed';
      } else if (certificateTrustState === 'TRUSTED') {
        trustDecision = 'trusted';
      } else if (certificateTrustState === 'UNANCHORED') {
        trustDecision = 'unanchored_chain';
      } else if (certificateTrustState === 'UNSUPPORTED') {
        trustDecision = 'unverifiable';
      } else {
        trustDecision = 'untrusted_chain';
      }
    } else {
      trustDecision = 'unverifiable';
      certificateTrustState = 'UNSUPPORTED';
    }

    if ((trustDecision as string) !== 'trusted') {
      untrustedCertificatesCount++;
    }

    // 7. Determine overall status for this signature
    let sigStatus: SignatureOverallStatus = 'signature_integrity_verified';

    if (!mathematicalIntegrityVerified) {
      sigStatus = 'signature_integrity_failed';
      hasFailedSignatures = true;
      technicalDetails = !messageDigestVerified
        ? 'Byte range hash does not match signer messageDigest attribute (content modified after signing).'
        : 'Signer public key failed to verify signature over signed attributes.';
    } else if (documentModifiedAfterSigning) {
      sigStatus = 'document_modified_after_signing';
      technicalDetails = `Document has ${appendedBytesLength} bytes appended after the signed byte range containing incremental updates.`;
    } else if (trustDecision === 'expired') {
      sigStatus = 'certificate_untrusted_or_unverifiable';
      technicalDetails = `Signature integrity verified mathematically, but signer certificate expired on ${signerCert?.validity.notAfter.toISOString()}.`;
    } else if (trustDecision === 'self_signed') {
      sigStatus = 'certificate_untrusted_or_unverifiable';
      technicalDetails = `Signature integrity verified mathematically. Certificate is self-signed (${signerCert?.subject.commonName}) and not anchored to an authenticated root in the trust store.`;
    } else if (trustDecision === 'unanchored_chain') {
      sigStatus = 'certificate_untrusted_or_unverifiable';
      technicalDetails = `Signature integrity verified mathematically. Certificate claims issuer "${signerCert?.issuer.commonName || 'Unknown'}". Full cryptographic trust-anchor validation, chain building, and CRL/OCSP revocation checks are unverified in this offline client runtime.`;
    } else if (trustDecision === 'untrusted_chain') {
      sigStatus = 'certificate_untrusted_or_unverifiable';
      technicalDetails = `Signature integrity verified mathematically. Certificate issuer "${signerCert?.issuer.commonName || 'Unknown'}" failed chain validation (${chainValidationResult?.diagnosticMessage || 'unknown error'}).`;
    } else if (!parsedPkcs7.signerInfo.hasTimestampToken) {
      sigStatus = 'timestamp_not_verified';
      technicalDetails = 'Cryptographic signature is valid, but lacks an RFC 3161 TSA counter-signature timestamp.';
    } else {
      // RFC 3161 token present, but TSA cryptographic signature & TSA chain unverified
      sigStatus = 'timestamp_not_verified';
      technicalDetails = 'Cryptographic signature is valid. RFC 3161 TSA timestamp token is present, but full cryptographic TSA signature, message imprint, and TSA certificate chain anchoring are unverified in this offline client runtime.';
    }

    if (isSubsequentSignatureRevision) {
      technicalDetails += ` Note: Document was subsequently incrementally signed by revision #${i + 2}.`;
    }

    signatures.push({
      signatureIndex: i + 1,
      subFilter: sig.subFilter,
      byteRange: sig.byteRange,
      isByteRangeValid: true,
      documentModifiedAfterSigning,
      appendedBytesLength,
      mathematicalIntegrityVerified,
      messageDigestVerified,
      cryptoSignatureVerified,
      status: sigStatus,
      signerCertificate: signerCert
        ? {
            subjectName: signerCert.subject.commonName || signerCert.subject.rawText,
            organization: signerCert.subject.organization,
            issuerName: signerCert.issuer.commonName || signerCert.issuer.rawText,
            serialNumber: signerCert.serialNumber,
            validFrom: signerCert.validity.notBefore.toISOString(),
            validTo: signerCert.validity.notAfter.toISOString(),
            isCurrentlyValid: signerCert.validity.isCurrentlyValid,
          }
        : undefined,
      claimedSigningTime: sig.claimedSigningTime || parsedPkcs7.signerInfo.signingTime?.toISOString(),
      hasRfc3161Timestamp: parsedPkcs7.signerInfo.hasTimestampToken,
      isTimestampTokenVerified: false,
      trustDecision,
      certificateTrustState,
      chainValidationResult,
      technicalDetails,
    });

  }

  // Determine overall report status
  let overallStatus: SignatureOverallStatus = 'signature_integrity_verified';
  if (hasFailedSignatures) {
    overallStatus = 'signature_integrity_failed';
  } else if (hasModifiedSignatures) {
    overallStatus = 'document_modified_after_signing';
  } else if (signatures.some((s) => s.status === 'signature_field_detected_unverified')) {
    overallStatus = 'signature_field_detected_unverified';
  } else if (signatures.some((s) => s.status === 'verification_unavailable')) {
    overallStatus = 'verification_unavailable';
  } else if (signatures.some((s) => s.status === 'certificate_untrusted_or_unverifiable')) {
    overallStatus = 'certificate_untrusted_or_unverifiable';
  } else if (signatures.some((s) => s.status === 'timestamp_not_verified')) {
    overallStatus = 'timestamp_not_verified';
  }

  return {
    overallStatus,
    signaturesCount: signatures.length,
    signatures,
    hasCryptographicSignatures: signatures.some((s) => s.mathematicalIntegrityVerified),
    hasFailedSignatures,
    hasModifiedSignatures,
    untrustedCertificatesCount,
    evaluatedAt: new Date().toISOString(),
    limitationsNotice,
  };
}
