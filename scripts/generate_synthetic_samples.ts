import fs from 'fs';
import path from 'path';

/**
 * TypeNull SIH 2026: Synthetic Demonstration Sample Generator
 *
 * Generates 100% valid standard PDF 1.4 documents containing synthetic text streams
 * for testing the TypeNull browser OCR / PDF text extraction and validation engine.
 *
 * Every document is explicitly watermarked:
 * "SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION"
 */

function createStandardPdf(lines: string[]): Buffer {
  let streamContent = 'BT\n/F1 10 Tf\n50 750 Td\n15 TL\n';
  for (const line of lines) {
    const escaped = line
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
    streamContent += `(${escaped}) '\n`;
  }
  streamContent += 'ET\n';

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

const baseDir = path.resolve(process.cwd(), 'docs/demo-samples');

// Ensure directories exist
const sc1Dir = path.join(baseDir, 'scenario-1-complete');
const sc2Dir = path.join(baseDir, 'scenario-2-missing-doc');
const sc3Dir = path.join(baseDir, 'scenario-3-inconsistent');
const sc4Dir = path.join(baseDir, 'scenario-4-poor-quality');

[sc1Dir, sc2Dir, sc3Dir, sc4Dir].forEach((d) => {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
});

console.log('Generating synthetic demonstration sample files...');

// =============================================================================
// SCENARIO 1 FILES: Complete Sample Application (SPICe+ INC-32)
// =============================================================================

// 1. Application Summary Form
const sc1AppPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION',
  '=================================================================',
  'Ministry of Corporate Affairs - Government of India',
  'Form SPICe+ (INC-32): Integrated Company Incorporation Application',
  '=================================================================',
  'Name of Company: Sharma Innovations Technologies Private Limited',
  'Corporate Identification Number: U72900KA2024PTC189201',
  'Principal Office Address: No 42, Innovation Campus, Electronic City Phase 1, Bengaluru 560100',
  'Applicant / Designated Director: AARAV SHARMA',
  'Director Identification Number: 09876543',
  'Date of Incorporation: 15/06/2024',
  'Jurisdiction: Registrar of Companies, Karnataka',
  'Subscribed Share Capital: INR 1,000,000',
  'Status: Pre-Validation Inspection Copy'
]);
fs.writeFileSync(path.join(sc1Dir, 'spice_plus_inc32_application_summary.pdf'), sc1AppPdf);

// 2. Director PAN Card
const sc1PanPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION',
  '=================================================================',
  'Income Tax Department, Government of India',
  'Permanent Account Number Card',
  '=================================================================',
  'Permanent Account Number: ABCDE1234F',
  'Name: AARAV SHARMA',
  'Father Name: RAJESH SHARMA',
  'Date of Birth: 15/05/1985',
  'Issuing Authority: Income Tax Department'
]);
fs.writeFileSync(path.join(sc1Dir, 'director_pan_card_aarav_sharma.pdf'), sc1PanPdf);

// 3. Certificate of Incorporation / MOA
const sc1CoiPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION',
  '=================================================================',
  'Ministry of Corporate Affairs - Registrar of Companies',
  'Certificate of Incorporation [Pursuant to Section 7(2) of Companies Act 2013]',
  '=================================================================',
  'Corporate Identity Number: U72900KA2024PTC189201',
  'Name of Company: Sharma Innovations Technologies Private Limited',
  'Date of Incorporation: 15/06/2024',
  'Registered Office: No 42, Innovation Campus, Electronic City Phase 1, Bengaluru 560100',
  'Issuing Authority: Ministry of Corporate Affairs'
]);
fs.writeFileSync(path.join(sc1Dir, 'certificate_of_incorporation_moa_aoa.pdf'), sc1CoiPdf);

// 4. Registered Office Utility Bill
const sc1UtilityPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION',
  '=================================================================',
  'Bangalore Electricity Supply Company Limited (BESCOM)',
  'Electricity Bill - Commercial Connection',
  '=================================================================',
  'Consumer Name: Sharma Innovations Technologies Private Limited',
  'Registered Office Address: No 42, Innovation Campus, Electronic City Phase 1, Bengaluru 560100',
  'Account Number: 8877665544',
  'Date of Issue: 10/09/2026',
  'Total Amount Due: INR 4,320',
  'Proof Category: Registered Office Address Proof'
]);
fs.writeFileSync(path.join(sc1Dir, 'registered_office_electricity_bill.pdf'), sc1UtilityPdf);

// =============================================================================
// SCENARIO 2 FILES: Missing Mandatory Document (Omitted PAN Card)
// =============================================================================

// Re-uses application summary, COI, and utility bill, omitting director PAN card
fs.writeFileSync(path.join(sc2Dir, 'spice_plus_inc32_application_summary.pdf'), sc1AppPdf);
fs.writeFileSync(path.join(sc2Dir, 'certificate_of_incorporation_moa_aoa.pdf'), sc1CoiPdf);
fs.writeFileSync(path.join(sc2Dir, 'registered_office_electricity_bill.pdf'), sc1UtilityPdf);

// =============================================================================
// SCENARIO 3 FILES: Inconsistent Documents (GSTIN vs PAN Mismatch & Name Divergence)
// =============================================================================

// 1. GST REG-01 Application Summary
const sc3AppPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION',
  '=================================================================',
  'Central Board of Indirect Taxes and Customs - Form GST REG-01',
  'Application for Registration under Section 22 of CGST Act, 2017',
  '=================================================================',
  'Legal Name of Business: Bharat Industrial Solutions Private Limited',
  'Trade Name: Bharat Industrial Tech',
  'GSTIN Registration Number: 27AAACB1234C1Z5',
  'Permanent Account Number: AAACB1234C',
  'Constitution of Business: Private Limited Company',
  'Principal Place of Business: Plot 88, MIDC Industrial Area, Andheri East, Mumbai 400093',
  'Date of Liability: 01/04/2024'
]);
fs.writeFileSync(path.join(sc3Dir, 'gst_reg01_application_summary.pdf'), sc3AppPdf);

// 2. GSTIN Certificate with embedded PAN AAACB1234C
const sc3GstCertPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION',
  '=================================================================',
  'Government of India - Goods and Services Tax Network',
  'Form GST REG-06: Registration Certificate',
  '=================================================================',
  'Registration Number: 27AAACB1234C1Z5',
  'Legal Name: Bharat Industrial Solutions Private Limited',
  'Principal Place of Business: Plot 88, MIDC Industrial Area, Andheri East, Mumbai 400093',
  'Date of Issue: 01/04/2024',
  'Issuing Authority: Goods and Services Tax Network'
]);
fs.writeFileSync(path.join(sc3Dir, 'gstin_registration_certificate.pdf'), sc3GstCertPdf);

// 3. Mismatched Promoter PAN Card (PAN ZZZZZ9999Z instead of AAACB1234C)
const sc3MismatchedPanPdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION',
  '=================================================================',
  'Income Tax Department, Government of India',
  'Permanent Account Number Card',
  '=================================================================',
  'Permanent Account Number: ZZZZZ9999Z',
  'Name: VIKRAM VERMA',
  'Father Name: MANOHAR VERMA',
  'Date of Birth: 22/07/1988',
  'Issuing Authority: Income Tax Department'
]);
fs.writeFileSync(path.join(sc3Dir, 'promoter_pan_card_mismatched.pdf'), sc3MismatchedPanPdf);

// 4. Divergent Legal Name Certificate (Zenith Enterprises instead of Bharat Industrial)
const sc3DivergentNamePdf = createStandardPdf([
  'SYNTHETIC DEMONSTRATION DATA - NOT FOR OFFICIAL SUBMISSION',
  '=================================================================',
  'Ministry of Corporate Affairs - Registrar of Companies',
  'Certificate of Incorporation',
  '=================================================================',
  'Corporate Identity Number: U29100MH2024PTC998877',
  'Name of Company: Zenith Enterprises Global Private Limited',
  'Date of Incorporation: 10/01/2024',
  'Issuing Authority: Ministry of Corporate Affairs'
]);
fs.writeFileSync(path.join(sc3Dir, 'corporate_name_divergent_certificate.pdf'), sc3DivergentNamePdf);

// =============================================================================
// SCENARIO 4 FILES: Poor-Quality Scan / Low-Text Density Warning
// =============================================================================

// File with less than 20 characters of extractable text to exercise extraction review
const sc4UnreadablePdf = createStandardPdf([
  'SYNTHETIC DEMO',
  '--BLANK SCAN--'
]);
fs.writeFileSync(path.join(sc4Dir, 'unreadable_corrupted_scan.pdf'), sc4UnreadablePdf);

console.log('Successfully generated all synthetic demonstration sample PDFs.');
