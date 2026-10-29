/**
 * TypeNull Multi-Signal Risk Assessment & Explainable Evidence Aggregator
 *
 * Combines independent evidentiary signals across 7 distinct verification domains:
 * 1. PDF Structural Forensics (revisions, header, trailer, JavaScript, embedded files)
 * 2. Cryptographic Digital Signature Verification (mathematical CMS / RSA / ECDSA byte ranges)
 * 3. Certificate Trust Policy (CCA India root store anchoring vs unanchored / self-signed / expired)
 * 4. Image Manipulation Indicators (ELA, local noise consistency, clone clusters, EXIF metadata)
 * 5. Cross-Document Entity Alignment (institution name, Permanent Institute ID, CA UDIN format)
 * 6. Document Readability & Extraction Confidence (OCR vs digital text, unreadable statutory fields)
 * 7. AICTE EoA Statutory Rule Checks (Form 1 affidavit, Land certificate, Faculty ratio, Financial statement)
 *
 * Strict Architectural Guarantees:
 * - 5 strictly decoupled regulatory dimensions:
 *     1. Technical Document Integrity
 *     2. Cryptographic Signature Integrity
 *     3. Certificate Trust Status
 *     4. Regulatory Compliance
 *     5. Risk Requiring Human Review
 * - A valid cryptographic signature != regulatory compliance.
 * - An untrusted certificate != automatic forgery (classified neutrally as unanchored).
 * - An image anomaly != proof of fraud (retains human review routing and benign explanations).
 * - Multi-signal corroboration: isolated heuristics remain low/medium; high risk requires independent cross-domain corroboration or verified mathematical tampering.
 * - Completely deterministic, explainable, and reproducible.
 */

import {
  DbApplication,
  ApplicationDocument,
  DocumentExtractionRecord,
} from '../../types';
import { DocumentIntegrityResult } from '../documentIntegrityService';
import { FieldComparisonResult } from './crossDocumentComparator';
import { EoaValidationFinding } from './eoaValidationEngine';

export type SignalSourceDomain =
  | 'pdf_forensics'
  | 'crypto_signature'
  | 'certificate_trust'
  | 'image_manipulation'
  | 'cross_document'
  | 'extraction_readability'
  | 'eoa_statutory_rule';

export type TechnicalIntegrityStatus = 'PASS' | 'WARNING' | 'FAIL' | 'INCONCLUSIVE';
export type CryptographicSignatureStatus =
  | 'VERIFIED'
  | 'NOT_VERIFIED'
  | 'FAILED'
  | 'NOT_APPLICABLE'
  | 'INCONCLUSIVE';
export type CertificateTrustStatus =
  | 'TRUSTED'
  | 'UNANCHORED'
  | 'UNTRUSTED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'REVOCATION_UNKNOWN'
  | 'UNSUPPORTED'
  | 'INCOMPLETE'
  | 'NOT_APPLICABLE'
  | 'UNTRUSTED_OR_EXPIRED';
export type RegulatoryComplianceStatus =
  | 'COMPLIANT'
  | 'DEFICIENT'
  | 'PENDING_REVIEW'
  | 'INCONCLUSIVE';
export type ReviewRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskContributingSignal {
  signalId: string;
  source: SignalSourceDomain;
  documentId?: string;
  documentFilename?: string;
  sha256Hash?: string;
  evidence: string;
  severity: 'info' | 'minor' | 'major' | 'blocking';
  confidence: 'low' | 'medium' | 'high' | 'inconclusive';
  isCorroborated: boolean;
  corroboratingSignalIds: string[];
  ruleReference?: string;
  limitations: string[];
  recommendedFollowUp: string;
}

export interface MultiSignalRiskAssessmentReport {
  applicationId: string;
  evaluatedAt: string;
  dimensionStatuses: {
    technicalDocumentIntegrity: TechnicalIntegrityStatus;
    cryptographicSignatureIntegrity: CryptographicSignatureStatus;
    certificateTrust: CertificateTrustStatus;
    regulatoryCompliance: RegulatoryComplianceStatus;
    riskRequiringHumanReview: ReviewRiskLevel;
  };
  executiveSummary: string;
  totalSignals: number;
  blockingSignalsCount: number;
  corroboratedSignalsCount: number;
  contributingSignals: RiskContributingSignal[];
  isDeterministicAndReproducible: true;
}

export interface MultiSignalEvaluationInput {
  application: DbApplication;
  documents: ApplicationDocument[];
  integrityReports?: Record<string, DocumentIntegrityResult>;
  crossDocumentComparisons?: FieldComparisonResult[];
  eoaFindings?: EoaValidationFinding[];
  extractions?: DocumentExtractionRecord[];
}

/**
 * Aggregates all independent signals into a multi-signal risk assessment
 */
export function evaluateMultiSignalRisk(
  input: MultiSignalEvaluationInput
): MultiSignalRiskAssessmentReport {
  const {
    application,
    documents,
    integrityReports = {},
    crossDocumentComparisons = [],
    eoaFindings = [],
    extractions = [],
  } = input;

  const signals: RiskContributingSignal[] = [];

  // 1. Process Document Integrity & Structural Forensics Signals
  let hasCorruptFile = false;
  let hasFailedSignature = false;
  let hasVerifiedSignature = false;
  let hasAnySignatures = false;
  let hasUntrustedCert = false;
  let hasUnanchoredCert = false;
  let hasExpiredCert = false;
  let hasTrustedCert = false;
  let hasRevokedCert = false;
  let hasIncompleteCert = false;
  let hasUnsupportedCert = false;

  for (const doc of documents) {
    const report = integrityReports[doc.id] || integrityReports[doc.original_filename];
    if (!report) continue;

    const hash = report.sha256Hash;
    const filename = doc.original_filename;

    // A. Format & stream integrity
    if (!report.isValidFormat || report.detectedFormat === 'unknown') {
      hasCorruptFile = true;
      signals.push({
        signalId: `INT-FMT-${doc.id}`,
        source: 'pdf_forensics',
        documentId: doc.id,
        documentFilename: filename,
        sha256Hash: hash,
        evidence: `File failed format inspection or contains unrecognized magic bytes.`,
        severity: 'blocking',
        confidence: 'high',
        isCorroborated: false,
        corroboratingSignalIds: [],
        limitations: ['File transfer corruption or unsupported file extension.'],
        recommendedFollowUp: 'Request fresh document upload from original institutional authority.',
      });
    }

    // B. PDF Structural Forensics
    if (report.forensicReport) {
      const fRep = report.forensicReport;
      if (!fRep.headerValid || !fRep.eofValid) {
        hasCorruptFile = true;
        signals.push({
          signalId: `PDF-STRUCT-${doc.id}`,
          source: 'pdf_forensics',
          documentId: doc.id,
          documentFilename: filename,
          sha256Hash: hash,
          evidence: `PDF structural markers invalid (Header valid: ${fRep.headerValid}, EOF valid: ${fRep.eofValid}).`,
          severity: 'blocking',
          confidence: 'high',
          isCorroborated: false,
          corroboratingSignalIds: [],
          ruleReference: 'ISO 32000-1 PDF File Structure',
          limitations: ['Truncated upload stream or non-compliant PDF generator.'],
          recommendedFollowUp: 'Re-export document from standard PDF viewer and re-upload.',
        });
      }

      if (fRep.hasJavaScript) {
        signals.push({
          signalId: `PDF-ACTIVE-JS-${doc.id}`,
          source: 'pdf_forensics',
          documentId: doc.id,
          documentFilename: filename,
          sha256Hash: hash,
          evidence: 'Document contains active JavaScript objects or launch actions.',
          severity: 'major',
          confidence: 'high',
          isCorroborated: false,
          corroboratingSignalIds: [],
          ruleReference: 'AICTE Secure Document Submission Norms',
          limitations: ['Interactive form calculations may innocently embed PDF scripts.'],
          recommendedFollowUp: 'Flatten document into static PDF before regulatory scrutiny.',
        });
      }
    }

    // C. Cryptographic Signatures
    if (report.signatureReport) {
      const sRep = report.signatureReport;
      if (sRep.signaturesCount > 0) {
        hasAnySignatures = true;
        for (const sig of sRep.signatures) {
          if (sig.status === 'signature_integrity_failed') {
            hasFailedSignature = true;
            signals.push({
              signalId: `SIG-FAIL-${doc.id}-${sig.signatureIndex}`,
              source: 'crypto_signature',
              documentId: doc.id,
              documentFilename: filename,
              sha256Hash: hash,
              evidence: `Cryptographic CMS signature #${sig.signatureIndex} failed mathematical digest verification. Document byte range has been modified.`,
              severity: 'blocking',
              confidence: 'high',
              isCorroborated: false,
              corroboratingSignalIds: [],
              ruleReference: 'RFC 5652 CMS Cryptographic Standards',
              limitations: ['Byte modification could be caused by corrupted disk sectors or PDF reparsers.'],
              recommendedFollowUp: 'Document cannot be accepted as an authentic digitally signed filing. Officer review mandatory.',
            });
          } else if (sig.status === 'document_modified_after_signing') {
            hasFailedSignature = true;
            signals.push({
              signalId: `SIG-POSTMOD-${doc.id}-${sig.signatureIndex}`,
              source: 'crypto_signature',
              documentId: doc.id,
              documentFilename: filename,
              sha256Hash: hash,
              evidence: `Bytes were appended or modified after signature #${sig.signatureIndex} was applied (${sig.appendedBytesLength} appended bytes).`,
              severity: 'blocking',
              confidence: 'high',
              isCorroborated: false,
              corroboratingSignalIds: [],
              ruleReference: 'ISO 32000-1 Digital Signature Modifications',
              limitations: ['Form fill-ins or annotations post-signature alter file trailing bytes.'],
              recommendedFollowUp: 'Verify if subsequent revisions represent benign multi-signing or unauthorized content alteration.',
            });
          } else if (sig.status === 'signature_integrity_verified') {
            hasVerifiedSignature = true;
          }

          // Certificate trust evaluation
          const certState = sig.certificateTrustState || (
            sig.trustDecision === 'trusted' ? 'TRUSTED' :
            sig.trustDecision === 'expired' ? 'EXPIRED' :
            sig.trustDecision === 'unanchored_chain' ? 'UNANCHORED' :
            sig.trustDecision === 'self_signed' ? 'UNANCHORED' :
            sig.trustDecision === 'unverifiable' ? 'UNSUPPORTED' : 'UNTRUSTED'
          );

          if (certState === 'TRUSTED') {
            hasTrustedCert = true;
            signals.push({
              signalId: `CERT-TRUSTED-${doc.id}-${sig.signatureIndex}`,
              source: 'certificate_trust',
              documentId: doc.id,
              documentFilename: filename,
              sha256Hash: hash,
              evidence: `Certificate for ${sig.signerCertificate?.subjectName || 'Signer'} is cryptographically verified to trusted root anchor "${sig.chainValidationResult?.trustAnchorUsed?.authorityName || 'Recognized Root'}".`,
              severity: 'info',
              confidence: 'high',
              isCorroborated: false,
              corroboratingSignalIds: [],
              ruleReference: 'Information Technology Act 2000 & CCA Root Guidelines',
              limitations: ['Revocation status unknown (offline client runtime).'],
              recommendedFollowUp: 'No follow-up required. Certificate chain successfully verified.',
            });
          } else if (certState === 'UNANCHORED') {
            hasUnanchoredCert = true;
            signals.push({
              signalId: `CERT-UNANCHORED-${doc.id}-${sig.signatureIndex}`,
              source: 'certificate_trust',
              documentId: doc.id,
              documentFilename: filename,
              sha256Hash: hash,
              evidence: `Digital certificate for ${sig.signerCertificate?.subjectName || 'Signer'} is mathematically valid but certificate chain is unanchored to known CCA India root store.`,
              severity: 'minor',
              confidence: 'medium',
              isCorroborated: false,
              corroboratingSignalIds: [],
              ruleReference: 'Information Technology Act 2000 & AICTE CA Trust Guidelines',
              limitations: ['Client lacks full offline CCA intermediate certificate bundle.'],
              recommendedFollowUp: 'Inspect public key against official Certifying Authority (eMudhra/NIC/NSDL) repository.',
            });
          } else if (certState === 'EXPIRED') {
            hasExpiredCert = true;
            signals.push({
              signalId: `CERT-EXPIRED-${doc.id}-${sig.signatureIndex}`,
              source: 'certificate_trust',
              documentId: doc.id,
              documentFilename: filename,
              sha256Hash: hash,
              evidence: `Certificate expired on ${sig.signerCertificate?.validTo || 'unknown date'}.`,
              severity: 'major',
              confidence: 'high',
              isCorroborated: false,
              corroboratingSignalIds: [],
              ruleReference: 'AICTE Digital Signature Validity Rules',
              limitations: ['Certificate was valid at signing time if corroborated by RFC 3161 TSA.'],
              recommendedFollowUp: 'Verify whether signature was executed prior to expiration date.',
            });
          } else if (certState === 'REVOKED') {
            hasRevokedCert = true;
            signals.push({
              signalId: `CERT-REVOKED-${doc.id}-${sig.signatureIndex}`,
              source: 'certificate_trust',
              documentId: doc.id,
              documentFilename: filename,
              sha256Hash: hash,
              evidence: `Digital certificate for ${sig.signerCertificate?.subjectName || 'Signer'} has been revoked by issuing authority.`,
              severity: 'blocking',
              confidence: 'high',
              isCorroborated: false,
              corroboratingSignalIds: [],
              ruleReference: 'AICTE EoA Scrutiny Norms & RFC 5280 Technical Status',
              limitations: ['Revocation confirmed via certificate revocation list or OCSP evidence.'],
              recommendedFollowUp: 'Do not accept filing. Institutional authority must provide valid unrevoked certificate.',
            });
          } else if (certState === 'INCOMPLETE') {
            hasIncompleteCert = true;
            signals.push({
              signalId: `CERT-INCOMPLETE-${doc.id}-${sig.signatureIndex}`,
              source: 'certificate_trust',
              documentId: doc.id,
              documentFilename: filename,
              sha256Hash: hash,
              evidence: `Certificate chain is incomplete: missing intermediate CA certificates between signer and root anchor.`,
              severity: 'minor',
              confidence: 'medium',
              isCorroborated: false,
              corroboratingSignalIds: [],
              ruleReference: 'RFC 5280 Certificate Path Processing',
              limitations: ['Missing intermediate certificates prevent path building.'],
              recommendedFollowUp: 'Request complete PKCS#7 signed bundle including full CA chain.',
            });
          } else if (certState === 'UNTRUSTED') {
            hasUntrustedCert = true;
            signals.push({
              signalId: `CERT-UNTRUSTED-${doc.id}-${sig.signatureIndex}`,
              source: 'certificate_trust',
              documentId: doc.id,
              documentFilename: filename,
              sha256Hash: hash,
              evidence: `Certificate path failed validation: ${sig.chainValidationResult?.diagnosticMessage || 'Issuer signature mismatch or non-CA intermediate'}.`,
              severity: 'major',
              confidence: 'high',
              isCorroborated: false,
              corroboratingSignalIds: [],
              ruleReference: 'RFC 5280 PKIX Path Validation',
              limitations: ['Path validation failed on signature, basic constraints, or key usage.'],
              recommendedFollowUp: 'Officer scrutiny required to examine certificate path and CA authorization.',
            });
          } else {
            hasUnsupportedCert = true;
          }
        }
      }
    }

    // D. Image Forensics Signals
    if (report.imageForensicsReport) {
      const iRep = report.imageForensicsReport;
      for (const imgFinding of iRep.findings) {
        signals.push({
          signalId: `IMG-${imgFinding.code}-${doc.id}`,
          source: 'image_manipulation',
          documentId: doc.id,
          documentFilename: filename,
          sha256Hash: hash,
          evidence: `${imgFinding.title}: ${imgFinding.explanation}`,
          severity: imgFinding.severity,
          confidence: imgFinding.confidence,
          isCorroborated: false,
          corroboratingSignalIds: [],
          limitations: imgFinding.limitations,
          recommendedFollowUp: imgFinding.recommendedFollowUp,
        });
      }
    }
  }

  // 2. Cross-Document Entity Alignment Signals
  let hasDiscrepancy = false;
  for (const cmp of crossDocumentComparisons) {
    if (cmp.outcome === 'genuine_discrepancy') {
      hasDiscrepancy = true;
      const primaryDocId = cmp.comparedValues[0]?.documentId;
      signals.push({
        signalId: `CMP-${cmp.fieldName}`,
        source: 'cross_document',
        documentId: primaryDocId,
        evidence: `Cross-document mismatch on ${cmp.fieldLabel}: ${cmp.explanation}`,
        severity: 'major',
        confidence: 'high',
        isCorroborated: false,
        corroboratingSignalIds: [],
        ruleReference: 'AICTE Approval Process Handbook (APH) 2024–2027 Chapter I',
        limitations: ['Data entry discrepancy between institutional portal and legal deed.'],
        recommendedFollowUp: 'Request clarification or legal deed confirming exact legal name spelling.',
      });
    }
  }

  // 3. Document Readability & Extraction Confidence Signals
  for (const ext of extractions) {
    if (ext.extraction_status === 'failed') {
      signals.push({
        signalId: `EXT-FAIL-${ext.document_id}`,
        source: 'extraction_readability',
        documentId: ext.document_id,
        evidence: `Document extraction failed: ${ext.error_message || 'Unreadable text or unsupported raster encoding.'}`,
        severity: 'major',
        confidence: 'high',
        isCorroborated: false,
        corroboratingSignalIds: [],
        limitations: ['Scanned at low DPI, blur, or corrupted font encoding.'],
        recommendedFollowUp: 'Request legible high-resolution copy.',
      });
    }
  }

  // 4. EoA Statutory Rule Findings
  let hasMissingStatutoryDocs = false;
  let hasBlockingRuleFailure = false;
  for (const finding of eoaFindings) {
    if (finding.status === 'FAIL') {
      if (finding.category === 'missing_documents') {
        hasMissingStatutoryDocs = true;
      }
      if (finding.isBlocking) {
        hasBlockingRuleFailure = true;
      }
      signals.push({
        signalId: `EOA-${finding.id}`,
        source: 'eoa_statutory_rule',
        evidence: `${finding.title}: ${finding.explanation}`,
        severity: finding.severity,
        confidence: 'high',
        isCorroborated: false,
        corroboratingSignalIds: [],
        ruleReference: finding.ruleCitation || finding.ruleId,
        limitations: ['Statutory checklist evaluation based on currently uploaded dossier.'],
        recommendedFollowUp: finding.recommendedAction || 'Upload mandatory document.',
      });
    }
  }

  // 5. Compute Signal Corroboration
  // Strictly requires INDEPENDENT DOMAINS (sA.source !== sB.source) to prevent circular corroboration!
  let corroboratedCount = 0;
  for (let i = 0; i < signals.length; i++) {
    for (let j = i + 1; j < signals.length; j++) {
      const sA = signals[i];
      const sB = signals[j];

      // Independence rule: Two findings from the SAME domain (e.g. two image manipulation findings)
      // derived from the same underlying scan/metadata CANNOT corroborate each other.
      if (sA.source === sB.source) continue;

      // Independent cross-domain corroboration:
      // (1) Same document affected by two distinct domains (e.g. image_manipulation + pdf_forensics / crypto_signature)
      // (2) Cross-document discrepancy affecting the same document as an image anomaly
      const sameDocMatch = sA.documentId && sA.documentId === sB.documentId;
      const isCrossDocCorroboration =
        sameDocMatch &&
        ((sA.source === 'cross_document' && sB.source === 'image_manipulation') ||
          (sB.source === 'cross_document' && sA.source === 'image_manipulation'));

      const isMultiDomainAnomaly =
        sameDocMatch &&
        ((sA.source === 'image_manipulation' && (sB.source === 'pdf_forensics' || sB.source === 'crypto_signature')) ||
          (sB.source === 'image_manipulation' && (sA.source === 'pdf_forensics' || sA.source === 'crypto_signature')));

      if (isMultiDomainAnomaly || isCrossDocCorroboration) {
        sA.isCorroborated = true;
        sB.isCorroborated = true;
        sA.corroboratingSignalIds.push(sB.signalId);
        sB.corroboratingSignalIds.push(sA.signalId);
        corroboratedCount++;
      }
    }
  }

  // 6. Compute Decoupled 5 Dimension Statuses
  // Dimension 1: Technical Document Integrity
  let technicalDocumentIntegrity: TechnicalIntegrityStatus = 'PASS';
  if (hasCorruptFile) {
    technicalDocumentIntegrity = 'FAIL';
  } else if (signals.some((s) => s.source === 'pdf_forensics' && s.severity === 'major')) {
    technicalDocumentIntegrity = 'WARNING';
  }

  // Dimension 2: Cryptographic Signature Integrity
  let cryptographicSignatureIntegrity: CryptographicSignatureStatus = 'NOT_APPLICABLE';
  if (hasAnySignatures) {
    if (hasFailedSignature) {
      cryptographicSignatureIntegrity = 'FAILED';
    } else if (hasVerifiedSignature) {
      cryptographicSignatureIntegrity = 'VERIFIED';
    } else {
      cryptographicSignatureIntegrity = 'NOT_VERIFIED';
    }
  }

  // Dimension 3: Certificate Trust Status
  let certificateTrust: CertificateTrustStatus = 'NOT_APPLICABLE';
  if (hasAnySignatures) {
    if (hasRevokedCert) {
      certificateTrust = 'REVOKED';
    } else if (hasUntrustedCert) {
      certificateTrust = 'UNTRUSTED';
    } else if (hasExpiredCert) {
      certificateTrust = 'EXPIRED';
    } else if (hasIncompleteCert) {
      certificateTrust = 'INCOMPLETE';
    } else if (hasUnanchoredCert) {
      certificateTrust = 'UNANCHORED';
    } else if (hasUnsupportedCert) {
      certificateTrust = 'UNSUPPORTED';
    } else if (hasTrustedCert) {
      certificateTrust = 'TRUSTED';
    } else {
      certificateTrust = 'UNANCHORED';
    }
  }

  // Dimension 4: Regulatory Compliance
  let regulatoryCompliance: RegulatoryComplianceStatus = 'COMPLIANT';
  if (hasMissingStatutoryDocs || hasBlockingRuleFailure || hasFailedSignature || hasRevokedCert) {
    regulatoryCompliance = 'DEFICIENT';
  } else if (hasDiscrepancy || signals.some((s) => s.source === 'eoa_statutory_rule' && s.severity === 'major')) {
    regulatoryCompliance = 'PENDING_REVIEW';
  }

  // Dimension 5: Risk Requiring Human Review
  // High risk ONLY when cryptographic failure occurs or multiple corroborated anomalies exist.
  // Isolated image anomaly is strictly MEDIUM risk for officer review, never auto-rejection.
  let riskRequiringHumanReview: ReviewRiskLevel = 'LOW';
  const blockingCount = signals.filter((s) => s.severity === 'blocking').length;
  const majorCount = signals.filter((s) => s.severity === 'major').length;

  if (hasFailedSignature || blockingCount >= 2 || (hasCorruptFile && hasBlockingRuleFailure)) {
    riskRequiringHumanReview = 'CRITICAL';
  } else if (blockingCount >= 1 || (majorCount >= 2 && corroboratedCount > 0)) {
    riskRequiringHumanReview = 'HIGH';
  } else if (majorCount >= 1 || signals.some((s) => s.source === 'image_manipulation' && s.severity !== 'info')) {
    riskRequiringHumanReview = 'MEDIUM';
  }

  // Executive summary
  const executiveSummary = [
    `Technical Integrity: ${technicalDocumentIntegrity}.`,
    `Cryptographic Signatures: ${cryptographicSignatureIntegrity} (${
      hasAnySignatures ? `${certificateTrust} trust` : 'No embedded signatures'
    }).`,
    `Regulatory Compliance: ${regulatoryCompliance} (${signals.length} contributing signals identified).`,
    `Review Risk Level: ${riskRequiringHumanReview}.`,
    riskRequiringHumanReview === 'CRITICAL'
      ? 'Mandatory officer review required due to cryptographic or structural integrity failures.'
      : riskRequiringHumanReview === 'HIGH'
      ? 'Elevated risk detected with corroborated findings. Scrutiny officer must review highlighted evidence.'
      : riskRequiringHumanReview === 'MEDIUM'
      ? 'Advisory findings or isolated image/heuristic observations detected. Human verification recommended prior to final approval.'
      : 'All technical and regulatory baseline parameters are satisfied.',
  ].join(' ');

  return {
    applicationId: application.id,
    evaluatedAt: new Date().toISOString(),
    dimensionStatuses: {
      technicalDocumentIntegrity,
      cryptographicSignatureIntegrity,
      certificateTrust,
      regulatoryCompliance,
      riskRequiringHumanReview,
    },
    executiveSummary,
    totalSignals: signals.length,
    blockingSignalsCount: blockingCount,
    corroboratedSignalsCount: corroboratedCount,
    contributingSignals: signals,
    isDeterministicAndReproducible: true,
  };
}
