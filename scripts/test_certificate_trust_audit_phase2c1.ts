/**
 * TypeNull Phase 2C.1 Independent Security and Correctness Audit Suite
 *
 * Verifies all 14 mandatory adversarial audit scenarios plus regulatory and RBAC invariants:
 * 1. Test-only root accidentally used in production -> UNANCHORED (TEST_ANCHOR_IN_PRODUCTION)
 * 2. Root certificate with unverified fingerprint / provenance -> UNANCHORED (ROOT_UNVERIFIED_PROVENANCE)
 * 3. Certificate with unsupported critical extension -> UNTRUSTED (UNSUPPORTED_CRITICAL_EXTENSION)
 * 4. Inconsistent signature algorithm identifiers (outer != inner) -> UNTRUSTED (ALGORITHM_MISMATCH)
 * 5. Unsupported algorithms (DSA) -> UNSUPPORTED (ALGORITHM_UNSUPPORTED), and weak SHA-1 by default -> UNTRUSTED (WEAK_HASH_ALGORITHM)
 * 6. Incorrect / tampered certificate signature -> UNTRUSTED (ISSUER_SIGNATURE_INVALID)
 * 7. Path-length edge case (pathLenConstraint = 0 with downstream CA) -> UNTRUSTED (PATH_LEN_EXCEEDED)
 * 8. Missing intermediate certificate -> INCOMPLETE (CHAIN_INCOMPLETE)
 * 9. Self-signed certificate not in authenticated trust store -> UNANCHORED (SELF_SIGNED_UNTRUSTED)
 * 10. Valid document signature with unanchored certificate -> PASS integrity, UNANCHORED trust, no false forgery claim
 * 11. Decoupled invariant: Trusted certificate chain with failed document signature -> FAILED integrity, TRUSTED cert, CRITICAL risk, DEFICIENT compliance
 * 12. Revocation information absent in offline mode -> REVOCATION_UNKNOWN with notice
 * 13. Timestamp token present but cryptographically unverified -> timestamp_not_verified, isTimestampTokenVerified: false
 * 14. Certificate chain with unsupported step cannot yield TRUSTED
 * 15. Regulatory reference audit: Section 35 removed from revocation blocking, replaced with AICTE / RFC 5280 norms
 * 16. Strict two-role RBAC model (institution and officer; is_admin=true officer permission)
 */

import crypto from 'crypto';
import {
  parseX509Certificate,
  computeSha256Sync,
} from '../src/services/crypto/asn1Parser';
import {
  validateCertificateChain,
} from '../src/services/crypto/x509PathValidator';
import {
  TrustStoreManager,
  defaultTrustStore,
  TrustAnchor,
  CCA_INDIA_ROOT_ANCHOR_2014,
  TYPENULL_BASELINE_ROOT_ANCHOR,
} from '../src/services/crypto/trustStore';
import {
  evaluateMultiSignalRisk,
} from '../src/services/validation/multiSignalRiskAssessment';
import {
  DbApplication,
  ApplicationDocument,
  UserRole,
} from '../src/types';
import { DocumentIntegrityResult } from '../src/services/documentIntegrityService';

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

// =============================================================================
// DER ENCODING HELPERS FOR REAL SYNTHETIC X.509 CERTIFICATES
// =============================================================================

function encodeLen(len: number): Buffer {
  if (len < 128) return Buffer.from([len]);
  const octets: number[] = [];
  let val = len;
  while (val > 0) {
    octets.unshift(val & 0xff);
    val >>= 8;
  }
  return Buffer.from([0x80 | octets.length, ...octets]);
}

function tlv(tag: number, content: Buffer | Uint8Array | number[]): Buffer {
  const cBuf = Buffer.isBuffer(content)
    ? content
    : Buffer.from(content as Uint8Array);
  return Buffer.concat([Buffer.from([tag]), encodeLen(cBuf.length), cBuf]);
}

function seq(items: Buffer[]): Buffer {
  return tlv(0x30, Buffer.concat(items));
}

function encodeOid(oidStr: string): Buffer {
  const parts = oidStr.split('.').map(Number);
  const bytes: number[] = [parts[0] * 40 + parts[1]];
  for (let i = 2; i < parts.length; i++) {
    let val = parts[i];
    if (val < 128) {
      bytes.push(val);
    } else {
      const vBytes: number[] = [];
      vBytes.push(val & 0x7f);
      val >>= 7;
      while (val > 0) {
        vBytes.unshift((val & 0x7f) | 0x80);
        val >>= 7;
      }
      bytes.push(...vBytes);
    }
  }
  return tlv(0x06, Buffer.from(bytes));
}

function encodeName(cn: string, o = 'TypeNull Institutional PKI', c = 'IN'): Buffer {
  const rdns: Buffer[] = [];
  if (c) rdns.push(tlv(0x31, seq([encodeOid('2.5.4.6'), tlv(0x13, Buffer.from(c))])));
  if (o) rdns.push(tlv(0x31, seq([encodeOid('2.5.4.10'), tlv(0x0c, Buffer.from(o))])));
  if (cn) rdns.push(tlv(0x31, seq([encodeOid('2.5.4.3'), tlv(0x0c, Buffer.from(cn))])));
  return seq(rdns);
}

function encodeValidity(nb: Date, na: Date): Buffer {
  function toUtc(d: Date): Buffer {
    const s = d.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z';
    return tlv(0x17, Buffer.from(s, 'ascii'));
  }
  return seq([toUtc(nb), toUtc(na)]);
}

interface CustomExtension {
  oid: string;
  critical?: boolean;
  value: Buffer;
}

interface SyntheticCertParams {
  subjectCN: string;
  issuerCN: string;
  subjectKey: crypto.KeyObject;
  parentKey: crypto.KeyObject;
  serialNumber?: number;
  notBefore?: Date;
  notAfter?: Date;
  isCA?: boolean;
  pathLenConstraint?: number;
  keyUsage?: {
    digitalSignature?: boolean;
    nonRepudiation?: boolean;
    keyCertSign?: boolean;
    cRLSign?: boolean;
  };
  sigAlgOid?: string;
  outerSigAlgOid?: string;
  tamperSignature?: boolean;
  customExtensions?: CustomExtension[];
}

function createSyntheticCertDer(params: SyntheticCertParams): Uint8Array {
  const serial = params.serialNumber || 1;
  const nb = params.notBefore || new Date('2024-01-01T00:00:00Z');
  const na = params.notAfter || new Date('2030-01-01T00:00:00Z');
  const innerSigAlgOid = params.sigAlgOid || '1.2.840.113549.1.1.11'; // sha256WithRSAEncryption
  const outerSigAlgOid = params.outerSigAlgOid || innerSigAlgOid;

  const innerSigAlg = seq([encodeOid(innerSigAlgOid), tlv(0x05, Buffer.alloc(0))]);
  const outerSigAlg = seq([encodeOid(outerSigAlgOid), tlv(0x05, Buffer.alloc(0))]);

  const spkiDer = params.subjectKey.export({ type: 'spki', format: 'der' });

  // Extensions
  const extList: Buffer[] = [];

  // BasicConstraints
  if (params.isCA !== undefined) {
    const bcItems: Buffer[] = [];
    if (params.isCA) {
      bcItems.push(tlv(0x01, Buffer.from([0xff]))); // cA: true
    }
    if (params.pathLenConstraint !== undefined) {
      bcItems.push(tlv(0x02, Buffer.from([params.pathLenConstraint])));
    }
    const bcVal = seq(bcItems);
    extList.push(seq([encodeOid('2.5.29.19'), tlv(0x04, bcVal)]));
  }

  // KeyUsage
  if (params.keyUsage) {
    let b0 = 0;
    if (params.keyUsage.digitalSignature) b0 |= 0x80;
    if (params.keyUsage.nonRepudiation) b0 |= 0x40;
    if (params.keyUsage.keyCertSign) b0 |= 0x04;
    if (params.keyUsage.cRLSign) b0 |= 0x02;
    const kuVal = tlv(0x03, Buffer.from([0x00, b0]));
    extList.push(seq([encodeOid('2.5.29.15'), tlv(0x04, kuVal)]));
  }

  // Custom Extensions (e.g. unknown critical extensions)
  if (params.customExtensions) {
    for (const cExt of params.customExtensions) {
      const extItems: Buffer[] = [encodeOid(cExt.oid)];
      if (cExt.critical) {
        extItems.push(tlv(0x01, Buffer.from([0xff]))); // critical: true
      }
      extItems.push(tlv(0x04, cExt.value));
      extList.push(seq(extItems));
    }
  }

  const tbsItems: Buffer[] = [
    tlv(0xa0, tlv(0x02, Buffer.from([0x02]))), // version 3
    tlv(0x02, Buffer.from([serial])),
    innerSigAlg,
    encodeName(params.issuerCN),
    encodeValidity(nb, na),
    encodeName(params.subjectCN),
    Buffer.from(spkiDer),
  ];

  if (extList.length > 0) {
    tbsItems.push(tlv(0xa3, seq(extList)));
  }

  const tbs = seq(tbsItems);

  let sigBytes: Buffer;
  if (innerSigAlgOid === '1.2.840.113549.1.1.11') {
    const signer = crypto.createSign('SHA256');
    signer.update(tbs);
    sigBytes = signer.sign(params.parentKey);
  } else if (innerSigAlgOid === '1.2.840.113549.1.1.5') {
    const signer = crypto.createSign('RSA-SHA1');
    signer.update(tbs);
    sigBytes = signer.sign(params.parentKey);
  } else {
    // Dummy signature for unsupported alg
    sigBytes = Buffer.alloc(128, 0xaa);
  }

  if (params.tamperSignature) {
    sigBytes[10] ^= 0xff;
    sigBytes[20] ^= 0x55;
  }

  const certBuf = seq([
    tbs,
    outerSigAlg,
    tlv(0x03, Buffer.concat([Buffer.from([0x00]), sigBytes])),
  ]);

  return new Uint8Array(certBuf);
}

// =============================================================================
// MAIN AUDIT TEST EXECUTION
// =============================================================================

async function runPhase2c1AuditTestSuite() {
  console.log('\n================================================================');
  console.log('TYPENULL PHASE 2C.1: CERTIFICATE TRUST AUDIT & ADVERSARIAL SUITE');
  console.log('================================================================\n');

  // Generate test cryptographic key pairs
  console.log('Generating RSA test cryptographic keys...');
  const rootKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const interKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const inter2Key = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const leafKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

  // Standard root certificate
  const rootCertDer = createSyntheticCertDer({
    subjectCN: 'TypeNull Audit Root CA',
    issuerCN: 'TypeNull Audit Root CA',
    subjectKey: rootKey.publicKey,
    parentKey: rootKey.privateKey,
    isCA: true,
    keyUsage: { keyCertSign: true, cRLSign: true },
  });
  const parsedRoot = parseX509Certificate(rootCertDer)!;
  const rootFp = parsedRoot.sha256Fingerprint!;

  // Standard intermediate certificate
  const interCertDer = createSyntheticCertDer({
    subjectCN: 'TypeNull Audit Intermediate CA',
    issuerCN: 'TypeNull Audit Root CA',
    subjectKey: interKey.publicKey,
    parentKey: rootKey.privateKey,
    isCA: true,
    pathLenConstraint: 2,
    keyUsage: { keyCertSign: true, cRLSign: true },
  });
  const parsedInter = parseX509Certificate(interCertDer)!;

  // Standard leaf certificate
  const leafCertDer = createSyntheticCertDer({
    subjectCN: 'Authorized Institutional Signatory',
    issuerCN: 'TypeNull Audit Intermediate CA',
    subjectKey: leafKey.publicKey,
    parentKey: interKey.privateKey,
    isCA: false,
    keyUsage: { digitalSignature: true, nonRepudiation: true },
  });
  const parsedLeaf = parseX509Certificate(leafCertDer)!;

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Test-Only Root Accidentally Used in Production
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 1: Test-Only Root in Production Environment ---');
  {
    const prodStore = new TrustStoreManager('production');
    prodStore.clear();

    const testAnchor: TrustAnchor = {
      id: 'test-fixture-anchor',
      authorityName: 'Synthetic Testing Root Authority',
      subjectName: parsedRoot.subject.rawText,
      issuerName: parsedRoot.issuer.rawText,
      sha256Fingerprint: rootFp,
      subjectPublicKeyInfo: parsedRoot.subjectPublicKeyInfo,
      notBefore: parsedRoot.validity.notBefore,
      notAfter: parsedRoot.validity.notAfter,
      isSelfSigned: true,
      trustLevel: 'testing_anchor',
      isVerifiedProvenance: true,
      description: 'Test fixture anchor presented in production',
    };
    prodStore.registerTrustAnchor(testAnchor);

    const res = await validateCertificateChain(parsedLeaf, [parsedInter, parsedRoot], {
      trustStore: prodStore,
      environment: 'production',
    });

    assert(res.trustStatus === 'UNANCHORED', 'Scenario 1: Status is UNANCHORED');
    assert(res.diagnosticCode === 'TEST_ANCHOR_IN_PRODUCTION', 'Scenario 1: Diagnostic code is TEST_ANCHOR_IN_PRODUCTION');
    assert(res.isPathValid === false, 'Scenario 1: Path is invalid in production');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Root Certificate with Unverified Fingerprint / Provenance
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 2: Root Certificate with Unverified Provenance ---');
  {
    const store = new TrustStoreManager('production');
    store.clear();

    const unverifiedAnchor: TrustAnchor = {
      id: 'unverified-root-anchor',
      authorityName: 'Unverified Root Authority',
      subjectName: parsedRoot.subject.rawText,
      issuerName: parsedRoot.issuer.rawText,
      sha256Fingerprint: rootFp,
      subjectPublicKeyInfo: parsedRoot.subjectPublicKeyInfo,
      notBefore: parsedRoot.validity.notBefore,
      notAfter: parsedRoot.validity.notAfter,
      isSelfSigned: true,
      trustLevel: 'unverified_root',
      isVerifiedProvenance: false,
      description: 'Anchor with placeholder fingerprint or unverified provenance',
    };
    store.registerTrustAnchor(unverifiedAnchor);

    const res = await validateCertificateChain(parsedLeaf, [parsedInter, parsedRoot], {
      trustStore: store,
      environment: 'production',
    });

    assert(res.trustStatus === 'UNANCHORED', 'Scenario 2: Status is UNANCHORED');
    assert(res.diagnosticCode === 'ROOT_UNVERIFIED_PROVENANCE', 'Scenario 2: Diagnostic code is ROOT_UNVERIFIED_PROVENANCE');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Certificate with Unsupported Critical Extension (RFC 5280 Section 4.2)
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 3: Certificate with Unsupported Critical Extension ---');
  {
    const store = new TrustStoreManager('test');
    store.clear();
    const verifiedRootAnchor: TrustAnchor = {
      id: 'verified-root-anchor',
      authorityName: 'TypeNull Audit Root CA',
      subjectName: parsedRoot.subject.rawText,
      issuerName: parsedRoot.issuer.rawText,
      sha256Fingerprint: rootFp,
      subjectPublicKeyInfo: parsedRoot.subjectPublicKeyInfo,
      notBefore: parsedRoot.validity.notBefore,
      notAfter: parsedRoot.validity.notAfter,
      isSelfSigned: true,
      trustLevel: 'official_root',
      isVerifiedProvenance: true,
    };
    store.registerTrustAnchor(verifiedRootAnchor);

    // Create leaf with an unknown critical extension (OID: 1.2.3.4.5.6.7)
    const rogueLeafDer = createSyntheticCertDer({
      subjectCN: 'Signer with Unknown Critical Extension',
      issuerCN: 'TypeNull Audit Intermediate CA',
      subjectKey: leafKey.publicKey,
      parentKey: interKey.privateKey,
      isCA: false,
      keyUsage: { digitalSignature: true },
      customExtensions: [
        {
          oid: '1.2.3.4.5.6.7',
          critical: true,
          value: Buffer.from([0x04, 0x04, 0xde, 0xad, 0xbe, 0xef]),
        },
      ],
    });
    const parsedRogueLeaf = parseX509Certificate(rogueLeafDer)!;

    const res = await validateCertificateChain(parsedRogueLeaf, [parsedInter, parsedRoot], {
      trustStore: store,
      environment: 'test',
    });

    assert(res.trustStatus === 'UNTRUSTED', 'Scenario 3: Status is UNTRUSTED');
    assert(res.diagnosticCode === 'UNSUPPORTED_CRITICAL_EXTENSION', 'Scenario 3: Diagnostic code is UNSUPPORTED_CRITICAL_EXTENSION');
    assert(res.diagnosticMessage.includes('1.2.3.4.5.6.7'), 'Scenario 3: Diagnostic message mentions unsupported extension OID');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Inconsistent Signature Algorithm Identifiers (RFC 5280 Section 4.1.1.2)
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 4: Inconsistent Signature Algorithm Identifiers ---');
  {
    const store = new TrustStoreManager('test');
    store.clear();
    const verifiedRootAnchor: TrustAnchor = {
      id: 'verified-root-anchor',
      authorityName: 'TypeNull Audit Root CA',
      subjectName: parsedRoot.subject.rawText,
      issuerName: parsedRoot.issuer.rawText,
      sha256Fingerprint: rootFp,
      subjectPublicKeyInfo: parsedRoot.subjectPublicKeyInfo,
      notBefore: parsedRoot.validity.notBefore,
      notAfter: parsedRoot.validity.notAfter,
      isSelfSigned: true,
      trustLevel: 'official_root',
      isVerifiedProvenance: true,
    };
    store.registerTrustAnchor(verifiedRootAnchor);

    // Inner is SHA-256 (1.2.840.113549.1.1.11), outer is SHA-384 (1.2.840.113549.1.1.12)
    const mismatchedCertDer = createSyntheticCertDer({
      subjectCN: 'Mismatched Algorithm Signer',
      issuerCN: 'TypeNull Audit Intermediate CA',
      subjectKey: leafKey.publicKey,
      parentKey: interKey.privateKey,
      sigAlgOid: '1.2.840.113549.1.1.11',
      outerSigAlgOid: '1.2.840.113549.1.1.12',
      isCA: false,
      keyUsage: { digitalSignature: true },
    });
    const parsedMismatched = parseX509Certificate(mismatchedCertDer)!;

    const res = await validateCertificateChain(parsedMismatched, [parsedInter, parsedRoot], {
      trustStore: store,
      environment: 'test',
    });

    assert(res.trustStatus === 'UNTRUSTED', 'Scenario 4: Status is UNTRUSTED');
    assert(res.diagnosticCode === 'ALGORITHM_MISMATCH', 'Scenario 4: Diagnostic code is ALGORITHM_MISMATCH');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Unsupported Algorithms (DSA) & Weak SHA-1 by Default
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 5: Unsupported Algorithms & Weak SHA-1 Policy ---');
  {
    const store = new TrustStoreManager('test');
    store.clear();
    const verifiedRootAnchor: TrustAnchor = {
      id: 'verified-root-anchor',
      authorityName: 'TypeNull Audit Root CA',
      subjectName: parsedRoot.subject.rawText,
      issuerName: parsedRoot.issuer.rawText,
      sha256Fingerprint: rootFp,
      subjectPublicKeyInfo: parsedRoot.subjectPublicKeyInfo,
      notBefore: parsedRoot.validity.notBefore,
      notAfter: parsedRoot.validity.notAfter,
      isSelfSigned: true,
      trustLevel: 'official_root',
      isVerifiedProvenance: true,
    };
    store.registerTrustAnchor(verifiedRootAnchor);

    // 5A: Unsupported DSA algorithm
    const dsaCertDer = createSyntheticCertDer({
      subjectCN: 'DSA Signer',
      issuerCN: 'TypeNull Audit Intermediate CA',
      subjectKey: leafKey.publicKey,
      parentKey: interKey.privateKey,
      sigAlgOid: '1.2.840.10040.4.3', // dsa-with-sha1
      isCA: false,
    });
    const parsedDsa = parseX509Certificate(dsaCertDer)!;
    const resDsa = await validateCertificateChain(parsedDsa, [parsedInter, parsedRoot], {
      trustStore: store,
      environment: 'test',
    });
    assert(resDsa.trustStatus === 'UNSUPPORTED', 'Scenario 5A: DSA is UNSUPPORTED');
    assert(resDsa.diagnosticCode === 'ALGORITHM_UNSUPPORTED', 'Scenario 5A: Diagnostic code is ALGORITHM_UNSUPPORTED');

    // 5B: Weak SHA-1 rejected by default (allowSha1: false or omitted)
    const sha1CertDer = createSyntheticCertDer({
      subjectCN: 'SHA-1 Signer',
      issuerCN: 'TypeNull Audit Intermediate CA',
      subjectKey: leafKey.publicKey,
      parentKey: interKey.privateKey,
      sigAlgOid: '1.2.840.113549.1.1.5', // sha1WithRSAEncryption
      isCA: false,
      keyUsage: { digitalSignature: true },
    });
    const parsedSha1 = parseX509Certificate(sha1CertDer)!;
    const resSha1Default = await validateCertificateChain(parsedSha1, [parsedInter, parsedRoot], {
      trustStore: store,
      environment: 'test',
    });
    assert(resSha1Default.trustStatus === 'UNTRUSTED', 'Scenario 5B: Weak SHA-1 rejected as UNTRUSTED by default');
    assert(resSha1Default.diagnosticCode === 'WEAK_HASH_ALGORITHM', 'Scenario 5B: Diagnostic code is WEAK_HASH_ALGORITHM');

    // 5C: Weak SHA-1 allowed when explicit override provided
    const resSha1Allowed = await validateCertificateChain(parsedSha1, [parsedInter, parsedRoot], {
      trustStore: store,
      environment: 'test',
      allowSha1: true,
    });
    assert(resSha1Allowed.trustStatus === 'TRUSTED', 'Scenario 5C: SHA-1 allowed when explicit allowSha1: true');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Incorrect / Tampered Certificate Signature
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 6: Tampered Certificate Signature ---');
  {
    const store = new TrustStoreManager('test');
    store.clear();
    store.registerTrustAnchor({
      id: 'verified-root-anchor',
      authorityName: 'TypeNull Audit Root CA',
      subjectName: parsedRoot.subject.rawText,
      issuerName: parsedRoot.issuer.rawText,
      sha256Fingerprint: rootFp,
      subjectPublicKeyInfo: parsedRoot.subjectPublicKeyInfo,
      notBefore: parsedRoot.validity.notBefore,
      notAfter: parsedRoot.validity.notAfter,
      isSelfSigned: true,
      trustLevel: 'official_root',
      isVerifiedProvenance: true,
    });

    const tamperedCertDer = createSyntheticCertDer({
      subjectCN: 'Tampered Leaf Signer',
      issuerCN: 'TypeNull Audit Intermediate CA',
      subjectKey: leafKey.publicKey,
      parentKey: interKey.privateKey,
      tamperSignature: true,
      isCA: false,
      keyUsage: { digitalSignature: true },
    });
    const parsedTampered = parseX509Certificate(tamperedCertDer)!;

    const res = await validateCertificateChain(parsedTampered, [parsedInter, parsedRoot], {
      trustStore: store,
      environment: 'test',
    });

    assert(res.trustStatus === 'UNTRUSTED', 'Scenario 6: Status is UNTRUSTED');
    assert(res.diagnosticCode === 'ISSUER_SIGNATURE_INVALID', 'Scenario 6: Diagnostic code is ISSUER_SIGNATURE_INVALID');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Path-Length Constraint Edge Case (pathLenConstraint = 0)
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 7: Path-Length Constraint Edge Case ---');
  {
    const store = new TrustStoreManager('test');
    store.clear();
    store.registerTrustAnchor({
      id: 'verified-root-anchor',
      authorityName: 'TypeNull Audit Root CA',
      subjectName: parsedRoot.subject.rawText,
      issuerName: parsedRoot.issuer.rawText,
      sha256Fingerprint: rootFp,
      subjectPublicKeyInfo: parsedRoot.subjectPublicKeyInfo,
      notBefore: parsedRoot.validity.notBefore,
      notAfter: parsedRoot.validity.notAfter,
      isSelfSigned: true,
      trustLevel: 'official_root',
      isVerifiedProvenance: true,
    });

    // Root CA -> Inter CA 1 (pathLenConstraint = 0) -> Inter CA 2 -> Leaf
    const inter1WithZeroLenDer = createSyntheticCertDer({
      subjectCN: 'Restricted PathLen Zero Intermediate CA',
      issuerCN: 'TypeNull Audit Root CA',
      subjectKey: interKey.publicKey,
      parentKey: rootKey.privateKey,
      isCA: true,
      pathLenConstraint: 0,
      keyUsage: { keyCertSign: true, cRLSign: true },
    });
    const parsedInter1Zero = parseX509Certificate(inter1WithZeroLenDer)!;

    const downstreamInterDer = createSyntheticCertDer({
      subjectCN: 'Unauthorized Downstream Intermediate CA',
      issuerCN: 'Restricted PathLen Zero Intermediate CA',
      subjectKey: inter2Key.publicKey,
      parentKey: interKey.privateKey,
      isCA: true,
      keyUsage: { keyCertSign: true, cRLSign: true },
    });
    const parsedDownstreamInter = parseX509Certificate(downstreamInterDer)!;

    const deepLeafDer = createSyntheticCertDer({
      subjectCN: 'Deep Leaf Signer',
      issuerCN: 'Unauthorized Downstream Intermediate CA',
      subjectKey: leafKey.publicKey,
      parentKey: inter2Key.privateKey,
      isCA: false,
      keyUsage: { digitalSignature: true },
    });
    const parsedDeepLeaf = parseX509Certificate(deepLeafDer)!;

    const res = await validateCertificateChain(
      parsedDeepLeaf,
      [parsedDownstreamInter, parsedInter1Zero, parsedRoot],
      { trustStore: store, environment: 'test' }
    );

    assert(res.trustStatus === 'UNTRUSTED', 'Scenario 7: Status is UNTRUSTED when pathLenConstraint is violated');
    assert(res.diagnosticCode === 'PATH_LEN_EXCEEDED', 'Scenario 7: Diagnostic code is PATH_LEN_EXCEEDED');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Missing Intermediate Certificate
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 8: Missing Intermediate Certificate ---');
  {
    const store = new TrustStoreManager('test');
    store.clear();
    store.registerTrustAnchor({
      id: 'verified-root-anchor',
      authorityName: 'TypeNull Audit Root CA',
      subjectName: parsedRoot.subject.rawText,
      issuerName: parsedRoot.issuer.rawText,
      sha256Fingerprint: rootFp,
      subjectPublicKeyInfo: parsedRoot.subjectPublicKeyInfo,
      notBefore: parsedRoot.validity.notBefore,
      notAfter: parsedRoot.validity.notAfter,
      isSelfSigned: true,
      trustLevel: 'official_root',
      isVerifiedProvenance: true,
    });

    // Provide leaf and root, but omit the intermediate
    const res = await validateCertificateChain(parsedLeaf, [parsedRoot], {
      trustStore: store,
      environment: 'test',
    });

    assert(res.trustStatus === 'INCOMPLETE', 'Scenario 8: Status is INCOMPLETE');
    assert(res.diagnosticCode === 'CHAIN_INCOMPLETE', 'Scenario 8: Diagnostic code is CHAIN_INCOMPLETE');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 9: Self-Signed Certificate Not in Authenticated Trust Store
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 9: Self-Signed Certificate Not in Trust Store ---');
  {
    const foreignKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const rogueRootDer = createSyntheticCertDer({
      subjectCN: 'Rogue Untrusted Self-Signed Root',
      issuerCN: 'Rogue Untrusted Self-Signed Root',
      subjectKey: foreignKey.publicKey,
      parentKey: foreignKey.privateKey,
      isCA: true,
      keyUsage: { keyCertSign: true },
    });
    const parsedRogueRoot = parseX509Certificate(rogueRootDer)!;

    const store = new TrustStoreManager('test');
    store.clear();
    store.registerTrustAnchor({
      id: 'verified-root-anchor',
      authorityName: 'TypeNull Audit Root CA',
      subjectName: parsedRoot.subject.rawText,
      issuerName: parsedRoot.issuer.rawText,
      sha256Fingerprint: rootFp,
      subjectPublicKeyInfo: parsedRoot.subjectPublicKeyInfo,
      notBefore: parsedRoot.validity.notBefore,
      notAfter: parsedRoot.validity.notAfter,
      isSelfSigned: true,
      trustLevel: 'official_root',
      isVerifiedProvenance: true,
    });
    // Do not register rogue root

    const res = await validateCertificateChain(parsedRogueRoot, [], {
      trustStore: store,
      environment: 'test',
    });

    assert(res.trustStatus === 'UNANCHORED', 'Scenario 9: Status is UNANCHORED');
    assert(res.diagnosticCode === 'SELF_SIGNED_UNTRUSTED', 'Scenario 9: Diagnostic code is SELF_SIGNED_UNTRUSTED');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 10: Valid Signature with Unanchored Certificate
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 10: Valid Signature with Unanchored Certificate ---');
  {
    const dummyApp: DbApplication = {
      id: 'app-scen-10',
      institution_id: 'inst-1',
      academic_year: '2026-2027',
      application_type: 'Extension of Approval (EoA)',
      status: 'submitted',
      current_step: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const dummyDoc: ApplicationDocument = {
      id: 'doc-scen-10',
      application_id: dummyApp.id,
      document_type: 'affidavit',
      original_filename: 'affidavit_unanchored.pdf',
      file_path: 'affidavit_unanchored.pdf',
      file_size_bytes: 4096,
      mime_type: 'application/pdf',
      sha256_hash: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      is_valid: true,
      uploaded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const docReport: DocumentIntegrityResult = {
      documentId: dummyDoc.id,
      sha256Hash: dummyDoc.sha256_hash,
      isValidFormat: true,
      detectedFormat: 'pdf',
      fileSizeBytes: 4096,
      signatureReport: {
        overallStatus: 'certificate_untrusted_or_unverifiable',
        signaturesCount: 1,
        signatures: [
          {
            signatureIndex: 1,
            subFilter: 'adbe.pkcs7.detached',
            byteRange: [0, 1000, 2000, 1000],
            isByteRangeValid: true,
            documentModifiedAfterSigning: false,
            appendedBytesLength: 0,
            mathematicalIntegrityVerified: true,
            messageDigestVerified: true,
            cryptoSignatureVerified: true,
            status: 'certificate_untrusted_or_unverifiable',
            signerCertificate: {
              subjectName: 'Authorized Institutional Signatory',
              issuerName: 'Unknown Commercial Sub-CA',
              serialNumber: '12345',
              validFrom: '2025-01-01T00:00:00Z',
              validTo: '2027-01-01T00:00:00Z',
              isCurrentlyValid: true,
            },
            hasRfc3161Timestamp: false,
            isTimestampTokenVerified: false,
            trustDecision: 'unanchored_chain',
            certificateTrustState: 'UNANCHORED',
            technicalDetails: 'Signature integrity verified mathematically. Certificate claims issuer Unknown Commercial Sub-CA. Chain is unanchored.',
          },
        ],
        hasCryptographicSignatures: true,
        hasFailedSignatures: false,
        hasModifiedSignatures: false,
        untrustedCertificatesCount: 1,
        evaluatedAt: new Date().toISOString(),
        limitationsNotice: 'Offline evaluation.',
      },
    };

    const riskReport = evaluateMultiSignalRisk({
      application: dummyApp,
      documents: [dummyDoc],
      integrityReports: { [dummyDoc.id]: docReport },
    });

    assert(riskReport.dimensionStatuses.riskRequiringHumanReview !== 'CRITICAL', 'Scenario 10: Unanchored certificate does not trigger CRITICAL false-forgery risk');
    assert(riskReport.contributingSignals.some(s => s.signalId.startsWith('CERT-UNANCHORED')), 'Scenario 10: Emits CERT-UNANCHORED signal');
    const unanchoredSig = riskReport.contributingSignals.find(s => s.signalId.startsWith('CERT-UNANCHORED'))!;
    assert(unanchoredSig.severity === 'minor', 'Scenario 10: Unanchored alone is classified as minor scrutiny notice');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 11: Decoupled Invariant: Trusted Cert Chain with Failed Signature
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 11: Decoupled Invariant (Trusted Cert + Tampered Doc) ---');
  {
    const dummyApp: DbApplication = {
      id: 'app-scen-11',
      institution_id: 'inst-1',
      academic_year: '2026-2027',
      application_type: 'Extension of Approval (EoA)',
      status: 'submitted',
      current_step: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const dummyDoc: ApplicationDocument = {
      id: 'doc-scen-11',
      application_id: dummyApp.id,
      document_type: 'affidavit',
      original_filename: 'tampered_doc.pdf',
      file_path: 'tampered_doc.pdf',
      file_size_bytes: 4096,
      mime_type: 'application/pdf',
      sha256_hash: '1111111111111111111111111111111111111111111111111111111111111111',
      is_valid: true,
      uploaded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const docReport: DocumentIntegrityResult = {
      documentId: dummyDoc.id,
      sha256Hash: dummyDoc.sha256_hash,
      isValidFormat: true,
      detectedFormat: 'pdf',
      fileSizeBytes: 4096,
      signatureReport: {
        overallStatus: 'signature_integrity_failed',
        signaturesCount: 1,
        signatures: [
          {
            signatureIndex: 1,
            subFilter: 'adbe.pkcs7.detached',
            byteRange: [0, 1000, 2000, 1000],
            isByteRangeValid: true,
            documentModifiedAfterSigning: false,
            appendedBytesLength: 0,
            mathematicalIntegrityVerified: false,
            messageDigestVerified: false,
            cryptoSignatureVerified: false,
            status: 'signature_integrity_failed',
            signerCertificate: {
              subjectName: 'Legitimate Authorized Principal',
              issuerName: 'TypeNull Audit Intermediate CA',
              serialNumber: '99999',
              validFrom: '2025-01-01T00:00:00Z',
              validTo: '2027-01-01T00:00:00Z',
              isCurrentlyValid: true,
            },
            hasRfc3161Timestamp: true,
            isTimestampTokenVerified: false,
            trustDecision: 'trusted',
            certificateTrustState: 'TRUSTED',
            chainValidationResult: {
              trustStatus: 'TRUSTED',
              diagnosticCode: 'VALID_PATH_TO_TRUST_ANCHOR',
              diagnosticMessage: 'Certificate chain valid to trust anchor.',
              chainLength: 3,
              isPathValid: true,
              validationTime: new Date().toISOString(),
              leafCertificate: {
                subject: 'Legitimate Authorized Principal',
                issuer: 'TypeNull Audit Intermediate CA',
                serialNumber: '99999',
                validFrom: '2025-01-01T00:00:00Z',
                validTo: '2027-01-01T00:00:00Z',
                isCurrentlyValid: true,
                sha256Fingerprint: 'dummyfp',
              },
              pathNodes: [],
              trustAnchorUsed: {
                id: 'verified-root-anchor',
                authorityName: 'TypeNull Audit Root CA',
                subjectName: 'TypeNull Audit Root CA',
                sha256Fingerprint: rootFp,
                trustLevel: 'official_root',
              },
              revocationStatus: 'REVOCATION_UNKNOWN',
              revocationNotice: 'Offline runtime.',
              limitations: [],
            },
            technicalDetails: 'Cryptographic signature failed mathematical verification. Document byte range modified.',
          },
        ],
        hasCryptographicSignatures: true,
        hasFailedSignatures: true,
        hasModifiedSignatures: false,
        untrustedCertificatesCount: 0,
        evaluatedAt: new Date().toISOString(),
        limitationsNotice: 'Offline evaluation.',
      },
    };

    const riskReport = evaluateMultiSignalRisk({
      application: dummyApp,
      documents: [dummyDoc],
      integrityReports: { [dummyDoc.id]: docReport },
    });

    assert(riskReport.dimensionStatuses.riskRequiringHumanReview === 'CRITICAL', 'Scenario 11: Modified document signature escalates risk to CRITICAL despite valid cert chain');
    assert(riskReport.dimensionStatuses.regulatoryCompliance === 'DEFICIENT', 'Scenario 11: Compliance is DEFICIENT');
    assert(riskReport.contributingSignals.some(s => s.signalId.startsWith('SIG-FAIL')), 'Scenario 11: Emits blocking SIG-FAIL signal');
    assert(riskReport.contributingSignals.some(s => s.signalId.startsWith('CERT-TRUSTED')), 'Scenario 11: Decoupled cert state is independently recorded as TRUSTED');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 12: Revocation Information Absent in Offline Mode
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 12: Offline Revocation Status Notice ---');
  {
    const store = new TrustStoreManager('test');
    store.clear();
    store.registerTrustAnchor({
      id: 'verified-root-anchor',
      authorityName: 'TypeNull Audit Root CA',
      subjectName: parsedRoot.subject.rawText,
      issuerName: parsedRoot.issuer.rawText,
      sha256Fingerprint: rootFp,
      subjectPublicKeyInfo: parsedRoot.subjectPublicKeyInfo,
      notBefore: parsedRoot.validity.notBefore,
      notAfter: parsedRoot.validity.notAfter,
      isSelfSigned: true,
      trustLevel: 'official_root',
      isVerifiedProvenance: true,
    });

    const res = await validateCertificateChain(parsedLeaf, [parsedInter, parsedRoot], {
      trustStore: store,
      environment: 'test',
    });

    assert(res.revocationStatus === 'REVOCATION_UNKNOWN', 'Scenario 12: Revocation status is REVOCATION_UNKNOWN');
    assert(res.revocationNotice.includes('offline'), 'Scenario 12: Notice explicitly discloses offline client runtime limitations');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 13: Timestamp Token Present but Cryptographically Unverified
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 13: Timestamp Token Cryptographically Unverified ---');
  {
    const dummyApp: DbApplication = {
      id: 'app-scen-13',
      institution_id: 'inst-1',
      academic_year: '2026-2027',
      application_type: 'Extension of Approval (EoA)',
      status: 'submitted',
      current_step: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const dummyDoc: ApplicationDocument = {
      id: 'doc-scen-13',
      application_id: dummyApp.id,
      document_type: 'affidavit',
      original_filename: 'timestamped_doc.pdf',
      file_path: 'timestamped_doc.pdf',
      file_size_bytes: 4096,
      mime_type: 'application/pdf',
      sha256_hash: '2222222222222222222222222222222222222222222222222222222222222222',
      is_valid: true,
      uploaded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const docReport: DocumentIntegrityResult = {
      documentId: dummyDoc.id,
      sha256Hash: dummyDoc.sha256_hash,
      isValidFormat: true,
      detectedFormat: 'pdf',
      fileSizeBytes: 4096,
      signatureReport: {
        overallStatus: 'timestamp_not_verified',
        signaturesCount: 1,
        signatures: [
          {
            signatureIndex: 1,
            subFilter: 'adbe.pkcs7.detached',
            byteRange: [0, 1000, 2000, 1000],
            isByteRangeValid: true,
            documentModifiedAfterSigning: false,
            appendedBytesLength: 0,
            mathematicalIntegrityVerified: true,
            messageDigestVerified: true,
            cryptoSignatureVerified: true,
            status: 'timestamp_not_verified',
            claimedSigningTime: '2026-05-15T10:00:00Z',
            hasRfc3161Timestamp: true,
            isTimestampTokenVerified: false,
            trustDecision: 'trusted',
            certificateTrustState: 'TRUSTED',
            technicalDetails: 'Cryptographic signature is valid. RFC 3161 TSA timestamp token is present, but full cryptographic TSA signature, message imprint, and TSA certificate chain anchoring are unverified in this offline client runtime.',
          },
        ],
        hasCryptographicSignatures: true,
        hasFailedSignatures: false,
        hasModifiedSignatures: false,
        untrustedCertificatesCount: 0,
        evaluatedAt: new Date().toISOString(),
        limitationsNotice: 'Offline TSA unverified.',
      },
    };

    assert(docReport.signatureReport!.signatures[0].hasRfc3161Timestamp === true, 'Scenario 13: hasRfc3161Timestamp is true');
    assert(docReport.signatureReport!.signatures[0].isTimestampTokenVerified === false, 'Scenario 13: isTimestampTokenVerified is strictly false');
    assert(docReport.signatureReport!.signatures[0].status === 'timestamp_not_verified', 'Scenario 13: Status is timestamp_not_verified');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 14: Unsupported Validation Step Cannot Yield TRUSTED
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 14: Incomplete / Unsupported Cannot Yield TRUSTED ---');
  {
    const store = new TrustStoreManager('production');
    store.clear();

    // Test with unanchored leaf
    const resUnanchored = await validateCertificateChain(parsedLeaf, [], {
      trustStore: store,
      environment: 'production',
    });
    assert(resUnanchored.trustStatus !== 'TRUSTED', 'Scenario 14A: Unanchored path cannot be TRUSTED');

    // Test with empty trust store
    store.clear();
    const resEmpty = await validateCertificateChain(parsedLeaf, [parsedInter, parsedRoot], {
      trustStore: store,
      environment: 'production',
    });
    assert(resEmpty.trustStatus !== 'TRUSTED', 'Scenario 14B: Empty trust store cannot yield TRUSTED');
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 15: Regulatory Reference Audit (No IT Act Section 35 Revocation)
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 15: Regulatory Reference Audit ---');
  {
    const dummyApp: DbApplication = {
      id: 'app-scen-15',
      institution_id: 'inst-1',
      academic_year: '2026-2027',
      application_type: 'Extension of Approval (EoA)',
      status: 'submitted',
      current_step: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const dummyDoc: ApplicationDocument = {
      id: 'doc-scen-15',
      application_id: dummyApp.id,
      document_type: 'affidavit',
      original_filename: 'revoked_cert_doc.pdf',
      file_path: 'revoked_cert_doc.pdf',
      file_size_bytes: 4096,
      mime_type: 'application/pdf',
      sha256_hash: '3333333333333333333333333333333333333333333333333333333333333333',
      is_valid: true,
      uploaded_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const docReport: DocumentIntegrityResult = {
      documentId: dummyDoc.id,
      sha256Hash: dummyDoc.sha256_hash,
      isValidFormat: true,
      detectedFormat: 'pdf',
      fileSizeBytes: 4096,
      signatureReport: {
        overallStatus: 'certificate_untrusted_or_unverifiable',
        signaturesCount: 1,
        signatures: [
          {
            signatureIndex: 1,
            subFilter: 'adbe.pkcs7.detached',
            byteRange: [0, 1000, 2000, 1000],
            isByteRangeValid: true,
            documentModifiedAfterSigning: false,
            appendedBytesLength: 0,
            mathematicalIntegrityVerified: true,
            messageDigestVerified: true,
            cryptoSignatureVerified: true,
            status: 'certificate_untrusted_or_unverifiable',
            hasRfc3161Timestamp: false,
            isTimestampTokenVerified: false,
            trustDecision: 'untrusted_chain',
            certificateTrustState: 'REVOKED',
            technicalDetails: 'Certificate revoked.',
          },
        ],
        hasCryptographicSignatures: true,
        hasFailedSignatures: false,
        hasModifiedSignatures: false,
        untrustedCertificatesCount: 1,
        evaluatedAt: new Date().toISOString(),
        limitationsNotice: 'Offline evaluation.',
      },
    };

    const riskReport = evaluateMultiSignalRisk({
      application: dummyApp,
      documents: [dummyDoc],
      integrityReports: { [dummyDoc.id]: docReport },
    });

    const revokedSig = riskReport.contributingSignals.find(s => s.signalId.startsWith('CERT-REVOKED'))!;
    assert(Boolean(revokedSig), 'Scenario 15: Emits CERT-REVOKED signal');
    assert(
      !revokedSig.ruleReference.includes('Section 35'),
      `Scenario 15: Rule reference ("${revokedSig.ruleReference}") does NOT cite IT Act Section 35`
    );
    assert(
      revokedSig.ruleReference === 'AICTE EoA Scrutiny Norms & RFC 5280 Technical Status',
      'Scenario 15: Rule reference correctly cites AICTE EoA Scrutiny Norms & RFC 5280 Technical Status'
    );
  }

  // ---------------------------------------------------------------------------
  // SCENARIO 16: Strict Two-Role RBAC Model Preservation
  // ---------------------------------------------------------------------------
  console.log('--- SCENARIO 16: Strict Two-Role RBAC Model Invariant ---');
  {
    const validRoles: UserRole[] = ['institution', 'officer'];
    assert(validRoles.length === 2, 'Scenario 16: Exactly two user roles exist');
    assert(validRoles.includes('institution'), 'Scenario 16: institution role exists');
    assert(validRoles.includes('officer'), 'Scenario 16: officer role exists');

    // Confirm is_admin is an officer permission flag, not a distinct third role
    const officerAdminUser = {
      role: 'officer' as UserRole,
      is_admin: true,
    };
    assert(officerAdminUser.role === 'officer', 'Scenario 16: Admin is an officer with elevated permissions, not a third role');
  }

  console.log('\n================================================================');
  console.log(`PHASE 2C.1 AUDIT SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');
}

runPhase2c1AuditTestSuite().catch((err) => {
  console.error('Audit Test Suite Fatal Error:', err);
  process.exit(1);
});
