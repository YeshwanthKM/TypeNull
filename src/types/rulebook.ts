/**
 * AICTE Rulebook & Regulatory Traceability Type Definitions
 * Grounded in AICTE Approval Process Handbook (APH) 2024–2027
 */

export type RuleVerificationStatus = 'verified' | 'conditional' | 'unverified' | 'superseded';

export type RegulatoryTopic =
  | 'approval_process'
  | 'infrastructure'
  | 'faculty_cadre'
  | 'financial_legal'
  | 'accreditation';

export interface RegulatorySource {
  id: string;
  title: string;
  shortTitle: string;
  academicYearRange: string;
  documentType: 'handbook' | 'gazette_notification' | 'circular' | 'public_notice' | 'statutory_act';
  issuingAuthority: string;
  sourceUrl: string;
  publicationDate: string;
  effectiveDate: string;
  isCurrentApplicable: boolean;
  summary: string;
}

export interface AicteRegulatoryRule {
  id: string;
  sourceId: string;
  ruleCode: string;
  title: string;
  topic: RegulatoryTopic;
  chapterOrAppendix: string;
  clauseOrSection: string;
  applicableCategory: 'extension_of_approval' | 'all_technical_institutions' | 'new_institutions';
  institutionApplicability: string;
  verificationStatus: RuleVerificationStatus;
  officialTextExcerpt: string;
  plainLanguageExplanation: string;
  institutionalAction: string;
  complianceEvidence: string;
  requiredDocumentKeys: string[];
  dependenciesOrExceptions?: string;
  lastVerifiedDate: string;
  version: string;
}

export interface ComplianceChecklistItem {
  id: string;
  ruleId: string;
  title: string;
  topic: RegulatoryTopic;
  chapterOrAppendix: string;
  plainLanguageExplanation: string;
  verificationStatus: RuleVerificationStatus;
  institutionStatus: 'compliant' | 'in_progress' | 'deficiency_noted' | 'not_applicable';
  evidenceDocumentName?: string;
  evidenceProvided: boolean;
  officialCitation: string;
  actionRequired: string;
}
