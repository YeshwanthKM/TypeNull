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
  // 1. Archived Legacy Catalogue: SPICe+ (MCA)
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
    status: 'deprecated',
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

  // 2. Archived Legacy Catalogue: GST REG-01 (CBIC)
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
    status: 'deprecated',
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
    status: 'deprecated',
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
    status: 'deprecated',
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
    status: 'deprecated',
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
    status: 'deprecated',
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

/**
 * Primary Active Government Service for Institutional Workflows
 * Strictly AICTE Extension of Approval (EoA)
 */
export const AICTE_EOA_GOVERNMENT_SERVICE: GovernmentService = {
  id: 'srv-AICTE-SRV-EOA',
  sourceId: 'SRC-AICTE-GOV',
  serviceName: 'Extension of Approval (EoA) for Technical Institutions',
  serviceCode: 'AICTE-EOA-2026',
  department: 'All India Council for Technical Education (AICTE)',
  jurisdiction: 'India (National)',
  officialUrl: 'https://www.aicte-india.org/bureaus/approval',
  description: 'Statutory annual Extension of Approval for existing approved technical institutions across diploma, degree, and postgraduate programmes.',
  category: 'institution_registration',
  status: 'active',
  createdAt: '2026-10-26T00:00:00.000Z',
  updatedAt: '2026-10-26T00:00:00.000Z',
  applicationTypes: [
    {
      id: 'type-aicte-eoa-2026',
      serviceId: 'srv-AICTE-SRV-EOA',
      applicationName: 'Extension of Approval (EoA) Application',
      variantCode: 'AICTE-EOA-2026',
      applicantCategory: 'approved_technical_institution',
      requirementsVersion: '2026-27',
      lifecycleStatus: 'published',
      publishedAt: '2026-10-26T00:00:00.000Z',
      verifiedBy: 'AICTE Approval Scrutiny Bureau',
      verifiedAt: '2026-10-26T00:00:00.000Z',
      adminNotes: 'Verified against AICTE Approval Process Handbook (APH) regulations for Extension of Approval.',
      requirements: [
        {
          id: 'req-eoa-affidavit',
          canonicalDocumentKey: 'statutory_declaration',
          documentName: 'Institution Compliance Affidavit (Form 1)',
          classification: 'mandatory',
          isMandatory: true,
          requiredFields: ['institution_name', 'aicte_permanent_id', 'authorized_signatory'],
          sourceEvidenceSnippet: 'Duly sworn affidavit by the Authorized Signatory on non-judicial stamp paper confirming compliance with AICTE norms.',
          extractionConfidence: 0.95,
          createdAt: '2026-10-26T00:00:00.000Z',
        },
        {
          id: 'req-eoa-land-building',
          canonicalDocumentKey: 'utility_bill',
          documentName: 'Land & Built-up Area Certificate',
          classification: 'mandatory',
          isMandatory: true,
          requiredFields: ['land_area_acres', 'built_up_area_sqm', 'khasra_survey_number'],
          sourceEvidenceSnippet: 'Land title and building completion/occupancy certificate attested by local municipal or competent authority.',
          extractionConfidence: 0.95,
          createdAt: '2026-10-26T00:00:00.000Z',
        },
        {
          id: 'req-eoa-faculty-list',
          canonicalDocumentKey: 'statutory_declaration',
          documentName: 'Faculty Cadre & Bio-data Statement',
          classification: 'mandatory',
          isMandatory: true,
          requiredFields: ['total_faculty_count', 'principal_name', 'cadre_ratio'],
          sourceEvidenceSnippet: 'Faculty roll verifying cadre ratio, qualification certifications, and biometric attendance records.',
          extractionConfidence: 0.95,
          createdAt: '2026-10-26T00:00:00.000Z',
        },
        {
          id: 'req-eoa-audited-financials',
          canonicalDocumentKey: 'incorporation_certificate',
          documentName: 'Audited Financial Statements (Preceding Financial Year)',
          classification: 'mandatory',
          isMandatory: true,
          requiredFields: ['ca_membership_number', 'financial_year', 'corpus_fund'],
          sourceEvidenceSnippet: 'Audited balance sheet and income/expenditure account certified by a Chartered Accountant with UDIN.',
          extractionConfidence: 0.95,
          createdAt: '2026-10-26T00:00:00.000Z',
        },
      ],
      conditionalQuestions: [
        {
          id: 'q-eoa-nba-accredited',
          applicationTypeId: 'type-aicte-eoa-2026',
          questionCode: 'has_nba_accreditation',
          questionText: 'Are any eligible courses currently accredited by NBA?',
          questionType: 'boolean',
          options: ['yes', 'no'],
          defaultValue: 'no',
          triggerCondition: "has_nba_accreditation == 'yes'",
          triggeredRequirementKeys: ['statutory_declaration'],
          displayOrder: 1,
          helpText: 'Institutions with accredited courses must submit current NBA accreditation award letters.',
        },
      ],
      createdAt: '2026-10-26T00:00:00.000Z',
      updatedAt: '2026-10-26T00:00:00.000Z',
    },
  ],
};

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
 * Returns strictly active, published services for institutional user workflows (excludes archived).
 * In TypeNull AICTE edition, returns strictly AICTE Extension of Approval (EoA).
 */
export async function getActiveGovernmentServices(): Promise<GovernmentService[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('government_services')
        .select('*')
        .eq('status', 'active');
      if (!error && data && data.length > 0) {
        return data as GovernmentService[];
      }
    } catch {
      // Fallback to runtime active service
    }
  }
  return [AICTE_EOA_GOVERNMENT_SERVICE];
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
 * Triggers an incremental automated discovery and ingestion scan, persisting runs,
 * services, requirements, questions, and catalog entries while strictly preserving
 * existing verified and published lifecycle statuses.
 */
export async function triggerDiscoveryRun(
  config?: DiscoveryPipelineConfig
): Promise<IngestionPipelineResult> {
  const result = await runGovernmentDiscoveryPipeline(config);

  // 1. Merge discovered services into runtime state with strict lifecycle status preservation
  for (const newSrv of result.servicesDiscovered) {
    const existingIdx = runtimeServices.findIndex((s) => s.serviceCode === newSrv.serviceCode);
    if (existingIdx >= 0) {
      const existingSrv = runtimeServices[existingIdx];
      const mergedAppTypes = newSrv.applicationTypes.map((newApp) => {
        const existingApp = existingSrv.applicationTypes.find(
          (ea) => ea.variantCode === newApp.variantCode
        );
        // Do NOT overwrite or downgrade verified or published lifecycle states!
        if (
          existingApp &&
          (existingApp.lifecycleStatus === 'verified' || existingApp.lifecycleStatus === 'published')
        ) {
          return {
            ...newApp,
            lifecycleStatus: existingApp.lifecycleStatus,
            verifiedBy: existingApp.verifiedBy,
            verifiedAt: existingApp.verifiedAt,
            adminNotes: existingApp.adminNotes,
            publishedAt: existingApp.publishedAt,
            requirements: existingApp.requirements,
            conditionalQuestions: existingApp.conditionalQuestions,
          };
        }
        return newApp;
      });

      runtimeServices[existingIdx] = {
        ...newSrv,
        applicationTypes: mergedAppTypes,
      };
    } else {
      runtimeServices.unshift(newSrv);
    }
  }

  // 2. Persist to Supabase if configured; provide explicit fallback if unconfigured
  if (!isSupabaseConfigured || !supabase) {
    result.isPersisted = false;
    result.persistenceNote =
      'Database unconfigured or offline. Ingestion run and discovered records retained in durable in-memory state.';
    return result;
  }

  try {
    // Record ingestion run in public.ingestion_runs
    const { data: runRecord } = await supabase
      .from('ingestion_runs')
      .insert({
        run_type: 'manual',
        sources_scanned: result.runSummary.sourcesScanned,
        resources_discovered: result.runSummary.resourcesDiscovered,
        resources_downloaded: result.runSummary.resourcesDownloaded,
        resources_parsed: result.runSummary.resourcesParsed,
        errors_count: result.runSummary.errorsCount,
        report_summary: result.runSummary,
        status: 'completed',
        completed_at: result.completedAt,
        is_simulated: false,
      })
      .select()
      .maybeSingle();

    // Persist discovered government services & application types
    for (const srv of result.servicesDiscovered) {
      const { data: savedSrv } = await supabase
        .from('government_services')
        .upsert(
          {
            source_id: srv.sourceId,
            service_name: srv.serviceName,
            service_code: srv.serviceCode,
            department: srv.department,
            jurisdiction: srv.jurisdiction,
            official_url: srv.officialUrl,
            description: srv.description,
            category: srv.category,
            status: srv.status,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'service_code' }
        )
        .select()
        .maybeSingle();

      const serviceDbId = savedSrv?.id || srv.id;

      for (const appType of srv.applicationTypes) {
        // Check if application type already exists in Supabase
        const { data: existingAppType } = await supabase
          .from('service_application_types')
          .select('id, lifecycle_status, verified_by, verified_at, admin_notes, published_at')
          .eq('service_id', serviceDbId)
          .eq('variant_code', appType.variantCode)
          .eq('requirements_version', appType.requirementsVersion)
          .maybeSingle();

        let finalLifecycleStatus = appType.lifecycleStatus;
        let finalVerifiedBy = appType.verifiedBy;
        let finalVerifiedAt = appType.verifiedAt;
        let finalAdminNotes = appType.adminNotes;
        let finalPublishedAt = appType.publishedAt;

        // Retain verified or published lifecycle states
        if (
          existingAppType &&
          (existingAppType.lifecycle_status === 'verified' ||
            existingAppType.lifecycle_status === 'published')
        ) {
          finalLifecycleStatus = existingAppType.lifecycle_status;
          finalVerifiedBy = existingAppType.verified_by;
          finalVerifiedAt = existingAppType.verified_at;
          finalAdminNotes = existingAppType.admin_notes;
          finalPublishedAt = existingAppType.published_at;
        }

        const { data: savedAppType } = await supabase
          .from('service_application_types')
          .upsert(
            {
              service_id: serviceDbId,
              application_name: appType.applicationName,
              variant_code: appType.variantCode,
              applicant_category: appType.applicantCategory,
              requirements_version: appType.requirementsVersion,
              lifecycle_status: finalLifecycleStatus,
              verified_by: finalVerifiedBy,
              verified_at: finalVerifiedAt,
              admin_notes: finalAdminNotes,
              published_at: finalPublishedAt,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'service_id,variant_code,requirements_version' }
          )
          .select()
          .maybeSingle();

        const appTypeDbId = savedAppType?.id || appType.id;

        // Only persist newly extracted requirements if the record wasn't already verified
        if (!existingAppType || (existingAppType.lifecycle_status !== 'verified' && existingAppType.lifecycle_status !== 'published')) {
          for (const req of appType.requirements || []) {
            await supabase.from('application_document_requirements').upsert(
              {
                application_type_id: appTypeDbId,
                document_name: req.documentName,
                document_type: req.canonicalDocumentKey,
                requirement_classification: req.classification,
                condition_expression: req.conditionExpression || null,
                accepted_alternatives: req.acceptedAlternatives || [],
                source_evidence: req.sourceEvidenceSnippet || null,
                source_url: srv.officialUrl,
                verification_status: req.verificationStatus || 'extracted',
              }
            );
          }

          for (const q of appType.conditionalQuestions || []) {
            await supabase.from('application_conditional_questions').upsert(
              {
                application_type_id: appTypeDbId,
                question_key: q.questionCode || q.questionKey,
                question_text: q.questionText,
                response_type: q.questionType || 'boolean',
                options: q.options || [],
                default_value: q.defaultValue || null,
                help_text: q.helpText || null,
                activates_document_types: q.triggeredRequirementKeys || q.activatesDocumentTypes || [],
              },
              { onConflict: 'application_type_id,question_key' }
            );
          }
        }
      }
    }

    // Persist discovered catalog entries
    for (const doc of result.catalogEntries) {
      await supabase.from('official_documents_catalog').upsert(
        {
          source_id: doc.sourceId,
          form_identifier: doc.formIdentifier,
          title: doc.title,
          source_url: doc.sourceUrl,
          file_format: doc.fileFormat,
          content_hash_sha256: doc.contentHashSha256,
          file_size_bytes: doc.fileSizeBytes,
          extraction_status: doc.extractionStatus,
          extraction_metadata: doc.extractionMetadata || {},
          last_checked_at: new Date().toISOString(),
        },
        { onConflict: 'content_hash_sha256' }
      );
    }

    result.isPersisted = true;
    result.persistenceNote = `Persisted run ${runRecord?.id || 'recorded'} to Supabase successfully.`;
  } catch (dbErr: any) {
    console.warn('[TypeNull] Ingestion persistence warning:', dbErr.message);
    result.isPersisted = false;
    result.persistenceNote = `Persistence note: ${dbErr.message}`;
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
