/**
 * TypeNull Certificate Trust & X.509 Path Validation Types
 *
 * Adheres to RFC 5280 (PKIX Certificate and CRL Profile) and
 * Indian IT Act 2000 / CCA Guidelines for AICTE EoA document scrutiny.
 *
 * Defines 8 explicit certificate trust states and fine-grained
 * diagnostic reason codes to prevent ambiguous binary trust decisions.
 */

export type CertificateTrustState =
  | 'TRUSTED'
  | 'UNANCHORED'
  | 'UNTRUSTED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'REVOCATION_UNKNOWN'
  | 'UNSUPPORTED'
  | 'INCOMPLETE';

export type CertificateDiagnosticCode =
  | 'VALID_PATH_TO_TRUST_ANCHOR'
  | 'NO_TRUST_ANCHOR'
  | 'CHAIN_INCOMPLETE'
  | 'ISSUER_SIGNATURE_INVALID'
  | 'PATH_LEN_EXCEEDED'
  | 'NOT_A_CA'
  | 'KEY_USAGE_MISMATCH'
  | 'EXT_KEY_USAGE_MISMATCH'
  | 'CERT_EXPIRED'
  | 'CERT_NOT_YET_VALID'
  | 'REVOCATION_CHECK_UNAVAILABLE'
  | 'CERT_REVOKED'
  | 'ALGORITHM_UNSUPPORTED'
  | 'MALFORMED_CERTIFICATE'
  | 'SELF_SIGNED_UNTRUSTED'
  | 'NAME_CHAINING_MISMATCH'
  | 'EMPTY_TRUST_STORE'
  | 'UNSUPPORTED_CRITICAL_EXTENSION'
  | 'ALGORITHM_MISMATCH'
  | 'WEAK_HASH_ALGORITHM'
  | 'ROOT_UNVERIFIED_PROVENANCE'
  | 'TEST_ANCHOR_IN_PRODUCTION';

export interface TrustAnchor {
  id: string;
  authorityName: string;
  subjectName: string;
  issuerName: string;
  sha256Fingerprint: string;
  subjectPublicKeyInfo: Uint8Array;
  notBefore: Date;
  notAfter: Date;
  isSelfSigned: boolean;
  rawDer?: Uint8Array;
  country?: string;
  trustLevel: 'official_root' | 'institutional_baseline' | 'testing_anchor' | 'unverified_root';
  isVerifiedProvenance: boolean;
  description?: string;
}

export interface ParsedCertificateExtensions {
  basicConstraints?: {
    isCA: boolean;
    pathLenConstraint?: number;
  };
  keyUsage?: {
    digitalSignature: boolean;
    nonRepudiation: boolean;
    keyEncipherment: boolean;
    dataEncipherment: boolean;
    keyAgreement: boolean;
    keyCertSign: boolean;
    cRLSign: boolean;
    encipherOnly: boolean;
    decipherOnly: boolean;
    rawBits: number;
  };
  extendedKeyUsage?: string[];
  subjectKeyIdentifier?: string;
  authorityKeyIdentifier?: string;
  criticalExtensions?: string[];
  unsupportedCriticalExtensions?: string[];
}

export interface CertificatePathNode {
  depth: number;
  subject: string;
  issuer: string;
  serialNumber: string;
  isCA: boolean;
  pathLenConstraint?: number;
  validFrom: string;
  validTo: string;
  isCurrentlyValid: boolean;
  sha256Fingerprint: string;
  algorithmOid: string;
  keyUsageBits?: number;
  isTrustAnchor: boolean;
  trustAnchorId?: string;
}

export interface CertificateChainValidationResult {
  trustStatus: CertificateTrustState;
  diagnosticCode: CertificateDiagnosticCode;
  diagnosticMessage: string;
  chainLength: number;
  isPathValid: boolean;
  validationTime: string;
  leafCertificate: {
    subject: string;
    issuer: string;
    serialNumber: string;
    validFrom: string;
    validTo: string;
    isCurrentlyValid: boolean;
    sha256Fingerprint: string;
  };
  pathNodes: CertificatePathNode[];
  trustAnchorUsed?: {
    id: string;
    authorityName: string;
    subjectName: string;
    sha256Fingerprint: string;
    trustLevel: string;
  };
  revocationStatus: 'REVOCATION_UNKNOWN' | 'NOT_REVOKED' | 'REVOKED';
  revocationNotice: string;
  limitations: string[];
}
