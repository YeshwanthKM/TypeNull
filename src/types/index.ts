/**
 * Core Type Definitions for TypeNull Platform
 */

export interface NavItem {
  label: string;
  href: string;
  isExternal?: boolean;
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

export type PhaseStatus = 'Phase 0: Project Initialisation' | 'Phase 1: Planned' | 'Phase 2: Planned';

export interface ProjectMetadata {
  name: string;
  tagline: string;
  description: string;
  sihTrack: string;
  version: string;
}
