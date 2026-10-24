# TypeNull SIH 2026: Official Demonstration Walkthrough & Evaluator Guide

**Track:** Smart India Hackathon (SIH 2026)  
**Problem Statement:** AI-Powered Application Validation, Document Authentication and Regulatory Compliance Verification  
**Evaluation Checkpoint:** `sih-demo-responsive-final`  
**Application Architecture:** React 18, Vite 6, TypeScript, Tailwind CSS, Supabase (Auth, PostgreSQL, Storage), Client-side WebAssembly OCR (Tesseract.js), PDF text stream parser  

---

## 1. System Scope, Positioning & Advisory Disclaimers

### 1.1 What TypeNull Is
TypeNull is an **intelligent pre-validation and cross-document discrepancy screening system** designed for two distinct audiences:
1. **Applicants**: Pre-validate application dossiers against configured statutory requirements *prior* to official filing, catching missing proofs, cross-document inconsistencies (such as GSTIN-PAN mismatches or corporate name discrepancies), and expired credentials early.
2. **Authorised Organisations / Evaluating Officers**: Rapidly screen incoming batches of received applications against configured statutory guidelines using automated document intelligence and cross-document comparison.

### 1.2 What TypeNull Does Not Claim
- **No Guarantee of Official Filing Approval**: Pre-validation determinations are advisory. They indicate whether an application satisfies the rules configured in TypeNull's knowledge base. Official statutory approval remains the exclusive authority of government bodies (e.g. Ministry of Corporate Affairs, Central Board of Indirect Taxes and Customs).
- **Proportionate Outcome Language**: When all configured checks pass, TypeNull displays **"No Configured Validation Issues Detected"** rather than exaggerating with "Ready for Official Filing" or "Government Approved".
- **Evidence-Gated Assessment**: TypeNull never awards an issue-free outcome if documents are missing or if mandatory checks could not be assessed (`unable_to_check`).
- **Privacy-Preserving Ingestion**: Private documents are stored in private Supabase Storage buckets with 15-minute signed URL tokens and Row-Level Security (RLS). Optical character recognition executes client-side via WebAssembly; unencrypted document payloads are never broadcast to public cloud endpoints.

---

## 2. End-to-End Demonstration Walkthrough (5–7 Minutes)

### Phase 1: Explore & Select Authoritative Government Service
1. **Navigate to Catalogue**: Log in as an Applicant and navigate to `/applications/explore` (or click **Explore Applications** from the dashboard).
2. **Inspect Catalogue Cards**:
   - Notice verified government applications:
     - **SPICe+ Company Incorporation (INC-32)** (Ministry of Corporate Affairs)
     - **GST Registration (GST REG-01)** (CBIC)
     - **Passport Application (Form 1)** (Ministry of External Affairs)
   - Notice cards show authoritative department titles, central/state jurisdiction, and requirements previews (Mandatory, Conditional, Alternative).
   - Test search bar: Type `SPICe+` or `Corporate` to demonstrate instant keyword filtering.
   - Test category filter pills: Select `Regulatory Application` to isolate GST REG-01.
3. **Select Application**: Click **Select & Pre-Fill Dossier** on **SPICe+ Company Incorporation (Form INC-32)**.

### Phase 2: Dynamic Questionnaire & Tailored Checklist Reaction
1. **Observe Auto-Populated Fields**: The dossier title, receiving department (`Ministry of Corporate Affairs`), category (`Organisation Registration`), and jurisdiction (`India`) are pre-filled directly from the published registry.
2. **Interact with Situational Questionnaire**:
   - Locate the question: *"Is the proposed registered office premises owned by the applicant or taken on lease/rent?"*
   - Change the answer from **No** to **Yes**.
   - **Observe Reactivity**: The **Personalized Document Checklist** preview immediately updates in real-time, activating the conditional requirement:
     - `Lease Deed / Rent Agreement with Owner NOC` (Triggered by: `is_rented_premise = yes`).
3. **Create Dossier**: Click **Create Dossier & Receive Checklist**. The application is created and persists in PostgreSQL.

### Phase 3: Document Upload & Client-Side Intelligence (OCR)
1. **Upload Verification Credentials**:
   - In the dossier view (`/applications/:id`), click **Upload Document**.
   - Upload or drag-and-drop sample PDF documents or capture physical proofs with camera.
   - Supported categories include: Registration Certificate, Identity Document (PAN / Aadhaar), Address Proof / Deed, Tax / Financial Statement.
2. **Execute Document Intelligence**:
   - For an uploaded document, click **Extract Data**.
   - Watch the in-browser pipeline execute Tesseract.js OCR WASM and PDF stream parsing.
   - Review candidate extracted fields (e.g. CIN, PAN, GSTIN, Entity Name, Issue Dates) with confidence scores and document provenance snippets.
   - Confirm or edit any extracted values to establish human-verified ground truth.

### Phase 4: Run Pre-Validation & Scrutinize Categorized Findings
Click **Run Pre-Validation Engine** in the pre-validation section.

#### Scenario 1: Missing Mandatory Document (Statutory Defect)
- **Condition**: Uploaded Lease Agreement and Electricity Bill, but left out Director Identity Proof (PAN Card).
- **Result**: Pre-validation outcome evaluates to **Major Issues**.
- **Categorization**: Under the `Missing Mandatory Documents` tab, a blocking statutory defect is reported:
  - *Rule DOC-REQ-IDENTITY_DOCUMENT: Mandatory Document Missing: Identity Document (PAN / Aadhaar)*.
  - The explanation clearly advises: *"This requirement is non-derogable under MCA guidelines."*

#### Scenario 2: Uploading Document Satisfies Requirement & Invalidation Banner
- **Action**: Click **Upload Document**, upload `director_pan_card.pdf`, and extract its fields.
- **Observe Invalidation**: The pre-validation section immediately detects document count / timestamp change and renders the **Results Stale Invalidation Banner**:
  - *"New documents have been added since this validation was recorded."*
- **Revalidate**: Click **Refresh Pre-Validation**.
- **Result**: The missing document finding is resolved and cleared.

#### Scenario 3: Cross-Document Inconsistency (GSTIN-PAN Mismatch & Name Divergence)
- **Condition**: Upload a GST Certificate where the GSTIN embeds a divergent PAN (e.g., GSTIN `27BBBCB9876B1Z2` vs standalone PAN `AAACA1234A`) or where the entity name diverges (`Acme Innovations Private Limited` vs `Apex Global Dynamics Limited`).
- **Result**: Pre-validation flags **Major Issues**.
- **Categorization**: Grouped under `Cross-Document Inconsistencies`:
  - *Rule XDOC-GST-PAN-ALIGN: GSTIN Embedded PAN Mismatch*.
  - *Rule XDOC-NAME-ALIGN: Entity Name Divergence Across Documents*.
  - Observed vs Expected comparison side-by-side demonstrates automated discrepancy identification across separate files.

#### Scenario 4: Corrected Input & Revalidation Refresh
- **Action**: Correct the document or input to congruent values.
- **Revalidate**: Click **Refresh Pre-Validation**.
- **Result**: Outcome transitions to **"No Configured Validation Issues Detected"**.
- **Advisory Banner**: The disclaimer explicitly reinforces that statutory filing approval remains with the respective authority.

### Phase 5: Organisation Bulk Application Screening (Officer Workspace)
1. **Switch Role**: Access the Officer Workspace (`/workspace/officer`).
2. **Bulk Intake**:
   - Select regulatory category (e.g., `Organisation Registration`).
   - Ingest an intake folder or ZIP archive containing multiple applicant dossiers.
   - Observe in-browser safe archive extraction with path-traversal sanitization (`../` blocking) and 15MB bounded download limits.
3. **Execute Bulk Screening**:
   - Click **Screen All Applications**.
   - Real-time progress bar monitors individual applicant dossier evaluation.
4. **Inspect Screening Results Queue**:
   - Standardized 4-KPI outcome cards: **1. Complete**, **2. Minor Issues**, **3. Major Issues**, **4. Unable to Assess**.
   - Filter items by clicking any KPI card or search by applicant identifier.
   - On handheld mobile devices (< 768px), applicants render as compact responsive stacked cards.
   - On desktop, applicants render as an authoritative 6-column screening table.
   - Click **Inspect Evidence** on any applicant to open the full inspection drawer, reviewing received files, rule determinations, and statutory citations.
5. **Export Report**: Click **Export Screening Report (CSV)** to generate an audit-ready compliance spreadsheet.

### Phase 6: Admin Governance & Discovery Ingestion Pipeline
1. **Access Admin Console**: Navigate to `/admin` as an Administrator.
2. **User Accounts & RBAC**:
   - View registered user profiles.
   - Assign Officer or Administrator clearance using trusted server RPC triggers (preventing client-side self-promotion).
   - Mobile stacked cards allow one-tap role management on handheld devices.
3. **Form Discovery & Ingestion**:
   - Open **Form Ingestion & Review**.
   - Review official source registry (.gov.in / .nic.in domain boundaries enforced).
   - Inspect discovered forms and their lifecycle status (`discovered` &rarr; `downloaded` &rarr; `extracted` &rarr; `needs_verification` &rarr; `verified` &rarr; `published`).
   - Only forms marked **Published** by an administrator are exposed in the Applicant Catalogue, preventing unverified or draft rules from impacting applicant pre-validation.

---

## 3. Mobile-First Responsive UI Verification Matrix

| Viewport Width | Tested Device | UI Adaptation Verified |
| :--- | :--- | :--- |
| **320px** | iPhone SE (1st gen) | No horizontal page scrolling; single-column stacked cards for Applications, Documents, and Users; touch targets &ge; 40px; full-width action buttons. |
| **375px / 390px** | iPhone 13/14/15/16, Pixel 8 | Form inputs use `text-base md:text-sm` (preventing iOS Safari auto-zoom); modals scroll cleanly inside 92vh height; tabs scroll horizontally without breaking layout. |
| **768px** | iPad Mini / Air (portrait) | 2-column card grids for catalogue and questionnaires; compact header with search filters; responsive drawer navigation. |
| **1024px** | iPad Pro / Small Laptop | Persistent sidebar navigation; multi-column metadata grids; side-by-side inspection layouts. |
| **1440px** | Large Desktop | Centered max-width containers (`max-w-6xl mx-auto`); full 6-column data tables with sort/filter controls. |

---

## 4. Test Suite & Verification Summary

All verification tests can be executed locally with:
```bash
npm test
npm run build
```

- **Test Suite Results**: 223/223 automated unit and scenario tests passing (100% pass rate).
- **TypeScript & Vite Build**: Compiles cleanly in ~2.5s with zero errors.
- **Git Commit Checkpoint**: Tagged as `sih-demo-responsive-final`.
