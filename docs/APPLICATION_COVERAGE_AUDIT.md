# TypeNull SIH 2026: Application Coverage Audit & Knowledge Base Mapping

**Evaluation Checkpoint:** `sih-demo-responsive-final`  
**System Module:** Module 1 — Applicant Application Pre-Validation  
**Audit Date:** October 24, 2026  
**Audited Against:** Codebase commit `78003cb`, Supabase migration files `001` through `007`, source registry `sourceRegistry.ts`, and official government source repositories.

---

## 1. Executive Summary & Environmental Data Sources

This audit establishes the ground truth regarding government application support within TypeNull. In TypeNull, an application’s presence in a catalogue or registry does **not** imply that it is ready for end-to-end statutory validation. We strictly distinguish between:
1. **Discovered**: An official government form, service code, or gazette URL identified by the ingestion crawler.
2. **Under Review / Partial**: Structured requirements or document lists extracted, but lacking administrative or officer verification.
3. **Published & Validation-Ready**: Authoritative statutory requirements verified by designated panels against official rules, with active conditional questions, regex format rules, document checklists, and cross-document verification algorithms.

### 1.1 Data Source Architecture by Environment

TypeNull is engineered with dual-mode data retrieval to guarantee zero failure during local demonstration, offline testing, and cloud production:

| Environment | Primary Data Source | Fallback / In-Memory Source | Operational Semantics |
| :--- | :--- | :--- | :--- |
| **Cloud Production (Live Supabase)** | Supabase PostgreSQL tables: `government_services`, `service_application_types`, `government_sources`, `official_documents_catalog`, and `application_document_requirements`. | In-memory registry (`CANDIDATE_GOVERNMENT_SERVICES`) if database connection experiences transient network timeout. | Reads live published variants via PostgreSQL RLS policies (`lifecycle_status = 'published'`). Mutations strictly restricted to role `'administrator'`. |
| **Local Staging / Development (`.env` configured)** | Local Supabase Docker / CLI instance with migrations `001` through `007` applied. | In-memory candidate registry. | Supports live document uploads to local Supabase Storage (`application-documents`), asynchronous OCR, and PostgreSQL persistence. |
| **Local Demonstration / Sandbox (`.env` unconfigured)** | `src/services/ingestion/ingestionService.ts` (`CANDIDATE_GOVERNMENT_SERVICES` runtime state). | `src/services/knowledgeBase.ts` (`KNOWLEDGE_BASE_REGISTRY`). | Fully self-contained. Generates synthetic dossiers, renders dynamic conditional questionnaires, executes in-browser WebAssembly OCR/PDF parsing, and executes the shared validation engine with 100% feature fidelity. |

---

## 2. Authoritative Government Application Coverage Audit Table

The table below audits all registered, seeded, and discovered government applications across TypeNull:

| Application Name | Form Number | Authority | Catalogue Status | Official Source | Form Availability | Document Checklist | Filling Rules | Conditional Requirements | Validation Rules Implemented | Verification Status | Missing Information / Statutory Gaps |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SPICe+ Company Registration** | INC-32 (Part A & B) | Ministry of Corporate Affairs (MCA) | **Published** | [mca.gov.in (SPICe+)](https://www.mca.gov.in/MinistryV2/incorporation_company.html) | Available (e-Form on MCA portal & Companies Act Rules) | **Complete** (5 rules: PAN, MOA/AOA, Address Proof, Lease/NOC, Board Resolution) | **Complete** (CIN regex, Entity Name, Issue Date, Address) | **Configured & Verified** (2 questions: `is_rented_premise`, `has_corporate_promoter`) | Mandatory doc checks, utility bill alternative group, CIN syntax, Name alignment, Date order | **Verified** (National Registrar Clearance Committee) | Integrated AGILE-PRO-S (EPFO, ESIC, Professional Tax, Bank Account opening) auxiliary schedules not assessed in initial pre-check. |
| **GST New Registration** | Form GST REG-01 | Central Board of Indirect Taxes and Customs (CBIC) | **Published** | [cbic.gov.in (CGST Act)](https://www.cbic.gov.in/resources//htdocs-cbec/gst/cgst-act.pdf) | Available (CGST Rules 2017 & GST Portal) | **Complete** (4 rules: PAN, Constitution Proof, Principal Place of Business, Bank Statement) | **Complete** (GSTIN 15-char regex, Legal Name, Date of Liability) | **Configured & Verified** (1 question: `opt_composition_scheme` activates CMP-01 declaration) | Mandatory doc checks, alternative constitution proofs, GSTIN regex, Cross-doc GSTIN-embedded PAN match, Entity Name token congruence | **Verified** (Indirect Tax Advisory Directorate) | Special Economic Zone (SEZ) developer documentation, multi-state branch matrices not yet individually parsed. |
| **Passport Ordinary Application** | Form No. 1 | Ministry of External Affairs (MEA) | **Published** | [passportindia.gov.in](https://www.passportindia.gov.in/AppOnlineProject/online/faqPassportAct) | Available (Official MEA PDF Form 1 & Annexures) | **Complete** (3 rules: DoB Proof, Residential Address, Tatkaal Verification Proof) | **Complete** (Applicant Name, Passport ID, Issue Date, Expiry Date) | **Configured & Verified** (1 question: `application_mode == 'tatkaal'` activates Tatkaal Annexure Verification) | Alternative DoB proofs (Birth Cert, School Leaving, PAN), Address proofs (Aadhaar, Utility, Rent), Temporal validity (expiry > now), Cross-doc Name match | **Verified** (Consular Services Document Standards Panel) | Minor applicant parental consent (Annexure D), Government servant prior intimation (Annexure H), Lost passport FIR affidavits. |
| **eForm DIR-3 (DIN Allotment)** | Form DIR-3 | Ministry of Corporate Affairs (MCA) | **Under Review** (`needs_verification`) | [mca.gov.in (DIR-3)](https://www.mca.gov.in/MinistryV2/dir-3.html) | Available (MCA e-Form DIR-3 under Sec 153) | **Partial** (3 candidate rules: Photo & ID proof, Proof of Residence, DSC Class 3) | **Partial** (DIN format `^[0-9]{8}$`, applicant name, residential address) | **Pending Review** (`is_foreign_national` activating consular apostille) | Document presence checks configured in registry. Validation execution disabled for applicants pending officer review. | **Awaiting Review** (Candidate extracted by crawler; notary attestation rules unverified) | Embassy/consular apostille rules for foreign nationals; CA/CS/CMA statutory verification certificate format. |
| **Aadhaar Demographic / Address Update** | Enrolment / Update Form | Unique Identification Authority of India (UIDAI) | **Under Review** (`extracted`) | [uidai.gov.in (SSUP)](https://uidai.gov.in/en/my-aadhaar/about-your-aadhaar/updating-data-on-aadhaar.html) | Available (UIDAI PDF Form & 45 PoA document list) | **Partial** (PoA extracted; PoI, DoB proofs pending full schedule ingestion) | **Partial** (Aadhaar 12-digit format, resident name, residential address) | **Unverified** (Head of Family [HoF] consent conditional logic unverified) | Address alternative group configured in candidate catalog. Validation execution disabled for applicants. | **Awaiting Review** (Automated crawler extraction from January 2024 Gazette) | Complete matrix of 45 PoA and 32 PoI valid supporting documents; biometric update vs demographic-only rules. |
| **Trade Mark Registration** | Form TM-A | Controller General of Patents, Designs and Trade Marks (CGPDTM) | **Discovered** (`discovered`) | [indiacode.nic.in (TM Act 1999)](https://www.indiacode.nic.in/handle/123456789/1990) | Available in Gazette (Trade Marks Rules 2017) | **Missing** (Document schedule parsing pending) | **Missing** (Class 1-45 classifications, representation of mark, user date) | **Unverified** (Priority claim under Paris Convention conditional requirement) | None currently implemented. | **Discovered** (Discovered in India Code statutory gazette) | Complete statutory document matrix (Form TM-48 Power of Attorney, user affidavit with commercial invoice evidence, MSME/Startup fee concession proof). |
| **General Institutional Application** | Standard Framework | Designated Statutory Authority | **Fallback Baseline** (`KB-GEN-REG-01`) | [india.gov.in](https://www.india.gov.in/) | N/A (Standard baseline dossier framework) | **Complete for Baseline** (Registration Charter, Supporting Compliance Evidence) | **Complete for Baseline** (Organisation Name, Registration Number) | **None** (Generic administrative baseline) | Document presence, Entity name alignment, Identifier presence | **Provisional** (Provisional baseline) | Custom statutory citations for specialized provincial registrations. |

---

## 3. Discovered Applications & Detailed Requirement Specifications

### 3.1 Priority Application 1: SPICe+ (INC-32) — Ministry of Corporate Affairs
- **Statutory Authority:** Companies Act, 2013 (Section 7) & Companies (Incorporation) Rules, 2014.
- **Official Portal & Form:** MCA21 Portal (`mca.gov.in`), Form SPICe+ Part B (INC-32).
- **Primary Objective:** One-stop electronic incorporation of Private Limited, One Person Company (OPC), or Public Limited entities.
- **Configured Required Documents:**
  1. *Mandatory:* Director PAN Card (`pan_card` / `identity_document`).
  2. *Mandatory:* Memorandum and Articles of Association signed by initial subscribers (`incorporation_certificate`).
  3. *Alternative Group:* Proof of Registered Office Address (`utility_bill`). Accepted alternatives: Electricity Bill, Telephone Bill, Gas Bill (must be issued within 2 months of filing).
  4. *Conditional Requirement A:* Commercial Premise Lease Deed & Property Owner NOC (`utility_bill`). Triggered when `is_rented_premise == 'yes'`.
  5. *Conditional Requirement B:* Board Resolution / Power of Attorney for Authorised Representative (`statutory_declaration`). Triggered when `has_corporate_promoter == 'yes'`.
- **Field & Regex Validation Rules:**
  - `registration_number` (Corporate Identification Number): `^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$` (e.g., `U72900KA2024PTC189201`).
  - `organisation_name`: Legal company name (e.g., `Sharma Innovations Technologies Private Limited`).
  - `issue_date`: Date of incorporation / issuance. Must not be in the future.
- **Cross-Document Consistency Checks:**
  - `MCA-XDOC-NAME`: Declared company name must match extracted entity name on Certificate of Incorporation / MOA with $\ge 75\%$ token similarity.
  - `MCA-XDOC-CIN`: CIN on application form must exactly match extracted CIN from statutory certificate.
  - `MCA-XDOC-ADDR`: Registered office postal code and state jurisdiction must be coherent across lease deed and utility bill.

### 3.2 Priority Application 2: Form GST REG-01 — CBIC & GST Council
- **Statutory Authority:** Central Goods and Services Tax Act, 2017 (Sections 22 & 25) & CGST Rules, 2017 (Rule 8).
- **Official Portal & Form:** GST Common Portal (`gst.gov.in`), Form GST REG-01.
- **Primary Objective:** Registration of normal taxable entities, inter-state suppliers, and composition dealers.
- **Configured Required Documents:**
  1. *Mandatory:* Permanent Account Number (PAN) Card of the business or promoter (`pan_card` / `identity_document`).
  2. *Alternative Group:* Proof of Constitution of Business (`incorporation_certificate`). Accepted alternatives: Partnership Deed, Certificate of Incorporation, Society Registration Certificate.
  3. *Alternative Group:* Principal Place of Business Proof (`utility_bill`). Accepted alternatives: Electricity Bill, Property Tax Receipt, Registered Rent Agreement.
  4. *Mandatory:* Bank Account Particulars & Cancelled Cheque / Bank Passbook (`financial_statement`).
  5. *Conditional Requirement:* Form GST CMP-01 Composition Scheme Declaration (`statutory_declaration`). Triggered when `opt_composition_scheme == 'yes'`.
- **Field & Regex Validation Rules:**
  - `registration_number` (GSTIN): `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` (e.g., `29ABCDE1234F1Z5`).
  - `organisation_name`: Legal Name of Business matching tax records.
  - `issue_date`: Date of liability or certificate issuance.
- **Cross-Document Consistency Checks:**
  - `GST-XDOC-PAN` (Crucial Blocking Check): Digits 3 through 12 of the 15-character GSTIN must identically equal the submitted 10-character PAN card number. Any divergence triggers a blocking submission defect.
  - `GST-XDOC-STATE`: First 2 digits of GSTIN (State Code) must correspond to the state code of the registered principal place of business.
  - `XDOC-NAME-ALIGN`: Declared legal business name must match the name on the business constitution document.

### 3.3 Priority Application 3: Passport Form No. 1 — Ministry of External Affairs
- **Statutory Authority:** The Passports Act, 1967 (Section 5) & Passports Rules, 1980.
- **Official Portal & Form:** Passport Seva (`passportindia.gov.in`), Form No. 1.
- **Primary Objective:** Fresh issuance or re-issue of ordinary Indian Passport (36/60 pages).
- **Configured Required Documents:**
  1. *Alternative Group:* Proof of Date of Birth (`identity_card`). Accepted alternatives: Birth Certificate, Secondary School Leaving Certificate (SSLC), PAN Card.
  2. *Alternative Group:* Proof of Current Residential Address (`utility_bill`). Accepted alternatives: Aadhaar Card, Electricity Bill, Water Bill, Registered Rent Agreement.
  3. *Conditional Requirement:* Tatkaal Annexure Verification Proof (`statutory_declaration`). Triggered when `application_mode == 'tatkaal'`.
- **Field & Regex Validation Rules:**
  - `applicant_name`: Given name and surname matching primary credentials.
  - `registration_number` (Passport / File ID): `^[A-Z][0-9]{7}$` (e.g., `Z1234567`).
  - `issue_date`: Date of credential issuance.
  - `expiry_date`: Expiry date. Must not be in the past (`DATE-VAL-EXPIRED`).
- **Cross-Document Consistency Checks:**
  - `ID-XDOC-EXPIRY`: Confirms credential expiry date has not elapsed and is sequentially after issue date.
  - `ID-XDOC-NAME`: Confirms applicant given name and surname are congruent across address proof and identity proof.

---

## 4. Requirement Verification & Lifecycle Governance Rules

To ensure regulatory integrity during the SIH 2026 evaluation, TypeNull implements strict lifecycle state governance:

```
[Discovered] 
     │ (Crawler identifies official government URL & form gazette)
     ▼
[Extracted]
     │ (Text & heuristic parser extracts document checklist & fields)
     ▼
[Needs Verification]
     │ (Draft assembled with conditional questions; awaiting human review)
     ▼
[Verified]
     │ (Authorised legal officer verifies against Gazette / Act)
     ▼
[Published]
       (EXCLUSIVELY available to applicants for automated pre-validation)
```

1. **AI / Crawler Discoveries Are Never Self-Authorising**: Crawled documents remain in `discovered` or `extracted` status until an officer or administrator signs off with an audit attribution (`verifiedBy`, `verifiedAt`, `adminNotes`).
2. **Applicant Portal Access Control**: Only application variants with `lifecycle_status === 'published'` can be instantiated as dossiers. Unverified variants are displayed in the catalogue for transparency with disabled action buttons and prominent disclaimers.
3. **No False Clean Outcome**: If mandatory checks cannot be evaluated due to unreadable scans or missing proofs (`unable_to_check > 0`), the engine evaluates to `Unable to Assess` or `Major Issues`. The engine never returns `Complete ("No Configured Validation Issues Detected")` on incomplete evidence.
