import {
  ApplicationDocument,
  ExtractedFieldRecord,
  DbApplication,
  ValidationRun,
} from '../../types';
import { runValidationEngine } from './engine';
import { CANDIDATE_GOVERNMENT_SERVICES } from '../ingestion/ingestionService';
import { evaluateConditionalChecklist } from '../conditionalEvaluator';

/**
 * Synthetic Test Fixture Helpers for SIH 2026 Demonstration
 * These fixtures use strictly synthetic, fictional entity data to demonstrate
 * the end-to-end pre-validation lifecycle without touching production user records.
 */

export const DEMO_ENTITIES = {
  declaredName: 'Acme Innovations Private Limited',
  divergentName: 'Apex Global Dynamics Limited',
  syntheticCin: 'U72900KA2024PTC184920',
  syntheticPan: 'AAACA1234A',
  congruentGstin: '27AAACA1234A1Z5', // Digits 3-12 match syntheticPan (AAACA1234A)
  divergentGstin: '27BBBCB9876B1Z2', // Digits 3-12 diverge (BBBCB9876B)
};

export const createSyntheticDoc = (
  id: string,
  type: string,
  filename: string,
  fileSize = 450000
): ApplicationDocument => ({
  id,
  application_id: 'demo-app-sih-2026',
  user_id: 'demo-applicant-uid',
  original_filename: filename,
  storage_path: `applications/demo-app-sih-2026/${filename}`,
  mime_type: filename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
  file_size_bytes: fileSize,
  document_type: type as any,
  processing_status: 'completed',
  created_at: new Date('2026-10-24T10:00:00Z').toISOString(),
  updated_at: new Date('2026-10-24T10:00:00Z').toISOString(),
});

export const createSyntheticField = (
  id: string,
  docId: string,
  fieldName: string,
  fieldLabel: string,
  value: string,
  snippet: string
): ExtractedFieldRecord => ({
  id,
  extraction_id: `ext-${docId}`,
  document_id: docId,
  application_id: 'demo-app-sih-2026',
  user_id: 'demo-applicant-uid',
  field_name: fieldName,
  field_label: fieldLabel,
  extracted_value: value,
  reviewed_value: value,
  page_number: 1,
  evidence_snippet: snippet,
  extraction_method: 'pdf_text',
  confidence_score: 0.98,
  review_status: 'confirmed',
  created_at: new Date('2026-10-24T10:00:00Z').toISOString(),
  updated_at: new Date('2026-10-24T10:00:00Z').toISOString(),
});

/**
 * Scenario 1: Supported Application Selected, Required Document Missing
 * Context: SPICe+ Company Incorporation with premise question answered "yes" (rented).
 * Uploaded: Lease Agreement and Electricity Bill.
 * Missing: Identity Document (PAN Card / Aadhaar).
 * Expected Outcome: Major Issues (blocking missing document finding in 'missing_documents' category).
 */
export function runScenario1MissingDocument(): {
  application: DbApplication;
  documents: ApplicationDocument[];
  fields: ExtractedFieldRecord[];
  run: ValidationRun;
} {
  const application: DbApplication = {
    id: 'demo-app-scenario-1',
    user_id: 'demo-applicant-uid',
    title: 'SPICe+ Company Incorporation (Form INC-32)',
    category: 'organisation_registration',
    organisation_name: DEMO_ENTITIES.declaredName,
    registration_number: DEMO_ENTITIES.syntheticCin,
    jurisdiction: 'India (Central ROC Compliance)',
    description: JSON.stringify({
      governmentService: {
        id: 'srv-MCA-SRV-SPICE-PLUS',
        serviceCode: 'MCA-SRV-SPICE-PLUS',
        variantCode: 'MCA-SPICE-INC32',
        applicationTypeId: 'type-spice-plus-v1',
        conditionalAnswers: {
          is_rented_premise: 'yes',
          has_corporate_promoter: 'no',
        },
      },
    }),
    status: 'draft',
    created_at: new Date('2026-10-24T10:00:00Z').toISOString(),
    updated_at: new Date('2026-10-24T10:00:00Z').toISOString(),
  };

  const srv = CANDIDATE_GOVERNMENT_SERVICES.find(
    (s) => s.id === 'srv-MCA-SRV-SPICE-PLUS' || s.serviceCode === 'MCA-SRV-SPICE-PLUS'
  )!;
  const variant = srv.applicationTypes.find(
    (v) => v.id === 'type-spice-plus-v1' || v.variantCode === 'MCA-SPICE-INC32'
  )!;

  // MOA/AOA, Lease Agreement, and Electricity Bill uploaded; PAN Card missing
  const documents: ApplicationDocument[] = [
    createSyntheticDoc('doc-moa', 'incorporation_certificate', 'memorandum_articles_association.pdf'),
    createSyntheticDoc('doc-lease', 'utility_bill', 'office_lease_deed_noc.pdf'),
    createSyntheticDoc('doc-util', 'utility_bill', 'bescom_electricity_bill.pdf'),
  ];

  const checklist = evaluateConditionalChecklist({
    applicationType: variant,
    userAnswers: { is_rented_premise: 'yes', has_corporate_promoter: 'no' },
    uploadedDocumentTypes: documents.map((d) => d.document_type),
  });

  const allReqs = [
    ...checklist.mandatoryDocuments,
    ...checklist.conditionalDocuments.map((c) => c.requirement),
    ...checklist.alternativeDocumentGroups.flatMap((g) => g.options),
  ];

  const fields: ExtractedFieldRecord[] = [
    createSyntheticField(
      'f-org-1',
      'doc-lease',
      'organisation_name',
      'Entity Name',
      DEMO_ENTITIES.declaredName,
      `Tenant: ${DEMO_ENTITIES.declaredName}`
    ),
    createSyntheticField(
      'f-cin-1',
      'doc-lease',
      'registration_number',
      'CIN',
      DEMO_ENTITIES.syntheticCin,
      `CIN: ${DEMO_ENTITIES.syntheticCin}`
    ),
  ];

  const run = runValidationEngine({
    applicationId: application.id,
    category: application.category,
    applicationMetadata: {
      title: application.title,
      organisation_name: application.organisation_name,
      registration_number: application.registration_number,
      jurisdiction: application.jurisdiction,
    },
    documents,
    fields,
    personalizedRequirements: allReqs,
    serviceName: checklist.serviceName,
  });

  return { application, documents, fields, run };
}

/**
 * Scenario 2: Satisfying the Required Document
 * Context: Applicant uploads the missing PAN card credential.
 * Expected Outcome: Document requirement cleared; passes in 'missing_documents' category.
 */
export function runScenario2SatisfiedDocument(): {
  application: DbApplication;
  documents: ApplicationDocument[];
  fields: ExtractedFieldRecord[];
  run: ValidationRun;
} {
  const base = runScenario1MissingDocument();

  // Add the missing Identity Proof (PAN Card)
  const panDoc = createSyntheticDoc('doc-pan', 'pan_card', 'director_pan_card.pdf');
  const documents = [...base.documents, panDoc];

  const srv = CANDIDATE_GOVERNMENT_SERVICES.find(
    (s) => s.id === 'srv-MCA-SRV-SPICE-PLUS' || s.serviceCode === 'MCA-SRV-SPICE-PLUS'
  )!;
  const variant = srv.applicationTypes.find(
    (v) => v.id === 'type-spice-plus-v1' || v.variantCode === 'MCA-SPICE-INC32'
  )!;

  const checklist = evaluateConditionalChecklist({
    applicationType: variant,
    userAnswers: { is_rented_premise: 'yes', has_corporate_promoter: 'no' },
    uploadedDocumentTypes: documents.map((d) => d.document_type),
  });

  const allReqs = [
    ...checklist.mandatoryDocuments,
    ...checklist.conditionalDocuments.map((c) => c.requirement),
    ...checklist.alternativeDocumentGroups.flatMap((g) => g.options),
  ];

  const fields = [
    ...base.fields,
    createSyntheticField(
      'f-pan-1',
      'doc-pan',
      'registration_number',
      'PAN',
      DEMO_ENTITIES.syntheticPan,
      `Income Tax Dept Permanent Account Number: ${DEMO_ENTITIES.syntheticPan}`
    ),
  ];

  const run = runValidationEngine({
    applicationId: base.application.id,
    category: base.application.category,
    applicationMetadata: {
      title: base.application.title,
      organisation_name: base.application.organisation_name,
      registration_number: base.application.registration_number,
      jurisdiction: base.application.jurisdiction,
    },
    documents,
    fields,
    personalizedRequirements: allReqs,
    serviceName: checklist.serviceName,
  });

  return { application: base.application, documents, fields, run };
}

/**
 * Scenario 3: Detectable Cross-Document Inconsistency
 * Context: Regulatory Application (GST / Corporate Tax) where:
 * 1. Declared entity name diverges from extracted document name, OR
 * 2. Embedded PAN inside GSTIN does not match standalone PAN credential.
 * Expected Outcome: Major Issues (blocking mismatch in 'cross_document' category).
 */
export function runScenario3CrossDocumentMismatch(): {
  application: DbApplication;
  documents: ApplicationDocument[];
  fields: ExtractedFieldRecord[];
  run: ValidationRun;
} {
  const application: DbApplication = {
    id: 'demo-app-scenario-3',
    user_id: 'demo-applicant-uid',
    title: 'Goods & Services Tax (GST REG-01)',
    category: 'regulatory_application',
    organisation_name: DEMO_ENTITIES.declaredName,
    registration_number: DEMO_ENTITIES.divergentGstin,
    jurisdiction: 'India (Central & State GST)',
    description: 'GST REG-01 registration screening dossier',
    status: 'draft',
    created_at: new Date('2026-10-24T10:00:00Z').toISOString(),
    updated_at: new Date('2026-10-24T10:00:00Z').toISOString(),
  };

  const docs = [
    createSyntheticDoc('doc-gst-mismatch', 'tax_financial_document', 'gst_registration_cert.pdf'),
    createSyntheticDoc('doc-pan-primary', 'identity_document', 'director_pan_card.pdf'),
    createSyntheticDoc('doc-coi-divergent', 'registration_certificate', 'certificate_incorporation.pdf'),
    createSyntheticDoc('doc-addr', 'address_proof', 'office_lease.pdf'),
  ];

  // GSTIN 27BBBCB9876B1Z2 (embeds BBBCB9876B) diverges from standalone PAN AAACA1234A!
  // Declared name Acme Innovations diverges from Apex Global Dynamics!
  const fields: ExtractedFieldRecord[] = [
    createSyntheticField(
      'f-gst-1',
      'doc-gst-mismatch',
      'registration_number',
      'GSTIN',
      DEMO_ENTITIES.divergentGstin,
      `GSTIN: ${DEMO_ENTITIES.divergentGstin}`
    ),
    createSyntheticField(
      'f-pan-1',
      'doc-pan-primary',
      'registration_number',
      'PAN',
      DEMO_ENTITIES.syntheticPan,
      `PAN: ${DEMO_ENTITIES.syntheticPan}`
    ),
    createSyntheticField(
      'f-org-divergent',
      'doc-coi-divergent',
      'organisation_name',
      'Entity Name',
      DEMO_ENTITIES.divergentName,
      `Name of Entity: ${DEMO_ENTITIES.divergentName}`
    ),
    createSyntheticField(
      'f-addr-1',
      'doc-addr',
      'address',
      'Address',
      'No. 42 Electronic City, Bengaluru',
      'No. 42 Electronic City, Bengaluru'
    ),
  ];

  const run = runValidationEngine({
    applicationId: application.id,
    category: application.category,
    applicationMetadata: {
      organisation_name: application.organisation_name,
      registration_number: DEMO_ENTITIES.divergentGstin,
    },
    documents: docs,
    fields,
  });

  return { application, documents: docs, fields, run };
}

/**
 * Scenario 4: Corrected Input and Clean Pre-Validation Revalidation
 * Context: Applicant replaces divergent certificate with congruent certificate
 * and aligns GSTIN with PAN (27AAACA1234A1Z5 matches AAACA1234A) and entity name.
 * Expected Outcome: Complete (All checks pass, cross-document concurrency confirmed).
 */
export function runScenario4CorrectedRevalidation(): {
  application: DbApplication;
  documents: ApplicationDocument[];
  fields: ExtractedFieldRecord[];
  run: ValidationRun;
} {
  const application: DbApplication = {
    id: 'demo-app-scenario-4',
    user_id: 'demo-applicant-uid',
    title: 'Goods & Services Tax (GST REG-01)',
    category: 'regulatory_application',
    organisation_name: DEMO_ENTITIES.declaredName,
    registration_number: DEMO_ENTITIES.congruentGstin,
    jurisdiction: 'India (Central & State GST)',
    description: 'GST REG-01 registration screening dossier',
    status: 'draft',
    created_at: new Date('2026-10-24T10:00:00Z').toISOString(),
    updated_at: new Date('2026-10-24T10:05:00Z').toISOString(),
  };

  const docs = [
    createSyntheticDoc('doc-gst-congruent', 'tax_financial_document', 'gst_registration_cert.pdf'),
    createSyntheticDoc('doc-pan-congruent', 'identity_document', 'director_pan_card.pdf'),
    createSyntheticDoc('doc-coi-congruent', 'registration_certificate', 'certificate_incorporation.pdf'),
    createSyntheticDoc('doc-addr-congruent', 'address_proof', 'office_lease.pdf'),
  ];

  // GSTIN 27AAACA1234A1Z5 embeds AAACA1234A, matching PAN AAACA1234A!
  // Declared name Acme Innovations matches extracted name Acme Innovations Private Limited!
  const fields: ExtractedFieldRecord[] = [
    createSyntheticField(
      'f-gst-fixed',
      'doc-gst-congruent',
      'registration_number',
      'GSTIN',
      DEMO_ENTITIES.congruentGstin,
      `GSTIN: ${DEMO_ENTITIES.congruentGstin}`
    ),
    createSyntheticField(
      'f-pan-fixed',
      'doc-pan-congruent',
      'registration_number',
      'PAN',
      DEMO_ENTITIES.syntheticPan,
      `PAN: ${DEMO_ENTITIES.syntheticPan}`
    ),
    createSyntheticField(
      'f-org-fixed',
      'doc-coi-congruent',
      'organisation_name',
      'Entity Name',
      DEMO_ENTITIES.declaredName,
      `Name of Entity: ${DEMO_ENTITIES.declaredName}`
    ),
    createSyntheticField(
      'f-addr-fixed',
      'doc-addr-congruent',
      'address',
      'Address',
      'No. 42 Electronic City, Bengaluru',
      'No. 42 Electronic City, Bengaluru'
    ),
    createSyntheticField(
      'f-date-fixed',
      'doc-gst-congruent',
      'issue_date',
      'Date of Liability',
      '2024-01-15',
      'Date of Liability / Registration: 15/01/2024'
    ),
  ];

  const run = runValidationEngine({
    applicationId: application.id,
    category: application.category,
    applicationMetadata: {
      organisation_name: application.organisation_name,
      registration_number: DEMO_ENTITIES.congruentGstin,
    },
    documents: docs,
    fields,
  });

  return { application, documents: docs, fields, run };
}
