var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// scripts/build_real_world_test_corpus.ts
import fs from "fs";
import path from "path";
var CORPUS_DIR = path.resolve("test_corpus/real_world_public");
if (!fs.existsSync(CORPUS_DIR)) {
  fs.mkdirSync(CORPUS_DIR, { recursive: true });
}
var officialMappings = {
  "AnnexureE.pdf": "01_MEA_Passport_Annexure_E_Blank_Proforma.pdf",
  "AnnexureA.pdf": "02_MEA_Passport_Annexure_A_Identity_Certificate.pdf",
  "AnnexureD.pdf": "03_MEA_Passport_Annexure_D_Minor_Consent.pdf",
  "AnnexureF.pdf": "04_MEA_Passport_Annexure_F_Lost_Passport.pdf",
  "AnnexureM.pdf": "05_MEA_Passport_Annexure_M_NOC.pdf",
  "passports_act.pdf": "06_MEA_The_Passports_Act_1967_Statutory_Publication.pdf",
  "consti_amend_act_gst.pdf": "07_GST_Council_Constitution_101st_Amendment_Act.pdf"
};
for (const [orig, standardized] of Object.entries(officialMappings)) {
  const origPath = path.join(CORPUS_DIR, orig);
  const targetPath = path.join(CORPUS_DIR, standardized);
  if (fs.existsSync(origPath) && !fs.existsSync(targetPath)) {
    fs.copyFileSync(origPath, targetPath);
    console.log(`Standardized: ${orig} -> ${standardized}`);
  }
}
function createStandardPdf(lines) {
  let streamContent = "BT\n/F1 10 Tf\n50 750 Td\n15 TL\n";
  for (const line of lines) {
    const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    streamContent += `(${escaped}) '
`;
  }
  streamContent += "ET\n";
  const streamBytes = Buffer.from(streamContent, "utf-8");
  let out = "%PDF-1.4\n";
  const offsets = [];
  offsets.push(out.length);
  out += "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  offsets.push(out.length);
  out += "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  offsets.push(out.length);
  out += "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n";
  offsets.push(out.length);
  out += "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
  offsets.push(out.length);
  out += `5 0 obj
<< /Length ${streamBytes.length} >>
stream
`;
  out += streamContent;
  out += "endstream\nendobj\n";
  const startxref = out.length;
  out += "xref\n0 6\n";
  out += "0000000000 65535 f \n";
  for (const off of offsets) {
    out += off.toString().padStart(10, "0") + " 00000 n \n";
  }
  out += `trailer
<< /Size 6 /Root 1 0 R >>
startxref
${startxref}
%%EOF
`;
  return Buffer.from(out, "latin1");
}
var completedDeclarationLines = [
  "ANNEXURE \u2018E\u2019",
  "SPECIMEN DECLARATION OF THE APPLICANT ON A PLAIN PAPER",
  "(PUBLIC COMPLETED DEMONSTRATION SAMPLE \u2014 ZERO SENSITIVE PII)",
  "",
  "I, SURESH KUMAR (name), son of Shri RAMESH KUMAR",
  "residing at 128 MG ROAD, INDIRANAGAR, BANGALORE 560038",
  "holding Director Identification Number (DIN) 08912345, designated representative of",
  "NEXUS ENTERPRISES PRIVATE LIMITED (CIN: U72900KA2024PTC189201)",
  "hereby solemnly affirm and declare as under:",
  "",
  "1. That I am a citizen of India.",
  "2. That I have not been convicted by any Court in India during five years preceding application.",
  "3. That no proceedings in respect of an offence alleged to have been committed by me",
  "   are pending before any criminal court in India.",
  "4. That no warrant or summons for my appearance or arrest has been issued by a Court.",
  "5. That I have not applied for or obtained another Indian passport.",
  "",
  "Date: 15/07/2024",
  "Place: Bangalore, Karnataka",
  "Deponent: Suresh Kumar",
  "Designation: Managing Director"
];
var completedDocPath = path.join(CORPUS_DIR, "08_Public_Completed_Redacted_Director_Declaration.pdf");
fs.writeFileSync(completedDocPath, createStandardPdf(completedDeclarationLines));
console.log("Created: 08_Public_Completed_Redacted_Director_Declaration.pdf");
function createPasswordProtectedPdf() {
  let streamContent = "BT\n/F1 12 Tf\n50 700 Td\n16 TL\n(CONFIDENTIAL STATUTORY ENCRYPTED DOCUMENT) '\n(Password Required: Pass123) '\nET\n";
  const streamBytes = Buffer.from(streamContent, "utf-8");
  let out = "%PDF-1.4\n";
  const offsets = [];
  offsets.push(out.length);
  out += "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  offsets.push(out.length);
  out += "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  offsets.push(out.length);
  out += "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n";
  offsets.push(out.length);
  out += "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n";
  offsets.push(out.length);
  out += `5 0 obj
<< /Length ${streamBytes.length} >>
stream
${streamContent}endstream
endobj
`;
  offsets.push(out.length);
  out += "6 0 obj\n<< /Filter /Standard /V 1 /R 2 /O <28BF4E5E4E758A4164004E56FFFA010828BF4E5E4E758A4164004E56FFFA0108> /U <28BF4E5E4E758A4164004E56FFFA010828BF4E5E4E758A4164004E56FFFA0108> /P -4 >>\nendobj\n";
  const startxref = out.length;
  out += "xref\n0 7\n";
  out += "0000000000 65535 f \n";
  for (const off of offsets) {
    out += off.toString().padStart(10, "0") + " 00000 n \n";
  }
  out += `trailer
<< /Size 7 /Root 1 0 R /Encrypt 6 0 R /ID [<1234567890abcdef1234567890abcdef> <1234567890abcdef1234567890abcdef>] >>
startxref
${startxref}
%%EOF
`;
  return Buffer.from(out, "latin1");
}
var encryptedDocPath = path.join(CORPUS_DIR, "09_Negative_Password_Protected_Confidential.pdf");
fs.writeFileSync(encryptedDocPath, createPasswordProtectedPdf());
console.log("Created: 09_Negative_Password_Protected_Confidential.pdf");
var corruptedDocPath = path.join(CORPUS_DIR, "10_Negative_Corrupted_Truncated_Byte_Stream.pdf");
var corruptedBytes = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] TRUNCATED_UNEXPECTED_EOF_ERROR_BYTE_CORRUPTION_DATA", "latin1");
fs.writeFileSync(corruptedDocPath, corruptedBytes);
console.log("Created: 10_Negative_Corrupted_Truncated_Byte_Stream.pdf");
var blankPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6AoPFy4E1v+vLwAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAAO0lEQVR42u3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwDkG3QABeX6K0wAAAABJRU5ErkJggg==";
var blankScanPath = path.join(CORPUS_DIR, "11_Negative_Unreadable_Blank_Scan.png");
fs.writeFileSync(blankScanPath, Buffer.from(blankPngBase64, "base64"));
console.log("Created: 11_Negative_Unreadable_Blank_Scan.png");
function generateSimulatedScanPng() {
  const svgContent = `
  <svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" style="background:#fefefe;">
    <rect width="600" height="800" fill="#ffffff" />
    <rect x="20" y="20" width="560" height="760" fill="none" stroke="#222222" stroke-width="2" />
    <text x="300" y="60" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold">BRUHAT BENGALURU MAHANAGARA PALIKE</text>
    <text x="300" y="85" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold">HEALTH AND TRADE LICENCE REGISTRATION</text>
    <text x="300" y="105" text-anchor="middle" font-family="Arial" font-size="11" fill="#444444">Under Section 353 of Karnataka Municipal Corporations Act, 1976</text>
    
    <line x1="40" y1="120" x2="560" y2="120" stroke="#000000" stroke-width="1"/>
    
    <text x="50" y="150" font-family="Arial" font-size="12" font-weight="bold">Licence Number:</text>
    <text x="220" y="150" font-family="Courier" font-size="13" font-weight="bold">BBMP-TR-2024-998124</text>
    
    <text x="50" y="180" font-family="Arial" font-size="12" font-weight="bold">Trade / Establishment Name:</text>
    <text x="220" y="180" font-family="Arial" font-size="12">NEXUS ENTERPRISES PRIVATE LIMITED</text>
    
    <text x="50" y="210" font-family="Arial" font-size="12" font-weight="bold">Business Type / Nature:</text>
    <text x="220" y="210" font-family="Arial" font-size="12">Information Technology &amp; Computer Software Consultancy</text>
    
    <text x="50" y="240" font-family="Arial" font-size="12" font-weight="bold">Ward &amp; Jurisdiction:</text>
    <text x="220" y="240" font-family="Arial" font-size="12">Ward 112, East Zone, Bengaluru Urban</text>
    
    <text x="50" y="270" font-family="Arial" font-size="12" font-weight="bold">Premise Address:</text>
    <text x="220" y="270" font-family="Arial" font-size="12">No. 128 MG Road, Indiranagar, Bangalore 560038</text>
    
    <text x="50" y="300" font-family="Arial" font-size="12" font-weight="bold">Date of Validity:</text>
    <text x="220" y="300" font-family="Courier" font-size="12">01/04/2024 to 31/03/2025</text>
    
    <rect x="40" y="340" width="520" height="100" fill="#f8f9fa" stroke="#cccccc"/>
    <text x="55" y="365" font-family="Arial" font-size="11" font-weight="bold">Statutory Compliance Conditions:</text>
    <text x="55" y="385" font-family="Arial" font-size="10" fill="#333333">1. Must adhere to Karnataka Municipal Corporation hygiene and safety standards.</text>
    <text x="55" y="405" font-family="Arial" font-size="10" fill="#333333">2. Subject to annual renewal before 31st March under standard prescribed statutory fee.</text>
    
    <text x="420" y="520" text-anchor="middle" font-family="Arial" font-size="11" font-weight="bold">Medical Officer of Health</text>
    <text x="420" y="535" text-anchor="middle" font-family="Arial" font-size="10">BBMP East Zone</text>
    <text x="420" y="550" text-anchor="middle" font-family="Courier" font-size="9" fill="#006600">[DIGITALLY APPROVED]</text>
  </svg>
  `;
  const svgPath = path.join(CORPUS_DIR, "temp_trade_licence.svg");
  const pngPath = path.join(CORPUS_DIR, "12_Scanned_OCR_Municipal_Trade_Licence.png");
  fs.writeFileSync(svgPath, svgContent);
  try {
    const { execSync } = __require("child_process");
    execSync(`sips -s format png "${svgPath}" --out "${pngPath}"`, { stdio: "pipe" });
    fs.unlinkSync(svgPath);
  } catch (err) {
    console.warn("sips conversion notice:", err);
  }
  return fs.readFileSync(pngPath);
}
try {
  generateSimulatedScanPng();
  console.log("Created: 12_Scanned_OCR_Municipal_Trade_Licence.png");
} catch (e) {
  console.error("Notice on simulated scan png:", e);
}
console.log("\n================================================================");
console.log("REAL-WORLD TEST CORPUS ASSEMBLED SUCCESSFULLY");
console.log("================================================================\n");
var allFiles = fs.readdirSync(CORPUS_DIR).sort();
allFiles.forEach((f, idx) => {
  const stat = fs.statSync(path.join(CORPUS_DIR, f));
  console.log(`${(idx + 1).toString().padStart(2, " ")}. ${f} (${(stat.size / 1024).toFixed(1)} KB)`);
});
