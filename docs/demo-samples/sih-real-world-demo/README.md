# TypeNull — Smart India Hackathon (SIH) Real-World Demonstration Pack

**Package Location:** `docs/demo-samples/sih-real-world-demo/`  
**Archive:** `docs/demo-samples/TypeNull_SIH_Real_World_Demo_Pack.zip`  
**Checksum Manifest:** `docs/demo-samples/TypeNull_SIH_Real_World_Demo_Pack_SHA256.txt`  
**Target Platform:** TypeNull AI Pre-Validation & Document Intelligence Platform  

---

## 1. Overview & Demonstration Purpose

This demonstration pack contains **23 curated document files** designed for live presentation at the **Smart India Hackathon (SIH)**. The pack equips presenters to demonstrate TypeNull’s automated pre-validation, optical document extraction, reference template comparison, and graceful edge-case handling across both **Applicant (Citizen)** and **Organisation (Officer Bulk Screening)** workflows.

### Demonstrator Safety & Data Protection Guarantee:
- **Zero Sensitive Personal Identifiable Information (PII):** Contains zero real individuals’ government identity cards, aadhaar copies, passports, or private records.
- **Authentic Government Proformas:** Blank forms downloaded directly from official departmental portals (`passportindia.gov.in`, `gstcouncil.gov.in`).
- **Simulated & Permitted Samples:** Completed samples utilize clearly marked fictional corporate entities (*NEXUS ENTERPRISES PRIVATE LIMITED*, CIN: `U72900KA2024PTC189201`).
- **Controlled Fault Injection:** Password encryption, corruption, and unreadable scans are isolated test fixtures designed to prove platform robustness.

---

## 2. Document Inventory & Checksum Matrix

| Directory / File | Category / Type | Size | Page Count | Known Password | SHA-256 Checksum | Origin / Source URL |
|---|---|---|---|---|---|---|
| `01_official_blank_forms/01_MEA_Passport_Annexure_E_Blank_Proforma.pdf` | Official Blank Proforma (PDF) | 85.9 KB | 1 | None | `adc35982c5055ee9...` | [Ministry of External Affairs (Passport Seva)](https://www.passportindia.gov.in/AppOnlineProject/pdf/AnnexureE.pdf) |
| `01_official_blank_forms/02_MEA_Passport_Annexure_A_Identity_Certificate.pdf` | Official Blank Proforma (PDF Table Layout) | 181.7 KB | 1 | None | `34efbf2cfb89b52c...` | [Ministry of External Affairs (Passport Seva)](https://www.passportindia.gov.in/AppOnlineProject/pdf/AnnexureA.pdf) |
| `01_official_blank_forms/03_MEA_Passport_Annexure_D_Minor_Consent.pdf` | Official Blank Proforma (PDF) | 79.2 KB | 1 | None | `adeb03fa6d27d243...` | [Ministry of External Affairs (Passport Seva)](https://www.passportindia.gov.in/AppOnlineProject/pdf/AnnexureD.pdf) |
| `01_official_blank_forms/04_MEA_Passport_Annexure_F_Lost_Passport.pdf` | Official Blank Proforma (PDF) | 241.6 KB | 1 | None | `6400a8bac63e2dec...` | [Ministry of External Affairs (Passport Seva)](https://www.passportindia.gov.in/AppOnlineProject/pdf/AnnexureF.pdf) |
| `01_official_blank_forms/05_MEA_Passport_Annexure_M_NOC.pdf` | Official Blank Proforma (PDF) | 164.0 KB | 1 | None | `98528935d95fa132...` | [Ministry of External Affairs (Passport Seva)](https://www.passportindia.gov.in/AppOnlineProject/pdf/AnnexureM.pdf) |
| `02_official_statutory_documents/06_MEA_The_Passports_Act_1967_Statutory_Publication.pdf` | Official Legislative Publication (PDF) | 218.6 KB | 14 | None | `32beb8cdcc5bd8ad...` | [Ministry of External Affairs (Gazette Authority)](https://www.passportindia.gov.in/AppOnlineProject/pdf/passports_act.pdf) |
| `02_official_statutory_documents/07_GST_Council_Constitution_101st_Amendment_Act.pdf` | Official Statutory Gazette Enactment (PDF) | 936.7 KB | 8 | None | `e9ead820f01eac25...` | [GST Council / Ministry of Finance](https://gstcouncil.gov.in/sites/default/files/2018-08/consti_amend_act_gst.pdf) |
| `03_completed_public_samples/08_Public_Completed_Redacted_Director_Declaration.pdf` | Completed Demonstration Sample (PDF - Zero PII) | 1.6 KB | 1 | None | `bd12b13cfde3389d...` | [Corporate Demonstration Fixture (Simulated Entity)](#) |
| `04_password_protected/09_Negative_Password_Protected_Confidential.pdf` | Encrypted PDF (RC4 40-bit / Standard Rev 2) | 0.9 KB | 1 | `Pass123` | `ad4900996f5386ff...` | [Fault-Injection Security Test Fixture](#) |
| `05_corrupted_files/10_Negative_Corrupted_Truncated_Byte_Stream.pdf` | Corrupted Byte Stream (Truncated / Missing EOF) | 0.1 KB | N/A | None | `66af97ec01c0cfa9...` | [Fault-Injection Robustness Fixture](#) |
| `06_unreadable_scans/11_Negative_Unreadable_Blank_Scan.png` | Blank Raster Image (PNG 100x100 - Zero Glyphs) | 0.2 KB | 1 | None | `0ad1631009051a4c...` | [OCR Fault-Injection Fixture](#) |
| `07_scanned_ocr_samples/12_Scanned_OCR_Municipal_Trade_Licence.png` | Scanned Document Image (PNG 600x800) | 50.5 KB | 1 | None | `ecdfcf244b5e5a82...` | [Municipal Trade Licence Simulation (BBMP Scope)](#) |
| `08_synthetic_authenticity_samples/applicant_reference_sample_pan.pdf` | Synthetic Reference PAN Card (PDF) | 1.1 KB | 1 | None | `41bafb05efcb6e50...` | [TypeNull Authenticity Engine Canonical Dataset](#) |
| `08_synthetic_authenticity_samples/applicant_altered_pan_copy.pdf` | Synthetic Altered PAN Copy (Font/Coordinate Tampering) | 1.1 KB | 1 | None | `3cc1f4298338c45b...` | [TypeNull Authenticity Adversarial Suite](#) |
| `08_synthetic_authenticity_samples/applicant_missing_field_pan.pdf` | Synthetic Incomplete PAN Card (Omitted DOB) | 1.0 KB | 1 | None | `eb7608b6347d5fca...` | [TypeNull Incompleteness Test Suite](#) |
| `08_synthetic_authenticity_samples/applicant_unknown_document.pdf` | Synthetic Uncatalogued Certificate (Non-Standard Layout) | 1.2 KB | 1 | None | `66249f6de8e4da38...` | [TypeNull Template Matching Test Suite](#) |
| `08_synthetic_authenticity_samples/applicant_unreadable_sample.pdf` | Synthetic Low-Contrast Degradation Sample (PDF) | 0.5 KB | 1 | None | `356f0c9761bcdf97...` | [TypeNull Quality Gating Test Suite](#) |
| `08_synthetic_authenticity_samples/organisation_reference_sample_gst.pdf` | Synthetic Reference GSTIN Certificate (PDF) | 1.2 KB | 1 | None | `8e7cc40fa972a45d...` | [TypeNull Authenticity Engine Canonical Dataset](#) |
| `08_synthetic_authenticity_samples/organisation_altered_gst_copy.pdf` | Synthetic Altered GST Certificate (Shifted Table Coordinates) | 1.2 KB | 1 | None | `9d14d25306b07a26...` | [TypeNull Authenticity Adversarial Suite](#) |
| `08_synthetic_authenticity_samples/organisation_malformed_qr.pdf` | Synthetic Corrupted QR Code Certificate (PDF) | 1.2 KB | 1 | None | `11c77031c003d0cb...` | [TypeNull Cryptographic QR Verification Suite](#) |
| `08_synthetic_authenticity_samples/organisation_missing_field.pdf` | Synthetic Incomplete GST Form (Missing Principal Place of Business) | 1.0 KB | 1 | None | `3aa2049dffac4f9e...` | [TypeNull Checklist Enforcement Suite](#) |
| `08_synthetic_authenticity_samples/organisation_unknown_document.pdf` | Synthetic Foreign Entity Certificate (Unapproved Schema) | 1.2 KB | 1 | None | `ff7f68980e7d5f13...` | [TypeNull Governance Boundary Suite](#) |
| `08_synthetic_authenticity_samples/organisation_supporting_declaration.pdf` | Synthetic Auxiliary Corporate Board Resolution (PDF) | 1.2 KB | 1 | None | `ff7f68980e7d5f13...` | [TypeNull Multi-Document Cross-Referencing Suite](#) |

---

## 3. SIH Demonstration Matrix: Scenarios, Expectations & Actual Results

| # | Demo Scenario | Sample File(s) | Expected Demonstration | Actual Verified TypeNull Result | Limitations & Presenter Notes |
|---|---|---|---|---|---|
| **1** | **Official Blank Form Gap Detection** | `01_official_blank_forms/01_MEA_Passport_Annexure_E_Blank_Proforma.pdf` | Demonstrates that template matching does NOT equal application approval. TypeNull matches the official MEA layout but identifies that applicant signature, deponent name, and date are unpopulated. | **VERIFIED PASS** — Engine extracts text, compares against template, and outputs `FIELD_MISSING` alerts with overall status **Minor / Major Issues Detected**. | Highlight to judges: *"TypeNull prevents premature submission of blank forms even when the form itself is 100% authentic."* |
| **2** | **Multi-Page Official Statutory Publication** | `02_official_statutory_documents/06_MEA_The_Passports_Act_1967_Statutory_Publication.pdf` (14 pages) | Demonstrates high-density vector text extraction across a multi-page legal gazette without browser freezing or memory exhaustion. | **VERIFIED PASS** — Successfully parses 14 pages of legal clauses and establishes document classification as legislative publication. | Not an application form itself; use to demonstrate TypeNull’s parser capacity on dense statutory text. |
| **3** | **Completed Corporate Sample** | `03_completed_public_samples/08_Public_Completed_Redacted_Director_Declaration.pdf` | Demonstrates complete field extraction: Director Identification Number (DIN: `08912345`), CIN, deponent name (*Suresh Kumar*), and compliance clauses. | **VERIFIED PASS** — Extracted DIN and CIN into normalized candidate dictionary; confirmed all required declaration clauses present. | Zero sensitive PII: Uses fictional entity (*NEXUS ENTERPRISES PRIVATE LIMITED*). |
| **4** | **Password-Protected Confidential PDF** | `04_password_protected/09_Negative_Password_Protected_Confidential.pdf` | Demonstrates that encrypted files do not crash the intake pipeline. TypeNull detects the standard RC4/AES `/Encrypt` dictionary, flags `password_protected`, and prompts for an unlocked copy. | **VERIFIED PASS** — Classified as `password_protected` with outcome **Unable to Assess**. Did not disrupt remaining files in batch. | **Known Password:** `Pass123`. State to judges: *"TypeNull protects officer privacy by refusing to brute-force encrypted attachments."* |
| **5** | **Corrupted Truncated Byte Stream** | `05_corrupted_files/10_Negative_Corrupted_Truncated_Byte_Stream.pdf` | Demonstrates fault tolerance against network drops or damaged uploads. Truncated byte stream without `startxref` / EOF is caught gracefully. | **VERIFIED PASS** — Caught non-fatally; individual applicant marked `failed` with outcome **Unable to Assess**, while remaining batch completed successfully. | Proves resilience: other applicant dossiers in the batch continue processing without interruption. |
| **6** | **Unreadable Blank Scan Image** | `06_unreadable_scans/11_Negative_Unreadable_Blank_Scan.png` | Demonstrates optical character recognition (OCR) bounding evaluation. A 100% white raster image with zero glyphs is flagged as unreadable. | **VERIFIED PASS** — Classified as `unreadable` scan. System prompts applicant to re-upload clear proof. | Distinguishes legibility from authenticity: zero text prevents false approvals. |
| **7** | **Scanned Municipal Licence (OCR Extraction)** | `07_scanned_ocr_samples/12_Scanned_OCR_Municipal_Trade_Licence.png` | Demonstrates Tesseract.js / Canvas raster OCR. Scanned BBMP Health & Trade Licence is parsed, extracting licence number (`BBMP-TR-2024-998124`) and ward. | **VERIFIED PASS** — Detected scanned raster, normalized whitespace and character substitutions, matched against municipal template. | High resolution (600x800) required for optimal character bounding. |
| **8** | **Tampered & Incomplete Synthetic Samples** | `08_synthetic_authenticity_samples/applicant_altered_pan_copy.pdf` & `organisation_missing_field.pdf` | Demonstrates coordinate drift, font substitution, and cross-record inconsistency detection against approved reference datasets. | **VERIFIED PASS** — Engine detects layout displacement and flagged missing statutory field (*Principal Place of Business*). | Demonstrates mathematical structural comparison ($Delta x, Delta y$ thresholds). |

---

## 4. Step-by-Step Live SIH Presentation Guide

### Option A: Local Evaluation Demo Mode (Recommended for Zero-Latency Stage Demos)
1. **Start TypeNull Locally:**
   ```bash
   npm run preview
   ```
   Open `http://localhost:4173/` in Google Chrome.

2. **Demonstrate Organisation Bulk Screening (`/officer`):**
   - In browser console, set demo role:
     ```javascript
     sessionStorage.setItem('typenull_demo_role', 'officer');
     location.href = '/officer';
     ```
   - Select Service Variant: **SPICe+ Company Incorporation (MCA-SPICE-INC32)** or **Passport Form 1 (MEA-PASS-FORM1)**.
   - **Upload Dossier 1:** Add `01_MEA_Passport_Annexure_E_Blank_Proforma.pdf` and `08_Public_Completed_Redacted_Director_Declaration.pdf`.
   - **Upload Dossier 2 (Edge Cases):** Add `09_Negative_Password_Protected_Confidential.pdf` and `10_Negative_Corrupted_Truncated_Byte_Stream.pdf`.
   - Click **"Screen All Applications"**.
   - **Show the Audience:**
     1. How Dossier 1 surfaces missing signatures on the blank proforma.
     2. How Dossier 2 isolates the encrypted file as `Unable to Assess` without crashing the rest of the batch.
     3. Click **"Export Batch (CSV)"** to show automated auditable records.

3. **Demonstrate Citizen Pre-Validation Wizard (`/applications/new`):**
   - In console: `sessionStorage.setItem('typenull_demo_role', 'applicant'); location.href = '/applications/new?serviceCode=MEA-PASS-FORM1';`
   - Show dynamic conditional questions (Minor applicant, Tatkaal expedited processing).
   - Answer "Yes" to Minor Applicant $ightarrow$ watch TypeNull automatically append **Annexure D (Parental Consent)** to the mandatory checklist!

---

### Option B: Live Cloud Deployment (`https://type-null-rho.vercel.app/`)
1. Open `https://type-null-rho.vercel.app/` on stage.
2. Demonstrate the Public Landing Page, Regulatory Technology positioning, and User Guides at `/guides`.
3. Click **"Sign In"** to show live production Supabase authentication gateway actively protecting government portals.

---

## 5. Integrity & Legal Boundaries

- **Validation $
e$ Authenticity:** TypeNull validates document structure, field completeness, and cross-record consistency. It assists officers by catching errors before submission; official legal issuance remains the sovereign prerogative of government authorities.
- **Reference Template Matching:** Compares geometry and field tags against approved schemas; does not claim direct cryptographic gateway handshake unless live department APIs are provisioned.
