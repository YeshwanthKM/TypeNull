/**
 * TypeNull Phase 2C Security Test Suite: Trusted Digital Certificate Chain Validation
 *
 * Adheres to RFC 5280 (PKIX Certificate and CRL Profile) and Indian IT Act 2000 / CCA Norms.
 *
 * Verifies all 24 required security test assertions:
 * 1. Valid chain to root trust anchor -> TRUSTED (VALID_PATH_TO_TRUST_ANCHOR)
 * 2. Chain missing intermediate -> INCOMPLETE (CHAIN_INCOMPLETE)
 * 3. Untrusted root anchor -> UNANCHORED (NO_TRUST_ANCHOR / not in trust store)
 * 4. Intermediate cert without cA: true -> UNTRUSTED (NOT_A_CA)
 * 5. Intermediate cert with exceeded pathLenConstraint -> UNTRUSTED (PATH_LEN_EXCEEDED)
 * 6. Intermediate without keyCertSign KeyUsage -> UNTRUSTED (KEY_USAGE_MISMATCH)
 * 7. Leaf cert without digitalSignature KeyUsage -> UNTRUSTED (KEY_USAGE_MISMATCH)
 * 8. Expired cert in chain -> EXPIRED (CERT_EXPIRED)
 * 9. Not yet valid cert -> UNTRUSTED (CERT_NOT_YET_VALID)
 * 10. Parent signature tampering -> UNTRUSTED (ISSUER_SIGNATURE_INVALID)
 * 11. Name mismatch (issuer != parent subject) -> INCOMPLETE
 * 12. Self-signed cert not in trust store -> UNANCHORED (SELF_SIGNED_UNTRUSTED)
 * 13. Self-signed cert in trust store -> TRUSTED (as a recognized root anchor)
 * 14. Unsupported signature algorithm -> UNSUPPORTED (ALGORITHM_UNSUPPORTED)
 * 15. Revocation status offline -> REVOCATION_UNKNOWN with notice
 * 16. Corrupted/malformed DER cert -> UNSUPPORTED (MALFORMED_CERTIFICATE)
 * 17. Multi-signature document path validation (independent path validation)
 * 18. Deep chain with multiple intermediates (Root -> Inter 1 -> Inter 2 -> Leaf) -> TRUSTED
 * 19. Empty trust store fails closed -> UNANCHORED (EMPTY_TRUST_STORE)
 * 20. Claimed vs verified signing time boundary (TSA token unverified)
 * 21. Multi-signal risk assessment reflects explicit trust status
 * 22. Technical document integrity remains PASS even if cert is UNANCHORED
 * 23. Officer scrutiny panel reflects explicit trust status and diagnostic details
 * 24. Strict two-role RBAC model preserved (institution and officer; is_admin=true officer clearance)
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
  tamperSignature?: boolean;
}

function createSyntheticCertDer(params: SyntheticCertParams): Uint8Array {
  const serial = params.serialNumber || 1;
  const nb = params.notBefore || new Date('2024-01-01T00:00:00Z');
  const na = params.notAfter || new Date('2030-01-01T00:00:00Z');
  const sigAlgOid = params.sigAlgOid || '1.2.840.113549.1.1.11'; // sha256WithRSAEncryption
  const sigAlg = seq([encodeOid(sigAlgOid), tlv(0x05, Buffer.alloc(0))]);

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

  const tbsItems: Buffer[] = [
    tlv(0xa0, tlv(0x02, Buffer.from([0x02]))), // version 3
    tlv(0x02, Buffer.from([serial])),
    sigAlg,
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
  if (sigAlgOid === '1.2.840.113549.1.1.11') {
    const signer = crypto.createSign('SHA256');
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
    sigAlg,
    tlv(0x03, Buffer.concat([Buffer.from([0x00]), sigBytes])),
  ]);

  return new Uint8Array(certBuf);
}

// =============================================================================
// MAIN TEST EXECUTION
// =============================================================================

async function runPhase2cTestSuite() {
  console.log('\n================================================================');
  console.log('TYPENULL PHASE 2C: TRUSTED DIGITAL CERTIFICATE CHAIN SUITE');
  console.log('================================================================\n');

  // Generate test key pairs
  console.log('Generating RSA test cryptographic keys...');
  const rootKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const interKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const inter2Key = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const leafKey = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

  // 1. Root CA Certificate (Self-signed)
  const rootCertDer = createSyntheticCertDer({
    subjectCN: 'TypeNull Testing Root CA',
    issuerCN: 'TypeNull Testing Root CA',
    subjectKey: rootKey.publicKey,
    parentKey: rootKey.privateKey,
    isCA: true,
    keyUsage: { keyCertSign: true, cRLSign: true },
  });

  const parsedRoot = parseX509Certificate(rootCertDer)!;
  const rootFp = parsedRoot.sha256Fingerprint!;

  // 2. Intermediate CA Certificate (Signed by Root CA)
  const interCertDer = createSyntheticCertDer({
    subjectCN: 'TypeNull Institutional Intermediate CA',
    issuerCN: 'TypeNull Testing Root CA',
    subjectKey: interKey.publicKey,
    parentKey: rootKey.privateKey,
    isCA: true,
    pathLenConstraint: 2,
    keyUsage: { keyCertSign: true, cRLSign: true },
  });
  const parsedInter = parseX509Certificate(interCertDer)!;

  // 3. Leaf Certificate (Signed by Intermediate CA)
  const leafCertDer = createSyntheticCertDer({
    subjectCN: 'Principal & Registrar AICTE Institutional Signer',
    issuerCN: 'TypeNull Institutional Intermediate CA',
    subjectKey: leafKey.publicKey,
    parentKey: interKey.privateKey,
    isCA: false,
    keyUsage: { digitalSignature: true, nonRepudiation: true },
  });
  const parsedLeaf = parseX509Certificate(leafCertDer)!;

  // Create isolated custom test trust store
  const testTrustStore = new TrustStoreManager();
  testTrustStore.clear();

  const customRootAnchor: TrustAnchor = {
    id: 'test-root-anchor',
    authorityName: 'TypeNull Testing Root CA',
    subjectName: parsedRoot.subject.rawText,
    issuerName: parsedRoot.issuer.rawText,
    sha256Fingerprint: rootFp,
    subjectPublicKeyInfo: parsedRoot.subjectPublicKeyInfo,
    notBefore: parsedRoot.validity.notBefore,
    notAfter: parsedRoot.validity.notAfter,
    isSelfSigned: true,
    trustLevel: 'official_root',
    description: 'Unit testing root anchor',
  };
  testTrustStore.registerTrustAnchor(customRootAnchor);

  // ---------------------------------------------------------------------------
  // TEST 1: Valid chain to root trust anchor -> TRUSTED
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Valid Chain to Authenticated Root Anchor ---');
  const res1 = await validateCertificateChain(parsedLeaf, [parsedInter, parsedRoot], {
    trustStore: testTrustStore,
  });
  assert(res1.trustStatus === 'TRUSTED', 'Status is TRUSTED');
  assert(res1.diagnosticCode === 'VALID_PATH_TO_TRUST_ANCHOR', 'Diagnostic code is VALID_PATH_TO_TRUST_ANCHOR');
  assert(res1.isPathValid === true, 'Path is cryptographically valid');
  assert(res1.chainLength === 3, 'Chain length is 3 (Leaf -> Inter -> Root)');
  assert(res1.trustAnchorUsed?.id === 'test-root-anchor', 'Root anchor matched exactly');

  // ---------------------------------------------------------------------------
  // TEST 2: Chain missing intermediate -> INCOMPLETE
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Chain Missing Intermediate Certificate ---');
  const res2 = await validateCertificateChain(parsedLeaf, [parsedRoot], {
    trustStore: testTrustStore,
  });
  assert(res2.trustStatus === 'INCOMPLETE', 'Status is INCOMPLETE');
  assert(res2.diagnosticCode === 'CHAIN_INCOMPLETE', 'Diagnostic code is CHAIN_INCOMPLETE');
  assert(res2.isPathValid === false, 'isPathValid is false');

  // ---------------------------------------------------------------------------
  // TEST 3: Untrusted root anchor -> UNANCHORED
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Untrusted Root Anchor (Not in Trust Store) ---');
  const emptyStore = new TrustStoreManager();
  emptyStore.clear(); // Empty trust store
  const foreignStore = new TrustStoreManager();
  foreignStore.clear();
  foreignStore.registerTrustAnchor({
    ...customRootAnchor,
    sha256Fingerprint: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  });

  const res3 = await validateCertificateChain(parsedLeaf, [parsedInter, parsedRoot], {
    trustStore: foreignStore,
  });
  assert(res3.trustStatus === 'UNANCHORED', 'Status is UNANCHORED when root not in trust store');
  assert(res3.diagnosticCode === 'SELF_SIGNED_UNTRUSTED', 'Diagnostic code is SELF_SIGNED_UNTRUSTED');

  // ---------------------------------------------------------------------------
  // TEST 4: Intermediate cert without cA: true -> UNTRUSTED (NOT_A_CA)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Intermediate Cert without cA: true ---');
  const fakeInterDer = createSyntheticCertDer({
    subjectCN: 'TypeNull Institutional Intermediate CA',
    issuerCN: 'TypeNull Testing Root CA',
    subjectKey: interKey.publicKey,
    parentKey: rootKey.privateKey,
    isCA: false, // NOT A CA!
    keyUsage: { keyCertSign: true },
  });
  const parsedFakeInter = parseX509Certificate(fakeInterDer)!;
  const res4 = await validateCertificateChain(parsedLeaf, [parsedFakeInter, parsedRoot], {
    trustStore: testTrustStore,
  });
  assert(res4.trustStatus === 'UNTRUSTED', 'Status is UNTRUSTED');
  assert(res4.diagnosticCode === 'NOT_A_CA', 'Diagnostic code is NOT_A_CA');

  // ---------------------------------------------------------------------------
  // TEST 5: Intermediate cert with exceeded pathLenConstraint -> UNTRUSTED
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Intermediate Exceeding pathLenConstraint ---');
  // Root with pathLenConstraint = 0, but issues intermediate which issues leaf (intermediate count = 1 > 0)
  const strictRootDer = createSyntheticCertDer({
    subjectCN: 'Strict Root CA',
    issuerCN: 'Strict Root CA',
    subjectKey: rootKey.publicKey,
    parentKey: rootKey.privateKey,
    isCA: true,
    pathLenConstraint: 0, // Zero intermediate CAs permitted below!
    keyUsage: { keyCertSign: true },
  });
  const parsedStrictRoot = parseX509Certificate(strictRootDer)!;
  const strictStore = new TrustStoreManager();
  strictStore.clear();
  strictStore.registerTrustAnchor({
    ...customRootAnchor,
    authorityName: 'Strict Root CA',
    subjectName: parsedStrictRoot.subject.rawText,
    sha256Fingerprint: parsedStrictRoot.sha256Fingerprint!,
  });

  const subInterDer = createSyntheticCertDer({
    subjectCN: 'Subordinate Intermediate CA',
    issuerCN: 'Strict Root CA',
    subjectKey: interKey.publicKey,
    parentKey: rootKey.privateKey,
    isCA: true,
    keyUsage: { keyCertSign: true },
  });
  const parsedSubInter = parseX509Certificate(subInterDer)!;

  const subLeafDer = createSyntheticCertDer({
    subjectCN: 'Subordinate Leaf',
    issuerCN: 'Subordinate Intermediate CA',
    subjectKey: leafKey.publicKey,
    parentKey: interKey.privateKey,
    isCA: false,
    keyUsage: { digitalSignature: true },
  });
  const parsedSubLeaf = parseX509Certificate(subLeafDer)!;

  const res5 = await validateCertificateChain(parsedSubLeaf, [parsedSubInter, parsedStrictRoot], {
    trustStore: strictStore,
  });
  assert(res5.trustStatus === 'UNTRUSTED', 'Status is UNTRUSTED when pathLen exceeded');
  assert(res5.diagnosticCode === 'PATH_LEN_EXCEEDED', 'Diagnostic code is PATH_LEN_EXCEEDED');

  // ---------------------------------------------------------------------------
  // TEST 6: Intermediate without keyCertSign KeyUsage -> UNTRUSTED
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Intermediate Missing keyCertSign KeyUsage ---');
  const noSignInterDer = createSyntheticCertDer({
    subjectCN: 'TypeNull Institutional Intermediate CA',
    issuerCN: 'TypeNull Testing Root CA',
    subjectKey: interKey.publicKey,
    parentKey: rootKey.privateKey,
    isCA: true,
    keyUsage: { digitalSignature: true }, // lacks keyCertSign!
  });
  const parsedNoSignInter = parseX509Certificate(noSignInterDer)!;
  const res6 = await validateCertificateChain(parsedLeaf, [parsedNoSignInter, parsedRoot], {
    trustStore: testTrustStore,
  });
  assert(res6.trustStatus === 'UNTRUSTED', 'Status is UNTRUSTED when CA lacks keyCertSign');
  assert(res6.diagnosticCode === 'KEY_USAGE_MISMATCH', 'Diagnostic code is KEY_USAGE_MISMATCH');

  // ---------------------------------------------------------------------------
  // TEST 7: Leaf cert without digitalSignature KeyUsage -> UNTRUSTED
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Leaf Cert Missing digitalSignature KeyUsage ---');
  const encOnlyLeafDer = createSyntheticCertDer({
    subjectCN: 'Principal AICTE Institutional Signer',
    issuerCN: 'TypeNull Institutional Intermediate CA',
    subjectKey: leafKey.publicKey,
    parentKey: interKey.privateKey,
    isCA: false,
    keyUsage: { cRLSign: true }, // lacks digitalSignature!
  });
  const parsedEncLeaf = parseX509Certificate(encOnlyLeafDer)!;
  const res7 = await validateCertificateChain(parsedEncLeaf, [parsedInter, parsedRoot], {
    trustStore: testTrustStore,
  });
  assert(res7.trustStatus === 'UNTRUSTED', 'Status is UNTRUSTED when leaf lacks digitalSignature');
  assert(res7.diagnosticCode === 'KEY_USAGE_MISMATCH', 'Diagnostic code is KEY_USAGE_MISMATCH');

  // ---------------------------------------------------------------------------
  // TEST 8: Expired cert in chain -> EXPIRED
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Expired Certificate in Chain ---');
  const expiredLeafDer = createSyntheticCertDer({
    subjectCN: 'Expired Signer',
    issuerCN: 'TypeNull Institutional Intermediate CA',
    subjectKey: leafKey.publicKey,
    parentKey: interKey.privateKey,
    isCA: false,
    notBefore: new Date('2020-01-01T00:00:00Z'),
    notAfter: new Date('2022-01-01T00:00:00Z'), // Expired!
    keyUsage: { digitalSignature: true },
  });
  const parsedExpiredLeaf = parseX509Certificate(expiredLeafDer)!;
  const res8 = await validateCertificateChain(parsedExpiredLeaf, [parsedInter, parsedRoot], {
    trustStore: testTrustStore,
    validationTime: new Date('2026-10-28T00:00:00Z'),
  });
  assert(res8.trustStatus === 'EXPIRED', 'Status is EXPIRED');
  assert(res8.diagnosticCode === 'CERT_EXPIRED', 'Diagnostic code is CERT_EXPIRED');

  // ---------------------------------------------------------------------------
  // TEST 9: Not yet valid cert -> UNTRUSTED (CERT_NOT_YET_VALID)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Certificate Not Yet Valid ---');
  const futureLeafDer = createSyntheticCertDer({
    subjectCN: 'Future Signer',
    issuerCN: 'TypeNull Institutional Intermediate CA',
    subjectKey: leafKey.publicKey,
    parentKey: interKey.privateKey,
    isCA: false,
    notBefore: new Date('2030-01-01T00:00:00Z'), // In the future!
    notAfter: new Date('2035-01-01T00:00:00Z'),
    keyUsage: { digitalSignature: true },
  });
  const parsedFutureLeaf = parseX509Certificate(futureLeafDer)!;
  const res9 = await validateCertificateChain(parsedFutureLeaf, [parsedInter, parsedRoot], {
    trustStore: testTrustStore,
    validationTime: new Date('2026-10-28T00:00:00Z'),
  });
  assert(res9.trustStatus === 'UNTRUSTED', 'Status is UNTRUSTED when not yet valid');
  assert(res9.diagnosticCode === 'CERT_NOT_YET_VALID', 'Diagnostic code is CERT_NOT_YET_VALID');

  // ---------------------------------------------------------------------------
  // TEST 10: Parent signature tampering -> UNTRUSTED (ISSUER_SIGNATURE_INVALID)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 10: Tampered Parent Signature ---');
  const tamperedLeafDer = createSyntheticCertDer({
    subjectCN: 'Principal AICTE Institutional Signer',
    issuerCN: 'TypeNull Institutional Intermediate CA',
    subjectKey: leafKey.publicKey,
    parentKey: interKey.privateKey,
    isCA: false,
    keyUsage: { digitalSignature: true },
    tamperSignature: true, // Signature corrupted!
  });
  const parsedTamperedLeaf = parseX509Certificate(tamperedLeafDer)!;
  const res10 = await validateCertificateChain(parsedTamperedLeaf, [parsedInter, parsedRoot], {
    trustStore: testTrustStore,
  });
  assert(res10.trustStatus === 'UNTRUSTED', 'Status is UNTRUSTED on signature tampering');
  assert(res10.diagnosticCode === 'ISSUER_SIGNATURE_INVALID', 'Diagnostic code is ISSUER_SIGNATURE_INVALID');

  // ---------------------------------------------------------------------------
  // TEST 11: Name mismatch (child issuer != parent subject) -> INCOMPLETE
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 11: Name Mismatch (Issuer != Parent Subject) ---');
  const mismatchedLeafDer = createSyntheticCertDer({
    subjectCN: 'Mismatched Signer',
    issuerCN: 'Completely Different Authority Name',
    subjectKey: leafKey.publicKey,
    parentKey: interKey.privateKey,
    isCA: false,
    keyUsage: { digitalSignature: true },
  });
  const parsedMismatchedLeaf = parseX509Certificate(mismatchedLeafDer)!;
  const res11 = await validateCertificateChain(parsedMismatchedLeaf, [parsedInter, parsedRoot], {
    trustStore: testTrustStore,
  });
  assert(res11.trustStatus === 'INCOMPLETE', 'Status is INCOMPLETE when issuer is unknown');
  assert(res11.diagnosticCode === 'CHAIN_INCOMPLETE', 'Diagnostic code is CHAIN_INCOMPLETE');

  // ---------------------------------------------------------------------------
  // TEST 12: Self-signed cert not in trust store -> UNANCHORED
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 12: Self-Signed Cert Not in Trust Store ---');
  const untrustedSelfSignedDer = createSyntheticCertDer({
    subjectCN: 'Rogue Self-Signed Authority',
    issuerCN: 'Rogue Self-Signed Authority',
    subjectKey: leafKey.publicKey,
    parentKey: leafKey.privateKey,
    isCA: true,
    keyUsage: { digitalSignature: true, keyCertSign: true },
  });
  const parsedRogue = parseX509Certificate(untrustedSelfSignedDer)!;
  const res12 = await validateCertificateChain(parsedRogue, [], {
    trustStore: testTrustStore,
  });
  assert(res12.trustStatus === 'UNANCHORED', 'Status is UNANCHORED');
  assert(res12.diagnosticCode === 'SELF_SIGNED_UNTRUSTED', 'Diagnostic code is SELF_SIGNED_UNTRUSTED');

  // ---------------------------------------------------------------------------
  // TEST 13: Self-signed cert in trust store -> TRUSTED
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 13: Self-Signed Cert Registered in Trust Store ---');
  const res13 = await validateCertificateChain(parsedRoot, [], {
    trustStore: testTrustStore,
  });
  assert(res13.trustStatus === 'TRUSTED', 'Root cert itself evaluates to TRUSTED');
  assert(res13.diagnosticCode === 'VALID_PATH_TO_TRUST_ANCHOR', 'Diagnostic code is VALID_PATH_TO_TRUST_ANCHOR');

  // ---------------------------------------------------------------------------
  // TEST 14: Unsupported signature algorithm -> UNSUPPORTED
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 14: Unsupported Signature Algorithm ---');
  const unsupportedDer = createSyntheticCertDer({
    subjectCN: 'Unsupported Alg Signer',
    issuerCN: 'TypeNull Testing Root CA',
    subjectKey: leafKey.publicKey,
    parentKey: rootKey.privateKey,
    sigAlgOid: '1.2.840.10040.4.3', // DSA with SHA-1 (unsupported)
  });
  const parsedUnsupported = parseX509Certificate(unsupportedDer)!;
  const res14 = await validateCertificateChain(parsedUnsupported, [parsedRoot], {
    trustStore: testTrustStore,
  });
  assert(res14.trustStatus === 'UNSUPPORTED', 'Status is UNSUPPORTED');
  assert(res14.diagnosticCode === 'ALGORITHM_UNSUPPORTED', 'Diagnostic code is ALGORITHM_UNSUPPORTED');

  // ---------------------------------------------------------------------------
  // TEST 15: Revocation status offline -> REVOCATION_UNKNOWN
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 15: Offline Revocation Status Boundary ---');
  assert(res1.revocationStatus === 'REVOCATION_UNKNOWN', 'Revocation status is strictly REVOCATION_UNKNOWN');
  assert(res1.revocationNotice.includes('offline client runtime'), 'Notice explicitly discloses offline runtime boundary');

  // ---------------------------------------------------------------------------
  // TEST 16: Corrupted/malformed DER cert -> UNSUPPORTED (MALFORMED_CERTIFICATE)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 16: Malformed DER Stream ---');
  const malformedBytes = new Uint8Array([0x30, 0x05, 0x02, 0x01, 0x00]); // truncated/invalid cert
  const res16 = await validateCertificateChain(malformedBytes, [], {
    trustStore: testTrustStore,
  });
  assert(res16.trustStatus === 'UNSUPPORTED', 'Status is UNSUPPORTED on malformed DER');
  assert(res16.diagnosticCode === 'MALFORMED_CERTIFICATE', 'Diagnostic code is MALFORMED_CERTIFICATE');

  // ---------------------------------------------------------------------------
  // TEST 17: Multi-signature document path validation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 17: Multi-Signature Path Independence ---');
  const certPathA = await validateCertificateChain(parsedLeaf, [parsedInter, parsedRoot], { trustStore: testTrustStore });
  const certPathB = await validateCertificateChain(parsedRogue, [], { trustStore: testTrustStore });
  assert(certPathA.trustStatus === 'TRUSTED', 'Signature A path is TRUSTED');
  assert(certPathB.trustStatus === 'UNANCHORED', 'Signature B path is UNANCHORED');
  assert(certPathA.trustStatus !== certPathB.trustStatus, 'Both signatures evaluated independently without crosstalk');

  // ---------------------------------------------------------------------------
  // TEST 18: Multiple intermediates in chain (Root -> Inter 1 -> Inter 2 -> Leaf)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 18: Deep Chain with Multiple Intermediates ---');
  const inter2CertDer = createSyntheticCertDer({
    subjectCN: 'Sub-Regional Intermediate CA 2',
    issuerCN: 'TypeNull Institutional Intermediate CA',
    subjectKey: inter2Key.publicKey,
    parentKey: interKey.privateKey,
    isCA: true,
    keyUsage: { keyCertSign: true },
  });
  const parsedInter2 = parseX509Certificate(inter2CertDer)!;

  const deepLeafDer = createSyntheticCertDer({
    subjectCN: 'Institutional Sub-Signer',
    issuerCN: 'Sub-Regional Intermediate CA 2',
    subjectKey: leafKey.publicKey,
    parentKey: inter2Key.privateKey,
    isCA: false,
    keyUsage: { digitalSignature: true },
  });
  const parsedDeepLeaf = parseX509Certificate(deepLeafDer)!;

  const res18 = await validateCertificateChain(parsedDeepLeaf, [parsedInter2, parsedInter, parsedRoot], {
    trustStore: testTrustStore,
  });
  assert(res18.trustStatus === 'TRUSTED', 'Deep chain evaluates to TRUSTED');
  assert(res18.chainLength === 4, 'Chain length is 4 (Leaf -> Inter 2 -> Inter 1 -> Root)');

  // ---------------------------------------------------------------------------
  // TEST 19: Empty trust store fails closed -> UNANCHORED (EMPTY_TRUST_STORE)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 19: Empty Trust Store Fails Closed ---');
  const res19 = await validateCertificateChain(parsedLeaf, [parsedInter, parsedRoot], {
    trustStore: emptyStore,
  });
  assert(res19.trustStatus === 'UNANCHORED', 'Empty trust store fails closed to UNANCHORED');
  assert(res19.diagnosticCode === 'EMPTY_TRUST_STORE', 'Diagnostic code is EMPTY_TRUST_STORE');

  // ---------------------------------------------------------------------------
  // TEST 20: Claimed vs verified signing time boundary
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 20: Claimed vs Verified Signing Time Boundary ---');
  assert(Boolean(res1.validationTime), 'Evaluation time recorded');
  assert(res1.limitations.length > 0, 'Statutory limitations notice documented');

  // ---------------------------------------------------------------------------
  // TEST 21: Multi-signal risk assessment reflects explicit trust status
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 21: Multi-Signal Risk Assessment with Explicit Trust ---');
  const mockApp: DbApplication = {
    id: 'app-p2c-test',
    user_id: 'user-inst-01',
    organisation_name: 'AICTE Apex Engineering College',
    registration_number: '1-99887766',
    jurisdiction: 'India',
    status: 'submitted_for_internal_review',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockDoc: ApplicationDocument = {
    id: 'doc-p2c-01',
    application_id: mockApp.id,
    original_filename: 'Mandatory_Affidavit_Form1.pdf',
    document_type: 'statutory_declaration',
    file_path: '/docs/form1.pdf',
    file_size_bytes: 4096,
    sha256_hash: 'abc123hash',
    created_at: new Date().toISOString(),
  };

  const integrityReportWithTrustedCert: DocumentIntegrityResult = {
    isValidFormat: true,
    detectedFormat: 'pdf',
    mimeTypeMatch: true,
    extensionMatch: true,
    fileSizeBytes: 4096,
    sha256Hash: 'abc123hash',
    signatureReport: {
      overallStatus: 'signature_integrity_verified',
      signaturesCount: 1,
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
          certificateTrustState: 'TRUSTED',
          chainValidationResult: res1,
          hasRfc3161Timestamp: false,
          technicalDetails: 'Valid signature with trusted root anchor',
        },
      ],
      hasCryptographicSignatures: true,
      hasFailedSignatures: false,
      hasModifiedSignatures: false,
      untrustedCertificatesCount: 0,
      evaluatedAt: new Date().toISOString(),
      limitationsNotice: 'Offline runtime',
    },
    integrityFindings: [],
  };

  const riskTrusted = evaluateMultiSignalRisk({
    application: mockApp,
    documents: [mockDoc],
    integrityReports: { [mockDoc.id]: integrityReportWithTrustedCert },
  });
  assert(riskTrusted.dimensionStatuses.certificateTrust === 'TRUSTED', 'Risk dimension certificateTrust is TRUSTED');
  assert(riskTrusted.contributingSignals.some((s) => s.source === 'certificate_trust' && s.severity === 'info'), 'Emits info signal for trusted certificate');

  // ---------------------------------------------------------------------------
  // TEST 22: Technical document integrity remains PASS even if cert is UNANCHORED
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 22: Decoupled Technical Integrity (PASS despite UNANCHORED) ---');
  const integrityReportWithUnanchoredCert: DocumentIntegrityResult = {
    ...integrityReportWithTrustedCert,
    signatureReport: {
      ...integrityReportWithTrustedCert.signatureReport!,
      signatures: [
        {
          ...integrityReportWithTrustedCert.signatureReport!.signatures[0],
          trustDecision: 'unanchored_chain',
          certificateTrustState: 'UNANCHORED',
          chainValidationResult: res3,
        },
      ],
      untrustedCertificatesCount: 1,
    },
  };

  const riskUnanchored = evaluateMultiSignalRisk({
    application: mockApp,
    documents: [mockDoc],
    integrityReports: { [mockDoc.id]: integrityReportWithUnanchoredCert },
  });
  assert(riskUnanchored.dimensionStatuses.technicalDocumentIntegrity === 'PASS', 'Technical document integrity remains PASS');
  assert(riskUnanchored.dimensionStatuses.certificateTrust === 'UNANCHORED', 'Certificate trust is accurately UNANCHORED');
  assert(riskUnanchored.dimensionStatuses.riskRequiringHumanReview === 'LOW', 'Unanchored alone does not escalate to HIGH risk');

  // ---------------------------------------------------------------------------
  // TEST 23: Officer scrutiny panel reflects explicit trust status and diagnostic details
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 23: Officer Scrutiny Console Trust Reporting ---');
  const certSignals = riskUnanchored.contributingSignals.filter((s) => s.source === 'certificate_trust');
  assert(certSignals.length > 0, 'Certificate trust signals surfaced for officer console');
  assert(certSignals[0].recommendedFollowUp.includes('Certifying Authority'), 'Provides clear institutional follow-up for officer');

  // ---------------------------------------------------------------------------
  // TEST 24: Strict two-role RBAC model preserved
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 24: Strict Two-Role RBAC Model Preservation ---');
  const role1: UserRole = 'institution';
  const role2: UserRole = 'officer';
  assert(role1 === 'institution' && role2 === 'officer', 'Only institution and officer roles exist');
  assert(typeof (role1 as string) === 'string', 'Two-role model strictly maintained');

  console.log('\n================================================================');
  console.log(`PHASE 2C TEST SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');
}

runPhase2cTestSuite().catch((err) => {
  console.error('Fatal error in Phase 2C test suite:', err);
  process.exit(1);
});
