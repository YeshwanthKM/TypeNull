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
 * Supabase Database Models (Phase 2 & Phase 3)
 */
export interface UserProfile {
  id: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
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
  | 'processing'
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
