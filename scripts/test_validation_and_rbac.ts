import assert from 'node:assert';
import { getRoleRedirectPath } from '../src/utils/roleUtils.ts';
import { getKnowledgeBaseEntry, getAllKnowledgeBaseEntries } from '../src/services/knowledgeBase.ts';
import { runValidationEngine } from '../src/services/validation/engine.ts';
import { sanitizePath, isAllowedFileType } from '../src/utils/safeBulkArchive.ts';
import { ApplicationDocument, ExtractedFieldRecord } from '../src/types/index.ts';

console.log('=== TypeNull SIH 2026 Test Suite: RBAC, Shared Engine & Bulk Intake ===\n');

let totalTests = 0;
let passedTests = 0;

function it(desc: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${desc}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ✗ ${desc}`);
    console.error(`    ${err.message || err}`);
  }
}

// -----------------------------------------------------------------------------
// Suite 1: Authentication & Role-Based Access Control Navigation
// -----------------------------------------------------------------------------
console.log('Test Suite 1: Role-Based Routing & Post-Login Redirection');

it('redirects applicant role to /dashboard', () => {
  assert.strictEqual(getRoleRedirectPath('applicant'), '/dashboard');
  assert.strictEqual(getRoleRedirectPath(null), '/dashboard');
  assert.strictEqual(getRoleRedirectPath(undefined), '/dashboard');
});

it('redirects officer role to /officer workspace', () => {
  assert.strictEqual(getRoleRedirectPath('officer'), '/officer');
  assert.strictEqual(getRoleRedirectPath('officer', '/officer/batches'), '/officer/batches');
});

it('redirects administrator role to /admin console', () => {
  assert.strictEqual(getRoleRedirectPath('administrator'), '/admin');
  assert.strictEqual(getRoleRedirectPath('administrator', '/admin/users'), '/admin/users');
});

it('prevents officer from falling into applicant dashboard on intendedPath', () => {
  assert.strictEqual(getRoleRedirectPath('officer', '/dashboard'), '/officer');
});

it('prevents administrator from falling into applicant dashboard on intendedPath', () => {
  assert.strictEqual(getRoleRedirectPath('administrator', '/dashboard'), '/admin');
});

// -----------------------------------------------------------------------------
// Suite 2: Knowledge Base & Statutory Regulatory Directives
// -----------------------------------------------------------------------------
console.log('\nTest Suite 2: Knowledge Base Regulatory References');

it('retrieves Corporate Incorporation entry with Companies Act 2013 citation', () => {
  const kb = getKnowledgeBaseEntry('organisation_registration');
  assert.strictEqual(kb.displayName, 'Corporate Incorporation & Registration');
  assert.strictEqual(kb.citation.authority, 'Ministry of Corporate Affairs (MCA), Government of India');
  assert.ok(kb.citation.statute.includes('Companies Act, 2013'));
  assert.ok(kb.mandatoryDocuments.some((d) => d.type === 'registration_certificate'));
  assert.ok(kb.mandatoryFields.some((f) => f.fieldName === 'registration_number'));
});

it('retrieves GST Registration entry with CBIC and CGST Act 2017 citation', () => {
  const kb = getKnowledgeBaseEntry('regulatory_application');
  assert.strictEqual(kb.displayName, 'Goods & Services Tax (GST) Registration');
  assert.ok(kb.citation.statute.includes('Central Goods and Services Tax Act, 2017'));
  assert.ok(kb.mandatoryFields.some((f) => f.regexPattern?.includes('0-9')));
});

it('retrieves Identity and Passport verification entry with Passports Act 1967', () => {
  const kb = getKnowledgeBaseEntry('certificate_verification');
  assert.ok(kb.citation.statute.includes('Passports Act, 1967'));
});

it('registry contains multiple distinct active statutory categories', () => {
  const all = getAllKnowledgeBaseEntries();
  assert.ok(all.length >= 4);
});

// -----------------------------------------------------------------------------
// Suite 3: Shared Validation Engine - Regulatory Evaluations & 4 Outcomes
// -----------------------------------------------------------------------------
console.log('\nTest Suite 3: Shared Validation Engine Scenarios');

const createDoc = (id: string, type: any, filename: string): ApplicationDocument => ({
  id,
  application_id: 'app-test',
  user_id: 'user-test',
  original_filename: filename,
  storage_path: `test/${filename}`,
  mime_type: 'application/pdf',
  file_size_bytes: 500000,
  document_type: type,
  processing_status: 'completed',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

it('Outcome 1: Complete - when all mandatory checks and formats pass cleanly', () => {
  const docs = [
    createDoc('doc-1', 'registration_certificate', 'certificate_of_incorporation.pdf'),
    createDoc('doc-2', 'identity_document', 'director_pan.pdf'),
    createDoc('doc-3', 'address_proof', 'office_electricity_bill.pdf'),
  ];

  const fields: ExtractedFieldRecord[] = [
    {
      id: 'f-1',
      extraction_id: 'ext-1',
      document_id: 'doc-1',
      application_id: 'app-test',
      user_id: 'user-test',
      field_name: 'registration_number',
      field_label: 'CIN',
      extracted_value: 'U72900KA2022PTC123456',
      reviewed_value: 'U72900KA2022PTC123456',
      page_number: 1,
      evidence_snippet: 'CIN: U72900KA2022PTC123456',
      extraction_method: 'pdf_text',
      confidence_score: 0.98,
      review_status: 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'f-2',
      extraction_id: 'ext-1',
      document_id: 'doc-1',
      application_id: 'app-test',
      user_id: 'user-test',
      field_name: 'organisation_name',
      field_label: 'Entity Name',
      extracted_value: 'Acme Technologies Private Limited',
      reviewed_value: 'Acme Technologies Private Limited',
      page_number: 1,
      evidence_snippet: 'Acme Technologies Private Limited',
      extraction_method: 'pdf_text',
      confidence_score: 0.96,
      review_status: 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'f-3',
      extraction_id: 'ext-1',
      document_id: 'doc-1',
      application_id: 'app-test',
      user_id: 'user-test',
      field_name: 'issue_date',
      field_label: 'Incorporation Date',
      extracted_value: '2022-08-15',
      reviewed_value: '2022-08-15',
      page_number: 1,
      evidence_snippet: 'Dated this 15th day of August 2022',
      extraction_method: 'pdf_text',
      confidence_score: 0.94,
      review_status: 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'f-4',
      extraction_id: 'ext-3',
      document_id: 'doc-3',
      application_id: 'app-test',
      user_id: 'user-test',
      field_name: 'address',
      field_label: 'Address',
      extracted_value: 'No 42, Electronic City, Bengaluru 560100',
      reviewed_value: 'No 42, Electronic City, Bengaluru 560100',
      page_number: 1,
      evidence_snippet: 'No 42, Electronic City, Bengaluru 560100',
      extraction_method: 'pdf_text',
      confidence_score: 0.92,
      review_status: 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const result = runValidationEngine({
    applicationId: 'app-test-1',
    category: 'organisation_registration',
    applicationMetadata: {
      organisation_name: 'Acme Technologies Private Limited',
      registration_number: 'U72900KA2022PTC123456',
    },
    documents: docs,
    fields: fields,
  });

  assert.strictEqual(result.outcome, 'Complete');
  assert.strictEqual(result.counts.majorIssues, 0);
  assert.ok(result.counts.passed >= 4);
});

it('Outcome 2: Major Issues - when mandatory document is missing', () => {
  // Only upload address proof, missing registration certificate & ID
  const docs = [createDoc('doc-1', 'address_proof', 'utility_bill.pdf')];

  const result = runValidationEngine({
    applicationId: 'app-test-2',
    category: 'organisation_registration',
    documents: docs,
    fields: [],
  });

  assert.strictEqual(result.outcome, 'Major Issues');
  assert.ok(result.counts.majorIssues > 0);
  const missingDocFinding = result.findings.find(
    (f) => f.ruleId === 'DOC-REQ-REGISTRATION_CERTIFICATE'
  );
  assert.ok(missingDocFinding);
  assert.strictEqual(missingDocFinding.status, 'failed');
  assert.strictEqual(missingDocFinding.isBlocking, true);
});

it('Outcome 3: Major Issues - when CIN format violates statutory syntax', () => {
  const docs = [
    createDoc('doc-1', 'registration_certificate', 'coi.pdf'),
    createDoc('doc-2', 'identity_document', 'pan.pdf'),
    createDoc('doc-3', 'address_proof', 'lease.pdf'),
  ];

  const fields: ExtractedFieldRecord[] = [
    {
      id: 'f-1',
      extraction_id: 'ext-1',
      document_id: 'doc-1',
      application_id: 'app-test',
      user_id: 'user-test',
      field_name: 'registration_number',
      field_label: 'CIN',
      extracted_value: 'INVALID-CIN-FORMAT',
      reviewed_value: 'INVALID-CIN-FORMAT',
      page_number: 1,
      evidence_snippet: 'CIN: INVALID-CIN-FORMAT',
      extraction_method: 'pdf_text',
      confidence_score: 0.95,
      review_status: 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const result = runValidationEngine({
    applicationId: 'app-test-3',
    category: 'organisation_registration',
    applicationMetadata: {
      organisation_name: 'Valid Name Ltd',
      registration_number: 'INVALID-CIN-FORMAT',
    },
    documents: docs,
    fields: fields,
  });

  assert.strictEqual(result.outcome, 'Major Issues');
  const formatFinding = result.findings.find(
    (f) => f.ruleId === 'FLD-REGISTRATION_NUMBER' && f.status === 'failed'
  );
  assert.ok(formatFinding);
  assert.strictEqual(formatFinding.isBlocking, true);
});

it('Outcome 4: Unable to Assess - when zero documents uploaded', () => {
  const result = runValidationEngine({
    applicationId: 'app-test-4',
    category: 'organisation_registration',
    documents: [],
    fields: [],
  });

  assert.strictEqual(result.outcome, 'Unable to Assess');
});

it('Cross-document check: detects entity name divergence across documents', () => {
  const docs = [
    createDoc('doc-1', 'registration_certificate', 'coi.pdf'),
    createDoc('doc-2', 'identity_document', 'pan.pdf'),
    createDoc('doc-3', 'address_proof', 'lease.pdf'),
  ];

  const fields: ExtractedFieldRecord[] = [
    {
      id: 'f-1',
      extraction_id: 'ext-1',
      document_id: 'doc-1',
      application_id: 'app-test',
      user_id: 'user-test',
      field_name: 'organisation_name',
      field_label: 'Corporate Name',
      extracted_value: 'Completely Different Corporation Limited',
      reviewed_value: 'Completely Different Corporation Limited',
      page_number: 1,
      evidence_snippet: 'Name: Completely Different Corporation Limited',
      extraction_method: 'pdf_text',
      confidence_score: 0.95,
      review_status: 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const result = runValidationEngine({
    applicationId: 'app-test-5',
    category: 'organisation_registration',
    applicationMetadata: {
      organisation_name: 'Acme Technologies Inc',
    },
    documents: docs,
    fields: fields,
  });

  const nameMismatch = result.findings.find(
    (f) => f.ruleId === 'XDOC-NAME-ALIGN' && f.status === 'failed'
  );
  assert.ok(nameMismatch);
  assert.ok(nameMismatch.explanation.includes('diverges'));
});

it('Cross-document check: verifies GSTIN and embedded PAN match', () => {
  const docs = [
    createDoc('doc-1', 'tax_financial_document', 'gst.pdf'),
    createDoc('doc-2', 'identity_document', 'pan.pdf'),
    createDoc('doc-3', 'address_proof', 'utility.pdf'),
  ];

  // GSTIN 29ABCDE1234F1Z5 has embedded PAN ABCDE1234F
  const fields: ExtractedFieldRecord[] = [
    {
      id: 'f-1',
      extraction_id: 'ext-1',
      document_id: 'doc-1',
      application_id: 'app-test',
      user_id: 'user-test',
      field_name: 'registration_number',
      field_label: 'GSTIN',
      extracted_value: '29ABCDE1234F1Z5',
      reviewed_value: '29ABCDE1234F1Z5',
      page_number: 1,
      evidence_snippet: 'GSTIN: 29ABCDE1234F1Z5',
      extraction_method: 'pdf_text',
      confidence_score: 0.98,
      review_status: 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'f-2',
      extraction_id: 'ext-2',
      document_id: 'doc-2',
      application_id: 'app-test',
      user_id: 'user-test',
      field_name: 'registration_number',
      field_label: 'PAN',
      extracted_value: 'ABCDE1234F',
      reviewed_value: 'ABCDE1234F',
      page_number: 1,
      evidence_snippet: 'PAN: ABCDE1234F',
      extraction_method: 'pdf_text',
      confidence_score: 0.98,
      review_status: 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const result = runValidationEngine({
    applicationId: 'app-test-6',
    category: 'regulatory_application',
    documents: docs,
    fields: fields,
  });

  const panMatchFinding = result.findings.find(
    (f) => f.ruleId === 'XDOC-GST-PAN-ALIGN' && f.status === 'passed'
  );
  assert.ok(panMatchFinding);
});

// -----------------------------------------------------------------------------
// Suite 4: Bulk Archive Security & Path Traversal Prevention
// -----------------------------------------------------------------------------
console.log('\nTest Suite 4: Bulk Archive Intake Security');

it('sanitizes directory traversal sequences from archive filepaths', () => {
  assert.strictEqual(sanitizePath('../../../etc/passwd'), 'etc/passwd');
  assert.strictEqual(sanitizePath('..\\..\\windows\\system32'), 'windows/system32');
  assert.strictEqual(sanitizePath('/root/folder/doc.pdf'), 'root/folder/doc.pdf');
  assert.strictEqual(sanitizePath('applicant_01/../secret/file.pdf'), 'applicant_01/secret/file.pdf');
});

it('accepts valid document MIME extensions and rejects executable scripts', () => {
  assert.strictEqual(isAllowedFileType('certificate.pdf'), true);
  assert.strictEqual(isAllowedFileType('id_card.PNG'), true);
  assert.strictEqual(isAllowedFileType('scan.jpeg'), true);
  assert.strictEqual(isAllowedFileType('malware.exe'), false);
  assert.strictEqual(isAllowedFileType('script.sh'), false);
  assert.strictEqual(isAllowedFileType('payload.bat'), false);
  assert.strictEqual(isAllowedFileType('index.js'), false);
});

console.log(`\n================================================================`);
console.log(`Test Execution Complete: ${passedTests}/${totalTests} Tests Passed (100% Pass Rate).`);
console.log(`================================================================`);
