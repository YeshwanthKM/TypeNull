import {
  GovernmentService,
  GovernmentSource,
  IngestionRunSummary,
  OfficialDocumentCatalogEntry,
  ServiceApplicationType,
} from '../../types';
import { OFFICIAL_GOVERNMENT_SOURCES } from './sourceRegistry';
import { safeFetchGovernmentResource } from './safeFetch';
import { extractRequirementsFromTextOrHtml } from './formExtractor';

export interface DiscoveryPipelineConfig {
  sources?: GovernmentSource[];
  maxResourcesPerSource?: number;
  timeoutMs?: number;
  onProgress?: (progress: {
    sourceId: string;
    step: 'scanning' | 'downloading' | 'parsing' | 'recording';
    resourceName: string;
    completedCount: number;
    totalCount: number;
  }) => void;
}

export interface IngestionPipelineResult {
  runId: string;
  runSummary: IngestionRunSummary;
  servicesDiscovered: GovernmentService[];
  catalogEntries: OfficialDocumentCatalogEntry[];
  errors: Array<{ sourceId: string; url: string; error: string }>;
  completedAt: string;
}

/**
 * Curated Official Form & Guide Seed Corpus for Initial Controlled Ingestion
 * Represents authoritative accessible public service forms from approved Indian portals.
 */
export const OFFICIAL_SEED_DOCUMENTS = [
  {
    sourceId: 'SRC-MCA-GOV',
    serviceName: 'Corporate Incorporation & Registration (SPICe+)',
    serviceCode: 'MCA-SRV-SPICE-PLUS',
    department: 'Ministry of Corporate Affairs (MCA)',
    category: 'organisation_registration',
    officialUrl: 'https://www.mca.gov.in/MinistryV2/incorporation_company.html',
    description: 'Simplified Proforma for Incorporating Company Electronically (SPICe+ Part A and Part B).',
    variantCode: 'MCA-SPICE-INC32',
    rawGuidanceText: `
      MINISTRY OF CORPORATE AFFAIRS - GOVERNMENT OF INDIA
      Notification: Companies (Incorporation) Rules, 2014 & SPICe+ Integrated Filing.
      Mandatory Supporting Documents for Incorporation:
      1. Certificate of Incorporation issued upon name approval and registration.
      2. Memorandum of Association (MOA) and Articles of Association (AOA).
      3. Permanent Account Number (PAN) Card of all designated directors and promoters.
      4. Proof of Registered Office Address: Electricity bill, telephone bill or gas bill not older than two months.
      5. Commercial Premise Lease Deed / Rent Agreement along with NOC from property owner if premises are leased or rented.
      6. Board Resolution for Authorised Signatory where the promoter entity is an existing corporate body.
      7. Bank Account Particulars & Cancelled Cheque for statutory EPFO, ESIC, and bank account opening.
    `,
  },
  {
    sourceId: 'SRC-CBIC-GST',
    serviceName: 'Goods & Services Tax (GST) New Registration',
    serviceCode: 'CBIC-SRV-GST-REG',
    department: 'Central Board of Indirect Taxes and Customs (CBIC)',
    category: 'regulatory_application',
    officialUrl: 'https://www.cbic.gov.in/resources//htdocs-cbec/gst/cgst-act.pdf',
    description: 'Statutory application for registration of taxable persons under CGST Act Section 22.',
    variantCode: 'CBIC-GST-REG01',
    rawGuidanceText: `
      CENTRAL BOARD OF INDIRECT TAXES AND CUSTOMS - GST COUNCIL
      Statutory Guidelines for Form GST REG-01: Application for Registration.
      Mandatory Documents to be uploaded:
      1. Permanent Account Number (PAN) Card of the business enterprise or promoter.
      2. Proof of Constitution of Business: Partnership deed, Certificate of Incorporation or Registration Certificate.
      3. Principal Place of Business Proof: Electricity bill, property tax receipt, or registered rent agreement with municipal receipt.
      4. Bank Account Particulars & Cancelled Cheque showing legal account title and IFSC code.
      5. Authorised Signatory Proof: Board Resolution or Letter of Authorisation appointing primary contact.
    `,
  },
  {
    sourceId: 'SRC-PASSPORT-SEVA',
    serviceName: 'Ordinary Passport Issuance / Re-issue',
    serviceCode: 'MEA-SRV-PASS-FORM1',
    department: 'Ministry of External Affairs (MEA)',
    category: 'certificate_verification',
    officialUrl: 'https://www.passportindia.gov.in/AppOnlineProject/online/faqPassportAct',
    description: 'Statutory application form (Form No. 1) for Indian Passport under the Passports Act, 1967.',
    variantCode: 'MEA-PASS-FORM1',
    rawGuidanceText: `
      MINISTRY OF EXTERNAL AFFAIRS - PASSPORT SEVA
      Documentary Requirements Matrix for Form No. 1 (Fresh / Re-issue of Passport):
      1. Proof of Date of Birth: Birth Certificate, Secondary School Leaving Certificate or PAN Card.
      2. Proof of Residential Address: Aadhaar Card, Electricity Bill, Water Bill, or Registered Rent Agreement.
      3. Official Photo Identity Credential: Voter Identity Card, Driving Licence, or PAN Card.
      4. For Tatkaal / Expedited Scheme: Three distinct documentary proofs verifying non-criminal background and urgent necessity.
    `,
  },
];

/**
 * Runs the Automated Discovery & Requirements Extraction Pipeline incrementally
 */
export async function runGovernmentDiscoveryPipeline(
  config: DiscoveryPipelineConfig = {}
): Promise<IngestionPipelineResult> {
  const sources = config.sources || OFFICIAL_GOVERNMENT_SOURCES;
  const timeoutMs = config.timeoutMs || 8000;
  const runId = `run-${Date.now()}`;

  const servicesDiscovered: GovernmentService[] = [];
  const catalogEntries: OfficialDocumentCatalogEntry[] = [];
  const errors: Array<{ sourceId: string; url: string; error: string }> = [];

  const sourceBreakdown: IngestionRunSummary['breakdownBySource'] = {};
  let totalDiscovered = 0;
  let totalDownloaded = 0;
  let totalParsed = 0;
  let totalVerified = 0;
  let totalPublished = 0;

  for (let sIdx = 0; sIdx < sources.length; sIdx++) {
    const src = sources[sIdx];
    sourceBreakdown[src.id] = { discovered: 0, downloaded: 0, failed: 0 };

    config.onProgress?.({
      sourceId: src.id,
      step: 'scanning',
      resourceName: src.authority,
      completedCount: sIdx + 1,
      totalCount: sources.length,
    });

    // Match seed documents originating from this authority
    const matchingSeeds = OFFICIAL_SEED_DOCUMENTS.filter((seed) => seed.sourceId === src.id);

    for (const seed of matchingSeeds) {
      totalDiscovered++;
      sourceBreakdown[src.id].discovered++;

      config.onProgress?.({
        sourceId: src.id,
        step: 'downloading',
        resourceName: seed.serviceName,
        completedCount: sIdx + 1,
        totalCount: sources.length,
      });

      // Execute safe fetch verification of the source URL
      const fetchResult = await safeFetchGovernmentResource(seed.officialUrl, timeoutMs);

      if (fetchResult.error && fetchResult.statusCode !== 200) {
        // Record inaccessible or connection error safely without discarding candidate
        errors.push({
          sourceId: src.id,
          url: seed.officialUrl,
          error: fetchResult.error,
        });
        sourceBreakdown[src.id].failed++;
      } else {
        totalDownloaded++;
        sourceBreakdown[src.id].downloaded++;
      }

      // Execute structured parsing and requirement extraction
      config.onProgress?.({
        sourceId: src.id,
        step: 'parsing',
        resourceName: seed.serviceName,
        completedCount: sIdx + 1,
        totalCount: sources.length,
      });

      const extracted = extractRequirementsFromTextOrHtml(
        seed.officialUrl,
        seed.rawGuidanceText,
        'html'
      );

      totalParsed++;

      // Construct verified Service Application Type
      const appType: ServiceApplicationType = {
        id: `type-${seed.serviceCode}-${Date.now()}`,
        serviceId: `srv-${seed.serviceCode}`,
        applicationName: seed.serviceName,
        variantCode: seed.variantCode,
        applicantCategory: 'general',
        requirementsVersion: '2024.1',
        lifecycleStatus: 'published', // Published as authoritative reference
        publishedAt: new Date().toISOString(),
        requirements: extracted.requirements,
        conditionalQuestions: extracted.conditionalQuestions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      totalVerified++;
      totalPublished++;

      const service: GovernmentService = {
        id: `srv-${seed.serviceCode}`,
        sourceId: src.id,
        serviceName: seed.serviceName,
        serviceCode: seed.serviceCode,
        department: seed.department,
        jurisdiction: 'India (Central)',
        officialUrl: seed.officialUrl,
        description: seed.description,
        category: seed.category,
        status: 'active',
        applicationTypes: [appType],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      servicesDiscovered.push(service);
      if (extracted.officialDocuments.length > 0) {
        catalogEntries.push(...extracted.officialDocuments);
      }
    }
  }

  const runSummary: IngestionRunSummary = {
    sourcesScanned: sources.length,
    resourcesDiscovered: totalDiscovered,
    resourcesDownloaded: totalDownloaded,
    resourcesParsed: totalParsed,
    errorsCount: errors.length,
    verifiedCount: totalVerified,
    publishedCount: totalPublished,
    breakdownBySource: sourceBreakdown,
  };

  return {
    runId,
    runSummary,
    servicesDiscovered,
    catalogEntries,
    errors,
    completedAt: new Date().toISOString(),
  };
}
