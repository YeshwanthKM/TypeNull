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
  | 'Phase 3: Document Intelligence';

export interface ProjectMetadata {
  name: string;
  tagline: string;
  description: string;
  sihTrack: string;
  version: string;
}

/**
 * Phase 1 Application & Verification Schema Types
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
  | 'pending_documents'
  | 'under_review'
  | 'verified'
  | 'flagged_inconsistency'
  | 'prototype';

export interface ApplicationRecord {
  id: string;
  title: string;
  category: ApplicationCategory;
  institutionName: string;
  registrationNumber?: string;
  jurisdiction: string;
  description?: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}
