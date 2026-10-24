import {
  ApplicationConditionalQuestion,
  ApplicationDocumentRequirement,
  DocumentCategory,
  OfficialDocumentCatalogEntry,
} from '../../types';

export interface ExtractedFormRequirements {
  serviceName: string;
  department: string;
  applicationName: string;
  variantCode: string;
  jurisdiction: string;
  category: string;
  officialDocuments: OfficialDocumentCatalogEntry[];
  requirements: ApplicationDocumentRequirement[];
  conditionalQuestions: ApplicationConditionalQuestion[];
  confidence: number;
  extractionNotes: string[];
}

/**
 * Heuristic parsing of HTML instruction text, form guides, or official gazette notifications
 */
export function extractRequirementsFromTextOrHtml(
  sourceUrl: string,
  rawContent: string,
  detectedFormat: 'pdf' | 'html' | 'docx' | 'other' = 'html'
): ExtractedFormRequirements {
  const notes: string[] = [];
  const requirements: ApplicationDocumentRequirement[] = [];
  const conditionalQuestions: ApplicationConditionalQuestion[] = [];
  const appTypeId = `app-type-${Math.random().toString(36).slice(2, 9)}`;

  // 1. Detect Responsible Department / Ministry
  let department = 'Government of India';
  if (/ministry\s+of\s+corporate\s+affairs/i.test(rawContent)) {
    department = 'Ministry of Corporate Affairs (MCA)';
  } else if (/central\s+board\s+of\s+indirect\s+taxes|cbic|gst\s+council/i.test(rawContent)) {
    department = 'Central Board of Indirect Taxes and Customs (CBIC)';
  } else if (/ministry\s+of\s+external\s+affairs|passport\s+seva/i.test(rawContent)) {
    department = 'Ministry of External Affairs (MEA)';
  } else if (/unique\s+identification\s+authority|uidai/i.test(rawContent)) {
    department = 'Unique Identification Authority of India (UIDAI)';
  }

  // 2. Detect Service Name & Category
  let serviceName = 'Statutory Application Service';
  let variantCode = 'VAR-GEN-01';
  let category = 'general_registration';

  if (/incorporation|spice\+|company\s+registration/i.test(rawContent)) {
    serviceName = 'Company Incorporation & Corporate Registration';
    variantCode = 'MCA-SPICE-PLUS';
    category = 'organisation_registration';
  } else if (/gst\s+registration|form\s+gst\s+reg-01/i.test(rawContent)) {
    serviceName = 'Goods & Services Tax (GST) New Registration';
    variantCode = 'CBIC-GST-REG01';
    category = 'regulatory_application';
  } else if (/passport\s+application|form\s+1\b|fresh\s+passport/i.test(rawContent)) {
    serviceName = 'Ordinary Passport Issuance / Re-issue';
    variantCode = 'MEA-PASS-FORM1';
    category = 'certificate_verification';
  }

  // 3. Extract Candidate Document Requirements
  const documentKeywords = [
    {
      regex: /certificate\s+of\s+incorporation|incorporation\s+certificate/i,
      name: 'Certificate of Incorporation',
      type: 'registration_certificate' as DocumentCategory,
      classification: 'mandatory' as const,
      evidence: 'Statutory certificate issued by ROC confirming legal establishment.',
    },
    {
      regex: /memorandum\s+of\s+association|articles\s+of\s+association|moa\b|aoa\b/i,
      name: 'Memorandum and Articles of Association (MOA/AOA)',
      type: 'registration_certificate' as DocumentCategory,
      classification: 'mandatory' as const,
      evidence: 'Foundational charter specifying corporate objects and internal regulations.',
    },
    {
      regex: /pan\s+card|permanent\s+account\s+number/i,
      name: 'Permanent Account Number (PAN) Card',
      type: 'identity_document' as DocumentCategory,
      classification: 'mandatory' as const,
      evidence: 'Tax identification credential issued by Income Tax Department.',
    },
    {
      regex: /passport\b|voter\s+identity|electoral\s+photo|driving\s+licen[cs]e/i,
      name: 'Official Photo Identity Credential',
      type: 'identity_document' as DocumentCategory,
      classification: 'alternative' as const,
      alternatives: ['Passport', 'Aadhaar Card', 'Voter Identity Card', 'Driving Licence'],
      evidence: 'Proof of identity credential acceptable from approved alternative schedule.',
    },
    {
      regex: /utility\s+bill|electricity\s+bill|telephone\s+bill|water\s+bill/i,
      name: 'Registered Office Address / Utility Bill',
      canonicalKey: 'utility_bill',
      type: 'address_proof' as DocumentCategory,
      classification: 'mandatory' as const,
      evidence: 'Utility proof not older than two calendar months from application date.',
    },
    {
      regex: /rent\s+agreement|lease\s+deed|ownership\s+title/i,
      name: 'Commercial Premise Lease Deed / Rent Agreement',
      canonicalKey: 'utility_bill',
      type: 'address_proof' as DocumentCategory,
      classification: 'conditional' as const,
      condition: 'is_rented_premises === true',
      evidence: 'Required when operating premises are leased or rented from a third party.',
    },
    {
      regex: /board\s+resolution|authorization\s+letter/i,
      name: 'Board Resolution for Authorised Signatory',
      canonicalKey: 'statutory_declaration',
      type: 'supporting_evidence' as DocumentCategory,
      classification: 'conditional' as const,
      condition: 'has_authorised_signatory === true',
      evidence: 'Formal resolution passed by Board designating the submitting signatory.',
    },
    {
      regex: /bank\s+account\s+proof|cancelled\s+cheque|bank\s+statement/i,
      name: 'Bank Account Particulars & Cancelled Cheque',
      canonicalKey: 'financial_statement',
      type: 'tax_financial_document' as DocumentCategory,
      classification: 'mandatory' as const,
      evidence: 'Bank statement or cancelled cheque containing MICR and IFSC details.',
    },
  ];

  for (const kw of documentKeywords) {
    if (kw.regex.test(rawContent)) {
      const matchSnippet = rawContent.match(kw.regex)?.[0] || kw.name;
      requirements.push({
        id: `req-${requirements.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
        applicationTypeId: appTypeId,
        documentName: kw.name,
        documentType: kw.type,
        canonicalDocumentKey: (kw as any).canonicalKey || kw.type,
        requirementClassification: kw.classification,
        classification: kw.classification,
        isMandatory: kw.classification === 'mandatory',
        conditionExpression: kw.condition || null,
        acceptedAlternatives: kw.alternatives || [],
        sourceEvidence: `Extracted match: "${matchSnippet}". ${kw.evidence}`,
        sourceEvidenceSnippet: `Extracted match: "${matchSnippet}". ${kw.evidence}`,
        sourceUrl,
        verificationStatus: 'extracted',
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 4. Extract Dynamic Conditional Questions based on extracted conditions
  if (
    requirements.some(
      (r) =>
        r.requirementClassification === 'conditional' &&
        (r.conditionExpression?.includes('is_rented_premises') ||
          r.conditionExpression?.includes('is_leased_premises'))
    )
  ) {
    conditionalQuestions.push({
      id: `q-leased-${Math.random().toString(36).slice(2, 6)}`,
      applicationTypeId: appTypeId,
      questionKey: 'is_rented_premises',
      questionCode: 'is_rented_premises',
      questionText: 'Is the business or registered office operating from rented or leased premises?',
      responseType: 'boolean',
      options: [
        { value: 'true', label: 'Yes (Rented / Leased)' },
        { value: 'false', label: 'No (Wholly Owned Premise)' },
      ],
      defaultValue: 'false',
      helpText: 'Answering Yes activates the mandatory Lease Deed & Rent Agreement checklist item.',
      activatesDocumentTypes: ['Commercial Premise Lease Deed / Rent Agreement'],
      triggeredRequirementKeys: ['utility_bill'],
      triggerCondition: 'is_rented_premises === true',
      createdAt: new Date().toISOString(),
    });
  }

  if (requirements.some((r) => r.conditionExpression?.includes('has_authorised_signatory'))) {
    conditionalQuestions.push({
      id: `q-signatory-${Math.random().toString(36).slice(2, 6)}`,
      applicationTypeId: appTypeId,
      questionKey: 'has_authorised_signatory',
      questionText: 'Is the application submitted through a designated authorised signatory or power of attorney?',
      responseType: 'boolean',
      options: [
        { value: 'true', label: 'Yes (Designated Signatory)' },
        { value: 'false', label: 'No (Direct Primary Applicant)' },
      ],
      defaultValue: 'false',
      helpText: 'Answering Yes requires uploading a formal Board Resolution or Letter of Authority.',
      activatesDocumentTypes: ['Board Resolution for Authorised Signatory'],
      createdAt: new Date().toISOString(),
    });
  }

  // Add category-specific questions if applicable
  if (category === 'certificate_verification') {
    conditionalQuestions.push({
      id: `q-tatkaal-${Math.random().toString(36).slice(2, 6)}`,
      applicationTypeId: appTypeId,
      questionKey: 'is_urgent_tatkaal',
      questionText: 'Is this an expedited / urgent issuance application (e.g. Tatkaal scheme)?',
      responseType: 'boolean',
      options: [
        { value: 'true', label: 'Yes (Tatkaal Scheme)' },
        { value: 'false', label: 'No (Standard Processing)' },
      ],
      defaultValue: 'false',
      helpText: 'Expedited processing requires uploading additional identity proof credentials.',
      activatesDocumentTypes: ['Official Photo Identity Credential'],
      createdAt: new Date().toISOString(),
    });
  }

  const confidence = Math.min(
    0.95,
    0.6 + requirements.length * 0.05 + conditionalQuestions.length * 0.05
  );

  notes.push(`Extracted ${requirements.length} candidate document requirements and ${conditionalQuestions.length} conditional questions from ${detectedFormat.toUpperCase()} stream.`);

  const catalogEntry: OfficialDocumentCatalogEntry = {
    id: `doc-${Math.random().toString(36).slice(2, 8)}`,
    applicationTypeId: appTypeId,
    formIdentifier: variantCode,
    title: `${serviceName} Guidance Specification`,
    sourceUrl,
    fileFormat: detectedFormat,
    contentHashSha256: 'simulated-hash',
    fileSizeBytes: rawContent.length,
    extractionStatus: 'extracted',
    extractionMetadata: {
      extractedRequirementsCount: requirements.length,
      extractedQuestionsCount: conditionalQuestions.length,
      department,
    },
    lastCheckedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  return {
    serviceName,
    department,
    applicationName: serviceName,
    variantCode,
    jurisdiction: 'India (Central)',
    category,
    officialDocuments: [catalogEntry],
    requirements,
    conditionalQuestions,
    confidence,
    extractionNotes: notes,
  };
}
