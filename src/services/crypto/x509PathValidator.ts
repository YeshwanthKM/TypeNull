/**
 * TypeNull X.509 Certificate Path Validation Service
 *
 * Implements RFC 5280 PKIX Path Validation for AICTE Extension of Approval (EoA)
 * digital document scrutiny.
 *
 * Strict Verification Standards:
 * 1. Issuer/Subject distinguished name chaining and cycle detection.
 * 2. Cryptographic signature verification of child TBSCertificate using parent SPKI public key.
 * 3. Validity period bounds checking (notBefore <= validationTime <= notAfter).
 * 4. Basic Constraints: isCA=true on all parent/intermediate certificates.
 * 5. Path length constraint enforcement (pathLenConstraint).
 * 6. Key Usage enforcement: keyCertSign for CAs, digitalSignature/nonRepudiation for leaf certs.
 * 7. Explicit trust-anchor resolution against authenticated Trust Store (fail-closed).
 * 8. Strict revocation boundaries: offline runtime produces REVOCATION_UNKNOWN with notice.
 */

import {
  ParsedX509Certificate,
  parseX509Certificate,
  computeSha256Sync,
} from './asn1Parser';
import {
  CertificateTrustState,
  CertificateDiagnosticCode,
  CertificateChainValidationResult,
  CertificatePathNode,
  TrustAnchor,
} from './certificateTrustTypes';
import { defaultTrustStore, TrustStoreManager } from './trustStore';
import { derSignatureToP1363 } from './pdfSignatureVerifier';

export interface PathValidationOptions {
  validationTime?: Date;
  trustStore?: TrustStoreManager;
  maxChainDepth?: number;
  expectedKeyUsage?: 'digitalSignature' | 'keyCertSign' | 'cRLSign';
  offlineRevocationTolerance?: boolean;
  environment?: 'production' | 'test' | 'staging';
  allowSha1?: boolean;
}

/**
 * Normalizes distinguished name strings for comparison
 */
export function normalizeDn(dnText: string): string {
  return dnText
    .toLowerCase()
    .replace(/\s*=\s*/g, '=')
    .replace(/\s*,\s*/g, ',')
    .trim();
}

/**
 * Determines whether child issuer matches candidate parent subject
 */
export function isIssuerMatch(child: ParsedX509Certificate, parent: ParsedX509Certificate): boolean {
  // 1. Normalized rawText comparison
  if (normalizeDn(child.issuer.rawText) === normalizeDn(parent.subject.rawText)) {
    return true;
  }

  // 2. Component-wise comparison
  const cnMatch =
    Boolean(child.issuer.commonName) &&
    Boolean(parent.subject.commonName) &&
    child.issuer.commonName?.trim().toLowerCase() === parent.subject.commonName?.trim().toLowerCase();

  const oMatch =
    !child.issuer.organization ||
    !parent.subject.organization ||
    child.issuer.organization.trim().toLowerCase() === parent.subject.organization.trim().toLowerCase();

  if (cnMatch && oMatch) {
    return true;
  }

  // 3. Authority Key Identifier to Subject Key Identifier matching
  if (
    child.extensions?.authorityKeyIdentifier &&
    parent.extensions?.subjectKeyIdentifier &&
    child.extensions.authorityKeyIdentifier.toLowerCase() === parent.extensions.subjectKeyIdentifier.toLowerCase()
  ) {
    return true;
  }

  return false;
}

/**
 * Cryptographically verifies parent signature over child tbsCertificate using WebCrypto
 */
export async function verifyCertificateSignature(
  parentSpki: Uint8Array,
  childTbs: Uint8Array,
  sigAlgOid: string,
  signatureBytes: Uint8Array,
  allowSha1: boolean = false
): Promise<{ verified: boolean; errorReason?: CertificateDiagnosticCode }> {
  try {
    const subtle =
      (typeof globalThis !== 'undefined' ? globalThis.crypto?.subtle : undefined) ||
      (typeof crypto !== 'undefined' ? crypto.subtle : undefined);

    if (!subtle) {
      return { verified: false, errorReason: 'ALGORITHM_UNSUPPORTED' };
    }

    // Determine algorithm and hash
    let hashAlgo: 'SHA-256' | 'SHA-384' | 'SHA-512' | 'SHA-1' = 'SHA-256';
    let isRsa = false;
    let isEcdsa = false;

    if (sigAlgOid === '1.2.840.113549.1.1.11') {
      isRsa = true;
      hashAlgo = 'SHA-256';
    } else if (sigAlgOid === '1.2.840.113549.1.1.12') {
      isRsa = true;
      hashAlgo = 'SHA-384';
    } else if (sigAlgOid === '1.2.840.113549.1.1.13') {
      isRsa = true;
      hashAlgo = 'SHA-512';
    } else if (sigAlgOid === '1.2.840.113549.1.1.5') {
      if (!allowSha1) {
        return { verified: false, errorReason: 'WEAK_HASH_ALGORITHM' };
      }
      isRsa = true;
      hashAlgo = 'SHA-1';
    } else if (sigAlgOid.startsWith('1.2.840.113549.1.1')) {
      isRsa = true;
      hashAlgo = 'SHA-256';
    } else if (sigAlgOid === '1.2.840.10045.4.3.2') {
      isEcdsa = true;
      hashAlgo = 'SHA-256';
    } else {
      return { verified: false, errorReason: 'ALGORITHM_UNSUPPORTED' };
    }

    if (isRsa) {
      const importedKey = await subtle.importKey(
        'spki',
        parentSpki as unknown as BufferSource,
        { name: 'RSASSA-PKCS1-v1_5', hash: hashAlgo },
        true,
        ['verify']
      );

      const isValid = await subtle.verify(
        'RSASSA-PKCS1-v1_5',
        importedKey,
        signatureBytes as unknown as BufferSource,
        childTbs as unknown as BufferSource
      );

      return { verified: isValid, errorReason: isValid ? undefined : 'ISSUER_SIGNATURE_INVALID' };
    }

    if (isEcdsa) {
      const importedKey = await subtle.importKey(
        'spki',
        parentSpki as unknown as BufferSource,
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['verify']
      );

      const p1363 = derSignatureToP1363(signatureBytes);
      if (!p1363) {
        return { verified: false, errorReason: 'ISSUER_SIGNATURE_INVALID' };
      }

      const isValid = await subtle.verify(
        { name: 'ECDSA', hash: hashAlgo },
        importedKey,
        p1363 as unknown as BufferSource,
        childTbs as unknown as BufferSource
      );

      return { verified: isValid, errorReason: isValid ? undefined : 'ISSUER_SIGNATURE_INVALID' };
    }

    return { verified: false, errorReason: 'ALGORITHM_UNSUPPORTED' };
  } catch {
    return { verified: false, errorReason: 'ISSUER_SIGNATURE_INVALID' };
  }
}

/**
 * Validates an X.509 certificate chain from leaf certificate to an authenticated root trust anchor
 */
export async function validateCertificateChain(
  leafCert: ParsedX509Certificate | Uint8Array,
  additionalCertificates: Array<ParsedX509Certificate | Uint8Array> = [],
  options: PathValidationOptions = {}
): Promise<CertificateChainValidationResult> {
  const validationTime = options.validationTime || new Date();
  const store = options.trustStore || defaultTrustStore;
  const maxDepth = options.maxChainDepth || 8;
  const expectedUsage = options.expectedKeyUsage || 'digitalSignature';
  const effectiveEnvironment = options.environment || store.getEnvironment();
  const allowSha1 = Boolean(options.allowSha1);

  // 1. Parse leaf certificate if provided as raw bytes
  const leaf: ParsedX509Certificate | null =
    leafCert instanceof Uint8Array ? parseX509Certificate(leafCert) : leafCert;

  if (!leaf) {
    return createFailureResult(
      'UNSUPPORTED',
      'MALFORMED_CERTIFICATE',
      'Leaf certificate is malformed or could not be decoded as valid ASN.1 DER.',
      0,
      validationTime,
      [],
      ['Provided certificate stream contains invalid ASN.1 structures.']
    );
  }

  // 2. Parse candidate intermediate certificates
  const pool: ParsedX509Certificate[] = [];
  for (const certItem of additionalCertificates) {
    const parsed = certItem instanceof Uint8Array ? parseX509Certificate(certItem) : certItem;
    if (parsed) pool.push(parsed);
  }

  // 3. Construct candidate chain from leaf upwards
  const path: ParsedX509Certificate[] = [leaf];
  const visitedFingerprints = new Set<string>();
  const leafFp = leaf.sha256Fingerprint || computeSha256Sync(leaf.rawDer);
  visitedFingerprints.add(leafFp);

  let current = leaf;
  let reachedTrustAnchor: TrustAnchor | undefined = undefined;

  // Check if trust store is completely empty
  if (!store.hasAnchors()) {
    // Fail-closed immediately
    const leafNode: CertificatePathNode = buildPathNode(leaf, 0, false);
    return {
      trustStatus: 'UNANCHORED',
      diagnosticCode: 'EMPTY_TRUST_STORE',
      diagnosticMessage: 'Trust store is empty. No trusted root anchors are installed to authenticate chains.',
      chainLength: 1,
      isPathValid: false,
      validationTime: validationTime.toISOString(),
      leafCertificate: extractLeafSummary(leaf, leafFp),
      pathNodes: [leafNode],
      revocationStatus: 'REVOCATION_UNKNOWN',
      revocationNotice: 'Revocation evaluation unavailable: trust store uninitialized.',
      limitations: ['Empty trust store: all certificates fail-closed to UNANCHORED.'],
    };
  }

  // Check if leaf itself is registered as a trusted root anchor
  const leafAnchor = store.findByFingerprint(leafFp);
  if (leafAnchor && leafAnchor.sha256Fingerprint.toLowerCase() === leafFp.toLowerCase()) {
    reachedTrustAnchor = leafAnchor;
  }

  // Chain building loop
  while (!reachedTrustAnchor && path.length < maxDepth) {
    const isSelfSigned =
      normalizeDn(current.issuer.rawText) === normalizeDn(current.subject.rawText) ||
      (current.issuer.commonName && current.issuer.commonName === current.subject.commonName);

    if (isSelfSigned) {
      // Reached self-signed root certificate
      const currentFp = current.sha256Fingerprint || computeSha256Sync(current.rawDer);
      const rootAnchor = store.findByFingerprint(currentFp);

      if (rootAnchor && rootAnchor.sha256Fingerprint.toLowerCase() === currentFp.toLowerCase()) {
        reachedTrustAnchor = rootAnchor;
      }
      break;
    }

    // Search for parent in pool
    let parentFound: ParsedX509Certificate | undefined = undefined;
    for (const candidate of pool) {
      const candFp = candidate.sha256Fingerprint || computeSha256Sync(candidate.rawDer);
      if (visitedFingerprints.has(candFp)) continue;

      if (isIssuerMatch(current, candidate)) {
        parentFound = candidate;
        break;
      }
    }

    if (parentFound) {
      const parentFp = parentFound.sha256Fingerprint || computeSha256Sync(parentFound.rawDer);
      visitedFingerprints.add(parentFp);
      path.push(parentFound);
      current = parentFound;

      // Check if parentFound is a recognized trust anchor
      const anchorMatch = store.findByFingerprint(parentFp);
      if (anchorMatch && anchorMatch.sha256Fingerprint.toLowerCase() === parentFp.toLowerCase()) {
        reachedTrustAnchor = anchorMatch;
        break;
      }
    } else {
      // Direct trust anchor lookup for issuer - requires cryptographic verification
      const anchorCandidate = store.findBySubject(current.issuer.rawText);
      if (anchorCandidate) {
        if (anchorCandidate.trustLevel === 'unverified_root' || !anchorCandidate.isVerifiedProvenance) {
          reachedTrustAnchor = anchorCandidate;
          break;
        }
        if (
          anchorCandidate.subjectPublicKeyInfo &&
          current.rawTbsCertificate &&
          current.certSignatureValue
        ) {
          const verifyAnchorSig = await verifyCertificateSignature(
            anchorCandidate.subjectPublicKeyInfo,
            current.rawTbsCertificate,
            current.certSignatureAlgorithmOid || current.algorithmOid,
            current.certSignatureValue,
            allowSha1
          );
          if (verifyAnchorSig.verified) {
            reachedTrustAnchor = anchorCandidate;
          }
        }
        break;
      }
      break;
    }
  }

  // Build path nodes for audit reporting
  const pathNodes: CertificatePathNode[] = path.map((c, idx) => {
    const fp = c.sha256Fingerprint || computeSha256Sync(c.rawDer);
    const isAnchor = Boolean(reachedTrustAnchor && reachedTrustAnchor.sha256Fingerprint === fp);
    return buildPathNode(c, idx, isAnchor, isAnchor ? reachedTrustAnchor?.id : undefined);
  });

  // 4. Verify RFC 5280 path constraints step-by-step
  // Step A0: Critical Extensions and Algorithm Identifier Consistency check
  for (let i = 0; i < path.length; i++) {
    const cert = path[i];

    // RFC 5280 Section 4.2: reject certificate with unrecognized critical extensions
    if (cert.extensions?.unsupportedCriticalExtensions && cert.extensions.unsupportedCriticalExtensions.length > 0) {
      return {
        trustStatus: 'UNTRUSTED',
        diagnosticCode: 'UNSUPPORTED_CRITICAL_EXTENSION',
        diagnosticMessage: `Certificate at depth ${i} (${cert.subject.commonName || cert.subject.rawText}) contains unsupported critical extension(s): ${cert.extensions.unsupportedCriticalExtensions.join(', ')}. RFC 5280 Section 4.2 mandates rejection.`,
        chainLength: path.length,
        isPathValid: false,
        validationTime: validationTime.toISOString(),
        leafCertificate: extractLeafSummary(leaf, leafFp),
        pathNodes,
        revocationStatus: 'REVOCATION_UNKNOWN',
        revocationNotice: 'Unsupported critical extension rejected per RFC 5280.',
        limitations: ['Certificate contains critical extensions not supported by the validation engine.'],
      };
    }

    // RFC 5280 Section 4.1.1.2: outer signatureAlgorithm MUST equal inner TBSCertificate signature algorithm
    if (
      cert.isAlgorithmIdentifierConsistent === false ||
      (cert.certSignatureAlgorithmOid && cert.algorithmOid && cert.certSignatureAlgorithmOid !== cert.algorithmOid)
    ) {
      return {
        trustStatus: 'UNTRUSTED',
        diagnosticCode: 'ALGORITHM_MISMATCH',
        diagnosticMessage: `Certificate at depth ${i} (${cert.subject.commonName || cert.subject.rawText}) has inconsistent signature algorithm identifiers (outer: ${cert.certSignatureAlgorithmOid}, inner: ${cert.algorithmOid}). RFC 5280 Section 4.1.1.2 mandates rejection.`,
        chainLength: path.length,
        isPathValid: false,
        validationTime: validationTime.toISOString(),
        leafCertificate: extractLeafSummary(leaf, leafFp),
        pathNodes,
        revocationStatus: 'REVOCATION_UNKNOWN',
        revocationNotice: 'Signature algorithm identifier mismatch per RFC 5280.',
        limitations: ['Outer Certificate and inner TBSCertificate algorithm identifiers do not match.'],
      };
    }
  }

  // Step A: Validity period checking for all certs in path
  for (let i = 0; i < path.length; i++) {
    const cert = path[i];
    if (validationTime > cert.validity.notAfter) {
      return {
        trustStatus: 'EXPIRED',
        diagnosticCode: 'CERT_EXPIRED',
        diagnosticMessage: `Certificate at depth ${i} (${cert.subject.commonName || cert.subject.rawText}) expired on ${cert.validity.notAfter.toISOString()}.`,
        chainLength: path.length,
        isPathValid: false,
        validationTime: validationTime.toISOString(),
        leafCertificate: extractLeafSummary(leaf, leafFp),
        pathNodes,
        revocationStatus: 'REVOCATION_UNKNOWN',
        revocationNotice: 'Certificate validity expired prior to evaluation time.',
        limitations: ['Certificate is outside its cryptographically stamped validity period.'],
      };
    }

    if (validationTime < cert.validity.notBefore) {
      return {
        trustStatus: 'UNTRUSTED',
        diagnosticCode: 'CERT_NOT_YET_VALID',
        diagnosticMessage: `Certificate at depth ${i} (${cert.subject.commonName || cert.subject.rawText}) is not yet valid (valid from ${cert.validity.notBefore.toISOString()}).`,
        chainLength: path.length,
        isPathValid: false,
        validationTime: validationTime.toISOString(),
        leafCertificate: extractLeafSummary(leaf, leafFp),
        pathNodes,
        revocationStatus: 'REVOCATION_UNKNOWN',
        revocationNotice: 'Certificate is not yet active at evaluation time.',
        limitations: ['Certificate evaluation occurred before notBefore timestamp.'],
      };
    }
  }

  // Step B: Leaf Key Usage check
  if (leaf.extensions?.keyUsage) {
    const ku = leaf.extensions.keyUsage;
    const isLeafCA = Boolean(leaf.extensions?.basicConstraints?.isCA);

    if (!isLeafCA && expectedUsage === 'digitalSignature' && !ku.digitalSignature && !ku.nonRepudiation) {
      return {
        trustStatus: 'UNTRUSTED',
        diagnosticCode: 'KEY_USAGE_MISMATCH',
        diagnosticMessage: `Leaf certificate lacks digitalSignature or nonRepudiation KeyUsage bits required for PDF signing (keyUsage bits: 0x${ku.rawBits.toString(16)}).`,
        chainLength: path.length,
        isPathValid: false,
        validationTime: validationTime.toISOString(),
        leafCertificate: extractLeafSummary(leaf, leafFp),
        pathNodes,
        revocationStatus: 'REVOCATION_UNKNOWN',
        revocationNotice: 'Key usage constraint violation.',
        limitations: ['Leaf certificate key usage extension forbids digital document signing.'],
      };
    }
  }

  // Step C: Validate CA status, PathLen, and KeyUsage on intermediates
  // In path: index 0 is leaf, indices 1 to n-1 are intermediates, index n-1 is root (if complete)
  for (let i = 1; i < path.length; i++) {
    const caCert = path[i];

    // Basic Constraints: MUST be CA
    const bc = caCert.extensions?.basicConstraints;
    if (!bc || !bc.isCA) {
      return {
        trustStatus: 'UNTRUSTED',
        diagnosticCode: 'NOT_A_CA',
        diagnosticMessage: `Certificate at depth ${i} (${caCert.subject.commonName || caCert.subject.rawText}) issued a certificate but is not authorized as a CA (cA: false or missing BasicConstraints).`,
        chainLength: path.length,
        isPathValid: false,
        validationTime: validationTime.toISOString(),
        leafCertificate: extractLeafSummary(leaf, leafFp),
        pathNodes,
        revocationStatus: 'REVOCATION_UNKNOWN',
        revocationNotice: 'CA hierarchy rule violation.',
        limitations: ['Intermediate or issuing authority lacks required CA:true basic constraint.'],
      };
    }

    // PathLenConstraint
    if (bc.pathLenConstraint !== undefined) {
      // Count non-self-issued intermediate certificates below this CA
      // The certs below it are at indices 1 to i-1
      const intermediatesBelow = i - 1;
      if (intermediatesBelow > bc.pathLenConstraint) {
        return {
          trustStatus: 'UNTRUSTED',
          diagnosticCode: 'PATH_LEN_EXCEEDED',
          diagnosticMessage: `Path length constraint exceeded at depth ${i}. Max allowed downstream intermediate CAs: ${bc.pathLenConstraint}, found: ${intermediatesBelow}.`,
          chainLength: path.length,
          isPathValid: false,
          validationTime: validationTime.toISOString(),
          leafCertificate: extractLeafSummary(leaf, leafFp),
          pathNodes,
          revocationStatus: 'REVOCATION_UNKNOWN',
          revocationNotice: 'Path length constraint violation.',
          limitations: ['CA pathLenConstraint limit violated by certificate chain depth.'],
        };
      }
    }

    // Key Usage: Intermediate CA MUST have keyCertSign
    if (caCert.extensions?.keyUsage) {
      if (!caCert.extensions.keyUsage.keyCertSign) {
        return {
          trustStatus: 'UNTRUSTED',
          diagnosticCode: 'KEY_USAGE_MISMATCH',
          diagnosticMessage: `Issuing CA at depth ${i} lacks keyCertSign KeyUsage bit.`,
          chainLength: path.length,
          isPathValid: false,
          validationTime: validationTime.toISOString(),
          leafCertificate: extractLeafSummary(leaf, leafFp),
          pathNodes,
          revocationStatus: 'REVOCATION_UNKNOWN',
          revocationNotice: 'CA keyCertSign permission missing.',
          limitations: ['CA certificate not authorized to sign subordinate certificates.'],
        };
      }
    }
  }

  // Step D: Cryptographic parent-child signature verification
  for (let i = 0; i < path.length - 1; i++) {
    const child = path[i];
    const parent = path[i + 1];

    if (!child.rawTbsCertificate || !child.certSignatureValue) {
      return {
        trustStatus: 'UNSUPPORTED',
        diagnosticCode: 'MALFORMED_CERTIFICATE',
        diagnosticMessage: `Child certificate at depth ${i} is missing raw TBS bytes or signature value for cryptographic validation.`,
        chainLength: path.length,
        isPathValid: false,
        validationTime: validationTime.toISOString(),
        leafCertificate: extractLeafSummary(leaf, leafFp),
        pathNodes,
        revocationStatus: 'REVOCATION_UNKNOWN',
        revocationNotice: 'ASN.1 structure incomplete.',
        limitations: ['Missing TBSCertificate or signature value prevents cryptographic link verification.'],
      };
    }

    const sigResult = await verifyCertificateSignature(
      parent.subjectPublicKeyInfo,
      child.rawTbsCertificate,
      child.certSignatureAlgorithmOid || child.algorithmOid,
      child.certSignatureValue,
      allowSha1
    );

    if (!sigResult.verified) {
      const isUnsupported = sigResult.errorReason === 'ALGORITHM_UNSUPPORTED';
      const isWeakHash = sigResult.errorReason === 'WEAK_HASH_ALGORITHM';
      return {
        trustStatus: isUnsupported ? 'UNSUPPORTED' : 'UNTRUSTED',
        diagnosticCode: sigResult.errorReason || 'ISSUER_SIGNATURE_INVALID',
        diagnosticMessage: isUnsupported
          ? `Signature algorithm (OID: ${child.certSignatureAlgorithmOid || child.algorithmOid}) is not supported for cryptographic verification.`
          : isWeakHash
          ? `Signature uses weak hash algorithm SHA-1 (OID: ${child.certSignatureAlgorithmOid || child.algorithmOid}). Weak digest algorithms are rejected by default security policy.`
          : `Parent certificate at depth ${i + 1} (${parent.subject.commonName}) failed to cryptographically verify signature of child certificate at depth ${i} (${child.subject.commonName}). Possible tampering or issuer key mismatch.`,
        chainLength: path.length,
        isPathValid: false,
        validationTime: validationTime.toISOString(),
        leafCertificate: extractLeafSummary(leaf, leafFp),
        pathNodes,
        revocationStatus: 'REVOCATION_UNKNOWN',
        revocationNotice: isUnsupported
          ? 'Unsupported cryptographic algorithm.'
          : isWeakHash
          ? 'Weak cryptographic hash algorithm rejected by security policy.'
          : 'Cryptographic parent signature verification failed.',
        limitations: [
          isUnsupported
            ? 'Client runtime does not support the certificate signature algorithm.'
            : isWeakHash
            ? 'SHA-1 is deprecated and forbidden for digital certificate signatures under current PKI standards.'
            : 'Parent public key did not verify child certificate signature.',
        ],
      };
    }
  }

  // Step E: Trust Anchor Resolution
  if (!reachedTrustAnchor) {
    const topCert = path[path.length - 1];
    const isSelfSigned =
      normalizeDn(topCert.issuer.rawText) === normalizeDn(topCert.subject.rawText) ||
      (topCert.issuer.commonName && topCert.issuer.commonName === topCert.subject.commonName);

    if (isSelfSigned) {
      return {
        trustStatus: 'UNANCHORED',
        diagnosticCode: 'SELF_SIGNED_UNTRUSTED',
        diagnosticMessage: `Certificate chain terminates at self-signed root "${topCert.subject.commonName || topCert.subject.rawText}" which is NOT present in the authenticated trust store.`,
        chainLength: path.length,
        isPathValid: false,
        validationTime: validationTime.toISOString(),
        leafCertificate: extractLeafSummary(leaf, leafFp),
        pathNodes,
        revocationStatus: 'REVOCATION_UNKNOWN',
        revocationNotice: 'Self-signed root anchor not recognized by official trust store.',
        limitations: ['Self-signed root certificate is unanchored and untrusted.'],
      };
    }

    return {
      trustStatus: 'INCOMPLETE',
      diagnosticCode: 'CHAIN_INCOMPLETE',
      diagnosticMessage: `Certificate chain is incomplete. Issuer "${topCert.issuer.commonName || topCert.issuer.rawText}" is not found in certificate bundle and does not match any authenticated trust anchor.`,
      chainLength: path.length,
      isPathValid: false,
      validationTime: validationTime.toISOString(),
      leafCertificate: extractLeafSummary(leaf, leafFp),
      pathNodes,
      revocationStatus: 'REVOCATION_UNKNOWN',
      revocationNotice: 'Intermediate certificates missing from document payload.',
      limitations: ['Incomplete certificate chain cannot be evaluated up to a root authority.'],
    };
  }

  // Step F: Evaluate Trust Anchor Provenance and Environment Separation
  if (reachedTrustAnchor.trustLevel === 'unverified_root' || !reachedTrustAnchor.isVerifiedProvenance) {
    return {
      trustStatus: 'UNANCHORED',
      diagnosticCode: 'ROOT_UNVERIFIED_PROVENANCE',
      diagnosticMessage: `Certificate chain terminates at root anchor "${reachedTrustAnchor.authorityName}" whose provenance is unverified (placeholder fingerprint or unverified key). Anchoring rejected.`,
      chainLength: path.length,
      isPathValid: false,
      validationTime: validationTime.toISOString(),
      leafCertificate: extractLeafSummary(leaf, leafFp),
      pathNodes,
      revocationStatus: 'REVOCATION_UNKNOWN',
      revocationNotice: 'Trust anchor provenance is unverified.',
      limitations: ['Root certificate has unverified provenance and cannot serve as an authentic trust anchor.'],
    };
  }

  if (
    (reachedTrustAnchor.trustLevel === 'testing_anchor' || reachedTrustAnchor.trustLevel === 'institutional_baseline') &&
    effectiveEnvironment === 'production'
  ) {
    return {
      trustStatus: 'UNANCHORED',
      diagnosticCode: 'TEST_ANCHOR_IN_PRODUCTION',
      diagnosticMessage: `Certificate chain terminates at testing or baseline fixture anchor "${reachedTrustAnchor.authorityName}". Test anchors are forbidden in the production environment.`,
      chainLength: path.length,
      isPathValid: false,
      validationTime: validationTime.toISOString(),
      leafCertificate: extractLeafSummary(leaf, leafFp),
      pathNodes,
      revocationStatus: 'REVOCATION_UNKNOWN',
      revocationNotice: 'Test anchor prohibited in production environment.',
      limitations: ['Test-only trust anchor was presented in production environment.'],
    };
  }

  // 5. Successful validation to Trust Anchor
  return {
    trustStatus: 'TRUSTED',
    diagnosticCode: 'VALID_PATH_TO_TRUST_ANCHOR',
    diagnosticMessage: `Certificate path successfully validated cryptographically to trusted root anchor "${reachedTrustAnchor.authorityName}".`,
    chainLength: path.length,
    isPathValid: true,
    validationTime: validationTime.toISOString(),
    leafCertificate: extractLeafSummary(leaf, leafFp),
    pathNodes,
    trustAnchorUsed: {
      id: reachedTrustAnchor.id,
      authorityName: reachedTrustAnchor.authorityName,
      subjectName: reachedTrustAnchor.subjectName,
      sha256Fingerprint: reachedTrustAnchor.sha256Fingerprint,
      trustLevel: reachedTrustAnchor.trustLevel,
    },
    revocationStatus: 'REVOCATION_UNKNOWN',
    revocationNotice:
      'Revocation status unknown: live online OCSP/CRL checking is not available in offline client runtime. Mathematical chain integrity and trust anchor verified.',
    limitations: [
      'Client operates in offline mode without live network access to OCSP/CRL responders.',
      'Trust established through cryptographic path validation and authenticated trust anchor binding.',
    ],
  };
}

/**
 * Creates a structured failure result
 */
function createFailureResult(
  trustStatus: CertificateTrustState,
  diagnosticCode: CertificateDiagnosticCode,
  diagnosticMessage: string,
  chainLength: number,
  validationTime: Date,
  pathNodes: CertificatePathNode[],
  limitations: string[]
): CertificateChainValidationResult {
  return {
    trustStatus,
    diagnosticCode,
    diagnosticMessage,
    chainLength,
    isPathValid: false,
    validationTime: validationTime.toISOString(),
    leafCertificate: {
      subject: 'Unknown',
      issuer: 'Unknown',
      serialNumber: '',
      validFrom: '',
      validTo: '',
      isCurrentlyValid: false,
      sha256Fingerprint: '',
    },
    pathNodes,
    revocationStatus: 'REVOCATION_UNKNOWN',
    revocationNotice: 'Evaluation halted due to fatal certificate path or syntax defect.',
    limitations,
  };
}

/**
 * Builds a path node audit structure
 */
function buildPathNode(
  cert: ParsedX509Certificate,
  depth: number,
  isTrustAnchor: boolean,
  trustAnchorId?: string
): CertificatePathNode {
  const fp = cert.sha256Fingerprint || computeSha256Sync(cert.rawDer);
  return {
    depth,
    subject: cert.subject.commonName || cert.subject.rawText,
    issuer: cert.issuer.commonName || cert.issuer.rawText,
    serialNumber: cert.serialNumber,
    isCA: cert.extensions?.basicConstraints?.isCA || false,
    pathLenConstraint: cert.extensions?.basicConstraints?.pathLenConstraint,
    validFrom: cert.validity.notBefore.toISOString(),
    validTo: cert.validity.notAfter.toISOString(),
    isCurrentlyValid: cert.validity.isCurrentlyValid,
    sha256Fingerprint: fp,
    algorithmOid: cert.algorithmOid,
    keyUsageBits: cert.extensions?.keyUsage?.rawBits,
    isTrustAnchor,
    trustAnchorId,
  };
}

/**
 * Extracts leaf certificate summary
 */
function extractLeafSummary(leaf: ParsedX509Certificate, fp: string) {
  return {
    subject: leaf.subject.commonName || leaf.subject.rawText,
    issuer: leaf.issuer.commonName || leaf.issuer.rawText,
    serialNumber: leaf.serialNumber,
    validFrom: leaf.validity.notBefore.toISOString(),
    validTo: leaf.validity.notAfter.toISOString(),
    isCurrentlyValid: leaf.validity.isCurrentlyValid,
    sha256Fingerprint: fp,
  };
}
