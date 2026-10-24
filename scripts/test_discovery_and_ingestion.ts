/**
 * TypeNull SIH 2026 Test Suite: Government Form Discovery,
 * Security & Safe Retrieval, Requirements Extraction, and Conditional Checklist Evaluation
 */

import {
  validateOfficialGovernmentUrl,
  detectMagicByteFormat,
  computeSha256Hex,
} from '../src/services/ingestion/safeFetch';
import { OFFICIAL_GOVERNMENT_SOURCES } from '../src/services/ingestion/sourceRegistry';
import { extractRequirementsFromTextOrHtml } from '../src/services/ingestion/formExtractor';
import {
  runGovernmentDiscoveryPipeline,
  OFFICIAL_SEED_DOCUMENTS,
} from '../src/services/ingestion/discoveryPipeline';
import {
  getGovernmentServices,
  getPublishedGovernmentServices,
  updateApplicationTypeLifecycle,
  updateRequirementClassification,
  getIngestionMetrics,
  CANDIDATE_GOVERNMENT_SERVICES,
} from '../src/services/ingestion/ingestionService';
import { evaluateConditionalChecklist } from '../src/services/conditionalEvaluator';
import { runValidationEngine } from '../src/services/validation/engine';
import { ApplicationDocument, ServiceApplicationType } from '../src/types';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failCount++;
  }
}

async function runTestSuite() {
  console.log('\n=== TypeNull SIH 2026 Ingestion & Discovery Test Suite ===\n');

  // --------------------------------------------------------------------------
  // TEST SUITE 1: Government URL Validation & SSRF Prevention
  // --------------------------------------------------------------------------
  console.log('Test Suite 1: Government URL Allowlisting & SSRF Protection');

  const validGovUrls = [
    'https://services.india.gov.in/service/detail/apply-for-pan-card',
    'https://passportindia.gov.in/AppOnlineProject/online/faqPassportAct',
    'https://cbic.gov.in/resources/htdocs-cbec/gst/cgst-act.pdf',
    'https://mca.gov.in/MinistryV2/incorporation_company.html',
    'https://uidai.gov.in/en/my-aadhaar/about-your-aadhaar.html',
    'https://indiacode.nic.in/handle/123456789/1990',
  ];

  for (const url of validGovUrls) {
    const res = validateOfficialGovernmentUrl(url);
    assert(res.isValid, `allows valid official portal: ${url}`);
  }

  const ssrfOrInvalidUrls = [
    'http://localhost/admin',
    'http://127.0.0.1:8080/internal',
    'http://10.0.0.1/secrets',
    'http://192.168.1.1/router-config',
    'http://169.254.169.254/latest/meta-data/',
    'https://fakegovforms.com/pan-application',
    'https://thirdparty-lawyer-portal.in/forms',
    'ftp://services.india.gov.in/unencrypted',
  ];

  for (const badUrl of ssrfOrInvalidUrls) {
    const res = validateOfficialGovernmentUrl(badUrl);
    assert(!res.isValid, `blocks prohibited or SSRF address: ${badUrl}`);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: Magic-Byte Content Detection & Cryptographic Hashing
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 2: Magic-Byte Content Detection & Cryptographic Hashing');

  // PDF Header "%PDF-1.4"
  const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  assert(detectMagicByteFormat(pdfBytes.buffer) === 'pdf', 'detects PDF format via magic bytes (%PDF)');

  // PNG Header
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert(detectMagicByteFormat(pngBytes.buffer) === 'png', 'detects PNG image format via magic bytes');

  // JPEG Header
  const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  assert(detectMagicByteFormat(jpegBytes.buffer) === 'jpeg', 'detects JPEG image format via magic bytes');

  // ZIP/DOCX Header "PK\x03\x04"
  const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
  assert(detectMagicByteFormat(zipBytes.buffer) === 'docx', 'detects DOCX/ZIP format via PK header');

  // HTML Text
  const htmlBuffer = new TextEncoder().encode('<!DOCTYPE html><html><body>Form</body></html>').buffer;
  assert(detectMagicByteFormat(htmlBuffer) === 'html', 'detects HTML format via text preamble');

  // SHA-256 Hash check
  const testBuffer = new TextEncoder().encode('TypeNull SIH 2026 Test String').buffer;
  const hashHex = await computeSha256Hex(testBuffer);
  assert(typeof hashHex === 'string' && hashHex.length === 64, 'computes valid 64-character SHA-256 hexadecimal digest');

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Requirements & Conditional Rules Extractor
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 3: Form Requirements & Rules Extractor');

  const guidanceHtml = `
    <h1>MINISTRY OF CORPORATE AFFAIRS - SPICe+ Integrated Filing</h1>
    <p>Mandatory Supporting Documents for Incorporation:</p>
    <ol>
      <li>Certificate of Incorporation / Name Approval</li>
      <li>Permanent Account Number (PAN) Card of all directors</li>
      <li>Proof of Registered Office Address: Electricity bill or Telephone bill not older than 2 months</li>
      <li>Commercial Premise Lease Deed / Rent Agreement along with NOC from property owner if premises are leased or rented</li>
      <li>Board Resolution for Authorised Signatory where the promoter is a corporate body</li>
    </ol>
  `;

  const extraction = extractRequirementsFromTextOrHtml(
    'https://www.mca.gov.in/MinistryV2/incorporation_company.html',
    guidanceHtml,
    'html'
  );

  assert(extraction.requirements.length >= 3, `extracts structured requirements (found ${extraction.requirements.length})`);
  assert(extraction.department.includes('Corporate Affairs'), 'extracts responsible authority from guidance text');

  const hasPan = extraction.requirements.some((r) => r.canonicalDocumentKey === 'pan_card' || r.documentName.includes('PAN'));
  assert(hasPan, 'identifies PAN Card as mandatory requirement');

  const hasUtility = extraction.requirements.some((r) => r.canonicalDocumentKey === 'utility_bill');
  assert(hasUtility, 'identifies Proof of Address / Utility Bill requirement');

  const hasConditionalRent = extraction.requirements.some(
    (r) => r.classification === 'conditional' && r.conditionExpression?.includes('rented')
  );
  assert(hasConditionalRent, 'extracts conditional requirement with Rent Agreement & Owner NOC trigger');

  assert(extraction.conditionalQuestions.length > 0, 'generates corresponding applicant conditional question');

  // --------------------------------------------------------------------------
  // TEST SUITE 4: Conditional Requirements Evaluator
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 4: Conditional Requirements Evaluator');

  const spiceVariant = CANDIDATE_GOVERNMENT_SERVICES[0].applicationTypes[0];

  // Scenario A: Non-rented premises (leased = no)
  const checklistA = evaluateConditionalChecklist({
    applicationType: spiceVariant,
    userAnswers: { is_rented_premise: 'no', has_corporate_promoter: 'no' },
    uploadedDocumentTypes: ['pan_card', 'incorporation_certificate'],
  });

  assert(checklistA.mandatoryDocuments.length >= 2, 'includes all base mandatory documents');
  assert(checklistA.conditionalDocuments.length === 0, 'does NOT activate Rent Agreement when rented_premise is "no"');
  assert(checklistA.alternativeDocumentGroups.length > 0, 'identifies registered office address alternative group');

  // Scenario B: Rented premises (leased = yes)
  const checklistB = evaluateConditionalChecklist({
    applicationType: spiceVariant,
    userAnswers: { is_rented_premise: 'yes', has_corporate_promoter: 'no' },
    uploadedDocumentTypes: ['pan_card'],
  });

  assert(checklistB.conditionalDocuments.length === 1, 'activates Lease Deed & Owner NOC when rented_premise is "yes"');
  assert(
    checklistB.conditionalDocuments[0].requirement.documentName.includes('Lease') ||
    checklistB.conditionalDocuments[0].requirement.documentName.includes('Rent'),
    'correctly identifies the activated conditional document'
  );

  // Scenario C: Alternative Group satisfaction
  const checklistC = evaluateConditionalChecklist({
    applicationType: spiceVariant,
    userAnswers: { is_rented_premise: 'no', has_corporate_promoter: 'no' },
    uploadedDocumentTypes: ['electricity bill'],
  });

  const utilityGroup = checklistC.alternativeDocumentGroups.find((g) => g.groupName.includes('Address'));
  assert(utilityGroup !== undefined && utilityGroup.isSatisfied, 'marks alternative document group satisfied when Electricity Bill is uploaded');

  // --------------------------------------------------------------------------
  // TEST SUITE 5: Requirement Lifecycle State Management
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 5: Requirement Lifecycle State Management');

  const allServicesBefore = await getGovernmentServices();
  const dir3Service = allServicesBefore.find((s) => s.serviceCode === 'MCA-SRV-DIR3');
  assert(dir3Service !== undefined, 'finds MCA DIR-3 candidate service');

  const dir3Type = dir3Service?.applicationTypes[0] as ServiceApplicationType;
  assert(dir3Type.lifecycleStatus === 'needs_verification', 'candidate DIR-3 begins in "needs_verification" state');

  const publishedBefore = await getPublishedGovernmentServices();
  const dir3InPublished = publishedBefore.some((s) => s.serviceCode === 'MCA-SRV-DIR3');
  assert(!dir3InPublished, 'unverified candidate DIR-3 is NOT exposed to public applicants');

  // Admin approves and publishes DIR-3
  await updateApplicationTypeLifecycle(
    dir3Type.id,
    'published',
    'Approved by Director General of Corporate Affairs',
    'Administrator'
  );

  const publishedAfter = await getPublishedGovernmentServices();
  const dir3InPublishedAfter = publishedAfter.some((s) => s.serviceCode === 'MCA-SRV-DIR3');
  assert(dir3InPublishedAfter, 'DIR-3 is immediately available to applicants once published');

  // Admin supersedes/deprecates
  await updateApplicationTypeLifecycle(dir3Type.id, 'superseded', 'Superseded by notification');
  const publishedAfterSupersede = await getPublishedGovernmentServices();
  const dir3InPublishedFinal = publishedAfterSupersede.some((s) => s.serviceCode === 'MCA-SRV-DIR3');
  assert(!dir3InPublishedFinal, 'superseded application variant is cleanly removed from applicant registry');

  // Reset back to needs_verification
  await updateApplicationTypeLifecycle(dir3Type.id, 'needs_verification');

  // --------------------------------------------------------------------------
  // TEST SUITE 6: Shared Validation Engine with Ingested Tailored Requirements
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 6: Shared Validation Engine with Ingested Tailored Requirements');

  const gstVariant = CANDIDATE_GOVERNMENT_SERVICES[1].applicationTypes[0];

  // Scenario 1: Missing Mandatory Documents against Ingested Rules
  const resultMissing = runValidationEngine({
    applicationId: 'app-test-gst-1',
    category: 'regulatory_application',
    documents: [], // Zero documents
    personalizedRequirements: gstVariant.requirements,
    serviceName: 'Goods & Services Tax New Registration (REG-01)',
  });

  assert(resultMissing.outcome === 'Major Issues' || resultMissing.outcome === 'Unable to Assess', 'flags missing mandatory documents as Major Issues');
  const missingPanFinding = resultMissing.findings.find((f) => f.title.includes('Missing: Permanent Account Number'));
  assert(missingPanFinding !== undefined, 'generates explicit statutory finding for missing PAN Card');
  assert(missingPanFinding?.isBlocking === true, 'missing mandatory document is designated as blocking defect');

  // Scenario 2: All Tailored Documents Provided Cleanly
  const mockGstDocs: ApplicationDocument[] = [
    {
      id: 'doc-pan-1',
      application_id: 'app-test-gst-2',
      original_filename: 'director_pan_card.pdf',
      storage_path: 'mock/path/pan.pdf',
      file_size_bytes: 450000,
      mime_type: 'application/pdf',
      document_type: 'pan_card',
      processing_status: 'ready_for_review',
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'doc-inc-1',
      application_id: 'app-test-gst-2',
      original_filename: 'certificate_of_incorporation.pdf',
      storage_path: 'mock/path/inc.pdf',
      file_size_bytes: 650000,
      mime_type: 'application/pdf',
      document_type: 'incorporation_certificate',
      processing_status: 'ready_for_review',
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'doc-util-1',
      application_id: 'app-test-gst-2',
      original_filename: 'electricity_bill_office.pdf',
      storage_path: 'mock/path/util.pdf',
      file_size_bytes: 350000,
      mime_type: 'application/pdf',
      document_type: 'utility_bill',
      processing_status: 'ready_for_review',
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'doc-bank-1',
      application_id: 'app-test-gst-2',
      original_filename: 'cancelled_cheque_bank.pdf',
      storage_path: 'mock/path/bank.pdf',
      file_size_bytes: 380000,
      mime_type: 'application/pdf',
      document_type: 'financial_statement',
      processing_status: 'ready_for_review',
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const resultPassed = runValidationEngine({
    applicationId: 'app-test-gst-2',
    category: 'regulatory_application',
    documents: mockGstDocs,
    personalizedRequirements: gstVariant.requirements,
    serviceName: 'Goods & Services Tax New Registration (REG-01)',
  });

  const panPassed = resultPassed.findings.find((f) => f.title.includes('Present: Permanent Account Number'));
  assert(panPassed !== undefined && panPassed.status === 'passed', 'verifies uploaded PAN Card against tailored requirement');

  const constitutionPassed = resultPassed.findings.find((f) => f.title.includes('Present: Proof of Constitution'));
  assert(constitutionPassed !== undefined && constitutionPassed.status === 'passed', 'verifies Certificate of Incorporation against alternative constitution rule');

  // --------------------------------------------------------------------------
  // TEST SUITE 7: Ingestion Metrics & Transparent Reporting
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 7: Ingestion Metrics & Transparent Reporting');

  const metrics = await getIngestionMetrics();
  assert(metrics.sourcesCount === OFFICIAL_GOVERNMENT_SOURCES.length, `reports exact configured sources (${metrics.sourcesCount})`);
  assert(metrics.servicesCount >= 4, `reports discovered government services (${metrics.servicesCount})`);
  assert(metrics.publishedCount >= 3, `reports published authoritative services (${metrics.publishedCount})`);
  assert(metrics.needsVerificationCount >= 1, `reports services awaiting administrative review (${metrics.needsVerificationCount})`);

  console.log('\n================================================================');
  console.log(`Test Execution Complete: ${passCount}/${passCount + failCount} Tests Passed (${Math.round((passCount / (passCount + failCount)) * 100)}% Pass Rate).`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
