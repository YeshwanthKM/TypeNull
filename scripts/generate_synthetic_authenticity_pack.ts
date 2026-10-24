import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * TypeNull Synthetic Authenticity Demo-Document Pack Generator
 *
 * Generates 100% standard PDF 1.4 documents containing synthetic demonstration streams
 * to exercise TypeNull's Document Reference Dataset & Authenticity Verification Engine.
 *
 * Every document is explicitly watermarked:
 * "SYNTHETIC DEMONSTRATION SAMPLE — NOT AN OFFICIAL DOCUMENT"
 *
 * All personal details, business names, registration numbers, and addresses
 * are completely fictional.
 */

function createStandardPdf(lines: string[], extraStreamProps: string = ''): Buffer {
  let streamContent = 'BT\n/F1 10 Tf\n50 750 Td\n15 TL\n';
  for (const line of lines) {
    const escaped = line
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
    streamContent += `(${escaped}) '\n`;
  }
  streamContent += 'ET\n';

  if (extraStreamProps) {
    streamContent += extraStreamProps;
  }

  const streamBytes = Buffer.from(streamContent, 'utf-8');

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];

  // obj 1: Catalog
  offsets.push(out.length);
  out += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  // obj 2: Pages
  offsets.push(out.length);
  out += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  // obj 3: Page
  offsets.push(out.length);
  out += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n';

  // obj 4: Font
  offsets.push(out.length);
  out += '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  // obj 5: Contents
  offsets.push(out.length);
  out += `5 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`;
  out += streamContent;
  out += 'endstream\nendobj\n';

  const startxref = out.length;
  out += 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 0; i < 5; i++) {
    out += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  out += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  return Buffer.from(out, 'utf-8');
}

/**
 * Creates an unreadable / extraction failure PDF sample.
 * Valid PDF structure containing no extractable alphanumeric characters.
 */
function createUnreadablePdf(): Buffer {
  const streamContent = 'q\n0 0 612 792 re\nW n\n0.9 0.9 0.9 rg\n50 50 512 692 re\nf\nQ\n';
  const streamBytes = Buffer.from(streamContent, 'utf-8');

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];

  offsets.push(out.length);
  out += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  offsets.push(out.length);
  out += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  offsets.push(out.length);
  out += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n';

  offsets.push(out.length);
  out += `4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${streamContent}endstream\nendobj\n`;

  const startxref = out.length;
  out += 'xref\n0 5\n0000000000 65535 f \n';
  for (let i = 0; i < 4; i++) {
    out += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  out += `trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`;

  return Buffer.from(out, 'utf-8');
}

const targetDir = path.resolve(process.cwd(), 'docs/demo-samples/authenticity-pack');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log('Generating synthetic authenticity demo pack in:', targetDir);

// =============================================================================
// APPLICANT DEMO DOCUMENTS
// =============================================================================

// 1. applicant_reference_original.pdf (Matches approved PAN Card template v1.0)
const applicantRefPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION SAMPLE — NOT AN OFFICIAL DOCUMENT',
  '=================================================================',
  'Income Tax Department, Government of India',
  'Permanent Account Number Card',
  '=================================================================',
  'Permanent Account Number: ABCDE1234F',
  'Name: AARAV SHARMA',
  'Father Name: RAJESH SHARMA',
  'Date of Birth: 15/05/1985',
  'Issuing Authority: Income Tax Department',
  'Status: Clean Synthetic Reference Sample'
]);
fs.writeFileSync(path.join(targetDir, 'applicant_reference_original.pdf'), applicantRefPdf);
fs.writeFileSync(path.join(targetDir, 'applicant_reference_sample_pan.pdf'), applicantRefPdf);

// 2. applicant_altered_copy.pdf (Invalid PAN format 'ABCDEX1234' - 6 letters violates regex)
const applicantAlteredPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION SAMPLE — NOT AN OFFICIAL DOCUMENT',
  '=================================================================',
  'Income Tax Department, Government of India',
  'Permanent Account Number Card',
  '=================================================================',
  'Permanent Account Number: ABCDEX1234', // Altered format - fails statutory 10-char regex
  'Name: AARAV SHARMA',
  'Father Name: RAJESH SHARMA',
  'Date of Birth: 15/05/1985',
  'Issuing Authority: Income Tax Department',
  'Status: Intentionally Altered Synthetic Test Submission'
]);
fs.writeFileSync(path.join(targetDir, 'applicant_altered_copy.pdf'), applicantAlteredPdf);
fs.writeFileSync(path.join(targetDir, 'applicant_altered_pan_copy.pdf'), applicantAlteredPdf);

// 3. applicant_missing_field.pdf (Mandatory Father Name omitted)
const applicantMissingFieldPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION SAMPLE — NOT AN OFFICIAL DOCUMENT',
  '=================================================================',
  'Income Tax Department, Government of India',
  'Permanent Account Number Card',
  '=================================================================',
  'Permanent Account Number: ABCDE1234F',
  'Name: AARAV SHARMA',
  // Father Name line intentionally missing
  'Date of Birth: 15/05/1985',
  'Issuing Authority: Income Tax Department',
  'Status: Synthetic Missing-Field Test Submission'
]);
fs.writeFileSync(path.join(targetDir, 'applicant_missing_field.pdf'), applicantMissingFieldPdf);
fs.writeFileSync(path.join(targetDir, 'applicant_missing_field_pan.pdf'), applicantMissingFieldPdf);

// 4. applicant_unknown_document.pdf (Unknown document type with no approved reference)
const applicantUnknownPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION SAMPLE — NOT AN OFFICIAL DOCUMENT',
  '=================================================================',
  'National Council of Technical Fellows',
  'Distinguished Professional Fellowship Certificate',
  '=================================================================',
  'Fellowship Identifier: NCTF-2026-88192',
  'Conferred To: AARAV SHARMA',
  'Specialisation: Advanced Software Engineering and Robotics',
  'Date of Award: 12/04/2026',
  'Issuing Body: National Council of Technical Fellows Secretariat',
  'Status: Synthetic Unknown Document Type (No Approved Template)'
]);
fs.writeFileSync(path.join(targetDir, 'applicant_unknown_document.pdf'), applicantUnknownPdf);

// 5. applicant_unreadable_sample.pdf (Damaged/blank raster scan simulation with 0 extractable characters)
const applicantUnreadablePdf = createUnreadablePdf();
fs.writeFileSync(path.join(targetDir, 'applicant_unreadable_sample.pdf'), applicantUnreadablePdf);

// =============================================================================
// ORGANISATION DEMO DOCUMENTS
// =============================================================================

// 6. organisation_reference_original.pdf (Matches approved Form GST REG-06 template v1.0)
const orgRefPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION SAMPLE — NOT AN OFFICIAL DOCUMENT',
  '=================================================================',
  'Goods and Services Tax',
  'Registration Certificate',
  'Form GST REG-06',
  '=================================================================',
  'Registration Number: 27AAACB1234C1Z5',
  'Legal Name: Bharat Industrial Solutions Private Limited',
  'Principal Place of Business: Plot 88, MIDC Industrial Area, Andheri East, Mumbai 400093',
  'Date of Issue: 01/04/2024',
  'Issuing Authority: Goods and Services Tax Network',
  'qr-code: gstin_qr_token:27AAACB1234C1Z5-TAX-VERIFIED',
  'Status: Clean Organisation Synthetic Reference Sample'
]);
fs.writeFileSync(path.join(targetDir, 'organisation_reference_original.pdf'), orgRefPdf);
fs.writeFileSync(path.join(targetDir, 'organisation_reference_sample_gst.pdf'), orgRefPdf);

// 7. organisation_altered_copy.pdf (Altered GSTIN with invalid state code '99' & structure)
const orgAlteredPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION SAMPLE — NOT AN OFFICIAL DOCUMENT',
  '=================================================================',
  'Goods and Services Tax',
  'Registration Certificate',
  'Form GST REG-06',
  '=================================================================',
  'Registration Number: 99XXXXX9999X_INVALID', // Altered format - fails statutory 15-char regex
  'Legal Name: Bharat Industrial Solutions Private Limited',
  'Principal Place of Business: Plot 88, MIDC Industrial Area, Andheri East, Mumbai 400093',
  'Date of Issue: 01/04/2024',
  'Issuing Authority: Goods and Services Tax Network',
  'qr-code: MALFORMED_GSTIN_TOKEN_ERR_INVALID',
  'Status: Intentionally Altered Organisation Registration Submission'
]);
fs.writeFileSync(path.join(targetDir, 'organisation_altered_copy.pdf'), orgAlteredPdf);
fs.writeFileSync(path.join(targetDir, 'organisation_altered_gst_copy.pdf'), orgAlteredPdf);

// 8. organisation_missing_field.pdf (Form GST REG-06 missing Legal Name & Principal Place of Business)
const orgMissingFieldPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION SAMPLE — NOT AN OFFICIAL DOCUMENT',
  '=================================================================',
  'Goods and Services Tax',
  'Registration Certificate',
  'Form GST REG-06',
  '=================================================================',
  'Registration Number: 27AAACB1234C1Z5',
  // Legal Name and Principal Place of Business intentionally omitted
  'Date of Issue: 01/04/2024',
  'Issuing Authority: Goods and Services Tax Network',
  'Status: Synthetic Missing-Field Organisation Submission'
]);
fs.writeFileSync(path.join(targetDir, 'organisation_missing_field.pdf'), orgMissingFieldPdf);

// 9. organisation_malformed_qr.pdf (Contains corrupted / malformed QR token payload)
const orgMalformedQrPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION SAMPLE — NOT AN OFFICIAL DOCUMENT',
  '=================================================================',
  'Goods and Services Tax',
  'Registration Certificate',
  'Form GST REG-06',
  '=================================================================',
  'Registration Number: 27AAACB1234C1Z5',
  'Legal Name: Bharat Industrial Solutions Private Limited',
  'Principal Place of Business: Plot 88, MIDC Industrial Area, Andheri East, Mumbai 400093',
  'Date of Issue: 01/04/2024',
  'Issuing Authority: Goods and Services Tax Network',
  'qr-code: MALFORMED_GSTIN_TOKEN_ERR_INVALID',
  'Status: Corrupted QR Token Submission'
]);
fs.writeFileSync(path.join(targetDir, 'organisation_malformed_qr.pdf'), orgMalformedQrPdf);

// 10. organisation_unknown_document.pdf (Commercial facility lease agreement without approved reference template)
const orgUnknownPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION SAMPLE — NOT AN OFFICIAL DOCUMENT',
  '=================================================================',
  'Apex Industrial Logistics & Warehousing Facilities',
  'Commercial Space Lease Agreement & Handover Certificate',
  '=================================================================',
  'Premises Identifier: APEX-FAC-99182',
  'Lessee Enterprise: Bharat Industrial Solutions Private Limited',
  'Facility Location: Unit 14, Apex Logistics Park, Bhiwandi, Maharashtra 421302',
  'Lease Execution Date: 15/01/2024',
  'Document Type: Private Commercial Lease Agreement',
  'Status: Synthetic Supporting Document Without Approved Reference Template'
]);
fs.writeFileSync(path.join(targetDir, 'organisation_unknown_document.pdf'), orgUnknownPdf);
fs.writeFileSync(path.join(targetDir, 'organisation_supporting_declaration.pdf'), orgUnknownPdf);

// =============================================================================
// COMPREHENSIVE README.md DOCUMENTATION
// =============================================================================

const readmeContent = `# TypeNull Synthetic Authenticity Demonstration Pack

> **SAFETY NOTICE & STATUTORY DISCLAIMER**
> Every document in this directory is a **conspicuously fictional demonstration artefact**.
> **NOT AN OFFICIAL DOCUMENT. NOT FOR OFFICIAL SUBMISSION.**
> All personal names, enterprise names, identification numbers (PAN, GSTIN, CIN),
> and addresses are 100% synthetic and created exclusively to test TypeNull's
> Document Reference Dataset and Authenticity Verification Engine.

---

## Pack Inventory & Test Case Matrix

| Filename | Category | Intended Test Case | Expected Assessment Behaviour | Limitations / Disclosures |
| :--- | :--- | :--- | :--- | :--- |
| \`applicant_reference_original.pdf\` | Applicant | Perfect match against approved PAN template v1.0 | Template: \`MATCH\`<br>Consistency: \`CONSISTENT\`<br>Alteration: \`NO_ALTERATIONS_DETECTED\`<br>Overall: \`UNABLE_TO_VERIFY\` | Template match does NOT equal legal verification. External ITD API unconfigured. |
| \`applicant_altered_copy.pdf\` | Applicant | Altered PAN format (\`ABCDEX1234\`, fails regex) | Template: \`MATCH\`<br>Consistency: \`INCONSISTENT\`<br>Alteration: \`SUSPICIOUS\`<br>Overall: \`SUSPICIOUS\` | Regex pattern inspection detects syntax alteration; cannot detect photographic tampering. |
| \`applicant_missing_field.pdf\` | Applicant | Mandatory field \`father_name\` omitted | Template: \`MATCH\`<br>Consistency: \`FIELD_MISSING\`<br>Compliance: \`INCOMPLETE\`<br>Overall: \`UNABLE_TO_VERIFY\` | Identifies missing mandatory statutory field. Prompts user re-upload. |
| \`applicant_unknown_document.pdf\` | Applicant | Unrecognized fellowship document with no reference | Template: \`TEMPLATE_UNAVAILABLE\`<br>Overall: \`UNABLE_TO_VERIFY\` | **Crucial**: Not falsely branded fraudulent or suspicious. Flagged for manual review. |
| \`applicant_unreadable_sample.pdf\` | Applicant | Zero extractable text characters | Extraction: \`0 characters\`<br>Template: \`TEMPLATE_UNAVAILABLE\`<br>Overall: \`UNABLE_TO_VERIFY\` | Gracefully detects unreadable scan without crashing. Prompts clear upload. |
| \`organisation_reference_original.pdf\` | Organisation | Compliant Form GST REG-06 with valid QR token | Template: \`MATCH\`<br>QR/Sig: \`VALID_SIGNATURE\`<br>Alteration: \`NO_ALTERATIONS_DETECTED\`<br>Overall: \`UNABLE_TO_VERIFY\` | Valid QR payload syntax verified; real GSTN gateway verification requires GSP API credentials. |
| \`organisation_altered_copy.pdf\` | Organisation | Altered GSTIN format (\`99XXXXX9999X9ZZ\`) | Consistency: \`INCONSISTENT\`<br>Alteration: \`SUSPICIOUS\`<br>Overall: \`SUSPICIOUS\` | Invalid state code (99) and character count flagged as format violation. |
| \`organisation_missing_field.pdf\` | Organisation | Form GST REG-06 missing Legal Name & Address | Consistency: \`FIELD_MISSING\`<br>Compliance: \`INCOMPLETE\`<br>Overall: \`UNABLE_TO_VERIFY\` | Detects missing statutory fields for enterprise registration screening. |
| \`organisation_malformed_qr.pdf\` | Organisation | Deliberately corrupted QR token payload | QR/Sig: \`MALFORMED_OR_INVALID\`<br>Alteration: \`SUSPICIOUS\`<br>Overall: \`SUSPICIOUS\` | Scans token payload and flags malformed/corrupted token schema. |
| \`organisation_unknown_document.pdf\` | Organisation | Commercial utility bill without screening template | Template: \`TEMPLATE_UNAVAILABLE\`<br>Overall: \`UNABLE_TO_VERIFY\` | Supplementary proof without mandatory template does not fail application. |

---

## Workflow Integration Instructions

### 1. Applicant Workflow Demonstration
1. Navigate to **Applicant Workspace** (\`/applications/explore\` or \`/applications/new\`).
2. Select an authoritative regulatory service (e.g., *SPICe+ Company Incorporation*).
3. In the Application Details Dossier (\`/applications/app-demo-1\`), click **Upload Document**.
4. Upload \`applicant_reference_original.pdf\` or \`applicant_altered_copy.pdf\`.
5. Observe the **Authenticity & Integrity Assessment** section render:
   - Matched reference: \`Permanent Account Number (PAN) Card v1.0 (Synthetic Demonstration)\`.
   - 7-Dimension Status Matrix: Structural match, format validation, alteration indicators.
   - Expandable **Evidence & Technical Findings** drawer detailing exact field-by-field outcomes.

### 2. Organisation Bulk Screening Demonstration
1. Navigate to **Officer Workspace** (\`/officer\`).
2. Use the **Intake Mode Toggle** to upload batch documents or the demo archive.
3. Observe batch processing categorize applications into:
   - *Statutory Violations vs Unable to Assess vs Format Discrepancies*.
4. Click **Inspect** on any batch item to view the detailed **Batch Item Review Modal**.
5. Inspect the live comparison of the submitted document against the approved reference template.

---

## Important Architectural Notes
- **Template Match $\\neq$ Genuine Legal Document**: Matching reference template structures establishes typographic, schema, and layout conformance. Legal authenticity requires authoritative government database verification (\`UNABLE_TO_VERIFY\` in demo).
- **Synthetic References are Distinct**: Seed reference templates are marked with \`isSynthetic: true\` and \`provenance: 'synthetic_demo'\`. They are never represented as authentic government records.
`;

fs.writeFileSync(path.join(targetDir, 'README.md'), readmeContent);

// =============================================================================
// GENERATE ZIP ARCHIVE FOR EASY DISTRIBUTION
// =============================================================================

const zipPath = path.join(targetDir, 'synthetic_demo_documents.zip');
try {
  // Use standard system zip to package files cleanly
  execSync(`cd "${targetDir}" && zip -q -r "${zipPath}" *.pdf README.md`, { stdio: 'inherit' });
  console.log('Successfully created synthetic demonstration ZIP archive:', zipPath);
} catch (err: any) {
  console.error('Warning: Failed to create zip archive via system zip:', err.message);
}

console.log('Successfully generated all 10 synthetic authenticity demonstration files, README.md, and ZIP bundle.');
