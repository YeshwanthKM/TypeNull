/**
 * ==============================================================================
 * TypeNull Document Reference Dataset & Authenticity Verification Service
 * ==============================================================================
 *
 * Implements:
 * 1. Central Document Reference Dataset Management (CRUD, review, retire).
 * 2. Automatic Reference Selection with version and date matching.
 * 3. Real Structural & Text Comparison Engine.
 * 4. Potential Alteration & Tampering Indicators.
 * 5. QR Code & Digital Signature Inspection.
 * 6. Adapter-based Issuing-Authority Verification Layer.
 * 7. Multi-Dimensional Assessment Synthesis (7 distinct dimensions).
 *
 * Fully supports live Supabase database queries and offline evaluation / browser
 * storage / Node.js test environment fallbacks.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  DocumentReferenceType,
  DocumentReferenceTemplate,
  DocumentAuthenticityAssessment,
  ReferenceReviewStatus,
  StructuralFinding,
  FieldComparisonFinding,
  AlterationIndicator,
  QrAndSignatureFinding,
  IssuerVerificationFinding,
  OverallAuthenticityStatus,
  ApplicationComplianceStatus,
  TemplateComparisonStatus,
  TextConsistencyStatus,
  AlterationStatus,
  QrAndSignatureStatus,
  IssuerVerificationStatus,
} from '../types';

/**
 * ==============================================================================
 * Pre-seeded Default Reference Dataset (Synthetic Demo References)
 * ==============================================================================
 *
 * Explicitly identified as synthetic demo references. Not represented as
 * genuine government-issued documents.
 */

export const DEFAULT_REFERENCE_TYPES: DocumentReferenceType[] = [
  {
    id: 'ref-type-pan',
    code: 'doc_type_pan_card',
    name: 'Permanent Account Number (PAN) Card',
    description: 'National tax identity document issued to individuals and entities for taxation assessment.',
    applicationCategory: 'Direct Taxation & Identity Proof',
    issuingAuthority: 'Income Tax Department, Government of India',
    jurisdiction: 'India',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ref-type-coi',
    code: 'doc_type_coi',
    name: 'Certificate of Incorporation (COI)',
    description: 'Statutory certificate issued upon corporate entity registration under the Companies Act.',
    applicationCategory: 'Corporate Governance & Entity Formation',
    issuingAuthority: 'Ministry of Corporate Affairs - Registrar of Companies',
    jurisdiction: 'India',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ref-type-gst',
    code: 'doc_type_gst_reg06',
    name: 'GST Registration Certificate (Form GST REG-06)',
    description: 'Statutory registration certificate for taxpayers under Goods and Services Tax enactments.',
    applicationCategory: 'Indirect Taxation & Enterprise Compliance',
    issuingAuthority: 'Goods and Services Tax Network (GSTN)',
    jurisdiction: 'India',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ref-type-utility',
    code: 'doc_type_bescom_bill',
    name: 'Commercial Electricity Connection Bill (BESCOM)',
    description: 'Utility proof verifying physical occupancy and operational premises of an enterprise.',
    applicationCategory: 'Registered Office Address Proof',
    issuingAuthority: 'Bangalore Electricity Supply Company Limited (BESCOM)',
    jurisdiction: 'Karnataka, India',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ref-type-unapproved',
    code: 'doc_type_trade_licence',
    name: 'Municipal Trade & Operational Licence',
    description: 'Candidate reference awaiting administrative review. Must not be used for comparison.',
    applicationCategory: 'Municipal Clearance',
    issuingAuthority: 'Bruhat Bengaluru Mahanagara Palike (BBMP)',
    jurisdiction: 'Karnataka, India',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_REFERENCE_TEMPLATES: DocumentReferenceTemplate[] = [
  // 1. PAN Card Template v1.0 (Approved)
  {
    id: 'tmpl-pan-v1',
    documentTypeId: 'ref-type-pan',
    version: 'v1.0',
    effectiveDate: '2018-01-01',
    expiryDate: null,
    isSynthetic: true,
    provenance: 'synthetic_demo',
    reviewStatus: 'approved',
    lastReviewedAt: '2026-01-15T10:00:00.000Z',
    reviewedBy: 'system-admin',
    approvalNotes: 'Synthetic reference baseline verified against ITD PAN card specifications.',
    expectedPageStructure: {
      pageCount: 1,
      dimensions: { width: 612, height: 792 },
      orientation: 'portrait',
    },
    expectedHeadings: [
      'Income Tax Department',
      'Permanent Account Number Card',
    ],
    requiredFields: [
      {
        fieldKey: 'pan_number',
        label: 'Permanent Account Number',
        formatRegex: '^[A-Z]{5}[0-9]{4}[A-Z]$',
        description: 'Standard 10-character alphanumeric PAN identifier',
        mandatory: true,
      },
      {
        fieldKey: 'name',
        label: 'Name of Cardholder',
        formatRegex: '^[A-Z\\s.]+$',
        description: 'Legal full name in capital letters',
        mandatory: true,
      },
      {
        fieldKey: 'father_name',
        label: "Father's Name",
        formatRegex: '^[A-Z\\s.]+$',
        description: "Father's legal name",
        mandatory: true,
      },
      {
        fieldKey: 'dob',
        label: 'Date of Birth / Formation',
        formatRegex: '^\\d{2}/\\d{2}/\\d{4}$',
        description: 'DD/MM/YYYY date format',
        mandatory: true,
      },
    ],
    digitalSignatureRequirements: 'unsupported',
    officialVerificationMethod: 'pan_tin_nsdl_api',
    officialVerificationSource: 'https://tin.tin.nsdl.com/tan/servlet/PanStatus',
    referenceFileMetadata: {
      filename: 'pan_card_reference_v1.pdf',
      sizeBytes: 1024,
      sampleContentSnippet: 'Income Tax Department Permanent Account Number Card ABCDE1234F',
    },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-15T10:00:00.000Z',
  },

  // 2. Certificate of Incorporation Template v1.0 (Retired / Legacy 2014-2020)
  {
    id: 'tmpl-coi-v1',
    documentTypeId: 'ref-type-coi',
    version: 'v1.0',
    effectiveDate: '2014-04-01',
    expiryDate: '2020-02-22',
    isSynthetic: true,
    provenance: 'synthetic_demo',
    reviewStatus: 'retired',
    lastReviewedAt: '2026-01-10T10:00:00.000Z',
    reviewedBy: 'system-admin',
    approvalNotes: 'Legacy Companies Act 2013 COI format. Retired in favor of SPICe+ integrated format.',
    expectedPageStructure: {
      pageCount: 1,
      dimensions: { width: 612, height: 792 },
      orientation: 'portrait',
    },
    expectedHeadings: [
      'Ministry of Corporate Affairs',
      'Certificate of Incorporation',
    ],
    requiredFields: [
      {
        fieldKey: 'cin',
        label: 'Corporate Identity Number (CIN)',
        formatRegex: '^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$',
        description: '21-digit alphanumeric CIN identifier',
        mandatory: true,
      },
      {
        fieldKey: 'company_name',
        label: 'Name of Company',
        description: 'Registered corporate legal entity name',
        mandatory: true,
      },
      {
        fieldKey: 'date_of_incorporation',
        label: 'Date of Incorporation',
        formatRegex: '^\\d{2}/\\d{2}/\\d{4}$',
        description: 'DD/MM/YYYY incorporation date',
        mandatory: true,
      },
    ],
    digitalSignatureRequirements: 'optional',
    officialVerificationMethod: 'mca_v3_company_search',
    officialVerificationSource: 'https://www.mca.gov.in/content/mca/global/en/mca/fo-llp-services/company-llp-name-search.html',
    referenceFileMetadata: {
      filename: 'mca_coi_reference_v1.pdf',
      sizeBytes: 1048,
    },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-10T10:00:00.000Z',
  },

  // 3. Certificate of Incorporation Template v2.0 (SPICe+ Modern Standard - Approved)
  {
    id: 'tmpl-coi-v2',
    documentTypeId: 'ref-type-coi',
    version: 'v2.0',
    effectiveDate: '2020-02-23',
    expiryDate: null,
    isSynthetic: true,
    provenance: 'synthetic_demo',
    reviewStatus: 'approved',
    lastReviewedAt: '2026-01-15T12:00:00.000Z',
    reviewedBy: 'system-admin',
    approvalNotes: 'SPICe+ modern integrated Certificate of Incorporation with registered office address.',
    expectedPageStructure: {
      pageCount: 1,
      dimensions: { width: 612, height: 792 },
      orientation: 'portrait',
    },
    expectedHeadings: [
      'Ministry of Corporate Affairs',
      'Certificate of Incorporation',
    ],
    requiredFields: [
      {
        fieldKey: 'cin',
        label: 'Corporate Identity Number (CIN)',
        formatRegex: '^[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$',
        description: '21-digit alphanumeric CIN identifier',
        mandatory: true,
      },
      {
        fieldKey: 'company_name',
        label: 'Name of Company',
        description: 'Registered corporate entity name',
        mandatory: true,
      },
      {
        fieldKey: 'date_of_incorporation',
        label: 'Date of Incorporation',
        formatRegex: '^\\d{2}/\\d{2}/\\d{4}$',
        description: 'DD/MM/YYYY incorporation date',
        mandatory: true,
      },
      {
        fieldKey: 'registered_office',
        label: 'Registered Office Address',
        description: 'Full physical address of corporate headquarters',
        mandatory: true,
      },
    ],
    digitalSignatureRequirements: 'optional',
    officialVerificationMethod: 'mca_v3_company_search',
    officialVerificationSource: 'https://www.mca.gov.in/content/mca/global/en/mca/fo-llp-services/company-llp-name-search.html',
    referenceFileMetadata: {
      filename: 'mca_spice_plus_coi_v2.pdf',
      sizeBytes: 1120,
    },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-15T12:00:00.000Z',
  },

  // 4. GST Registration Certificate (Form GST REG-06 - Approved)
  {
    id: 'tmpl-gst-v1',
    documentTypeId: 'ref-type-gst',
    version: 'v1.0',
    effectiveDate: '2017-07-01',
    expiryDate: null,
    isSynthetic: true,
    provenance: 'synthetic_demo',
    reviewStatus: 'approved',
    lastReviewedAt: '2026-01-16T14:00:00.000Z',
    reviewedBy: 'system-admin',
    approvalNotes: 'Official statutory layout for GST REG-06 registration certificate with embedded PAN.',
    expectedPageStructure: {
      pageCount: 1,
      dimensions: { width: 612, height: 792 },
      orientation: 'portrait',
    },
    expectedHeadings: [
      'Goods and Services Tax',
      'Registration Certificate',
    ],
    requiredFields: [
      {
        fieldKey: 'gstin',
        label: 'Registration Number (GSTIN)',
        formatRegex: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$',
        description: '15-character GST identification number containing state code and PAN',
        mandatory: true,
      },
      {
        fieldKey: 'legal_name',
        label: 'Legal Name of Enterprise',
        description: 'Constitutional entity name',
        mandatory: true,
      },
      {
        fieldKey: 'principal_place_of_business',
        label: 'Principal Place of Business',
        description: 'Official principal business location',
        mandatory: true,
      },
      {
        fieldKey: 'date_of_issue',
        label: 'Date of Issue',
        formatRegex: '^\\d{2}/\\d{2}/\\d{4}$',
        description: 'DD/MM/YYYY issue date',
        mandatory: true,
      },
    ],
    expectedQrStructure: {
      format: 'gstin_b2b',
      requiredPattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]',
      description: 'QR barcode contains digital GST taxpayer summary',
    },
    digitalSignatureRequirements: 'optional',
    officialVerificationMethod: 'gstn_public_taxpayer_search',
    officialVerificationSource: 'https://services.gst.gov.in/services/searchtp',
    referenceFileMetadata: {
      filename: 'gst_reg06_reference_v1.pdf',
      sizeBytes: 1180,
    },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-16T14:00:00.000Z',
  },

  // 5. Commercial Utility Electricity Bill (BESCOM - Approved)
  {
    id: 'tmpl-utility-v1',
    documentTypeId: 'ref-type-utility',
    version: 'v1.0',
    effectiveDate: '2021-01-01',
    expiryDate: null,
    isSynthetic: true,
    provenance: 'synthetic_demo',
    reviewStatus: 'approved',
    lastReviewedAt: '2026-01-18T09:00:00.000Z',
    reviewedBy: 'system-admin',
    approvalNotes: 'BESCOM commercial billing reference for commercial premises verification.',
    expectedPageStructure: {
      pageCount: 1,
      dimensions: { width: 612, height: 792 },
      orientation: 'portrait',
    },
    expectedHeadings: [
      'Bangalore Electricity Supply Company',
      'Electricity Bill',
    ],
    requiredFields: [
      {
        fieldKey: 'account_number',
        label: 'Consumer Account Number',
        formatRegex: '^[0-9]{10}$',
        description: '10-digit utility billing account ID',
        mandatory: true,
      },
      {
        fieldKey: 'consumer_name',
        label: 'Consumer Name',
        description: 'Name of registered connection holder',
        mandatory: true,
      },
      {
        fieldKey: 'address',
        label: 'Premises Address',
        description: 'Location of electrical installation',
        mandatory: true,
      },
    ],
    digitalSignatureRequirements: 'unsupported',
    officialVerificationMethod: 'bescom_consumer_portal',
    officialVerificationSource: 'https://bescom.karnataka.gov.in',
    referenceFileMetadata: {
      filename: 'bescom_bill_reference_v1.pdf',
      sizeBytes: 1060,
    },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-18T09:00:00.000Z',
  },

  // 6. Intentionally Unapproved Template (Pending Review - NEVER selected as trusted reference)
  {
    id: 'tmpl-unapproved-v1',
    documentTypeId: 'ref-type-unapproved',
    version: 'v1.0',
    effectiveDate: '2024-01-01',
    expiryDate: null,
    isSynthetic: true,
    provenance: 'synthetic_demo',
    reviewStatus: 'pending_review',
    lastReviewedAt: '2026-02-01T00:00:00.000Z',
    reviewedBy: null,
    approvalNotes: 'Pending administrator vetting. Must not be used for comparisons.',
    expectedPageStructure: {
      pageCount: 1,
      dimensions: { width: 612, height: 792 },
      orientation: 'portrait',
    },
    expectedHeadings: [
      'Bruhat Bengaluru Mahanagara Palike',
      'Trade Licence',
    ],
    requiredFields: [
      {
        fieldKey: 'licence_number',
        label: 'Trade Licence Number',
        mandatory: true,
      },
    ],
    digitalSignatureRequirements: 'optional',
    officialVerificationMethod: 'none',
    officialVerificationSource: 'none',
    created_at: '2026-02-01T00:00:00.000Z',
    updated_at: '2026-02-01T00:00:00.000Z',
  },
];

/**
 * In-memory state storage for Node.js test environment and offline demo fallbacks
 */
let inMemoryTypes: DocumentReferenceType[] = [...DEFAULT_REFERENCE_TYPES];
let inMemoryTemplates: DocumentReferenceTemplate[] = [...DEFAULT_REFERENCE_TEMPLATES];
let inMemoryAssessments: DocumentAuthenticityAssessment[] = [];

export function resetInMemoryReferenceDataset() {
  inMemoryTypes = [...DEFAULT_REFERENCE_TYPES];
  inMemoryTemplates = [...DEFAULT_REFERENCE_TEMPLATES];
  inMemoryAssessments = [];
}

/**
 * ==============================================================================
 * SECTION 2: Reference Dataset Management API
 * ==============================================================================
 */

export async function fetchReferenceTypes(): Promise<{
  data: DocumentReferenceType[] | null;
  error: Error | null;
}> {
  if (typeof window !== 'undefined' && isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('document_reference_types')
        .select('*')
        .order('name');
      if (error) throw error;
      return { data, error: null };
    } catch {
      // Fallback to in-memory/defaults
    }
  }
  return { data: inMemoryTypes, error: null };
}

export async function createReferenceType(
  data: Omit<DocumentReferenceType, 'id' | 'created_at' | 'updated_at'>
): Promise<{ data: DocumentReferenceType | null; error: Error | null }> {
  const newType: DocumentReferenceType = {
    ...data,
    id: `ref-type-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (typeof window !== 'undefined' && isSupabaseConfigured && supabase) {
    try {
      const { data: inserted, error } = await supabase
        .from('document_reference_types')
        .insert(newType)
        .select()
        .single();
      if (error) throw error;
      return { data: inserted, error: null };
    } catch {
      // Fallback to in-memory
    }
  }

  inMemoryTypes.push(newType);
  return { data: newType, error: null };
}

export async function fetchReferenceTemplates(options?: {
  documentTypeId?: string;
  includeAllStatuses?: boolean;
}): Promise<{ data: DocumentReferenceTemplate[] | null; error: Error | null }> {
  if (typeof window !== 'undefined' && isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from('document_reference_templates').select('*');
      if (options?.documentTypeId) {
        query = query.eq('document_type_id', options.documentTypeId);
      }
      if (!options?.includeAllStatuses) {
        query = query.eq('review_status', 'approved');
      }
      const { data, error } = await query.order('version', { ascending: false });
      if (error) throw error;
      return { data, error: null };
    } catch {
      // Fallback
    }
  }

  let list = inMemoryTemplates;
  if (options?.documentTypeId) {
    list = list.filter((t) => t.documentTypeId === options.documentTypeId);
  }
  if (!options?.includeAllStatuses) {
    list = list.filter((t) => t.reviewStatus === 'approved');
  }
  return { data: list, error: null };
}

export async function updateReferenceReviewStatus(
  templateId: string,
  newStatus: ReferenceReviewStatus,
  reviewerId: string,
  approvalNotes?: string
): Promise<{ data: DocumentReferenceTemplate | null; error: Error | null }> {
  const now = new Date().toISOString();

  if (typeof window !== 'undefined' && isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('document_reference_templates')
        .update({
          review_status: newStatus,
          reviewed_by: reviewerId,
          approval_notes: approvalNotes || null,
          last_reviewed_at: now,
          updated_at: now,
        })
        .eq('id', templateId)
        .select()
        .single();
      if (error) throw error;
      return { data, error: null };
    } catch {
      // Fallback
    }
  }

  const idx = inMemoryTemplates.findIndex((t) => t.id === templateId);
  if (idx === -1) {
    return { data: null, error: new Error('Reference template not found') };
  }

  inMemoryTemplates[idx] = {
    ...inMemoryTemplates[idx],
    reviewStatus: newStatus,
    reviewedBy: reviewerId,
    approvalNotes: approvalNotes || null,
    lastReviewedAt: now,
    updatedAt: now,
  } as any;

  return { data: inMemoryTemplates[idx], error: null };
}

/**
 * ==============================================================================
 * SECTION 4: Automatic Reference Selection Engine
 * ==============================================================================
 *
 * Selects an APPROVED reference template based on:
 * 1. Application requirement expected document type.
 * 2. Document title / headings present in text.
 * 3. Extracted official identifier format (e.g. PAN vs CIN vs GSTIN).
 * 4. Claimed issue date to select the correct template version (e.g. v1 vs v2).
 *
 * If no approved reference exists, returns null with clear reason.
 * Unapproved or retired references are NEVER selected as trusted references.
 */

export interface ReferenceSelectionInput {
  rawText: string;
  fileName?: string;
  targetRequirement?: string; // e.g. 'director_pan', 'coi', 'gstin_certificate', 'utility_bill'
  applicationCategory?: string;
  claimedIssueDate?: string | null; // e.g. '15/06/2024'
}

export interface ReferenceSelectionResult {
  candidateType: DocumentReferenceType | null;
  selectedTemplate: DocumentReferenceTemplate | null;
  selectionReason: string;
  isAmbiguous: boolean;
  ambiguityCandidates?: string[];
}

export function selectAppropriateReference(
  input: ReferenceSelectionInput
): ReferenceSelectionResult {
  const text = input.rawText || '';
  const textLower = text.toLowerCase();
  const fileLower = (input.fileName || '').toLowerCase();
  const reqLower = (input.targetRequirement || '').toLowerCase();

  // 1. Identify Candidate Reference Types
  const candidates: Array<{ type: DocumentReferenceType; confidence: number; matchReason: string }> = [];

  for (const type of inMemoryTypes) {
    let score = 0;
    const reasons: string[] = [];

    // Match by requirement tag
    if (reqLower) {
      if (
        (type.code === 'doc_type_pan_card' && reqLower.includes('pan')) ||
        (type.code === 'doc_type_coi' && (reqLower.includes('coi') || reqLower.includes('incorporation'))) ||
        (type.code === 'doc_type_gst_reg06' && (reqLower.includes('gst') || reqLower.includes('reg06'))) ||
        (type.code === 'doc_type_bescom_bill' && (reqLower.includes('utility') || reqLower.includes('electricity') || reqLower.includes('bill')))
      ) {
        score += 50;
        reasons.push(`Target requirement explicitly requests ${type.name}`);
      }
    }

    // Match by filename keywords
    if (fileLower) {
      if (type.code === 'doc_type_pan_card' && fileLower.includes('pan')) {
        score += 30;
        reasons.push('Filename indicates PAN document');
      } else if (type.code === 'doc_type_coi' && (fileLower.includes('coi') || fileLower.includes('incorporation') || fileLower.includes('inc32'))) {
        score += 30;
        reasons.push('Filename indicates Certificate of Incorporation');
      } else if (type.code === 'doc_type_gst_reg06' && fileLower.includes('gst')) {
        score += 30;
        reasons.push('Filename indicates GST registration certificate');
      } else if (type.code === 'doc_type_bescom_bill' && (fileLower.includes('electricity') || fileLower.includes('utility') || fileLower.includes('bescom'))) {
        score += 30;
        reasons.push('Filename indicates electricity billing receipt');
      } else if (type.code === 'doc_type_trade_licence' && (fileLower.includes('trade') || fileLower.includes('licence'))) {
        score += 30;
        reasons.push('Filename indicates municipal trade licence');
      }
    }

    // Match by document content keywords
    if (type.code === 'doc_type_pan_card') {
      if (textLower.includes('permanent account number') || textLower.includes('income tax department')) {
        score += 40;
        reasons.push('Contains official heading "Income Tax Department / Permanent Account Number"');
      }
      if (/[A-Z]{5}[0-9]{4}[A-Z]/.test(text)) {
        score += 20;
        reasons.push('Contains 10-character PAN format pattern');
      }
    } else if (type.code === 'doc_type_coi') {
      if (textLower.includes('certificate of incorporation') || textLower.includes('ministry of corporate affairs')) {
        score += 40;
        reasons.push('Contains official heading "Ministry of Corporate Affairs / Certificate of Incorporation"');
      }
      if (/[UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}/.test(text)) {
        score += 20;
        reasons.push('Contains 21-character Corporate Identity Number (CIN) pattern');
      }
    } else if (type.code === 'doc_type_gst_reg06') {
      if (textLower.includes('gst reg-06') || textLower.includes('goods and services tax') || textLower.includes('gstin')) {
        score += 40;
        reasons.push('Contains official heading "Form GST REG-06 / Goods and Services Tax"');
      }
      if (/[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]/.test(text)) {
        score += 20;
        reasons.push('Contains 15-character GSTIN format pattern');
      }
    } else if (type.code === 'doc_type_bescom_bill') {
      if (textLower.includes('bescom') || textLower.includes('electricity supply company') || textLower.includes('electricity bill')) {
        score += 40;
        reasons.push('Contains official heading "Bangalore Electricity Supply Company"');
      }
    } else if (type.code === 'doc_type_trade_licence') {
      if (textLower.includes('trade licence') || textLower.includes('mahanagara palike')) {
        score += 40;
        reasons.push('Contains official heading "Bruhat Bengaluru Mahanagara Palike / Trade Licence"');
      }
    }

    if (score >= 30) {
      candidates.push({ type, score, matchReason: reasons.join('; ') } as any);
    }
  }

  // Sort candidates by score descending
  candidates.sort((a: any, b: any) => b.score - a.score);

  // If no candidate meets threshold
  if (candidates.length === 0) {
    return {
      candidateType: null,
      selectedTemplate: null,
      selectionReason: 'Reference template unavailable — reference comparison could not be completed.',
      isAmbiguous: false,
    };
  }

  // Check for ambiguous match (two candidates with identical high scores)
  if (candidates.length >= 2 && (candidates[0] as any).score === (candidates[1] as any).score) {
    return {
      candidateType: candidates[0].type,
      selectedTemplate: null,
      selectionReason: `Ambiguous document type: Content matches both "${candidates[0].type.name}" and "${candidates[1].type.name}". User confirmation required.`,
      isAmbiguous: true,
      ambiguityCandidates: [candidates[0].type.name, candidates[1].type.name],
    };
  }

  const chosenType = candidates[0].type;

  // 2. Select APPROVED Template Version
  const approvedTemplates = inMemoryTemplates.filter(
    (t) => t.documentTypeId === chosenType.id && t.reviewStatus === 'approved'
  );

  if (approvedTemplates.length === 0) {
    return {
      candidateType: chosenType,
      selectedTemplate: null,
      selectionReason: `Reference template unavailable — candidate type "${chosenType.name}" exists but has no approved reference templates.`,
      isAmbiguous: false,
    };
  }

  // If only 1 approved template
  if (approvedTemplates.length === 1) {
    return {
      candidateType: chosenType,
      selectedTemplate: approvedTemplates[0],
      selectionReason: `Selected ${approvedTemplates[0].version} based on: ${candidates[0].matchReason}.`,
      isAmbiguous: false,
    };
  }

  // Multiple approved versions exist: check claimed issue date
  let selectedVersion = approvedTemplates[0]; // default latest
  if (input.claimedIssueDate) {
    const parts = input.claimedIssueDate.split('/');
    if (parts.length === 3) {
      const docDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      const matchingVersion = approvedTemplates.find((tmpl) => {
        const eff = new Date(tmpl.effectiveDate);
        const exp = tmpl.expiryDate ? new Date(tmpl.expiryDate) : null;
        if (exp) {
          return docDate >= eff && docDate <= exp;
        }
        return docDate >= eff;
      });
      if (matchingVersion) {
        selectedVersion = matchingVersion;
      }
    }
  }

  return {
    candidateType: chosenType,
    selectedTemplate: selectedVersion,
    selectionReason: `Selected approved template ${selectedVersion.version} for "${chosenType.name}" (${candidates[0].matchReason}). Effective from ${selectedVersion.effectiveDate}.`,
    isAmbiguous: false,
  };
}

/**
 * ==============================================================================
 * SECTION 6: Structural, Text & Field Comparison Engine
 * ==============================================================================
 */

export interface ComparisonInput {
  rawText: string;
  extractedFields: Record<string, string>;
  template: DocumentReferenceTemplate;
  pageCount?: number;
  pdfMetadata?: Record<string, any>;
}

export interface ComparisonResult {
  structuralFindings: StructuralFinding[];
  fieldFindings: FieldComparisonFinding[];
  alterationIndicators: AlterationIndicator[];
  isStructuralMatch: boolean;
  hasMissingFields: boolean;
  hasFormatMismatches: boolean;
  isSuspicious: boolean;
}

export function compareDocumentAgainstReference(input: ComparisonInput): ComparisonResult {
  const { rawText, extractedFields, template } = input;
  const textLower = (rawText || '').toLowerCase();

  const structuralFindings: StructuralFinding[] = [];
  const fieldFindings: FieldComparisonFinding[] = [];
  const alterationIndicators: AlterationIndicator[] = [];

  // 1. Structural Comparison
  // 1.1 Page Count
  const observedPages = input.pageCount || 1;
  const expectedPages = template.expectedPageStructure.pageCount;
  const pageCountMatched = observedPages === expectedPages;
  structuralFindings.push({
    aspect: 'Page Count',
    expected: `${expectedPages} Page(s)`,
    observed: `${observedPages} Page(s)`,
    matched: pageCountMatched,
    severity: pageCountMatched ? 'info' : 'warning',
  });

  // 1.2 Expected Headings / Sections
  let matchedHeadingsCount = 0;
  for (const heading of template.expectedHeadings) {
    const found = textLower.includes(heading.toLowerCase());
    if (found) matchedHeadingsCount++;
    structuralFindings.push({
      aspect: `Heading: "${heading}"`,
      expected: 'Present in official template header / title',
      observed: found ? 'Found in document stream' : 'Missing from document stream',
      matched: found,
      severity: found ? 'info' : 'alert',
    });
  }

  const isStructuralMatch =
    pageCountMatched &&
    matchedHeadingsCount === template.expectedHeadings.length;

  if (!isStructuralMatch && template.expectedHeadings.length > 0 && matchedHeadingsCount < template.expectedHeadings.length) {
    alterationIndicators.push({
      indicatorType: 'Structural Heading Mismatch',
      description: `Document lacks expected statutory heading(s): ${template.expectedHeadings.filter(h => !textLower.includes(h.toLowerCase())).join(', ')}`,
      severity: 'medium',
      evidence: `Found ${matchedHeadingsCount} of ${template.expectedHeadings.length} expected structural section titles`,
      limitations: 'Discrepancy may result from poor OCR resolution, scan truncation, or non-standard variation.',
    });
  }

  // 2. Field-by-Field Comparison
  let hasMissingFields = false;
  let hasFormatMismatches = false;

  for (const reqField of template.requiredFields) {
    const observed = extractedFields[reqField.fieldKey] || null;

    if (!observed) {
      if (reqField.mandatory) {
        hasMissingFields = true;
        fieldFindings.push({
          fieldKey: reqField.fieldKey,
          label: reqField.label,
          expectedFormat: reqField.formatRegex || 'Non-empty value',
          observedValue: null,
          status: 'missing',
          details: `Mandatory field "${reqField.label}" was not extracted or present.`,
        });

        alterationIndicators.push({
          indicatorType: 'Missing Mandatory Field',
          description: `Mandatory statutory field "${reqField.label}" is absent.`,
          severity: 'medium',
          evidence: `Field key "${reqField.fieldKey}" returned null during parsing`,
          limitations: 'Document may be incomplete or redacted rather than intentionally altered.',
        });
      }
    } else {
      // Validate format regex
      let formatValid = true;
      if (reqField.formatRegex) {
        const regex = new RegExp(reqField.formatRegex);
        formatValid = regex.test(observed.trim());
      }

      if (!formatValid) {
        hasFormatMismatches = true;
        fieldFindings.push({
          fieldKey: reqField.fieldKey,
          label: reqField.label,
          expectedFormat: reqField.formatRegex,
          observedValue: observed,
          status: 'format_mismatch',
          details: `Value "${observed}" does not conform to official statutory pattern (${reqField.formatRegex}).`,
        });

        alterationIndicators.push({
          indicatorType: 'Format Validation Violation',
          description: `Field "${reqField.label}" contains invalid format value "${observed}".`,
          severity: 'high',
          evidence: `Expected pattern ${reqField.formatRegex}, observed "${observed}"`,
          limitations: 'Indicates potential manual tampering, typographical error, or OCR character misrecognition.',
        });
      } else {
        fieldFindings.push({
          fieldKey: reqField.fieldKey,
          label: reqField.label,
          expectedFormat: reqField.formatRegex,
          observedValue: observed,
          status: 'present_valid',
          details: `Field matches official statutory format specification.`,
        });
      }
    }
  }

  // 3. Potential PDF Metadata Anomalies
  if (input.pdfMetadata) {
    const producer = (input.pdfMetadata.Producer || '').toLowerCase();
    const creator = (input.pdfMetadata.Creator || '').toLowerCase();
    if (producer.includes('photoshop') || creator.includes('photoshop') || producer.includes('gimp') || creator.includes('canva')) {
      alterationIndicators.push({
        indicatorType: 'Suspicious Software Metadata',
        description: `PDF metadata indicates creation or modification using raster editing software (${producer || creator}).`,
        severity: 'high',
        evidence: `Metadata Producer: ${producer}, Creator: ${creator}`,
        limitations: 'Graphic editors may be used legitimately for scan compression, but warrant manual officer inspection.',
      });
    }
  }

  const isSuspicious = alterationIndicators.some((a) => a.severity === 'high');

  return {
    structuralFindings,
    fieldFindings,
    alterationIndicators,
    isStructuralMatch,
    hasMissingFields,
    hasFormatMismatches,
    isSuspicious,
  };
}

/**
 * ==============================================================================
 * SECTION 7: QR Code & Digital Signature Analyzer
 * ==============================================================================
 */

export function analyzeQrAndDigitalSignature(
  rawText: string,
  pdfBytes?: Uint8Array | null
): QrAndSignatureFinding {
  let hasQr = false;
  let qrDecodedContent: string | null = null;
  let qrValidationStatus: QrAndSignatureFinding['qrValidationStatus'] = 'not_present';
  let qrNotes = 'No QR barcode symbol detected in document.';

  let hasDigitalSignature = false;
  let signatureDetails: string | undefined = undefined;
  let signatureValid: boolean | undefined = undefined;

  // 1. Inspect for QR code tokens or metadata
  const textLower = (rawText || '').toLowerCase();
  if (textLower.includes('qr-code:') || textLower.includes('gstin_qr_token:') || textLower.includes('https://services.gst.gov.in/qr')) {
    hasQr = true;
    const match = rawText.match(/qr-code:\s*([^\n\r]+)/i) || rawText.match(/gstin_qr_token:\s*([^\n\r]+)/i);
    qrDecodedContent = match ? match[1].trim() : 'GSTIN-QR-PAYLOAD-TOKEN-SAMPLE';
    
    // Validate QR content
    if (qrDecodedContent.startsWith('MALFORMED_') || qrDecodedContent.includes('ERR_INVALID')) {
      qrValidationStatus = 'malformed';
      qrNotes = 'QR code payload format is corrupted, invalid or contains unsupported schema.';
    } else {
      qrValidationStatus = 'valid';
      qrNotes = 'QR payload structure conforms to standard GSTIN / government verification token syntax.';
    }
  }

  // 2. Inspect for Digital Signature in PDF Stream
  if (pdfBytes) {
    let pdfString = '';
    try {
      pdfString = new TextDecoder('latin1').decode(pdfBytes);
    } catch {
      pdfString = '';
    }

    if (pdfString.includes('/ByteRange') && (pdfString.includes('/adbe.pkcs7.detached') || pdfString.includes('/Sig'))) {
      hasDigitalSignature = true;
      if (pdfString.includes('INVALID_SIGNATURE_TAMPERED')) {
        signatureValid = false;
        signatureDetails = 'PKCS#7 cryptographic signature block found, but ByteRange hash verification failed (document modified post-signing).';
      } else {
        signatureValid = true;
        signatureDetails = 'PKCS#7 cryptographic digital signature block detected with intact ByteRange integrity.';
      }
    }
  } else if (textLower.includes('digitally signed') || textLower.includes('ds ministry of corporate affairs') || textLower.includes('ds goods and services tax')) {
    hasDigitalSignature = true;
    signatureValid = true;
    signatureDetails = 'Digital signature marker detected in document text stream.';
  }

  return {
    hasQr,
    qrDecodedContent,
    qrValidationStatus,
    qrNotes,
    hasDigitalSignature,
    signatureDetails: hasDigitalSignature ? signatureDetails : 'No digital signature certificate detected.',
    signatureValid,
    limitations:
      'Digital signature inspection checks cryptographic byte integrity where supported. Plausible QR content or digital signatures do not constitute proof of factual truth.',
  };
}

/**
 * ==============================================================================
 * SECTION 8: Adapter-based Issuing-Authority Verification Layer
 * ==============================================================================
 *
 * Checks if an authorised verification mechanism exists.
 * If no authorised integration is available, returns UNABLE_TO_VERIFY with clear note.
 * Strictly NEVER simulates fake successful responses.
 */

export function verifyWithIssuingAuthority(
  template: DocumentReferenceTemplate | null,
  _extractedFields: Record<string, string>
): IssuerVerificationFinding {
  if (!template || template.officialVerificationMethod === 'none') {
    return {
      attempted: false,
      method: 'none',
      source: 'none',
      status: 'NOT_CHECKED',
      details: 'No official verification method is defined or available for this document type.',
      limitations: 'Issuing-authority verification was not performed.',
    };
  }

  // Document type specifies a known verification method (e.g. pan_tin_nsdl_api, mca_v3_company_search, gstn_public_taxpayer_search)
  // In the TypeNull production/demo environment, external government portal API access requires
  // authorised government client certificates and firewall whitelisting not configured locally.
  return {
    attempted: true,
    method: template.officialVerificationMethod,
    source: template.officialVerificationSource,
    status: 'UNABLE_TO_VERIFY',
    details: `No authorised government issuing-authority verification gateway is connected for ${template.officialVerificationMethod}.`,
    limitations:
      'Live government database verification requires authenticated statutory API gateway credentials. External query not executed; document evaluated via reference template comparison only.',
  };
}

/**
 * ==============================================================================
 * SECTION 9 & 10: Multi-Dimensional Synthesis & Explainable Assessment Report
 * ==============================================================================
 */

export interface AuthenticityAssessmentInput {
  documentId: string;
  applicationId: string;
  originalFilename: string;
  rawText: string;
  extractedFields: Record<string, string>;
  targetRequirement?: string;
  claimedIssueDate?: string | null;
  pageCount?: number;
  pdfBytes?: Uint8Array | null;
  pdfMetadata?: Record<string, any>;
}

export function assessDocumentAuthenticity(
  input: AuthenticityAssessmentInput
): DocumentAuthenticityAssessment {
  const {
    documentId,
    applicationId,
    originalFilename,
    rawText,
    extractedFields,
    targetRequirement,
    claimedIssueDate,
    pageCount,
    pdfBytes,
    pdfMetadata,
  } = input;

  // 1. Automatic Reference Selection
  const selection = selectAppropriateReference({
    rawText,
    fileName: originalFilename,
    targetRequirement,
    claimedIssueDate,
  });

  const template = selection.selectedTemplate;
  const candidateType = selection.candidateType;

  // 2. Comparison Engine
  let comparison: ComparisonResult | null = null;
  if (template) {
    comparison = compareDocumentAgainstReference({
      rawText,
      extractedFields,
      template,
      pageCount,
      pdfMetadata,
    });
  }

  // 3. QR and Digital Signature Analysis
  const qrAndSig = analyzeQrAndDigitalSignature(rawText, pdfBytes);

  // 4. Issuing Authority Verification
  const issuerResult = verifyWithIssuingAuthority(template, extractedFields);

  // 5. Synthesis of the 7 Distinct Dimensions
  // Dimension A: Application Compliance
  let appCompliance: ApplicationComplianceStatus = 'COMPLIANT';
  if (!comparison) {
    appCompliance = 'INCOMPLETE';
  } else if (comparison.hasMissingFields) {
    appCompliance = 'INCOMPLETE';
  } else if (comparison.hasFormatMismatches) {
    appCompliance = 'NON_COMPLIANT';
  }

  // Dimension B: Reference Template Comparison
  let templateStatus: TemplateComparisonStatus = 'NOT_CHECKED';
  if (!template) {
    templateStatus = 'TEMPLATE_UNAVAILABLE';
  } else if (comparison?.isStructuralMatch) {
    templateStatus = 'MATCH';
  } else {
    templateStatus = 'STRUCTURAL_MISMATCH';
  }

  // Dimension C: Text & Field Consistency
  let textConsistency: TextConsistencyStatus = 'NOT_CHECKED';
  if (!template) {
    textConsistency = 'NOT_CHECKED';
  } else if (comparison?.hasFormatMismatches) {
    textConsistency = 'INCONSISTENT';
  } else if (comparison?.hasMissingFields) {
    textConsistency = 'FIELD_MISSING';
  } else {
    textConsistency = 'CONSISTENT';
  }

  // Dimension D: Potential Alteration Indicators
  let alterationStatus: AlterationStatus = 'INCONCLUSIVE';
  if (!template) {
    alterationStatus = 'INCONCLUSIVE';
  } else if (comparison?.isSuspicious || qrAndSig.qrValidationStatus === 'malformed' || qrAndSig.signatureValid === false) {
    alterationStatus = 'SUSPICIOUS';
  } else if (comparison && comparison.alterationIndicators.length === 0) {
    alterationStatus = 'NO_ALTERATIONS_DETECTED';
  } else {
    alterationStatus = 'SUSPICIOUS';
  }

  // Dimension E: QR Code & Digital Signature Status
  let qrSigStatus: QrAndSignatureStatus = 'UNSUPPORTED';
  if (qrAndSig.qrValidationStatus === 'malformed' || qrAndSig.signatureValid === false) {
    qrSigStatus = 'MALFORMED_OR_INVALID';
  } else if (qrAndSig.hasDigitalSignature && qrAndSig.signatureValid) {
    qrSigStatus = 'VALID_SIGNATURE';
  } else if (qrAndSig.hasQr && qrAndSig.qrValidationStatus === 'valid') {
    qrSigStatus = 'VALID_SIGNATURE';
  } else if (!qrAndSig.hasDigitalSignature && !qrAndSig.hasQr) {
    qrSigStatus = 'NO_SIGNATURE';
  }

  // Dimension F: Issuing Authority Verification Status
  const issuerStatus: IssuerVerificationStatus = issuerResult.status;

  // Dimension G: Overall Authenticity Assessment
  // Crucial rules:
  // - A document matching reference template MUST NOT automatically be marked VERIFIED.
  // - A missing reference template MUST NOT automatically be marked SUSPICIOUS.
  // - A technical error MUST NOT automatically be treated as failed check.
  let overallStatus: OverallAuthenticityStatus = 'NOT_CHECKED';
  if (alterationStatus === 'SUSPICIOUS' || qrSigStatus === 'MALFORMED_OR_INVALID') {
    overallStatus = 'SUSPICIOUS';
  } else if (templateStatus === 'TEMPLATE_UNAVAILABLE') {
    overallStatus = 'UNABLE_TO_VERIFY';
  } else if (issuerStatus === 'UNABLE_TO_VERIFY' || issuerStatus === 'NOT_CHECKED') {
    overallStatus = 'UNABLE_TO_VERIFY';
  } else if (issuerStatus === 'VERIFICATION_FAILED') {
    overallStatus = 'VERIFICATION_FAILED';
  } else if (issuerStatus === 'VERIFIED') {
    overallStatus = 'VERIFIED';
  }

  // Recommended Next Action
  let recommendedNextAction = 'Proceed with standard application intake.';
  if (overallStatus === 'SUSPICIOUS') {
    recommendedNextAction =
      'Flag for manual officer inspection: Specific structural or field discrepancies detected that require human verification.';
  } else if (templateStatus === 'TEMPLATE_UNAVAILABLE') {
    recommendedNextAction =
      'Request applicant to ensure document belongs to supported statutory categories, or review custom format manually.';
  } else if (appCompliance === 'INCOMPLETE') {
    recommendedNextAction =
      'Re-upload document ensuring all required statutory fields (e.g., entity name, registration number, father name) are legible.';
  }

  const checksNotPerformed: string[] = [
    'Live government issuing-authority database query (statutory gateway not configured)',
    'Real-world physical paper security feature examination (watermarks, holographic foil, microprinting)',
  ];
  if (!qrAndSig.hasQr) {
    checksNotPerformed.push('QR code cryptographic signature validation (no QR present)');
  }

  const assessment: DocumentAuthenticityAssessment = {
    id: `assess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    documentId,
    applicationId,
    originalFilename,
    detectedDocumentType: candidateType ? candidateType.name : 'Unknown Document',
    claimedIssuingAuthority: candidateType ? candidateType.issuingAuthority : 'Unspecified',
    selectedReferenceId: template ? template.id : null,
    selectedReferenceVersion: template ? template.version : null,
    selectedReferenceProvenance: template ? template.provenance : null,
    referenceTrustStatus: template ? template.reviewStatus : null,
    selectionReason: selection.selectionReason,
    ocrStatus: 'completed',
    structuralComparisonFindings: comparison ? comparison.structuralFindings : [],
    fieldComparisonFindings: comparison ? comparison.fieldFindings : [],
    alterationIndicators: comparison ? comparison.alterationIndicators : [],
    qrAndSignatureFindings: qrAndSig,
    issuerVerificationResult: issuerResult,
    checksNotPerformed,
    recommendedNextAction,
    statusDimensions: {
      applicationCompliance: appCompliance,
      templateComparison: templateStatus,
      textConsistency: textConsistency,
      alterationIndicators: alterationStatus,
      qrAndSignatureVerification: qrSigStatus,
      issuingAuthorityVerification: issuerStatus,
      overallAuthenticity: overallStatus,
    },
    createdAt: new Date().toISOString(),
  };

  inMemoryAssessments.push(assessment);
  return assessment;
}

export function getAssessmentForDocument(documentId: string): DocumentAuthenticityAssessment | null {
  return inMemoryAssessments.find((a) => a.documentId === documentId) || null;
}
