import { CategoryRequirement } from '../types';

/**
 * Knowledge Base: Authoritative Statutory Requirements & Category Catalog
 *
 * Provides structured statutory citations, mandatory document checklists,
 * field validation rules, and cross-document verification logic for supported categories.
 */

export interface KnowledgeBaseEntry extends CategoryRequirement {
  version: string;
  isActive: boolean;
  lastVerifiedAt: string;
  officialPortalUrl?: string;
}

export const KNOWLEDGE_BASE_REGISTRY: KnowledgeBaseEntry[] = [
  {
    id: 'KB-MCA-CORP-01',
    categoryKey: 'organisation_registration',
    displayName: 'Corporate Incorporation & Registration',
    jurisdiction: 'India (Central)',
    version: '2024.1',
    isActive: true,
    lastVerifiedAt: '2026-01-15',
    officialPortalUrl: 'https://www.mca.gov.in',
    citation: {
      authority: 'Ministry of Corporate Affairs (MCA), Government of India',
      statute: 'Companies Act, 2013 & Companies (Incorporation) Rules, 2014',
      section: 'Section 7(1) - Incorporation of Company; SPICe+ (INC-32)',
      effectiveDate: '2014-04-01',
      sourceUrl: 'https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks.html',
      verificationStatus: 'verified',
    },
    mandatoryDocuments: [
      {
        type: 'registration_certificate',
        name: 'Certificate of Incorporation (COI)',
        description: 'Statutory certificate issued by Registrar of Companies with assigned CIN.',
        acceptableFormats: ['PDF', 'JPEG', 'PNG'],
      },
      {
        type: 'identity_document',
        name: 'Director PAN / Identity Proof',
        description: 'Permanent Account Number (PAN) card of promoter/designated director.',
        acceptableFormats: ['PDF', 'JPEG', 'PNG'],
      },
      {
        type: 'address_proof',
        name: 'Registered Office Address Proof',
        description: 'Utility bill (electricity, water, telephone) or registered lease deed under 2 months old.',
        acceptableFormats: ['PDF', 'JPEG', 'PNG'],
      },
    ],
    mandatoryFields: [
      {
        fieldName: 'registration_number',
        label: 'Corporate Identification Number (CIN)',
        regexPattern: '^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$',
        description: '21-digit alphanumeric corporate identification code assigned by ROC.',
        example: 'U72900KA2022PTC123456',
      },
      {
        fieldName: 'organisation_name',
        label: 'Legal Entity Name',
        description: 'Exact corporate name matching Certificate of Incorporation.',
        example: 'Acme Technologies Private Limited',
      },
      {
        fieldName: 'issue_date',
        label: 'Date of Incorporation',
        description: 'Official date of incorporation specified on statutory certificate.',
        example: '2022-08-15',
      },
      {
        fieldName: 'address',
        label: 'Registered Office Address',
        description: 'Principal physical address of the company recorded with the Registrar.',
        example: 'No 42, Innovation Park, Electronic City, Bengaluru 560100',
      },
    ],
    crossDocumentChecks: [
      {
        id: 'MCA-XDOC-NAME',
        name: 'Corporate Name Alignment',
        description: 'Verifies entity name on application form matches name on Certificate of Incorporation.',
        severity: 'blocking',
      },
      {
        id: 'MCA-XDOC-CIN',
        name: 'CIN Exact Match',
        description: 'Verifies CIN on application matches extracted 21-digit code from official certificate.',
        severity: 'blocking',
      },
      {
        id: 'MCA-XDOC-ADDR',
        name: 'Registered Address Coherence',
        description: 'Cross-verifies postal code and state jurisdiction between utility proof and application dossier.',
        severity: 'minor',
      },
    ],
  },
  {
    id: 'KB-CBIC-GST-01',
    categoryKey: 'regulatory_application',
    displayName: 'Goods & Services Tax (GST) Registration',
    jurisdiction: 'India (GST Council)',
    version: '2024.1',
    isActive: true,
    lastVerifiedAt: '2026-02-01',
    officialPortalUrl: 'https://www.gst.gov.in',
    citation: {
      authority: 'Central Board of Indirect Taxes and Customs (CBIC) & GST Council',
      statute: 'Central Goods and Services Tax Act, 2017',
      section: 'Section 22 & 25 - Registration of Taxable Persons; Form GST REG-06',
      effectiveDate: '2017-07-01',
      sourceUrl: 'https://www.cbic.gov.in/resources//htdocs-cbec/gst/cgst-act.pdf',
      verificationStatus: 'verified',
    },
    mandatoryDocuments: [
      {
        type: 'tax_financial_document',
        name: 'GST Registration Certificate (REG-06)',
        description: 'Official GSTIN registration certificate issued by the tax jurisdiction.',
        acceptableFormats: ['PDF', 'JPEG', 'PNG'],
      },
      {
        type: 'identity_document',
        name: 'Promoter / Business PAN Card',
        description: '10-character Permanent Account Number card corresponding to digits 3 to 12 of GSTIN.',
        acceptableFormats: ['PDF', 'JPEG', 'PNG'],
      },
      {
        type: 'address_proof',
        name: 'Principal Place of Business Proof',
        description: 'Ownership deed, electricity bill, or valid rent agreement for commercial premises.',
        acceptableFormats: ['PDF', 'JPEG', 'PNG'],
      },
    ],
    mandatoryFields: [
      {
        fieldName: 'registration_number',
        label: 'GSTIN (Taxpayer Identification)',
        regexPattern: '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$',
        description: '15-character standard GSTIN format with embedded PAN digits.',
        example: '29ABCDE1234F1Z5',
      },
      {
        fieldName: 'organisation_name',
        label: 'Legal Name of Business',
        description: 'Legal name of enterprise as registered with the tax authority.',
        example: 'TechNova Solutions LLP',
      },
      {
        fieldName: 'issue_date',
        label: 'Date of Liability / Registration',
        description: 'Effective date of registration issued in Form GST REG-06.',
        example: '2021-04-01',
      },
    ],
    crossDocumentChecks: [
      {
        id: 'GST-XDOC-PAN',
        name: 'PAN-to-GSTIN Embedding Integrity',
        description: 'Confirms that digits 3 through 12 of the GSTIN match the submitted PAN card number identically.',
        severity: 'blocking',
      },
      {
        id: 'GST-XDOC-STATE',
        name: 'State Jurisdiction Code Consistency',
        description: 'Verifies the first 2 digits of GSTIN match the state code of the registered address.',
        severity: 'major',
      },
    ],
  },
  {
    id: 'KB-MEA-ID-01',
    categoryKey: 'certificate_verification',
    displayName: 'Identity & Statutory Credential Verification',
    jurisdiction: 'India (National)',
    version: '2024.2',
    isActive: true,
    lastVerifiedAt: '2026-01-20',
    officialPortalUrl: 'https://passportindia.gov.in',
    citation: {
      authority: 'Ministry of External Affairs / National Identity Authorities',
      statute: 'The Passports Act, 1967 & Identity Proof Directives',
      section: 'Section 5 - Application for Passports and Verification of Credentials',
      effectiveDate: '1967-06-24',
      sourceUrl: 'https://www.passportindia.gov.in/AppOnlineProject/online/faqPassportAct',
      verificationStatus: 'verified',
    },
    mandatoryDocuments: [
      {
        type: 'identity_document',
        name: 'Official Travel Document or National Identity',
        description: 'Passport biographical page or official government photo identity document.',
        acceptableFormats: ['PDF', 'JPEG', 'PNG'],
      },
      {
        type: 'address_proof',
        name: 'Proof of Residential Address',
        description: 'Government-issued utility bill, voter ID, or domicile certificate.',
        acceptableFormats: ['PDF', 'JPEG', 'PNG'],
      },
    ],
    mandatoryFields: [
      {
        fieldName: 'applicant_name',
        label: 'Applicant Full Name',
        description: 'Given name and surname matching primary documentary evidence.',
        example: 'Aarav Rajesh Sharma',
      },
      {
        fieldName: 'registration_number',
        label: 'Document ID Number',
        description: 'Unique alphanumeric identifier on the credential.',
        example: 'Z1234567',
      },
      {
        fieldName: 'issue_date',
        label: 'Document Issue Date',
        description: 'Issuance date recorded by the competent authority.',
        example: '2020-05-12',
      },
      {
        fieldName: 'expiry_date',
        label: 'Document Expiry Date',
        description: 'Validity cutoff date. Must not be in the past.',
        example: '2030-05-11',
      },
    ],
    crossDocumentChecks: [
      {
        id: 'ID-XDOC-EXPIRY',
        name: 'Temporal Validity & Non-Expiry',
        description: 'Confirms that document expiry date has not elapsed and is sequentially after issue date.',
        severity: 'blocking',
      },
      {
        id: 'ID-XDOC-NAME',
        name: 'Applicant Name Consistency',
        description: 'Verifies identity name across primary credential and address proof document.',
        severity: 'major',
      },
    ],
  },
  {
    id: 'KB-GEN-REG-01',
    categoryKey: 'general_registration',
    displayName: 'General Institutional Application Dossier',
    jurisdiction: 'General / Multi-Jurisdiction',
    version: '2024.1',
    isActive: true,
    lastVerifiedAt: '2026-01-10',
    citation: {
      authority: 'Designated Statutory Authority or Evaluating Body',
      statute: 'Administrative Pre-Screening Guidelines',
      section: 'Standard Dossier Ingestion and Verification Protocol',
      effectiveDate: '2024-01-01',
      verificationStatus: 'provisional',
    },
    mandatoryDocuments: [
      {
        type: 'registration_certificate',
        name: 'Institutional Registration or Charter',
        description: 'Principal certificate of registration or establishment document.',
        acceptableFormats: ['PDF', 'JPEG', 'PNG'],
      },
      {
        type: 'supporting_evidence',
        name: 'Supporting Compliance Evidence',
        description: 'Proof of operational compliance, authorization, or license.',
        acceptableFormats: ['PDF', 'JPEG', 'PNG'],
      },
    ],
    mandatoryFields: [
      {
        fieldName: 'organisation_name',
        label: 'Organization Name',
        description: 'Name of the applying institution or organization.',
        example: 'National Research Institute',
      },
      {
        fieldName: 'registration_number',
        label: 'Registration or License Number',
        description: 'Assigned registration identifier.',
        example: 'REG-2024-99881',
      },
    ],
    crossDocumentChecks: [
      {
        id: 'GEN-XDOC-ORG',
        name: 'Organization Name Verification',
        description: 'Confirms declared organization name is supported by documentary proof.',
        severity: 'major',
      },
    ],
  },
];

/**
 * Look up knowledge base entry by categoryKey
 */
export function getKnowledgeBaseEntry(categoryKey: string): KnowledgeBaseEntry {
  const found = KNOWLEDGE_BASE_REGISTRY.find(
    (e) => e.categoryKey === categoryKey || e.id === categoryKey
  );
  return found || KNOWLEDGE_BASE_REGISTRY[KNOWLEDGE_BASE_REGISTRY.length - 1];
}

/**
 * Get all active knowledge base entries
 */
export function getAllKnowledgeBaseEntries(): KnowledgeBaseEntry[] {
  return KNOWLEDGE_BASE_REGISTRY;
}
