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

export type PhaseStatus =
  | 'Phase 0: Project Initialisation'
  | 'Phase 1: Frontend Foundation'
  | 'Phase 2: Supabase Integration'
  | 'Phase 3: Secure Document Ingestion'
  | 'Phase 4: OCR & Document Intelligence';

export interface ProjectMetadata {
  name: string;
  tagline: string;
  description: string;
  sihTrack: string;
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
 * Phase 3: Document Ingestion, Metadata & Storage Types
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
 * Phase 4: Document Intelligence, Field Extraction & Human Review Types
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

export interface ScreeningBatchItem {
  id: string;
  applicantIdentifier: string;
  targetCategory: string;
  outcome: ScreeningOutcome;
  documentCount: number;
  findings: ValidationFinding[];
  counts: ValidationSummaryCounts;
  extractedFields: Record<string, string>;
  sourceFiles: Array<{ name: string; size: number; mimeType: string }>;
  processedAt: string;
}

export interface ScreeningBatch {
  id: string;
  title: string;
  organisationId?: string;
  targetCategory: string;
  totalApplications: number;
  outcomeCounts: Record<ScreeningOutcome, number>;
  items: ScreeningBatchItem[];
  createdAt: string;
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

