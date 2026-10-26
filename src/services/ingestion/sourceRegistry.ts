import { GovernmentSource } from '../../types';

/**
 * Official Indian Government Source Registry
 * Authoritative starting points for statutory forms, service directories, and regulatory gazettes.
 */
export const OFFICIAL_GOVERNMENT_SOURCES: GovernmentSource[] = [
  {
    id: 'SRC-INDIA-SERVICES',
    authority: 'National Informatics Centre (NIC) / Ministry of Electronics & IT',
    sourceUrl: 'https://services.india.gov.in/',
    sourceType: 'portal',
    jurisdiction: 'India (National & States)',
    supportedCategories: [
      'general_registration',
      'organisation_registration',
      'regulatory_application',
      'certificate_verification',
    ],
    retrievalStatus: 'active',
    verificationStatus: 'verified',
    accessLimitations:
      'Aggregated central/state services directory; links directly to originating state and ministry service portals.',
    lastDiscoveredAt: '2026-02-01T00:00:00Z',
    lastCheckedAt: '2026-10-24T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRC-INDIA-PORTAL',
    authority: 'Government of India (National Portal)',
    sourceUrl: 'https://www.india.gov.in/',
    sourceType: 'portal',
    jurisdiction: 'India (Union)',
    supportedCategories: ['general_registration', 'certificate_verification'],
    retrievalStatus: 'active',
    verificationStatus: 'verified',
    accessLimitations:
      'Central clearinghouse for gazette notifications, official acts, and departmental form catalogues.',
    lastDiscoveredAt: '2026-02-01T00:00:00Z',
    lastCheckedAt: '2026-10-24T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRC-IGOD-DIR',
    authority: 'Integrated Government Online Directory (NIC)',
    sourceUrl: 'https://igod.gov.in/',
    sourceType: 'directory',
    jurisdiction: 'India (Central & States)',
    supportedCategories: ['organisation_registration', 'regulatory_application'],
    retrievalStatus: 'active',
    verificationStatus: 'verified',
    accessLimitations:
      'Directory of Indian government apex bodies, ministries, and departments with official URLs.',
    lastDiscoveredAt: '2026-02-01T00:00:00Z',
    lastCheckedAt: '2026-10-24T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRC-PASSPORT-SEVA',
    authority: 'Consular, Passport & Visa Division, Ministry of External Affairs',
    sourceUrl: 'https://www.passportindia.gov.in/',
    sourceType: 'department_site',
    jurisdiction: 'India (National & Overseas)',
    supportedCategories: ['certificate_verification'],
    retrievalStatus: 'active',
    verificationStatus: 'verified',
    accessLimitations:
      'Provides official PDF application forms (Form 1, Annexures A through I) and documentary evidence matrices.',
    lastDiscoveredAt: '2026-02-01T00:00:00Z',
    lastCheckedAt: '2026-10-24T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRC-INDIA-CODE',
    authority: 'Legislative Department, Ministry of Law and Justice',
    sourceUrl: 'https://www.indiacode.nic.in/',
    sourceType: 'statutory_code',
    jurisdiction: 'India (Central Acts)',
    supportedCategories: [
      'organisation_registration',
      'regulatory_application',
      'certificate_verification',
    ],
    retrievalStatus: 'active',
    verificationStatus: 'verified',
    accessLimitations:
      'Digital repository of all Central & State statutory Acts, rules, regulations, and statutory schedules.',
    lastDiscoveredAt: '2026-02-01T00:00:00Z',
    lastCheckedAt: '2026-10-24T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRC-MCA-GOV',
    authority: 'Ministry of Corporate Affairs (MCA), Government of India',
    sourceUrl: 'https://www.mca.gov.in/',
    sourceType: 'department_site',
    jurisdiction: 'India (Registrar of Companies)',
    supportedCategories: ['organisation_registration'],
    retrievalStatus: 'active',
    verificationStatus: 'verified',
    accessLimitations:
      'Statutory repository of e-Forms (SPICe+ INC-32, DIR-3, RUN, AOA/MOA) and Companies Act 2013 rules.',
    lastDiscoveredAt: '2026-02-01T00:00:00Z',
    lastCheckedAt: '2026-10-24T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRC-CBIC-GST',
    authority: 'Central Board of Indirect Taxes and Customs (CBIC) & GST Council',
    sourceUrl: 'https://www.cbic.gov.in/',
    sourceType: 'department_site',
    jurisdiction: 'India (Indirect Tax)',
    supportedCategories: ['regulatory_application'],
    retrievalStatus: 'active',
    verificationStatus: 'verified',
    accessLimitations:
      'Central depository for GST registration statutory formats (REG-01 to REG-30) and CGST notifications.',
    lastDiscoveredAt: '2026-02-01T00:00:00Z',
    lastCheckedAt: '2026-10-24T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRC-UIDAI-DIRECTIVES',
    authority: 'Unique Identification Authority of India (UIDAI)',
    sourceUrl: 'https://uidai.gov.in/',
    sourceType: 'department_site',
    jurisdiction: 'India (National Identity)',
    supportedCategories: ['certificate_verification'],
    retrievalStatus: 'active',
    verificationStatus: 'verified',
    accessLimitations:
      'Official list of supporting documents for identity and residential proof under Aadhaar regulations.',
    lastDiscoveredAt: '2026-02-01T00:00:00Z',
    lastCheckedAt: '2026-10-24T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'SRC-AICTE-GOV',
    authority: 'All India Council for Technical Education (AICTE), Ministry of Education',
    sourceUrl: 'https://www.aicte-india.org/',
    sourceType: 'portal',
    jurisdiction: 'India (Technical Education & Apex Regulatory)',
    supportedCategories: ['institution_registration', 'regulatory_application'],
    retrievalStatus: 'active',
    verificationStatus: 'verified',
    accessLimitations:
      'Apex regulatory portal for technical education institutional approvals, Approval Process Handbook (APH), and Extension of Approval (EoA) statutory filings.',
    lastDiscoveredAt: '2026-02-01T00:00:00Z',
    lastCheckedAt: '2026-10-26T00:00:00Z',
    createdAt: '2026-10-26T00:00:00Z',
  },
];

/**
 * Returns all configured government sources
 */
export function getRegisteredGovernmentSources(): GovernmentSource[] {
  return OFFICIAL_GOVERNMENT_SOURCES;
}

/**
 * Find source by ID
 */
export function getGovernmentSourceById(id: string): GovernmentSource | undefined {
  return OFFICIAL_GOVERNMENT_SOURCES.find((s) => s.id === id);
}
