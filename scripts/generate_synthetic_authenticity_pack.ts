import fs from 'fs';
import path from 'path';

/**
 * TypeNull Synthetic Authenticity Demo-Document Pack Generator
 *
 * Generates 100% standard PDF 1.4 documents containing synthetic demonstration streams
 * to exercise TypeNull's Document Reference Dataset & Authenticity Verification Engine.
 *
 * All files are explicitly watermarked:
 * "SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION"
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

const targetDir = path.resolve(process.cwd(), 'docs/demo-samples/authenticity-pack');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log('Generating synthetic authenticity demo pack in:', targetDir);

// 1. Applicant Reference Sample (Valid PAN Card)
const applicantRefPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION',
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
fs.writeFileSync(path.join(targetDir, 'applicant_reference_sample_pan.pdf'), applicantRefPdf);

// 2. Intentionally Altered Applicant Test Copy (Invalid PAN format 'ABCDEX1234')
const applicantAlteredPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION',
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
fs.writeFileSync(path.join(targetDir, 'applicant_altered_pan_copy.pdf'), applicantAlteredPdf);

// 3. Applicant Document with Missing Mandatory Field (Father's Name Omitted)
const applicantMissingFieldPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION',
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
fs.writeFileSync(path.join(targetDir, 'applicant_missing_field_pan.pdf'), applicantMissingFieldPdf);

// 4. Organisation Registration Reference Sample (Form GST REG-06)
const orgRefPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION',
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
fs.writeFileSync(path.join(targetDir, 'organisation_reference_sample_gst.pdf'), orgRefPdf);

// 5. Intentionally Altered Organisation Test Copy (Altered GSTIN & Corrupted QR)
const orgAlteredPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION',
  '=================================================================',
  'Goods and Services Tax',
  'Registration Certificate',
  'Form GST REG-06',
  '=================================================================',
  'Registration Number: 99XXXXX9999X9ZZ', // Altered invalid state code & check digit
  'Legal Name: Bharat Industrial Solutions Private Limited',
  'Principal Place of Business: Plot 88, MIDC Industrial Area, Andheri East, Mumbai 400093',
  'Date of Issue: 01/04/2024',
  'Issuing Authority: Goods and Services Tax Network',
  'qr-code: MALFORMED_GSTIN_TOKEN_ERR_INVALID',
  'Status: Intentionally Altered Organisation Test Submission'
]);
fs.writeFileSync(path.join(targetDir, 'organisation_altered_gst_copy.pdf'), orgAlteredPdf);

// 6. Organisation Supporting Declaration / Utility Bill
const orgSupportingPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION',
  '=================================================================',
  'Bangalore Electricity Supply Company Limited (BESCOM)',
  'Electricity Bill - Commercial Connection',
  '=================================================================',
  'Consumer Name: Sharma Innovations Technologies Private Limited',
  'Premises Address: No 42, Innovation Campus, Electronic City Phase 1, Bengaluru 560100',
  'Consumer Account Number: 8877665544',
  'Date of Issue: 10/09/2026',
  'Proof Category: Registered Office Address Proof',
  'Status: Synthetic Supporting Document'
]);
fs.writeFileSync(path.join(targetDir, 'organisation_supporting_declaration.pdf'), orgSupportingPdf);

console.log('Successfully generated all 6 synthetic authenticity demonstration files.');
