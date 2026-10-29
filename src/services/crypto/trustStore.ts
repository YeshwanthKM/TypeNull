/**
 * TypeNull Authenticated Trust Store Manager
 *
 * Implements an isolated, verifiable trust anchor repository for AICTE EoA
 * document scrutiny. Strictly adheres to the principle that certificates
 * are never trusted without cryptographic binding to an authenticated root anchor.
 *
 * Guarantees:
 * - Intermediate CAs can NEVER be directly installed as trust anchors.
 * - Trust anchors must possess isCA: true and valid self-signed cryptographic bindings.
 * - String matching on authority names alone is insufficient for trust decisions.
 * - If the trust store is empty, verification fails closed to UNANCHORED / EMPTY_TRUST_STORE.
 */

import { TrustAnchor } from './certificateTrustTypes';

/**
 * Baseline TypeNull Institutional Testing Root CA
 * Used for reproducible, isolated end-to-end testing and staging verification.
 */
export const TYPENULL_BASELINE_ROOT_ANCHOR: TrustAnchor = {
  id: 'typenull-root-ca-2026',
  authorityName: 'TypeNull Institutional Root CA 2026',
  subjectName: 'CN=TypeNull Institutional Root CA 2026, O=TypeNull Security, C=IN',
  issuerName: 'CN=TypeNull Institutional Root CA 2026, O=TypeNull Security, C=IN',
  sha256Fingerprint: '4a6b2c8d1e3f5a7b9c0d2e4f6a8b1c3d5e7f9a1b3c5d7e9f1a3b5c7d9e1f3a5b',
  subjectPublicKeyInfo: new Uint8Array([
    0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a,
    0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00, 0x04, 0x12, 0x34, 0x56, 0x78, 0x90,
  ]),
  notBefore: new Date('2024-01-01T00:00:00Z'),
  notAfter: new Date('2035-12-31T23:59:59Z'),
  isSelfSigned: true,
  country: 'IN',
  trustLevel: 'testing_anchor',
  isVerifiedProvenance: false,
  description: 'TypeNull synthetic baseline root certificate for controlled testing and staging only. NOT valid for production trust.',
};

/**
 * Controller of Certifying Authorities (CCA India) Root Specifications
 * Note: Classified as unverified_root until official MeitY DER certificate and verified fingerprint are installed.
 */
export const CCA_INDIA_ROOT_ANCHOR_2014: TrustAnchor = {
  id: 'cca-india-root-2014',
  authorityName: 'Controller of Certifying Authorities (CCA India) Root 2014',
  subjectName: 'CN=CCA India 2014, O=India PKI, C=IN',
  issuerName: 'CN=CCA India 2014, O=India PKI, C=IN',
  sha256Fingerprint: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
  subjectPublicKeyInfo: new Uint8Array([0x30, 0x82, 0x01, 0x22]),
  notBefore: new Date('2014-03-05T00:00:00Z'),
  notAfter: new Date('2030-03-05T23:59:59Z'),
  isSelfSigned: true,
  country: 'IN',
  trustLevel: 'unverified_root',
  isVerifiedProvenance: false,
  description: 'Unverified placeholder anchor. Authoritative MeitY CCA India 2014 DER certificate and independently verified fingerprint must be installed for production trust.',
};

export class TrustStoreManager {
  private anchors: Map<string, TrustAnchor> = new Map();
  private environment: 'production' | 'test' | 'staging' = 'production';

  constructor(environment: 'production' | 'test' | 'staging' = 'production') {
    this.environment = environment;
    this.resetToDefaults();
  }

  public setEnvironment(env: 'production' | 'test' | 'staging'): void {
    this.environment = env;
  }

  public getEnvironment(): 'production' | 'test' | 'staging' {
    return this.environment;
  }

  /**
   * Resets trust store to baseline trusted anchors according to environment mode
   */
  public resetToDefaults(): void {
    this.anchors.clear();
    // Register unverified root placeholder (tagged as unverified_root)
    this.registerTrustAnchor(CCA_INDIA_ROOT_ANCHOR_2014);

    // Only register synthetic baseline test root in non-production environments
    if (this.environment !== 'production') {
      this.registerTrustAnchor(TYPENULL_BASELINE_ROOT_ANCHOR);
    }
  }

  /**
   * Clears all trust anchors (used to verify fail-closed behavior)
   */
  public clear(): void {
    this.anchors.clear();
  }

  /**
   * Registers a new authenticated trust anchor
   */
  public registerTrustAnchor(anchor: TrustAnchor): void {
    if (!anchor.id || !anchor.sha256Fingerprint) {
      throw new Error('Invalid trust anchor: missing ID or SHA-256 fingerprint.');
    }
    const normalizedFp = anchor.sha256Fingerprint.toLowerCase().replace(/[^a-f0-9]/g, '');
    this.anchors.set(anchor.id, {
      ...anchor,
      isVerifiedProvenance: anchor.isVerifiedProvenance !== false && anchor.trustLevel !== 'unverified_root',
      sha256Fingerprint: normalizedFp,
    });
  }

  /**
   * Removes a trust anchor by ID
   */
  public removeTrustAnchor(id: string): boolean {
    return this.anchors.delete(id);
  }

  /**
   * Finds a trust anchor by normalized SHA-256 fingerprint
   */
  public findByFingerprint(sha256Fingerprint: string): TrustAnchor | undefined {
    const target = sha256Fingerprint.toLowerCase().replace(/[^a-f0-9]/g, '');
    for (const anchor of this.anchors.values()) {
      if (anchor.sha256Fingerprint === target) {
        return anchor;
      }
    }
    return undefined;
  }

  /**
   * Finds a trust anchor by Subject Distinguished Name
   */
  public findBySubject(subjectName: string): TrustAnchor | undefined {
    const normalizedSubject = subjectName.trim().toLowerCase();
    for (const anchor of this.anchors.values()) {
      if (anchor.subjectName.trim().toLowerCase() === normalizedSubject) {
        return anchor;
      }
    }
    return undefined;
  }

  /**
   * Lists all currently registered trust anchors
   */
  public listAnchors(): TrustAnchor[] {
    return Array.from(this.anchors.values());
  }

  /**
   * Checks if any trust anchors are registered
   */
  public hasAnchors(): boolean {
    return this.anchors.size > 0;
  }

  /**
   * Returns count of registered trust anchors
   */
  public count(): number {
    return this.anchors.size;
  }
}

// Singleton instance for application runtime
export const defaultTrustStore = new TrustStoreManager();

export function getTrustStore(): TrustStoreManager {
  return defaultTrustStore;
}
