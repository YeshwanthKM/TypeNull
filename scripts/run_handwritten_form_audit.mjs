import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createWorker } from 'tesseract.js';

// Import pure extraction & validation logic from TypeNull
import {
  parseStructuredFields,
  classifyDocumentText,
} from '../src/services/extraction.ts';

import {
  resolveFieldCandidate,
  normalizeFieldValue,
} from '../src/services/documentAuthenticityService.ts';

import { runValidationEngine } from '../src/services/validation/engine.ts';

const EVAL_DIR = path.resolve('test_corpus/handwritten_eval');
if (!fs.existsSync(EVAL_DIR)) {
  fs.mkdirSync(EVAL_DIR, { recursive: true });
}

console.log('========================================================================');
console.log('TYPENULL HANDWRITTEN FORM COMPATIBILITY AUDIT & TEST MATRIX SUITE');
console.log('Target Evaluation Directory: ' + EVAL_DIR);
console.log('Timestamp: ' + new Date().toISOString());
console.log('========================================================================\n');

/**
 * 1. Define the 10 Test Form Templates & Specifications
 */
const testCaseSpecs = [
  {
    caseId: 1,
    title: 'Neatly Handwritten Answers',
    formName: 'MEA Passport Annexure E (Applicant Declaration)',
    formSource: 'Ministry of External Affairs — Passport Seva Portal',
    formType: 'Government Statutory Declaration / Identity Verification',
    testCondition: 'Clean, upright, uppercase block handwriting on horizontal baseline lines (Noteworthy font).',
    expectedOutput: {
      documentTitle: 'Passport Applicant Declaration (Annexure E)',
      applicantName: 'SURESH KUMAR',
      registrationNumber: 'ABCDE1234F',
      issueDate: '15/07/2024',
      address: '128 MG ROAD INDIRANAGAR BANGALORE 560038',
    },
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" style="background:#ffffff;">
        <rect width="800" height="1000" fill="#ffffff"/>
        <rect x="30" y="30" width="740" height="940" fill="none" stroke="#222222" stroke-width="2"/>
        
        <text x="400" y="80" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="bold">GOVERNMENT OF INDIA - MINISTRY OF EXTERNAL AFFAIRS</text>
        <text x="400" y="110" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="bold">ANNEXURE 'E'</text>
        <text x="400" y="135" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13">SPECIMEN DECLARATION OF THE APPLICANT ON A PLAIN PAPER</text>
        <line x1="50" y1="150" x2="750" y2="150" stroke="#444444" stroke-width="1.5"/>

        <text x="60" y="200" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold">Applicant Name:</text>
        <line x1="200" y1="205" x2="730" y2="205" stroke="#888888" stroke-width="1"/>
        <text x="210" y="198" font-family="Noteworthy, sans-serif" font-size="20" font-weight="bold" fill="#0d47a1">SURESH KUMAR</text>

        <text x="60" y="250" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold">Father's Name:</text>
        <line x1="200" y1="255" x2="730" y2="255" stroke="#888888" stroke-width="1"/>
        <text x="210" y="248" font-family="Noteworthy, sans-serif" font-size="20" font-weight="bold" fill="#0d47a1">RAMESH KUMAR</text>

        <text x="60" y="300" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold">PAN / Tax ID:</text>
        <line x1="200" y1="305" x2="450" y2="305" stroke="#888888" stroke-width="1"/>
        <text x="210" y="298" font-family="Noteworthy, sans-serif" font-size="20" font-weight="bold" fill="#0d47a1">ABCDE1234F</text>

        <text x="470" y="300" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold">Date of Birth:</text>
        <line x1="580" y1="305" x2="730" y2="305" stroke="#888888" stroke-width="1"/>
        <text x="590" y="298" font-family="Noteworthy, sans-serif" font-size="20" font-weight="bold" fill="#0d47a1">12/04/1985</text>

        <text x="60" y="350" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold">Residential Address:</text>
        <line x1="220" y1="355" x2="730" y2="355" stroke="#888888" stroke-width="1"/>
        <text x="230" y="348" font-family="Noteworthy, sans-serif" font-size="18" font-weight="bold" fill="#0d47a1">128 MG ROAD INDIRANAGAR BANGALORE 560038</text>

        <text x="60" y="420" font-family="Arial, Helvetica, sans-serif" font-size="12">I solemnly affirm that the particulars stated above are true and correct.</text>

        <text x="60" y="500" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold">Date of Issue:</text>
        <line x1="170" y1="505" x2="350" y2="505" stroke="#888888" stroke-width="1"/>
        <text x="180" y="498" font-family="Noteworthy, sans-serif" font-size="19" font-weight="bold" fill="#0d47a1">15/07/2024</text>

        <text x="480" y="500" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="bold">Signature of Applicant:</text>
        <line x1="640" y1="505" x2="730" y2="505" stroke="#888888" stroke-width="1"/>
        <text x="645" y="498" font-family="Noteworthy, sans-serif" font-size="20" font-weight="bold" fill="#0d47a1">Suresh K</text>
      </svg>
    `,
  },
  {
    caseId: 2,
    title: 'Ordinary Handwriting',
    formName: 'Income Tax Form 49A (Application for Allotment of PAN)',
    formSource: 'Income Tax Department, Government of India',
    formType: 'Statutory Direct Tax Registration Form',
    testCondition: 'Typical natural human handwriting with mixed upper/lowercase, minor slant, and proportional spacing (Chalkboard font).',
    expectedOutput: {
      documentTitle: 'Permanent Account Number (PAN) Card',
      applicantName: 'Priya Sharma',
      registrationNumber: 'DL-04-2022-0091823',
      issueDate: '24/11/2022',
    },
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="950" viewBox="0 0 800 950" style="background:#ffffff;">
        <rect width="800" height="950" fill="#ffffff"/>
        <rect x="25" y="25" width="750" height="900" fill="none" stroke="#222222" stroke-width="2"/>
        
        <text x="400" y="70" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">INCOME TAX DEPARTMENT - GOVERNMENT OF INDIA</text>
        <text x="400" y="95" text-anchor="middle" font-family="Arial" font-size="15" font-weight="bold">FORM NO. 49A</text>
        <text x="400" y="120" text-anchor="middle" font-family="Arial" font-size="12">Application for Allotment of Permanent Account Number</text>
        <line x1="40" y1="135" x2="760" y2="135" stroke="#333333" stroke-width="1"/>

        <text x="50" y="180" font-family="Arial" font-size="13" font-weight="bold">1. Full Name:</text>
        <line x1="160" y1="185" x2="740" y2="185" stroke="#999999" stroke-width="1"/>
        <text x="170" y="178" font-family="Chalkboard, sans-serif" font-size="20" fill="#1b5e20">Priya Sharma</text>

        <text x="50" y="230" font-family="Arial" font-size="13" font-weight="bold">2. Father's Name:</text>
        <line x1="170" y1="235" x2="740" y2="235" stroke="#999999" stroke-width="1"/>
        <text x="180" y="228" font-family="Chalkboard, sans-serif" font-size="20" fill="#1b5e20">Mohan Lal Sharma</text>

        <text x="50" y="280" font-family="Arial" font-size="13" font-weight="bold">3. Date of Birth:</text>
        <line x1="160" y1="285" x2="400" y2="285" stroke="#999999" stroke-width="1"/>
        <text x="170" y="278" font-family="Chalkboard, sans-serif" font-size="20" fill="#1b5e20">24/11/1990</text>

        <text x="430" y="280" font-family="Arial" font-size="13" font-weight="bold">Registration No:</text>
        <line x1="560" y1="285" x2="740" y2="285" stroke="#999999" stroke-width="1"/>
        <text x="570" y="278" font-family="Chalkboard, sans-serif" font-size="18" fill="#1b5e20">DL-04-2022-0091823</text>

        <text x="50" y="330" font-family="Arial" font-size="13" font-weight="bold">4. Address for Communication:</text>
        <line x1="250" y1="335" x2="740" y2="335" stroke="#999999" stroke-width="1"/>
        <text x="260" y="328" font-family="Chalkboard, sans-serif" font-size="18" fill="#1b5e20">Flat 302, Green Valley Apartments, Rohini, New Delhi</text>

        <text x="50" y="400" font-family="Arial" font-size="13" font-weight="bold">Date of Issue:</text>
        <line x1="160" y1="405" x2="350" y2="405" stroke="#999999" stroke-width="1"/>
        <text x="170" y="398" font-family="Chalkboard, sans-serif" font-size="20" fill="#1b5e20">24/11/2022</text>
      </svg>
    `,
  },
  {
    caseId: 3,
    title: 'Difficult-to-Read Handwriting',
    formName: 'Municipal Trade Licence Clearance Application',
    formSource: 'Urban Local Body Municipal Authority',
    formType: 'Municipal Trade & Operational Clearance',
    testCondition: 'Fast cursive script with high slant (25°), connected loops, uneven line thickness, and cursive ligatures (Brush Script MT font).',
    expectedOutput: {
      documentTitle: 'Municipal Trade & Operational Licence',
      organisationName: 'Venkateshwara Engineering Works',
      applicantName: 'Dr. Anandhan Rajagopalan',
      registrationNumber: 'BBMP-TL-2023-8891',
      issueDate: '05/09/2023',
    },
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="900" viewBox="0 0 800 900" style="background:#ffffff;">
        <rect width="800" height="900" fill="#ffffff"/>
        <rect x="25" y="25" width="750" height="850" fill="none" stroke="#333333" stroke-width="2"/>
        
        <text x="400" y="70" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">MUNICIPAL CORPORATION - TRADE LICENSING DEPARTMENT</text>
        <text x="400" y="95" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold">APPLICATION FOR TRADE LICENCE REGISTRATION</text>
        <line x1="40" y1="115" x2="760" y2="115" stroke="#444444" stroke-width="1"/>

        <text x="50" y="160" font-family="Arial" font-size="13" font-weight="bold">Establishment Name:</text>
        <line x1="200" y1="165" x2="740" y2="165" stroke="#999999" stroke-width="1"/>
        <text x="210" y="158" font-family="'Brush Script MT', cursive" font-size="26" fill="#003366">Venkateshwara Engineering Works</text>

        <text x="50" y="220" font-family="Arial" font-size="13" font-weight="bold">Proprietor Name:</text>
        <line x1="180" y1="225" x2="740" y2="225" stroke="#999999" stroke-width="1"/>
        <text x="190" y="218" font-family="'Brush Script MT', cursive" font-size="26" fill="#003366">Dr. Anandhan Rajagopalan</text>

        <text x="50" y="280" font-family="Arial" font-size="13" font-weight="bold">Licence Number:</text>
        <line x1="180" y1="285" x2="450" y2="285" stroke="#999999" stroke-width="1"/>
        <text x="190" y="278" font-family="'Brush Script MT', cursive" font-size="26" fill="#003366">BBMP-TL-2023-8891</text>

        <text x="50" y="340" font-family="Arial" font-size="13" font-weight="bold">Date of Issue:</text>
        <line x1="160" y1="345" x2="400" y2="345" stroke="#999999" stroke-width="1"/>
        <text x="170" y="338" font-family="'Brush Script MT', cursive" font-size="26" fill="#003366">05/09/2023</text>
      </svg>
    `,
  },
  {
    caseId: 4,
    title: 'Photograph Taken at an Angle',
    formName: 'MEA Passport Annexure D (Parental Minor Consent)',
    formSource: 'Ministry of External Affairs — Passport Seva Portal',
    formType: 'Government Statutory Affidavit',
    testCondition: 'Photograph taken with mobile device at approximately 15° perspective angle with keystone skew and uneven background gradient.',
    expectedOutput: {
      documentTitle: 'Passport Applicant Declaration',
      applicantName: 'AARAV SHARMA',
      registrationNumber: 'Z1928374',
    },
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="900" height="750" viewBox="0 0 900 750" style="background:#d6d6d6;">
        <defs>
          <linearGradient id="photoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="70%" stop-color="#f5f5f5"/>
            <stop offset="100%" stop-color="#e0e0e0"/>
          </linearGradient>
        </defs>
        <rect width="900" height="750" fill="#d6d6d6"/>

        <!-- Perspective Skew Group (15 degree tilt and keystoning) -->
        <g transform="matrix(0.92, 0.16, -0.14, 0.88, 80, 40)">
          <rect width="720" height="600" fill="url(#photoGrad)" stroke="#444" stroke-width="2"/>
          <text x="360" y="60" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold">PASSPORT SEVA - GOVERNMENT OF INDIA</text>
          <text x="360" y="90" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">ANNEXURE 'D'</text>
          <text x="360" y="115" text-anchor="middle" font-family="Arial" font-size="12">AFFIDAVIT FOR MINOR PASSPORT APPLICATION</text>
          <line x1="40" y1="130" x2="680" y2="130" stroke="#333" stroke-width="1.5"/>

          <text x="50" y="180" font-family="Arial" font-size="14" font-weight="bold">Minor Applicant Name:</text>
          <text x="250" y="180" font-family="Noteworthy, sans-serif" font-size="22" font-weight="bold" fill="#0d47a1">AARAV SHARMA</text>

          <text x="50" y="240" font-family="Arial" font-size="14" font-weight="bold">Father's Legal Name:</text>
          <text x="240" y="240" font-family="Noteworthy, sans-serif" font-size="22" font-weight="bold" fill="#0d47a1">SURESH SHARMA</text>

          <text x="50" y="300" font-family="Arial" font-size="14" font-weight="bold">Passport Number:</text>
          <text x="210" y="300" font-family="Noteworthy, sans-serif" font-size="22" font-weight="bold" fill="#0d47a1">Z1928374</text>

          <text x="50" y="360" font-family="Arial" font-size="14" font-weight="bold">Date of Issue:</text>
          <text x="180" y="360" font-family="Noteworthy, sans-serif" font-size="22" font-weight="bold" fill="#0d47a1">14/06/2023</text>
        </g>
      </svg>
    `,
  },
  {
    caseId: 5,
    title: 'Low-Resolution Scan',
    formName: 'BBMP Municipal Trade Licence Certificate',
    formSource: 'Bruhat Bengaluru Mahanagara Palike',
    formType: 'Municipal Trade Clearance Certificate',
    testCondition: 'Severely downsampled raster image (100 DPI) with heavy blurring, loss of fine strokes, and pixelation artifacts.',
    expectedOutput: {
      documentTitle: 'Municipal Trade & Operational Licence',
      organisationName: 'APEX LOGISTICS SERVICES',
      registrationNumber: 'BBMP-TL-2024-5512',
      issueDate: '12/03/2024',
    },
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" style="background:#ffffff;">
        <rect width="800" height="600" fill="#ffffff"/>
        <rect x="20" y="20" width="760" height="560" fill="none" stroke="#222" stroke-width="2"/>
        <text x="400" y="60" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold">BRUHAT BENGALURU MAHANAGARA PALIKE</text>
        <text x="400" y="90" text-anchor="middle" font-family="Arial" font-size="15" font-weight="bold">TRADE LICENCE REGISTRATION CERTIFICATE</text>
        <line x1="40" y1="110" x2="760" y2="110" stroke="#333" stroke-width="1.5"/>

        <text x="50" y="160" font-family="Arial" font-size="14" font-weight="bold">Trade Name:</text>
        <text x="200" y="160" font-family="Noteworthy, sans-serif" font-size="20" font-weight="bold" fill="#1a237e">APEX LOGISTICS SERVICES</text>

        <text x="50" y="220" font-family="Arial" font-size="14" font-weight="bold">Licence Number:</text>
        <text x="210" y="220" font-family="Courier" font-size="18" font-weight="bold">BBMP-TL-2024-5512</text>

        <text x="50" y="280" font-family="Arial" font-size="14" font-weight="bold">Date of Issue:</text>
        <text x="180" y="280" font-family="Noteworthy, sans-serif" font-size="20" font-weight="bold" fill="#1a237e">12/03/2024</text>
      </svg>
    `,
    downsampleWidth: 380, // downsampled to simulate 100 DPI scan
  },
  {
    caseId: 6,
    title: 'Standard Form with Printed Text and Handwritten Entries',
    formName: 'Form GST REG-01 (Application for Registration under GST)',
    formSource: 'Central Board of Indirect Taxes and Customs (CBIC) & GST Council',
    formType: 'Statutory Indirect Tax Registration Application',
    testCondition: 'Extensive machine-printed legal boilerplate, statutory clauses, table grid borders, and designated boxed fill-ins containing handwritten responses.',
    expectedOutput: {
      documentTitle: 'GST Registration Certificate',
      organisationName: 'NEXUS ENTERPRISES PRIVATE LIMITED',
      registrationNumber: '29ABCDE1234F1Z5',
      issueDate: '01/06/2024',
    },
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1050" viewBox="0 0 800 1050" style="background:#ffffff;">
        <rect width="800" height="1050" fill="#ffffff"/>
        <rect x="25" y="25" width="750" height="1000" fill="none" stroke="#222" stroke-width="2"/>
        
        <text x="400" y="65" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">GOODS AND SERVICES TAX NETWORK</text>
        <text x="400" y="88" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold">FORM GST REG-01</text>
        <text x="400" y="108" text-anchor="middle" font-family="Arial" font-size="11">[See Rule 8(1) of Central Goods and Services Tax Rules, 2017]</text>
        <line x1="40" y1="120" x2="760" y2="120" stroke="#333" stroke-width="1"/>

        <rect x="40" y="140" width="720" height="35" fill="#f0f4f8" stroke="#cbd5e1"/>
        <text x="50" y="162" font-family="Arial" font-size="12" font-weight="bold">PART A: APPLICANT PARTICULARS &amp; JURISDICTION</text>

        <!-- Box 1: Legal Name -->
        <rect x="40" y="190" width="350" height="60" fill="none" stroke="#94a3b8"/>
        <text x="50" y="210" font-family="Arial" font-size="11" font-weight="bold" fill="#475569">Legal Name of the Business:</text>
        <text x="50" y="235" font-family="Noteworthy, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">NEXUS ENTERPRISES PRIVATE LIMITED</text>

        <!-- Box 2: Trade Name -->
        <rect x="410" y="190" width="350" height="60" fill="none" stroke="#94a3b8"/>
        <text x="420" y="210" font-family="Arial" font-size="11" font-weight="bold" fill="#475569">Trade Name (if different):</text>
        <text x="420" y="235" font-family="Noteworthy, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">NEXUS CLOUD SOLUTIONS</text>

        <!-- Box 3: GSTIN / PAN -->
        <rect x="40" y="270" width="350" height="60" fill="none" stroke="#94a3b8"/>
        <text x="50" y="290" font-family="Arial" font-size="11" font-weight="bold" fill="#475569">GSTIN Registration Number:</text>
        <text x="50" y="315" font-family="Noteworthy, sans-serif" font-size="18" font-weight="bold" fill="#0f172a">29ABCDE1234F1Z5</text>

        <!-- Box 4: Date of Commencement -->
        <rect x="410" y="270" width="350" height="60" fill="none" stroke="#94a3b8"/>
        <text x="420" y="290" font-family="Arial" font-size="11" font-weight="bold" fill="#475569">Date of Issue / Commencement:</text>
        <text x="420" y="315" font-family="Noteworthy, sans-serif" font-size="17" font-weight="bold" fill="#0f172a">01/06/2024</text>

        <!-- Printed Legal Declaration Boilerplate -->
        <rect x="40" y="350" width="720" height="120" fill="#f8fafc" stroke="#e2e8f0"/>
        <text x="50" y="375" font-family="Arial" font-size="11" font-weight="bold">STATUTORY VERIFICATION &amp; DECLARATION:</text>
        <text x="50" y="395" font-family="Arial" font-size="10" fill="#334155">I hereby solemnly affirm and declare that the information given herein above is true and correct</text>
        <text x="50" y="415" font-family="Arial" font-size="10" fill="#334155">to the best of my knowledge and belief and nothing has been concealed therefrom.</text>
        <text x="50" y="445" font-family="Arial" font-size="10" fill="#334155">Under Section 22 of the Central Goods and Services Tax Act, 2017.</text>

        <text x="50" y="520" font-family="Arial" font-size="12" font-weight="bold">Authorised Signatory:</text>
        <text x="210" y="520" font-family="Noteworthy, sans-serif" font-size="18" font-weight="bold" fill="#0f172a">Suresh Kumar</text>
      </svg>
    `,
  },
  {
    caseId: 7,
    title: 'Form with an Empty Field That Should Have Been Completed',
    formName: 'MEA Passport Annexure E (Blank Mandatory Identifier)',
    formSource: 'Ministry of External Affairs — Passport Seva Portal',
    formType: 'Government Statutory Declaration',
    testCondition: 'Applicant completed all fields except mandatory Registration Number / Reference ID which was left entirely blank (empty underline).',
    expectedOutput: {
      documentTitle: 'Passport Applicant Declaration (Annexure E)',
      applicantName: 'SURESH KUMAR',
      registrationNumber: null, // OMITTED / BLANK
      issueDate: '15/07/2024',
    },
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="900" viewBox="0 0 800 900" style="background:#ffffff;">
        <rect width="800" height="900" fill="#ffffff"/>
        <rect x="25" y="25" width="750" height="850" fill="none" stroke="#222" stroke-width="2"/>
        
        <text x="400" y="70" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">PASSPORT SEVA - MINISTRY OF EXTERNAL AFFAIRS</text>
        <text x="400" y="95" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold">ANNEXURE 'E' - STATUTORY APPLICANT DECLARATION</text>
        <line x1="40" y1="115" x2="760" y2="115" stroke="#333" stroke-width="1"/>

        <text x="50" y="160" font-family="Arial" font-size="13" font-weight="bold">Applicant Name:</text>
        <line x1="180" y1="165" x2="740" y2="165" stroke="#999" stroke-width="1"/>
        <text x="190" y="158" font-family="Noteworthy, sans-serif" font-size="18" font-weight="bold" fill="#0d47a1">SURESH KUMAR</text>

        <!-- EMPTY MANDATORY REGISTRATION FIELD -->
        <text x="50" y="220" font-family="Arial" font-size="13" font-weight="bold">Registration Number:</text>
        <line x1="220" y1="225" x2="740" y2="225" stroke="#999" stroke-width="1"/>
        <!-- NO VALUE WRITTEN (EMPTY LINE) -->

        <text x="50" y="280" font-family="Arial" font-size="13" font-weight="bold">Date of Birth:</text>
        <line x1="160" y1="285" x2="400" y2="285" stroke="#999" stroke-width="1"/>
        <text x="170" y="278" font-family="Noteworthy, sans-serif" font-size="18" font-weight="bold" fill="#0d47a1">12/04/1985</text>

        <text x="50" y="340" font-family="Arial" font-size="13" font-weight="bold">Date of Issue:</text>
        <line x1="160" y1="345" x2="400" y2="345" stroke="#999" stroke-width="1"/>
        <text x="170" y="338" font-family="Noteworthy, sans-serif" font-size="18" font-weight="bold" fill="#0d47a1">15/07/2024</text>
      </svg>
    `,
  },
  {
    caseId: 8,
    title: 'Numbers That Could Be Misread (1 vs 7, 0 vs O, 5 vs S)',
    formName: 'Income Tax PAN Card Application with Ambiguous Glyphs',
    formSource: 'Income Tax Department — Statutory Taxpayer Enrollment',
    formType: 'Identity & Tax Credential Record',
    testCondition: 'Handwritten alphanumeric characters featuring classic OCR confusion glyphs: 1 vs 7, 0 vs O, and 5 vs S in tax code A71051705F and birthdate 17/01/1971.',
    expectedOutput: {
      documentTitle: 'Permanent Account Number (PAN) Card',
      registrationNumber: 'A71051705F',
      dob: '17/01/1971',
    },
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="700" viewBox="0 0 800 700" style="background:#ffffff;">
        <rect width="800" height="700" fill="#ffffff"/>
        <rect x="25" y="25" width="750" height="650" fill="none" stroke="#222" stroke-width="2"/>
        
        <text x="400" y="70" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">INCOME TAX DEPARTMENT - GOVERNMENT OF INDIA</text>
        <text x="400" y="95" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold">PERMANENT ACCOUNT NUMBER CARD VERIFICATION</text>
        <line x1="40" y1="115" x2="760" y2="115" stroke="#333" stroke-width="1"/>

        <text x="50" y="170" font-family="Arial" font-size="14" font-weight="bold">Permanent Account Number:</text>
        <rect x="280" y="145" width="300" height="40" fill="#f8fafc" stroke="#94a3b8"/>
        <!-- Handwritten PAN with 7 that resembles 1, 0 resembling O, 5 resembling S -->
        <text x="295" y="172" font-family="Chalkboard, sans-serif" font-size="22" font-weight="bold" fill="#0f172a">A71051705F</text>

        <text x="50" y="240" font-family="Arial" font-size="14" font-weight="bold">Cardholder Name:</text>
        <text x="200" y="240" font-family="Chalkboard, sans-serif" font-size="20" fill="#0f172a">AARAV SHARMA</text>

        <text x="50" y="300" font-family="Arial" font-size="14" font-weight="bold">Date of Birth:</text>
        <text x="180" y="300" font-family="Chalkboard, sans-serif" font-size="20" fill="#0f172a">17/01/1971</text>
      </svg>
    `,
  },
  {
    caseId: 9,
    title: 'Dates Written in Different Formats',
    formName: 'MCA Director Statutory Filing (Multi-Format Date Specimen)',
    formSource: 'Ministry of Corporate Affairs — Corporate Governance',
    formType: 'Corporate Statutory Filing Record',
    testCondition: 'Evaluates extraction of diverse date representations: alphanumeric with ordinal ("15th August 2024"), hyphen-delimited ("15-08-2024"), US format ("08/15/2024"), and dot-delimited ("2024.08.15").',
    expectedOutput: {
      documentTitle: 'Certificate of Incorporation',
      datesRecorded: ['15th August 2024', '15-08-2024', '08/15/2024', '2024.08.15'],
    },
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="900" viewBox="0 0 800 900" style="background:#ffffff;">
        <rect width="800" height="900" fill="#ffffff"/>
        <rect x="25" y="25" width="750" height="850" fill="none" stroke="#222" stroke-width="2"/>
        
        <text x="400" y="70" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">MINISTRY OF CORPORATE AFFAIRS - STATUTORY RECORD</text>
        <text x="400" y="95" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold">DIRECTOR DECLARATION &amp; COMPLIANCE DATES</text>
        <line x1="40" y1="115" x2="760" y2="115" stroke="#333" stroke-width="1"/>

        <text x="50" y="170" font-family="Arial" font-size="13" font-weight="bold">Format 1 (Ordinal Text): Date of Incorporation:</text>
        <text x="400" y="170" font-family="Noteworthy, sans-serif" font-size="19" font-weight="bold" fill="#0d47a1">15th August 2024</text>

        <text x="50" y="230" font-family="Arial" font-size="13" font-weight="bold">Format 2 (Hyphen-Delimited): Registration Date:</text>
        <text x="400" y="230" font-family="Noteworthy, sans-serif" font-size="19" font-weight="bold" fill="#0d47a1">15-08-2024</text>

        <text x="50" y="290" font-family="Arial" font-size="13" font-weight="bold">Format 3 (US Month-First): Date of Issue:</text>
        <text x="400" y="290" font-family="Noteworthy, sans-serif" font-size="19" font-weight="bold" fill="#0d47a1">08/15/2024</text>

        <text x="50" y="350" font-family="Arial" font-size="13" font-weight="bold">Format 4 (Dot-Delimited ISO): Expiry Date:</text>
        <text x="400" y="350" font-family="Noteworthy, sans-serif" font-size="19" font-weight="bold" fill="#0d47a1">2024.08.15</text>
      </svg>
    `,
  },
  {
    caseId: 10,
    title: 'Scanned PDF Without a Text Layer',
    formName: 'Passport Seva Annexure M (Employer No Objection Certificate)',
    formSource: 'Ministry of External Affairs — Passport Seva Portal',
    formType: 'Government No Objection Certificate (PDF Container)',
    testCondition: 'Pure scanned raster image enclosed inside a PDF container with zero digital text operators (0 characters selectable). Evaluates TypeNull digital text check threshold (< 25 chars) and automatic OCR fallback.',
    expectedOutput: {
      documentTitle: 'Passport Applicant Declaration',
      organisationName: 'BHARAT ELECTRONICS LIMITED',
      applicantName: 'SURESH KUMAR',
      registrationNumber: 'PSU-NOC-2024-9182',
      issueDate: '10/05/2024',
    },
    svg: `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="950" viewBox="0 0 800 950" style="background:#ffffff;">
        <rect width="800" height="950" fill="#ffffff"/>
        <rect x="25" y="25" width="750" height="900" fill="none" stroke="#222" stroke-width="2"/>
        
        <text x="400" y="70" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">MINISTRY OF EXTERNAL AFFAIRS - PASSPORT SEVA</text>
        <text x="400" y="95" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold">ANNEXURE 'M'</text>
        <text x="400" y="118" text-anchor="middle" font-family="Arial" font-size="12">NO OBJECTION CERTIFICATE FROM EMPLOYER / STATUTORY CADRE</text>
        <line x1="40" y1="130" x2="760" y2="130" stroke="#333" stroke-width="1"/>

        <text x="50" y="180" font-family="Arial" font-size="13" font-weight="bold">1. Employer / Organisation Name:</text>
        <text x="300" y="180" font-family="Noteworthy, sans-serif" font-size="19" font-weight="bold" fill="#0d47a1">BHARAT ELECTRONICS LIMITED</text>

        <text x="50" y="240" font-family="Arial" font-size="13" font-weight="bold">2. Employee / Applicant Name:</text>
        <text x="280" y="240" font-family="Noteworthy, sans-serif" font-size="19" font-weight="bold" fill="#0d47a1">SURESH KUMAR</text>

        <text x="50" y="300" font-family="Arial" font-size="13" font-weight="bold">3. Reference / NOC Number:</text>
        <text x="270" y="300" font-family="Noteworthy, sans-serif" font-size="19" font-weight="bold" fill="#0d47a1">PSU-NOC-2024-9182</text>

        <text x="50" y="360" font-family="Arial" font-size="13" font-weight="bold">4. Date of Issue:</text>
        <text x="180" y="360" font-family="Noteworthy, sans-serif" font-size="19" font-weight="bold" fill="#0d47a1">10/05/2024</text>
      </svg>
    `,
    isPdf: true,
  },
];

/**
 * 2. Generate the Images and Files
 */
console.log('Generating standardized test form fixtures in test_corpus/handwritten_eval/...\n');
for (const spec of testCaseSpecs) {
  const baseName = spec.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_');
  const svgPath = path.join(EVAL_DIR, `${spec.caseId.toString().padStart(2, '0')}_${baseName}.svg`);
  const pngPath = path.join(EVAL_DIR, `${spec.caseId.toString().padStart(2, '0')}_${baseName}.png`);
  
  fs.writeFileSync(svgPath, spec.svg.trim());
  execSync(`sips -s format png "${svgPath}" --out "${pngPath}"`, { stdio: 'pipe' });

  if (spec.downsampleWidth) {
    execSync(`sips --resampleWidth ${spec.downsampleWidth} "${pngPath}"`, { stdio: 'pipe' });
  }

  if (spec.isPdf) {
    const pdfPath = path.join(EVAL_DIR, `${spec.caseId.toString().padStart(2, '0')}_${baseName}.pdf`);
    execSync(`sips -s format pdf "${pngPath}" --out "${pdfPath}"`, { stdio: 'pipe' });
    spec.targetFile = pdfPath;
    spec.evalImage = pngPath; // for OCR
    console.log(`  ✓ Generated Case ${spec.caseId}: ${path.basename(pdfPath)} (Pure raster PDF)`);
  } else {
    spec.targetFile = pngPath;
    spec.evalImage = pngPath;
    console.log(`  ✓ Generated Case ${spec.caseId}: ${path.basename(pngPath)}`);
  }

  // Clean temp SVG
  fs.unlinkSync(svgPath);
}

/**
 * 3. Initialize Tesseract Worker and Execute Tests
 */
console.log('\nInitialising Tesseract OCR Engine (standard machine-printed eng model)...');
const worker = await createWorker('eng');

const auditResults = [];

for (const spec of testCaseSpecs) {
  console.log(`\n------------------------------------------------------------------------`);
  console.log(`Executing Audit Case ${spec.caseId}: ${spec.title}`);
  console.log(`File: ${path.basename(spec.targetFile)}`);
  console.log(`Condition: ${spec.testCondition}`);

  // Step 1: Run Tesseract OCR on the raster image
  const ocrResult = await worker.recognize(spec.evalImage);
  const rawText = ocrResult.data.text || '';
  const ocrConfidence = ocrResult.data.confidence ? ocrResult.data.confidence / 100 : 0.0;

  console.log(`  - OCR Confidence: ${(ocrConfidence * 100).toFixed(1)}%`);
  console.log(`  - Raw Text Length: ${rawText.trim().length} chars`);
  console.log(`  - Text Snippet: ${JSON.stringify(rawText.slice(0, 120).replace(/\\n/g, ' '))}`);

  // Step 2: Run TypeNull Structured Field Parsing
  const candidateFields = parseStructuredFields(
    rawText,
    [{ pageNumber: 1, text: rawText, method: 'ocr', confidence: ocrConfidence }],
    'ocr',
    ocrConfidence
  );

  // Step 3: Run Document Classification
  const classification = classifyDocumentText(rawText);
  console.log(`  - Classified Category: ${classification.type} (${(classification.confidence * 100).toFixed(0)}%)`);

  // Step 4: Evaluate Candidate Resolution and Normalization
  const extractedFieldMap = {};
  for (const f of candidateFields) {
    extractedFieldMap[f.fieldName] = f.extractedValue;
  }

  const normalizedResults = {};
  for (const [k, v] of Object.entries(extractedFieldMap)) {
    normalizedResults[k] = normalizeFieldValue(k, v);
  }

  // Step 5: Run TypeNull Validation Engine
  const fakeDoc = {
    id: `doc-case-${spec.caseId}`,
    application_id: `app-case-${spec.caseId}`,
    original_filename: path.basename(spec.targetFile),
    document_type: classification.type,
    mime_type: spec.isPdf ? 'application/pdf' : 'image/png',
    storage_path: `applications/eval/${path.basename(spec.targetFile)}`,
    file_size_bytes: fs.statSync(spec.targetFile).size,
    processing_status: rawText.length < 20 ? 'failed' : 'completed',
    uploaded_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const fakeExtRecord = {
    id: `ext-case-${spec.caseId}`,
    document_id: fakeDoc.id,
    application_id: fakeDoc.application_id,
    user_id: 'test-auditor',
    extraction_status: rawText.length < 20 ? 'failed' : 'completed',
    extraction_method: 'ocr',
    raw_text: rawText,
    page_count: 1,
    classified_type: classification.type,
    classification_confidence: classification.confidence,
    classification_reason: classification.reason,
    created_at: new Date().toISOString(),
  };

  const fakeFieldRecords = candidateFields.map((f, idx) => ({
    id: `fld-case-${spec.caseId}-${idx}`,
    extraction_id: fakeExtRecord.id,
    document_id: fakeDoc.id,
    application_id: fakeDoc.application_id,
    user_id: 'test-auditor',
    field_name: f.fieldName,
    field_label: f.fieldLabel,
    extracted_value: f.extractedValue,
    reviewed_value: f.extractedValue,
    page_number: 1,
    evidence_snippet: f.evidenceSnippet,
    extraction_method: 'ocr',
    confidence_score: f.confidenceScore,
    review_status: 'needs_review',
    created_at: new Date().toISOString(),
  }));

  const validationRun = runValidationEngine({
    applicationId: fakeDoc.application_id,
    category: classification.type,
    documents: [fakeDoc],
    extractions: [fakeExtRecord],
    fields: fakeFieldRecords,
  });

  // Evaluate correctly vs missed fields
  const expectedKeys = Object.keys(spec.expectedOutput);
  const correctlyExtracted = [];
  const missedOrIncorrect = [];

  for (const expKey of expectedKeys) {
    const expVal = spec.expectedOutput[expKey];
    if (expVal === null) {
      // Intentionally missing field (Case 7)
      const found = extractedFieldMap['registration_number'];
      if (!found) {
        correctlyExtracted.push({ field: expKey, expected: 'OMITTED / BLANK', observed: 'SAFELY UNASSIGNED / MISSING' });
      } else {
        missedOrIncorrect.push({ field: expKey, expected: 'OMITTED / BLANK', observed: found, reason: 'False positive detection on empty line' });
      }
      continue;
    }

    if (Array.isArray(expVal)) {
      // Multiple date formats (Case 9)
      for (const d of expVal) {
        if (rawText.includes(d) || Object.values(extractedFieldMap).some(v => v.includes(d))) {
          correctlyExtracted.push({ field: 'date', expected: d, observed: d });
        } else {
          missedOrIncorrect.push({ field: 'date', expected: d, observed: 'Not extracted or parsed', reason: 'Regex failed to match format' });
        }
      }
      continue;
    }

    const obsVal = extractedFieldMap[expKey] || extractedFieldMap[expKey.replace(/([A-Z])/g, '_$1').toLowerCase()];
    if (obsVal && obsVal.toLowerCase().includes(expVal.toLowerCase())) {
      correctlyExtracted.push({ field: expKey, expected: expVal, observed: obsVal });
    } else {
      missedOrIncorrect.push({
        field: expKey,
        expected: expVal,
        observed: obsVal || 'NOT_DETECTED',
        reason: obsVal ? 'Value corrupted or partial match' : 'Field not recognized by regex or OCR failed',
      });
    }
  }

  // Assess unreadable field handling
  const unreadableHandling = {
    safeGating: false,
    manualReviewTriggered: false,
    blockingFailures: validationRun.findings.filter(f => f.isBlocking).map(f => f.title),
    unassessedFindings: validationRun.findings.filter(f => f.status === 'unable_to_check').map(f => f.title),
  };

  if (rawText.trim().length < 20) {
    unreadableHandling.safeGating = true;
    unreadableHandling.manualReviewTriggered = true;
  } else if (validationRun.findings.some(f => f.requiresManualReview)) {
    unreadableHandling.manualReviewTriggered = true;
  }

  const caseResult = {
    caseId: spec.caseId,
    title: spec.title,
    formName: spec.formName,
    formSource: spec.formSource,
    formType: spec.formType,
    testCondition: spec.testCondition,
    targetFile: path.basename(spec.targetFile),
    ocrConfidence,
    rawTextLength: rawText.length,
    rawTextSnippet: rawText.slice(0, 300),
    classifiedCategory: classification.type,
    classificationConfidence: classification.confidence,
    extractedFields: candidateFields,
    normalizedFields: normalizedResults,
    correctlyExtracted,
    missedOrIncorrect,
    unreadableHandling,
    validationSummary: {
      outcome: validationRun.outcome,
      totalFindings: validationRun.findings.length,
      blockingCount: validationRun.findings.filter(f => f.isBlocking).length,
      majorCount: validationRun.counts?.majorIssues || 0,
      minorCount: validationRun.counts?.minorIssues || 0,
      unableToAssessCount: validationRun.counts?.unableToAssess || 0,
    },
  };

  auditResults.push(caseResult);
  console.log(`  - Extraction Success: ${correctlyExtracted.length} correct, ${missedOrIncorrect.length} missed/corrupted`);
  console.log(`  - Validation Outcome: ${caseResult.validationSummary.outcome} (${caseResult.validationSummary.blockingCount} blocking issues)`);
}

await worker.terminate();

// Save Machine-Readable JSON Audit Results
const jsonPath = path.resolve('docs/qa/handwritten_form_test_results.json');
fs.writeFileSync(jsonPath, JSON.stringify(auditResults, null, 2));
console.log(`\n========================================================================`);
console.log(`AUDIT TEST MATRIX COMPLETE`);
console.log(`Results saved to: ${jsonPath}`);
console.log(`========================================================================\n`);
