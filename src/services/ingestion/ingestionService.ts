import {
  GovernmentService,
  GovernmentSource,
  LifecycleStatus,
  RequirementClassification,
} from '../../types';
import { OFFICIAL_GOVERNMENT_SOURCES } from './sourceRegistry';
import {
  runGovernmentDiscoveryPipeline,
  DiscoveryPipelineConfig,
  IngestionPipelineResult,
} from './discoveryPipeline';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

/**
 * Initial candidate services with various lifecycle states for administrative review
 */
export const CANDIDATE_GOVERNMENT_SERVICES: GovernmentService[] = [
  // 1. Published: SPICe+ (MCA)
  {
    id: 'srv-MCA-SRV-SPICE-PLUS',
    sourceId: 'SRC-MCA-GOV',
    serviceName: 'Corporate Incorporation & Registration (SPICe+)',
    serviceCode: 'MCA-SRV-SPICE-PLUS',
    department: 'Ministry of Corporate Affairs (MCA)',
    jurisdiction: 'India (Central)',
    officialUrl: 'https://www.mca.gov.in/MinistryV2/incorporation_company.html',
    description: 'Simplified Proforma for Incorporating Company Electronically (SPICe+ Part A and Part B).',
    category: 'organisation_registration',
    status: 'active',
    createdAt: '2024-09-01T10:00:00.000Z',
    updatedAt: '2024-10-15T12:00:00.000Z',
    applicationTypes: [
      {
        id: 'type-spice-plus-v1',
        serviceId: 'srv-MCA-SRV-SPICE-PLUS',
        applicationName: 'SPICe+ (INC-32) Company Registration',
        variantCode: 'MCA-SPICE-INC32',
        applicantCategory: 'corporate_promoter',
        requirementsVersion: '2024.1',
        lifecycleStatus: 'published',
        publishedAt: '2024-10-15T12:00:00.000Z',
        verifiedBy: 'National Registrar Clearance Committee',
        verifiedAt: '2024-10-14T16:00:00.000Z',
        adminNotes: 'Verified against Companies (Incorporation) Rules, 2014 & MCA SPICe+ Gazette notification.',
        requirements: [
          {
            id: 'req-spice-pan',
            canonicalDocumentKey: 'pan_card',
            documentName: 'Permanent Account Number (PAN) Card',
            classification: 'mandatory',
            isMandatory: true,
            requiredFields: ['pan_number', 'holder_name', 'date_of_birth'],
            sourceEvidenceSnippet: 'Permanent Account Number (PAN) Card of all designated directors and promoters.',
            extractionConfidence: 0.98,
            createdAt: '2024-09-01T10:00:00.000Z',
          },
          {
            id: 'req-spice-moa-aoa',
            canonicalDocumentKey: 'incorporation_certificate',
            documentName: 'Memorandum and Articles of Association (MOA/AOA)',
            classification: 'mandatory',
            isMandatory: true,
            requiredFields: ['entity_name', 'registration_number'],
            sourceEvidenceSnippet: 'Memorandum of Association (MOA) and Articles of Association (AOA) signed by subscribers.',
            extractionConfidence: 0.95,
            createdAt: '2024-09-01T10:00:00.000Z',
          },
          {
            id: 'req-spice-rent-noc',
            canonicalDocumentKey: 'utility_bill',
            documentName: 'Commercial Premise Lease Deed & Owner NOC',
            classification: 'conditional',
            isMandatory: false,
            conditionExpression: "is_rented_premise == 'yes'",
            requiredFields: ['entity_name', 'address', 'issue_date'],
            sourceEvidenceSnippet: 'Commercial Premise Lease Deed / Rent Agreement along with NOC from property owner if premises are leased or rented.',
            extractionConfidence: 0.92,
            createdAt: '2024-09-01T10:00:00.000Z',
          },
          {
            id: 'req-spice-utility',
            canonicalDocumentKey: 'utility_bill',
            documentName: 'Proof of Registered Office Address',
            classification: 'alternative',
            isMandatory: true,
            acceptedAlternatives: ['Electricity Bill', 'Telephone Bill', 'Gas Bill'],
            requiredFields: ['address', 'issue_date'],
            sourceEvidenceSnippet: 'Proof of Registered Office Address: Electricity bill, telephone bill or gas bill not older than two months.',
            extractionConfidence: 0.94,
            createdAt: '2024-09-01T10:00:00.000Z',
          },
          {
            id: 'req-spice-board-res',
            canonicalDocumentKey: 'statutory_declaration',
            documentName: 'Board Resolution for Authorised Signatory',
            classification: 'conditional',
            isMandatory: false,
            conditionExpression: "has_corporate_promoter == 'yes'",
            requiredFields: ['entity_name', 'signatory_name'],
            sourceEvidenceSnippet: 'Board Resolution for Authorised Signatory where the promoter entity is an existing corporate body.',
            extractionConfidence: 0.90,
            createdAt: '2024-09-01T10:00:00.000Z',
          },
        ],
        conditionalQuestions: [
          {
            id: 'q-spice-rent',
            applicationTypeId: 'type-spice-plus-v1',
            questionCode: 'is_rented_premise',
            questionText: 'Are the proposed registered office premises leased or rented?',
            questionType: 'boolean',
            options: ['yes', 'no'],
            defaultValue: 'no',
            triggerCondition: "is_rented_premise == 'yes'",
            triggeredRequirementKeys: ['utility_bill'],
            displayOrder: 1,
            helpText: 'If premises are rented, statutory rules mandate a Lease Agreement and Property Owner NOC.',
          },
          {
            id: 'q-spice-corp-promoter',
            applicationTypeId: 'type-spice-plus-v1',
            questionCode: 'has_corporate_promoter',
            questionText: 'Is one or more of the promoters an existing corporate body or foreign entity?',
            questionType: 'boolean',
            options: ['yes', 'no'],
            defaultValue: 'no',
            triggerCondition: "has_corporate_promoter == 'yes'",
            triggeredRequirementKeys: ['statutory_declaration'],
            displayOrder: 2,
            helpText: 'Requires an certified Board Resolution or Power of Attorney appointing authorised individual representative.',
          },
        ],
        createdAt: '2024-09-01T10:00:00.000Z',
        updatedAt: '2024-10-15T12:00:00.000Z',
      },
    ],
  },

  // 2. Published: GST REG-01 (CBIC)
  {
    id: 'srv-CBIC-SRV-GST-REG',
    sourceId: 'SRC-CBIC-GST',
    serviceName: 'Goods & Services Tax (GST) New Registration',
    serviceCode: 'CBIC-SRV-GST-REG',
    department: 'Central Board of Indirect Taxes and Customs (CBIC)',
    jurisdiction: 'India (Central & States)',
    officialUrl: 'https://www.cbic.gov.in/resources//htdocs-cbec/gst/cgst-act.pdf',
    description: 'Statutory application for registration of taxable persons under Central Goods and Services Tax Act Section 22.',
    category: 'regulatory_application',
    status: 'active',
    createdAt: '2024-09-05T10:00:00.000Z',
    updatedAt: '2024-10-16T14:00:00.000Z',
    applicationTypes: [
      {
        id: 'type-gst-reg01-v1',
        serviceId: 'srv-CBIC-SRV-GST-REG',
        applicationName: 'Form GST REG-01 Normal Taxpayer Registration',
        variantCode: 'CBIC-GST-REG01',
        applicantCategory: 'taxable_business',
        requirementsVersion: '2024.2',
        lifecycleStatus: 'published',
        publishedAt: '2024-10-16T14:00:00.000Z',
        verifiedBy: 'Indirect Tax Advisory Directorate',
        verifiedAt: '2024-10-16T11:00:00.000Z',
        adminNotes: 'Verified against CGST Rules 2017 Form REG-01 documentary guidelines.',
        requirements: [
          {
            id: 'req-gst-pan',
            canonicalDocumentKey: 'pan_card',
            documentName: 'Permanent Account Number (PAN) Card',
            classification: 'mandatory',
            isMandatory: true,
            requiredFields: ['pan_number', 'holder_name'],
            sourceEvidenceSnippet: 'Permanent Account Number (PAN) Card of the business enterprise or promoter.',
            extractionConfidence: 0.99,
            createdAt: '2024-09-05T10:00:00.000Z',
          },
          {
            id: 'req-gst-constitution',
            canonicalDocumentKey: 'incorporation_certificate',
            documentName: 'Proof of Constitution of Business',
            classification: 'alternative',
            isMandatory: true,
            acceptedAlternatives: ['Partnership Deed', 'Certificate of Incorporation', 'Society Registration Certificate'],
            requiredFields: ['entity_name', 'registration_number'],
            sourceEvidenceSnippet: 'Proof of Constitution of Business: Partnership deed, Certificate of Incorporation or Registration Certificate.',
            extractionConfidence: 0.94,
            createdAt: '2024-09-05T10:00:00.000Z',
          },
          {
            id: 'req-gst-address',
            canonicalDocumentKey: 'utility_bill',
            documentName: 'Principal Place of Business Proof',
            classification: 'alternative',
            isMandatory: true,
            acceptedAlternatives: ['Electricity Bill', 'Property Tax Receipt', 'Registered Rent Agreement'],
            requiredFields: ['address', 'issue_date'],
            sourceEvidenceSnippet: 'Principal Place of Business Proof: Electricity bill, property tax receipt, or registered rent agreement with municipal receipt.',
            extractionConfidence: 0.96,
            createdAt: '2024-09-05T10:00:00.000Z',
          },
          {
            id: 'req-gst-bank',
            canonicalDocumentKey: 'financial_statement',
            documentName: 'Bank Account Particulars & Cancelled Cheque',
            classification: 'mandatory',
            isMandatory: true,
            requiredFields: ['entity_name', 'registration_number'],
            sourceEvidenceSnippet: 'Bank Account Particulars & Cancelled Cheque showing legal account title and IFSC code.',
            extractionConfidence: 0.91,
            createdAt: '2024-09-05T10:00:00.000Z',
          },
        ],
        conditionalQuestions: [
          {
            id: 'q-gst-composition',
            applicationTypeId: 'type-gst-reg01-v1',
            questionCode: 'opt_composition_scheme',
            questionText: 'Do you opt for the GST Composition Levy scheme under Section 10?',
            questionType: 'boolean',
            options: ['yes', 'no'],
            defaultValue: 'no',
            triggerCondition: "opt_composition_scheme == 'yes'",
            triggeredRequirementKeys: ['statutory_declaration'],
            displayOrder: 1,
            helpText: 'Requires an explicit declaration under GST CMP-01 confirming eligible aggregate turnover limits.',
          },
        ],
        createdAt: '2024-09-05T10:00:00.000Z',
        updatedAt: '2024-10-16T14:00:00.000Z',
      },
    ],
  },

  // 3. Published: Passport Form No. 1 (MEA)
  {
    id: 'srv-MEA-SRV-PASS-FORM1',
    sourceId: 'SRC-PASSPORT-SEVA',
    serviceName: 'Ordinary Passport Issuance / Re-issue',
    serviceCode: 'MEA-SRV-PASS-FORM1',
    department: 'Ministry of External Affairs (MEA)',
    jurisdiction: 'India (Consular / Passport Offices)',
    officialUrl: 'https://www.passportindia.gov.in/AppOnlineProject/online/faqPassportAct',
    description: 'Statutory application form (Form No. 1) for Indian Passport under the Passports Act, 1967.',
    category: 'certificate_verification',
    status: 'active',
    createdAt: '2024-09-10T10:00:00.000Z',
    updatedAt: '2024-10-18T15:00:00.000Z',
    applicationTypes: [
      {
        id: 'type-passport-f1-v1',
        serviceId: 'srv-MEA-SRV-PASS-FORM1',
        applicationName: 'Passport Form No. 1 (Fresh / Re-issue)',
        variantCode: 'MEA-PASS-FORM1',
        applicantCategory: 'individual_citizen',
        requirementsVersion: '2024.1',
        lifecycleStatus: 'published',
        publishedAt: '2024-10-18T15:00:00.000Z',
        verifiedBy: 'Consular Services Document Standards Panel',
        verifiedAt: '2024-10-18T12:00:00.000Z',
        adminNotes: 'Verified against Passport Manual 2020 and MEA official documentary checklist.',
        requirements: [
          {
            id: 'req-pass-dob',
            canonicalDocumentKey: 'identity_card',
            documentName: 'Proof of Date of Birth',
            classification: 'alternative',
            isMandatory: true,
            acceptedAlternatives: ['Birth Certificate', 'Secondary School Certificate', 'PAN Card'],
            requiredFields: ['holder_name', 'date_of_birth'],
            sourceEvidenceSnippet: 'Proof of Date of Birth: Birth Certificate, Secondary School Leaving Certificate or PAN Card.',
            extractionConfidence: 0.97,
            createdAt: '2024-09-10T10:00:00.000Z',
          },
          {
            id: 'req-pass-address',
            canonicalDocumentKey: 'utility_bill',
            documentName: 'Proof of Current Residential Address',
            classification: 'alternative',
            isMandatory: true,
            acceptedAlternatives: ['Aadhaar Card', 'Electricity Bill', 'Water Bill', 'Registered Rent Agreement'],
            requiredFields: ['holder_name', 'address'],
            sourceEvidenceSnippet: 'Proof of Residential Address: Aadhaar Card, Electricity Bill, Water Bill, or Registered Rent Agreement.',
            extractionConfidence: 0.95,
            createdAt: '2024-09-10T10:00:00.000Z',
          },
          {
            id: 'req-pass-tatkaal',
            canonicalDocumentKey: 'statutory_declaration',
            documentName: 'Tatkaal Annexure Verification Proof',
            classification: 'conditional',
            isMandatory: false,
            conditionExpression: "application_mode == 'tatkaal'",
            requiredFields: ['holder_name', 'issue_date'],
            sourceEvidenceSnippet: 'For Tatkaal / Expedited Scheme: Three distinct documentary proofs verifying non-criminal background and urgent necessity.',
            extractionConfidence: 0.89,
            createdAt: '2024-09-10T10:00:00.000Z',
          },
        ],
        conditionalQuestions: [
          {
            id: 'q-pass-scheme',
            applicationTypeId: 'type-passport-f1-v1',
            questionCode: 'application_mode',
            questionText: 'Select processing scheme mode:',
            questionType: 'select',
            options: ['normal', 'tatkaal'],
            defaultValue: 'normal',
            triggerCondition: "application_mode == 'tatkaal'",
            triggeredRequirementKeys: ['statutory_declaration'],
            displayOrder: 1,
            helpText: 'Tatkaal scheme requires three designated ID credentials as prescribed under Passports Rules schedule.',
          },
        ],
        createdAt: '2024-09-10T10:00:00.000Z',
        updatedAt: '2024-10-18T15:00:00.000Z',
      },
    ],
  },

  // 4. Candidate: Needs Verification (MCA DIR-3)
  {
    id: 'srv-MCA-DIR3',
    sourceId: 'SRC-MCA-GOV',
    serviceName: 'Application for Allotment of Director Identification Number (DIR-3)',
    serviceCode: 'MCA-SRV-DIR3',
    department: 'Ministry of Corporate Affairs (MCA)',
    jurisdiction: 'India (Central)',
    officialUrl: 'https://www.mca.gov.in/MinistryV2/dir-3.html',
    description: 'Statutory filing under Section 153 of the Companies Act, 2013 for obtaining DIN.',
    category: 'regulatory_application',
    status: 'active',
    createdAt: '2024-10-20T08:30:00.000Z',
    updatedAt: '2024-10-20T08:30:00.000Z',
    applicationTypes: [
      {
        id: 'type-dir3-candidate',
        serviceId: 'srv-MCA-DIR3',
        applicationName: 'eForm DIR-3 (DIN Allotment)',
        variantCode: 'MCA-DIR-3',
        applicantCategory: 'individual_director',
        requirementsVersion: '2024.1-draft',
        lifecycleStatus: 'needs_verification', // Needs admin verification before publishing
        createdAt: '2024-10-20T08:30:00.000Z',
        updatedAt: '2024-10-20T08:30:00.000Z',
        adminNotes: 'Automated crawler extracted 3 candidate document rules. Needs verification of notary attestation requirement.',
        requirements: [
          {
            id: 'req-dir3-photo',
            canonicalDocumentKey: 'identity_card',
            documentName: 'Applicant Photograph & Identity Proof',
            classification: 'mandatory',
            isMandatory: true,
            requiredFields: ['holder_name', 'date_of_birth'],
            sourceEvidenceSnippet: 'High-resolution colour photograph and self-attested identity proof (PAN card mandatory for Indian nationals).',
            extractionConfidence: 0.94,
            createdAt: '2024-10-20T08:30:00.000Z',
          },
          {
            id: 'req-dir3-address',
            canonicalDocumentKey: 'utility_bill',
            documentName: 'Proof of Residence (Electricity / Passport / Driving Licence)',
            classification: 'alternative',
            isMandatory: true,
            acceptedAlternatives: ['Passport', 'Voter Identity Card', 'Driving Licence', 'Electricity Bill not older than 2 months'],
            requiredFields: ['address', 'holder_name'],
            sourceEvidenceSnippet: 'Proof of Residence: Address proof in the name of applicant not older than 2 months for utility bills.',
            extractionConfidence: 0.91,
            createdAt: '2024-10-20T08:30:00.000Z',
          },
          {
            id: 'req-dir3-digital-sig',
            canonicalDocumentKey: 'statutory_declaration',
            documentName: 'Digital Signature Certificate (DSC Class 3)',
            classification: 'mandatory',
            isMandatory: true,
            requiredFields: ['holder_name', 'expiry_date'],
            sourceEvidenceSnippet: 'Form DIR-3 must be digitally signed by the applicant using their valid DSC.',
            extractionConfidence: 0.88,
            createdAt: '2024-10-20T08:30:00.000Z',
          },
        ],
        conditionalQuestions: [
          {
            id: 'q-dir3-foreign',
            applicationTypeId: 'type-dir3-candidate',
            questionCode: 'is_foreign_national',
            questionText: 'Is the applicant a foreign national or non-resident?',
            questionType: 'boolean',
            options: ['yes', 'no'],
            defaultValue: 'no',
            triggerCondition: "is_foreign_national == 'yes'",
            triggeredRequirementKeys: ['identity_card'],
            displayOrder: 1,
            helpText: 'Foreign nationals require apostilled/notarised passport and consular verification.',
          },
        ],
      },
    ],
  },

  // 5. Candidate: Extracted (UIDAI Aadhaar Update)
  {
    id: 'srv-UIDAI-UPDATE',
    sourceId: 'SRC-UIDAI-AADHAAR',
    serviceName: 'Aadhaar Demographic / Address Update',
    serviceCode: 'UIDAI-SRV-UPDATE',
    department: 'Unique Identification Authority of India (UIDAI)',
    jurisdiction: 'India (National)',
    officialUrl: 'https://uidai.gov.in/en/my-aadhaar/about-your-aadhaar/updating-data-on-aadhaar.html',
    description: 'Demographic and Address Update through Self Service Update Portal (SSUP) or Enrolment Centre.',
    category: 'certificate_verification',
    status: 'active',
    createdAt: '2024-10-22T14:10:00.000Z',
    updatedAt: '2024-10-22T14:10:00.000Z',
    applicationTypes: [
      {
        id: 'type-uidai-update-candidate',
        serviceId: 'srv-UIDAI-UPDATE',
        applicationName: 'Aadhaar Enrolment / Correction Form',
        variantCode: 'UIDAI-SSUP-2024',
        applicantCategory: 'resident_individual',
        requirementsVersion: '2024.1-draft',
        lifecycleStatus: 'extracted', // Newly extracted, awaiting initial review
        createdAt: '2024-10-22T14:10:00.000Z',
        updatedAt: '2024-10-22T14:10:00.000Z',
        adminNotes: 'Extracted automatically from UIDAI SSUP standard list of supporting documents (January 2024).',
        requirements: [
          {
            id: 'req-uidai-poa',
            canonicalDocumentKey: 'utility_bill',
            documentName: 'Proof of Address (PoA) Document',
            classification: 'alternative',
            isMandatory: true,
            acceptedAlternatives: ['Electricity Bill', 'Water Bill', 'Bank Passbook with Photo', 'Registered Sale Deed'],
            requiredFields: ['holder_name', 'address'],
            sourceEvidenceSnippet: 'Proof of Address (PoA) containing Name and Address: 45 acceptable documents listed in UIDAI schedule.',
            extractionConfidence: 0.95,
            createdAt: '2024-10-22T14:10:00.000Z',
          },
        ],
        conditionalQuestions: [],
      },
    ],
  },

  // 6. Candidate: Discovered (India Code / Intellectual Property)
  {
    id: 'srv-IPINDIA-TMA',
    sourceId: 'SRC-INDIA-CODE',
    serviceName: 'Trade Mark Application (Form TM-A)',
    serviceCode: 'CGPDTM-SRV-TMA',
    department: 'Controller General of Patents, Designs and Trade Marks (CGPDTM)',
    jurisdiction: 'India (National)',
    officialUrl: 'https://www.indiacode.nic.in/handle/123456789/1990',
    description: 'Statutory application for registration of a trade mark under Trade Marks Act, 1999.',
    category: 'regulatory_application',
    status: 'active',
    createdAt: '2024-10-23T11:00:00.000Z',
    updatedAt: '2024-10-23T11:00:00.000Z',
    applicationTypes: [
      {
        id: 'type-tma-discovered',
        serviceId: 'srv-IPINDIA-TMA',
        applicationName: 'Form TM-A: Application for Registration of Trade Mark',
        variantCode: 'CGPDTM-TM-A',
        applicantCategory: 'proprietor_or_agent',
        requirementsVersion: '2024.1-discovered',
        lifecycleStatus: 'discovered', // Newly discovered from India Code catalogue
        createdAt: '2024-10-23T11:00:00.000Z',
        updatedAt: '2024-10-23T11:00:00.000Z',
        adminNotes: 'URL discovered in statutory repository. Parsing pending schedule extraction.',
        requirements: [],
        conditionalQuestions: [],
      },
    ],
  },
];

// In-memory runtime state for services & sources (synced with Supabase when configured)
let runtimeServices = [...CANDIDATE_GOVERNMENT_SERVICES];
let runtimeSources = [...OFFICIAL_GOVERNMENT_SOURCES];

/**
 * Returns all configured government sources
 */
export async function getGovernmentSources(): Promise<GovernmentSource[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('government_sources')
        .select('*')
        .order('authority', { ascending: true });
      if (!error && data && data.length > 0) {
        return data as GovernmentSource[];
      }
    } catch (err) {
      console.warn('[TypeNull] Error loading sources from Supabase, using registry:', err);
    }
  }
  return runtimeSources;
}

/**
 * Returns government services with optional lifecycle status filter
 */
export async function getGovernmentServices(
  statusFilter?: LifecycleStatus
): Promise<GovernmentService[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from('government_services')
        .select('*, application_types:service_application_types(*)');

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const formatted: GovernmentService[] = data.map((d: any) => ({
          ...d,
          applicationTypes: d.application_types || [],
        }));
        if (statusFilter) {
          return formatted.filter((s) =>
            s.applicationTypes.some((t) => t.lifecycleStatus === statusFilter)
          );
        }
        return formatted;
      }
    } catch (err) {
      console.warn('[TypeNull] Error loading services from Supabase, using local catalog:', err);
    }
  }

  if (statusFilter) {
    return runtimeServices.filter((s) =>
      s.applicationTypes.some((t) => t.lifecycleStatus === statusFilter)
    );
  }
  return runtimeServices;
}

/**
 * Returns only published, authoritative government services for applicants to select
 */
export async function getPublishedGovernmentServices(): Promise<GovernmentService[]> {
  const allServices = await getGovernmentServices();
  return allServices
    .map((service) => ({
      ...service,
      applicationTypes: service.applicationTypes.filter(
        (t) => t.lifecycleStatus === 'published'
      ),
    }))
    .filter((service) => service.applicationTypes.length > 0);
}

/**
 * Updates the lifecycle state of a service application type (Admin action)
 */
export async function updateApplicationTypeLifecycle(
  typeId: string,
  newStatus: LifecycleStatus,
  adminNotes?: string,
  verifiedBy?: string
): Promise<boolean> {
  // Update in runtime state
  runtimeServices = runtimeServices.map((service) => ({
    ...service,
    applicationTypes: service.applicationTypes.map((appType) => {
      if (appType.id === typeId) {
        return {
          ...appType,
          lifecycleStatus: newStatus,
          adminNotes: adminNotes ?? appType.adminNotes,
          verifiedBy: verifiedBy ?? appType.verifiedBy ?? 'Administrator',
          verifiedAt: newStatus === 'verified' || newStatus === 'published' ? new Date().toISOString() : appType.verifiedAt,
          publishedAt: newStatus === 'published' ? new Date().toISOString() : appType.publishedAt,
          updatedAt: new Date().toISOString(),
        };
      }
      return appType;
    }),
  }));

  // Sync with Supabase if available
  if (isSupabaseConfigured && supabase) {
    try {
      const updatePayload: Record<string, any> = {
        lifecycle_status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (adminNotes) updatePayload.admin_notes = adminNotes;
      if (newStatus === 'verified' || newStatus === 'published') {
        updatePayload.verified_at = new Date().toISOString();
        if (verifiedBy) updatePayload.verified_by = verifiedBy;
      }
      if (newStatus === 'published') {
        updatePayload.published_at = new Date().toISOString();
      }

      await supabase
        .from('service_application_types')
        .update(updatePayload)
        .eq('id', typeId);
    } catch (err) {
      console.warn('[TypeNull] Failed to persist lifecycle update to Supabase:', err);
    }
  }

  return true;
}

/**
 * Updates a requirement's classification or mandatory flag
 */
export async function updateRequirementClassification(
  requirementId: string,
  newClassification: RequirementClassification,
  isMandatory: boolean
): Promise<boolean> {
  runtimeServices = runtimeServices.map((service) => ({
    ...service,
    applicationTypes: service.applicationTypes.map((appType) => ({
      ...appType,
      requirements: appType.requirements.map((req) => {
        if (req.id === requirementId) {
          return {
            ...req,
            classification: newClassification,
            isMandatory,
          };
        }
        return req;
      }),
    })),
  }));
  return true;
}

/**
 * Triggers an incremental automated discovery and ingestion scan
 */
export async function triggerDiscoveryRun(
  config?: DiscoveryPipelineConfig
): Promise<IngestionPipelineResult> {
  const result = await runGovernmentDiscoveryPipeline(config);

  // Merge discovered services into runtime
  for (const newSrv of result.servicesDiscovered) {
    const existingIdx = runtimeServices.findIndex((s) => s.serviceCode === newSrv.serviceCode);
    if (existingIdx >= 0) {
      runtimeServices[existingIdx] = newSrv;
    } else {
      runtimeServices.unshift(newSrv);
    }
  }

  return result;
}

/**
 * Computes exact measured counts across sources and candidate requirements
 */
export async function getIngestionMetrics(): Promise<{
  sourcesCount: number;
  servicesCount: number;
  applicationTypesCount: number;
  requirementsCount: number;
  publishedCount: number;
  verifiedCount: number;
  needsVerificationCount: number;
  extractedCount: number;
  discoveredCount: number;
  supersededCount: number;
}> {
  const sources = await getGovernmentSources();
  const services = await getGovernmentServices();

  let applicationTypesCount = 0;
  let requirementsCount = 0;
  let publishedCount = 0;
  let verifiedCount = 0;
  let needsVerificationCount = 0;
  let extractedCount = 0;
  let discoveredCount = 0;
  let supersededCount = 0;

  for (const srv of services) {
    for (const appType of srv.applicationTypes) {
      applicationTypesCount++;
      requirementsCount += (appType.requirements || []).length;

      switch (appType.lifecycleStatus) {
        case 'published':
          publishedCount++;
          break;
        case 'verified':
          verifiedCount++;
          break;
        case 'needs_verification':
          needsVerificationCount++;
          break;
        case 'extracted':
          extractedCount++;
          break;
        case 'discovered':
        case 'downloaded':
          discoveredCount++;
          break;
        case 'superseded':
        case 'inactive':
          supersededCount++;
          break;
      }
    }
  }

  return {
    sourcesCount: sources.length,
    servicesCount: services.length,
    applicationTypesCount,
    requirementsCount,
    publishedCount,
    verifiedCount,
    needsVerificationCount,
    extractedCount,
    discoveredCount,
    supersededCount,
  };
}
