# TypeNull SIH 2026: Applicant Module 1 Complete Testing Guide

**System Module:** Module 1 — Applicant Application Pre-Validation  
**Target Evaluation:** Smart India Hackathon 2026  
**Document Purpose:** Step-by-step instructions for testing and evaluating the applicant validation journey in TypeNull.

---

## 1. System Overview & Scope of Module 1

Module 1 empowers individual citizens, promoters, and business applicants to pre-validate their application dossiers against authoritative statutory guidelines *before* submitting them to official government portals (such as the Ministry of Corporate Affairs or GST Common Portal).

It verifies:
- Mandatory document presence and acceptable alternatives.
- Dynamic situational requirements triggered by conditional questionnaire responses.
- Regulatory syntax constraints on official identifiers (CIN, GSTIN, PAN).
- Cross-document consistency (e.g. GSTIN embedded PAN digits matching standalone PAN credentials, corporate name congruence).
- Temporal validity (issue dates and non-expired credentials).
- OCR scan quality and extraction confidence.

---

## 2. Step-by-Step Manual Testing Instructions

### Step 1: Start the Application Server
Open your terminal in the TypeNull repository root and start the Vite local development server:
```bash
npm run dev
```
By default, Vite serves the application on `http://localhost:5173`. Open this URL in Google Chrome, Safari, or Microsoft Edge.

To run the production build instead:
```bash
npm run build && npm run preview
```

---

### Step 2: Log In or Register Using Authentication Flow
1. Navigate to the Login route: `http://localhost:5173/login`.
2. **When Supabase is configured:**
   - Click **Create an Account** (`/register`) to register as an applicant with your email and password, or log in with existing credentials.
   - Upon authentication, `getRoleRedirectPath` directs applicants automatically to the applicant dashboard (`/dashboard`).
3. **When running in unconfigured / offline test mode:**
   - If your local `.env` lacks remote Supabase keys, the UI renders the informative configuration banner.
   - For offline evaluation without a live remote database, run the automated end-to-end applicant test suite (`npm test`), which exercises the complete client-side extraction, questionnaire reactivity, and validation engine in-memory.

---

### Step 3: Open the Government Applications Catalogue
1. From the Applicant Dashboard (`/dashboard`), click the **Explore Applications** button in the top action bar or the **Browse Catalogue** link in the dashboard banner.
2. Direct URL: `http://localhost:5173/applications/explore` (or `/applications/catalogue`).
3. Notice the search and filter toolbar:
   - Search bar: Type `SPICe+`, `GST`, or `Passport` to filter cards instantaneously.
   - Category filter pills: Filter by `Organisation Registration`, `Regulatory Application`, or `Certificate Verification`.
   - Coverage status pills: Switch between **All Coverages (6)**, **Validation Ready (3)**, **Under Review & Partial (2)**, and **Discovered Pipeline (1)**.

---

### Step 4: Select a Supported Application
1. Locate the **SPICe+ (INC-32) Company Registration** card (or **Form GST REG-01**).
2. Notice the card displays:
   - Authority: `Ministry of Corporate Affairs (MCA)`
   - Variant Code: `MCA-SPICE-INC32`
   - Status Badge: `Validation Ready` (Emerald badge with `ShieldCheck` icon).
   - Document Checklist preview: `2 Mandatory`, `2 Conditional`, `1 Alternative`, `2 Questions`.
3. Click **View Details** to open the inspection modal:
   - Review **What TypeNull Can Check** vs **What TypeNull Cannot Check**.
   - Notice the direct link to the official government portal (`mca.gov.in`).
4. Click **Start Validation** on the card or in the modal. You are redirected to `/applications/new`.

*(Note: If you view unverified applications such as DIR-3 or TM-A, notice that the "Start Validation" button is intentionally disabled and displays "Validation Unavailable", strictly enforcing TypeNull's publication safeguard).*

---

### Step 5: Answer the Situational Conditional Questions
In the **Prepare Application Dossier** screen (`/applications/new`):
1. Notice that the application title, receiving department, jurisdiction, and category are auto-populated from the catalogue.
2. Scroll to the **Situational Questionnaire (Dynamic Requirements)** section:
   - Question 1: *"Are the proposed registered office premises leased or rented?"*
     - Default: **No**.
     - Toggle to **Yes**.
     - **Observe Live Reactivity:** The **Personalized Document Checklist** preview immediately updates, dynamically adding:
       - `Commercial Premise Lease Deed & Owner NOC` (Triggered by: `is_rented_premise == 'yes'`).
   - Question 2: *"Is one or more of the promoters an existing corporate body or foreign entity?"*
     - Toggle to **Yes** to observe dynamic activation of `Board Resolution for Authorised Signatory`.

---

### Step 6: Create and Save the Dossier
1. Review the declared company title (e.g. `Sharma Innovations Technologies Private Limited`).
2. Click **Create Application Dossier & Receive Checklist**.
3. The application dossier is created, and you are navigated to the dossier details view: `/applications/:id`.

---

### Step 7: Locate the Synthetic Demonstration Sample Files
All synthetic demonstration files are stored in the repository under:
```
docs/demo-samples/
```
The files are organized into dedicated scenario folders:
- Complete Application: `docs/demo-samples/scenario-1-complete/`
- Missing Document: `docs/demo-samples/scenario-2-missing-doc/`
- Inconsistent Documents: `docs/demo-samples/scenario-3-inconsistent/`
- Poor-Quality Scan: `docs/demo-samples/scenario-4-poor-quality/`

---

### Step 8: Upload the Sample Application and Supporting Documents
> [!NOTE]
> **Document Upload Mechanism**: In TypeNull, documents in an applicant dossier are uploaded individually through the secure upload modal (`DocumentUploadModal`), assigning each file to its regulatory category (`registration_certificate`, `identity_document`, `address_proof`, `tax_financial_document`, etc.).

1. On the dossier page (`/applications/:id`), scroll to the **Submitted Documents & Evidence** section.
2. Click **Upload Document**.
3. In the upload modal:
   - Select Document Category: `identity_document`.
   - Choose file: Select `director_pan_card_aarav_sharma.pdf` from `docs/demo-samples/scenario-1-complete/`.
   - Click **Upload & Ingest Document**.
4. Repeat for the remaining files:
   - `certificate_of_incorporation_moa_aoa.pdf` $\to$ Category: `registration_certificate`.
   - `registered_office_electricity_bill.pdf` $\to$ Category: `address_proof`.
5. For each uploaded document, click **Extract Data** to trigger in-browser WebAssembly OCR (Tesseract.js) and PDF stream extraction.
   - Review candidate extracted fields (e.g. CIN `U72900KA2024PTC189201`, PAN `ABCDE1234F`).
   - Click **Accept & Save Extraction**.

---

### Step 9: Run the Pre-Validation Engine
1. Scroll down to the **Pre-Validation Compliance Screening** section.
2. Click the primary button: **Run Pre-Validation Engine**.
3. The engine evaluates:
   - Document checklist against personalized conditional requirements.
   - Regex syntax patterns for statutory identifiers.
   - Temporal sequence of issue and expiry dates.
   - Token congruence across documents.

---

### Step 10: Inspect Categorized Findings
Inspect the validation summary and categorized finding tabs:
1. **Outcome Card:** Displays the advisory determination:
   - **No Configured Validation Issues Detected** (`Complete`): All checks satisfied.
   - **Submission Blockers Detected** (`Major Issues`): Missing mandatory documents or cross-document divergence.
   - **Minor Issues Detected** (`Minor Issues`): Formatting nuances or low text density.
   - **Pre-Validation Pending** (`Unable to Assess`): Scans unreadable or mandatory proofs missing.
2. **Advisory Disclaimer:** Notice the prominent banner clarifying that automated pre-validation does not guarantee statutory approval or constitute legal certification.
3. **Categorized Tabs:** Click through the finding categories:
   - `Missing Mandatory Documents`: Flags omitted non-derogable proofs.
   - `Cross-Document Inconsistencies`: Side-by-side comparison of observed vs expected values.
   - `Date & Format Issues`: Regex syntax violations and expired credentials.
   - `Extraction & OCR Quality Review`: Low-density scans and OCR notes.

---

### Step 11: Change a Document or Field
To simulate an applicant correcting an issue:
1. Delete a document or click **Upload Document** to add a new document.
2. Or edit an extracted field value in the **Extracted Dossier Intelligence** section.

---

### Step 12: Confirm Stale-Result Invalidation Banner
1. Immediately upon adding a document or changing an extracted field, observe the pre-validation section.
2. The engine computes a real-time MD5/token fingerprint over all documents, timestamps, and extracted fields.
3. An amber **Results Stale Invalidation Banner** appears:
   > *"Dossier modified: New documents or field values have been recorded since the last validation run. Refresh pre-validation to update compliance status."*

---

### Step 13: Revalidate
1. Click **Refresh Pre-Validation** (or **Re-Run Pre-Validation**).
2. The engine re-executes against the updated dossier state.
3. The invalidation banner dismisses, and the fresh findings are displayed.

---

### Step 14: Compare Findings with Scenario Manifests
Compare your results with the scenario manifests in `docs/demo-samples/`:
- **Scenario 1 (Complete):** Expect outcome `Complete` with 0 major issues and 0 minor issues.
- **Scenario 2 (Missing Doc):** Expect outcome `Major Issues` with blocking error `GOV-REQ-PAN_CARD`.
- **Scenario 3 (Inconsistent):** Expect outcome `Major Issues` with blocking errors `XDOC-GST-PAN-ALIGN` and `XDOC-NAME-ALIGN`.
- **Scenario 4 (Poor-Quality):** Expect outcome `Unable to Assess` with warning `OCR-QUAL-LOW`.

---

### Step 15: Distinguish Engine Defects vs Unsupported Requirements
When evaluating engine findings:
1. **Genuine Engine Defect:**
   - A document matching an accepted alternative is uploaded and classified correctly, but the engine reports it as missing.
   - A valid regex format (such as standard 21-digit CIN) is falsely flagged as a format discrepancy.
   - Identical names fail the $\ge 75\%$ token congruence check.
2. **Unsupported or Unverified Requirement:**
   - Auxiliary schedules not yet configured in the Knowledge Base (e.g., AGILE-PRO-S bank opening forms).
   - Rules on unverified application variants (e.g., consular apostille requirements on DIR-3).
   - In accordance with TypeNull governance, unverified rules are never claimed as supported.
