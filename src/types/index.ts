/**
 * Core Type Definitions for TypeNull Platform
 */

export interface NavItem {
  label: string;
  href: string;
  isExternal?: boolean;
  iconName?: string;
}

export interface FeaturePillar {
  id: string;
  title: string;
  category: 'document-verification' | 'application-validation' | 'compliance-checking';
  shortDescription: string;
  details: string[];
  iconName: 'FileCheck' | 'Layers' | 'ShieldAlert' | 'FileText' | 'CheckCircle';
  badge: string;
}

export type ProductTier =
  | 'applicant_prevalidation'
  | 'organisation_bulk_screening'
  | 'admin_governance';

export interface ProjectMetadata {
  name: string;
  tagline: string;
  description: string;
  complianceDomain?: string;
  version: string;
}

/**
 * Application & Verification Schema Types
 */
export type ApplicationCategory =
  | 'general_registration'
  | 'organisation_registration'
  | 'institution_registration'
  | 'certificate_verification'
  | 'regulatory_application';

export interface ApplicationCategoryOption {
  value: ApplicationCategory;
  label: string;
  description: string;
}

export interface NewApplicationFormData {
  title: string;
  category: ApplicationCategory | '';
  institutionName: string;
  registrationNumber: string;
  jurisdiction: string;
  description: string;
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'pending_documents'
  | 'verified'
  | 'flagged_inconsistency'
  | 'prototype';

/**
 * Supabase Database Models (Authentication & Roles)
 */
export type UserRole = 'applicant' | 'officer' | 'administrator';

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Organisation {
  id: string;
  name: string;
  code: string;
  category?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganisationMember {
  id: string;
  organisation_id: string;
  user_id: string;
  member_role: 'officer' | 'lead_officer' | 'admin';
  created_at: string;
}

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export interface OrganisationAccessRequest {
  id: string;
  user_id: string;
  organisation_id: string;
  explanation?: string | null;
  status: AccessRequestStatus;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  review_note?: string | null;
  created_at?: string;
  updated_at?: string;
  // Joined or populated fields for presentation
  user_name?: string;
  user_email?: string;
  organisation_name?: string;
  organisation_code?: string;
  reviewer_name?: string;
}

export interface DbApplication {
  id: string;
  user_id: string;
  title: string;
  category: string;
  organisation_name: string;
  registration_number: string | null;
  jurisdiction: string;
  description: string | null;
  status: 'draft' | 'submitted' | 'under_review';
  assigned_organisation_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationRecord {
  id: string;
  title: string;
  category: string;
  institutionName: string;
  registrationNumber?: string;
  jurisdiction: string;
  description?: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Document Ingestion, Metadata & Storage Types
 */
export type DocumentCategory =
  | 'registration_certificate'
  | 'identity_document'
  | 'address_proof'
  | 'tax_financial_document'
  | 'application_form'
  | 'supporting_evidence'
  | 'other';

export type DocumentProcessingStatus =
  | 'uploaded'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'extracted'
  | 'failed';

export interface ApplicationDocument {
  id: string;
  application_id: string;
  user_id: string;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  document_type: DocumentCategory;
  processing_status: DocumentProcessingStatus;
  created_at: string;
  updated_at: string;
}

export interface DocumentUploadOptions {
  applicationId: string;
  userId: string;
  file: File;
  documentType: DocumentCategory;
}

/**
 * Document Intelligence, Field Extraction & Human Review Types
 */
export type ExtractionStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type ExtractionMethod = 'pdf_text' | 'ocr' | 'hybrid' | 'manual';

export type FieldReviewStatus = 'needs_review' | 'confirmed' | 'corrected';

export type ExtractedFieldName =
  | 'organisation_name'
  | 'applicant_name'
  | 'registration_number'
  | 'issue_date'
  | 'expiry_date'
  | 'address'
  | 'issuing_authority'
  | 'document_title';

export interface DocumentExtractionRecord {
  id: string;
  document_id: string;
  application_id: string;
  user_id: string;
  extraction_status: ExtractionStatus;
  extraction_method: ExtractionMethod;
  raw_text: string | null;
  page_count: number;
  classified_type: DocumentCategory | null;
  classification_confidence: number | null;
  classification_reason: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedFieldRecord {
  id: string;
  extraction_id: string;
  document_id: string;
  application_id: string;
  user_id: string;
  field_name: ExtractedFieldName | string;
  field_label: string;
  extracted_value: string | null;
  reviewed_value: string | null;
  page_number: number;
  evidence_snippet: string | null;
  extraction_method: ExtractionMethod | string;
  confidence_score: number | null;
  review_status: FieldReviewStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Shared Validation Engine & Screening Types
 */
export type FindingStatus =
  | 'passed'
  | 'failed'
  | 'warning'
  | 'needs_review'
  | 'unable_to_check';

export type FindingSeverity = 'blocking' | 'major' | 'minor' | 'info';

export type ScreeningOutcome =
  | 'Complete'
  | 'Minor Issues'
  | 'Major Issues'
  | 'Unable to Assess';

export interface ValidationFinding {
  id: string;
  ruleId: string;
  ruleVersion: string;
  title: string;
  status: FindingStatus;
  severity: FindingSeverity;
  explanation: string;
  sourceDocument?: string;
  sourcePage?: number;
  observedValue?: string | null;
  expectedValue?: string | null;
  evidenceSnippet?: string | null;
  recommendedAction?: string;
  isBlocking: boolean;
  requiresManualReview: boolean;
  referenceCitation?: string;
}

export interface ValidationSummaryCounts {
  passed: number;
  warnings: number;
  minorIssues: number;
  majorIssues: number;
  unableToAssess: number;
  total: number;
}

export interface ValidationRun {
  id: string;
  applicationId: string;
  category: string;
  outcome: ScreeningOutcome;
  findings: ValidationFinding[];
  counts: ValidationSummaryCounts;
  validatedAt: string;
}

export type BatchProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ScreeningBatchItem {
  id: string;
  batchId?: string;
  applicationId?: string;
  applicantIdentifier: string;
  applicantName?: string;
  targetCategory: string;
  serviceCode?: string;
  variantCode?: string;
  status?: BatchProcessingStatus;
  outcome: ScreeningOutcome;
  documentCount: number;
  findings: ValidationFinding[];
  counts: ValidationSummaryCounts;
  extractedFields: Record<string, string>;
  sourceFiles: Array<{ name: string; size: number; mimeType: string }>;
  errorMessage?: string;
  isStale?: boolean;
  processedAt: string;
}

export interface ScreeningBatch {
  id: string;
  title: string;
  organisationId?: string;
  serviceCode?: string;
  variantCode?: string;
  targetCategory: string;
  totalApplications: number;
  outcomeCounts: Record<ScreeningOutcome, number>;
  status?: BatchProcessingStatus;
  items: ScreeningBatchItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface StatutoryCitation {
  authority: string;
  statute: string;
  section: string;
  effectiveDate: string;
  sourceUrl?: string;
  verificationStatus: 'verified' | 'provisional' | 'synthetic_reference';
}

export interface CategoryRequirement {
  id: string;
  categoryKey: string;
  displayName: string;
  jurisdiction: string;
  citation: StatutoryCitation;
  mandatoryDocuments: Array<{
    type: DocumentCategory;
    name: string;
    description: string;
    acceptableFormats: string[];
  }>;
  mandatoryFields: Array<{
    fieldName: string;
    label: string;
    regexPattern?: string;
    description: string;
    example: string;
  }>;
  crossDocumentChecks: Array<{
    id: string;
    name: string;
    description: string;
    severity: FindingSeverity;
  }>;
}

/**
 * Government Services & Ingestion System Types
 */
export type GovernmentSourceType =
  | 'portal'
  | 'directory'
  | 'department_site'
  | 'gazette'
  | 'statutory_code'
  | 'national_services_portal'
  | 'statutory_repository';

export type SourceRetrievalStatus = 'active' | 'limited' | 'inaccessible' | 'rate_limited' | 'pending_verification';

export type LifecycleStatus =
  | 'discovered'
  | 'downloaded'
  | 'extracted'
  | 'needs_verification'
  | 'verified'
  | 'published'
  | 'superseded'
  | 'inactive';

export type RequirementClassification =
  | 'mandatory'
  | 'conditional'
  | 'alternative'
  | 'optional';

export interface GovernmentSource {
  id: string;
  authority: string;
  sourceUrl: string;
  sourceType: GovernmentSourceType;
  jurisdiction: string;
  supportedCategories: string[];
  retrievalStatus: SourceRetrievalStatus;
  verificationStatus?: 'verified' | 'provisional' | 'unverified';
  isVerifiedOfficial?: boolean;
  accessLimitations?: string;
  lastDiscoveredAt: string;
  lastCheckedAt: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GovernmentService {
  id: string;
  sourceId?: string;
  serviceName: string;
  serviceCode: string;
  department: string;
  jurisdiction: string;
  officialUrl: string;
  description: string;
  category: string;
  status: 'active' | 'inactive' | 'deprecated';
  applicationTypes: ServiceApplicationType[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceApplicationType {
  id: string;
  serviceId: string;
  applicationName: string;
  variantCode: string;
  applicantCategory?: string;
  requirementsVersion: string;
  lifecycleStatus: LifecycleStatus;
  publishedAt?: string | null;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  adminNotes?: string | null;
  officialDocuments?: OfficialDocumentCatalogEntry[];
  requirements: ApplicationDocumentRequirement[];
  conditionalQuestions: ApplicationConditionalQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface OfficialDocumentCatalogEntry {
  id: string;
  applicationTypeId?: string;
  sourceId?: string;
  formIdentifier: string;
  title: string;
  sourceUrl: string;
  fileFormat: 'pdf' | 'html' | 'docx' | 'csv' | 'json' | 'xml' | 'other';
  contentHashSha256: string;
  fileSizeBytes: number;
  effectiveDate?: string | null;
  extractionStatus: 'discovered' | 'downloaded' | 'extracted' | 'failed';
  extractionMetadata: Record<string, any>;
  lastCheckedAt: string;
  createdAt: string;
}

export interface ApplicationDocumentRequirement {
  id: string;
  applicationTypeId?: string;
  documentName: string;
  documentType?: DocumentCategory;
  canonicalDocumentKey?: string;
  requirementClassification?: RequirementClassification;
  classification?: RequirementClassification;
  isMandatory?: boolean;
  conditionExpression?: string | null;
  acceptedAlternatives?: string[];
  requiredFields?: string[];
  sourceEvidence?: string | null;
  sourceEvidenceSnippet?: string | null;
  sourceUrl?: string | null;
  extractionConfidence?: number;
  verificationStatus?: 'extracted' | 'needs_review' | 'verified' | 'rejected';
  createdAt?: string;
}

export interface ApplicationConditionalQuestion {
  id: string;
  applicationTypeId?: string;
  questionKey?: string;
  questionCode?: string;
  questionText: string;
  responseType?: 'boolean' | 'select' | 'text' | 'number';
  questionType?: 'boolean' | 'select' | 'text' | 'number';
  options?: Array<{ value: string; label: string } | string>;
  defaultValue?: string | null;
  helpText?: string | null;
  triggerCondition?: string;
  triggeredRequirementKeys?: string[];
  activatesDocumentTypes?: string[];
  displayOrder?: number;
  createdAt?: string;
}

export interface IngestionRunSummary {
  sourcesScanned: number;
  resourcesDiscovered: number;
  resourcesDownloaded: number;
  resourcesParsed: number;
  errorsCount: number;
  verifiedCount: number;
  publishedCount: number;
  breakdownBySource: Record<string, { discovered: number; downloaded: number; failed: number }>;
}

export interface IngestionRun {
  id: string;
  startedBy?: string | null;
  runType: 'manual' | 'scheduled' | 'incremental_resume';
  sourcesScanned: number;
  resourcesDiscovered: number;
  resourcesDownloaded: number;
  resourcesParsed: number;
  errorsCount: number;
  reportSummary: IngestionRunSummary | Record<string, any>;
  status: 'running' | 'completed' | 'interrupted' | 'failed';
  createdAt: string;
}

export interface PersonalizedChecklistResult {
  applicationTypeId: string;
  serviceName: string;
  mandatoryDocuments: ApplicationDocumentRequirement[];
  conditionalDocuments: Array<{
    requirement: ApplicationDocumentRequirement;
    triggeredByQuestion: string;
    userAnswer: any;
  }>;
  alternativeDocumentGroups: Array<{
    groupName: string;
    options: ApplicationDocumentRequirement[];
    isSatisfied: boolean;
  }>;
  optionalDocuments: ApplicationDocumentRequirement[];
  unresolvedRequirements: Array<{
    requirement: ApplicationDocumentRequirement;
    reason: string;
  }>;
  totalRequiredCount: number;
}

/**
 * =============================================================================
 * Document Reference Dataset & Authenticity Verification Types
 * =============================================================================
 */

export type ReferenceReviewStatus = 'pending_review' | 'approved' | 'retired' | 'rejected';

export type ReferenceProvenance =
  | 'synthetic_demo'
  | 'official_gazette'
  | 'regulatory_standard'
  | 'internal_curation';

export interface DocumentReferenceType {
  id: string;
  code: string; // e.g. doc_type_pan_card, doc_type_coi, doc_type_gst_reg06
  name: string;
  description: string;
  applicationCategory: string;
  issuingAuthority: string;
  jurisdiction: string;
  created_at: string;
  updated_at: string;
}

export interface ExpectedFieldDefinition {
  fieldKey: string;
  label: string;
  formatRegex?: string;
  description?: string;
  mandatory: boolean;
}

export interface ExpectedQrStructure {
  format: 'gstin_b2b' | 'digital_seal' | 'url_reference' | 'none';
  requiredPattern?: string;
  description?: string;
}

export interface DocumentReferenceTemplate {
  id: string;
  documentTypeId: string;
  version: string; // e.g. 'v1.0', 'v2.0'
  effectiveDate: string; // ISO date string YYYY-MM-DD
  expiryDate: string | null;
  isSynthetic: boolean;
  provenance: ReferenceProvenance;
  reviewStatus: ReferenceReviewStatus;
  lastReviewedAt: string;
  reviewedBy: string | null;
  approvalNotes: string | null;
  expectedPageStructure: {
    pageCount: number;
    dimensions: { width: number; height: number };
    orientation: 'portrait' | 'landscape';
  };
  expectedHeadings: string[];
  requiredFields: ExpectedFieldDefinition[];
  expectedQrStructure?: ExpectedQrStructure;
  digitalSignatureRequirements: 'mandatory' | 'optional' | 'unsupported';
  officialVerificationMethod: string;
  officialVerificationSource: string;
  referenceFileMetadata?: {
    filename: string;
    sizeBytes: number;
    sha256?: string;
    sampleContentSnippet?: string;
  };
  created_at: string;
  updated_at: string;
}

export type ApplicationComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'INCOMPLETE';
export type TemplateComparisonStatus = 'MATCH' | 'STRUCTURAL_MISMATCH' | 'TEMPLATE_UNAVAILABLE' | 'NOT_CHECKED';
export type TextConsistencyStatus = 'CONSISTENT' | 'INCONSISTENT' | 'FIELD_MISSING' | 'NOT_CHECKED';
export type AlterationStatus = 'NO_ALTERATIONS_DETECTED' | 'SUSPICIOUS' | 'INCONCLUSIVE';
export type QrAndSignatureStatus = 'VALID_SIGNATURE' | 'NO_SIGNATURE' | 'MALFORMED_OR_INVALID' | 'UNSUPPORTED';
export type IssuerVerificationStatus = 'VERIFIED' | 'VERIFICATION_FAILED' | 'UNABLE_TO_VERIFY' | 'NOT_CHECKED';
export type OverallAuthenticityStatus = 'VERIFIED' | 'VERIFICATION_FAILED' | 'SUSPICIOUS' | 'UNABLE_TO_VERIFY' | 'NOT_CHECKED';

export interface StructuralFinding {
  aspect: string;
  expected: string;
  observed: string;
  matched: boolean;
  severity: 'info' | 'warning' | 'alert';
}

export interface FieldComparisonFinding {
  fieldKey: string;
  label: string;
  expectedFormat?: string;
  observedValue: string | null;
  status: 'present_valid' | 'missing' | 'format_mismatch' | 'discrepancy';
  details: string;
}

export interface AlterationIndicator {
  indicatorType: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  evidence: string;
  limitations: string;
}

export interface QrAndSignatureFinding {
  hasQr: boolean;
  qrDecodedContent?: string | null;
  qrValidationStatus: 'valid' | 'malformed' | 'unsupported' | 'not_present';
  qrNotes?: string;
  hasDigitalSignature: boolean;
  signatureDetails?: string;
  signatureValid?: boolean;
  limitations: string;
}

export interface IssuerVerificationFinding {
  attempted: boolean;
  method: string;
  source: string;
  status: IssuerVerificationStatus;
  details: string;
  limitations: string;
  verifiedAt?: string;
}

export interface DocumentAuthenticityAssessment {
  id: string;
  documentId: string;
  applicationId: string;
  originalFilename: string;
  detectedDocumentType: string;
  claimedIssuingAuthority: string;
  selectedReferenceId: string | null;
  selectedReferenceVersion: string | null;
  selectedReferenceProvenance: ReferenceProvenance | null;
  referenceTrustStatus: ReferenceReviewStatus | null;
  selectionReason: string;
  ocrStatus: string;
  structuralComparisonFindings: StructuralFinding[];
  fieldComparisonFindings: FieldComparisonFinding[];
  alterationIndicators: AlterationIndicator[];
  qrAndSignatureFindings: QrAndSignatureFinding;
  issuerVerificationResult: IssuerVerificationFinding;
  checksNotPerformed: string[];
  recommendedNextAction: string;
  statusDimensions: {
    applicationCompliance: ApplicationComplianceStatus;
    templateComparison: TemplateComparisonStatus;
    textConsistency: TextConsistencyStatus;
    alterationIndicators: AlterationStatus;
    qrAndSignatureVerification: QrAndSignatureStatus;
    issuingAuthorityVerification: IssuerVerificationStatus;
    overallAuthenticity: OverallAuthenticityStatus;
  };
  createdAt: string;
}


