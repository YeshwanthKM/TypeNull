# TypeNull Synthetic Authenticity Demonstration Pack

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
| `applicant_reference_original.pdf` | Applicant | Perfect match against approved PAN template v1.0 | Template: `MATCH`<br>Consistency: `CONSISTENT`<br>Alteration: `NO_ALTERATIONS_DETECTED`<br>Overall: `UNABLE_TO_VERIFY` | Template match does NOT equal legal verification. External ITD API unconfigured. |
| `applicant_altered_copy.pdf` | Applicant | Altered PAN format (`ABCDEX1234`, fails regex) | Template: `MATCH`<br>Consistency: `INCONSISTENT`<br>Alteration: `SUSPICIOUS`<br>Overall: `SUSPICIOUS` | Regex pattern inspection detects syntax alteration; cannot detect photographic tampering. |
| `applicant_missing_field.pdf` | Applicant | Mandatory field `father_name` omitted | Template: `MATCH`<br>Consistency: `FIELD_MISSING`<br>Compliance: `INCOMPLETE`<br>Overall: `UNABLE_TO_VERIFY` | Identifies missing mandatory statutory field. Prompts user re-upload. |
| `applicant_unknown_document.pdf` | Applicant | Unrecognized fellowship document with no reference | Template: `TEMPLATE_UNAVAILABLE`<br>Overall: `UNABLE_TO_VERIFY` | **Crucial**: Not falsely branded fraudulent or suspicious. Flagged for manual review. |
| `applicant_unreadable_sample.pdf` | Applicant | Zero extractable text characters | Extraction: `0 characters`<br>Template: `TEMPLATE_UNAVAILABLE`<br>Overall: `UNABLE_TO_VERIFY` | Gracefully detects unreadable scan without crashing. Prompts clear upload. |
| `organisation_reference_original.pdf` | Organisation | Compliant Form GST REG-06 with valid QR token | Template: `MATCH`<br>QR/Sig: `VALID_SIGNATURE`<br>Alteration: `NO_ALTERATIONS_DETECTED`<br>Overall: `UNABLE_TO_VERIFY` | Valid QR payload syntax verified; real GSTN gateway verification requires GSP API credentials. |
| `organisation_altered_copy.pdf` | Organisation | Altered GSTIN format (`99XXXXX9999X9ZZ`) | Consistency: `INCONSISTENT`<br>Alteration: `SUSPICIOUS`<br>Overall: `SUSPICIOUS` | Invalid state code (99) and character count flagged as format violation. |
| `organisation_missing_field.pdf` | Organisation | Form GST REG-06 missing Legal Name & Address | Consistency: `FIELD_MISSING`<br>Compliance: `INCOMPLETE`<br>Overall: `UNABLE_TO_VERIFY` | Detects missing statutory fields for enterprise registration screening. |
| `organisation_malformed_qr.pdf` | Organisation | Deliberately corrupted QR token payload | QR/Sig: `MALFORMED_OR_INVALID`<br>Alteration: `SUSPICIOUS`<br>Overall: `SUSPICIOUS` | Scans token payload and flags malformed/corrupted token schema. |
| `organisation_unknown_document.pdf` | Organisation | Commercial utility bill without screening template | Template: `TEMPLATE_UNAVAILABLE`<br>Overall: `UNABLE_TO_VERIFY` | Supplementary proof without mandatory template does not fail application. |

---

## Workflow Integration Instructions

### 1. Applicant Workflow Demonstration
1. Navigate to **Applicant Workspace** (`/applications/explore` or `/applications/new`).
2. Select an authoritative regulatory service (e.g., *SPICe+ Company Incorporation*).
3. In the Application Details Dossier (`/applications/app-demo-1`), click **Upload Document**.
4. Upload `applicant_reference_original.pdf` or `applicant_altered_copy.pdf`.
5. Observe the **Authenticity & Integrity Assessment** section render:
   - Matched reference: `Permanent Account Number (PAN) Card v1.0 (Synthetic Demonstration)`.
   - 7-Dimension Status Matrix: Structural match, format validation, alteration indicators.
   - Expandable **Evidence & Technical Findings** drawer detailing exact field-by-field outcomes.

### 2. Organisation Bulk Screening Demonstration
1. Navigate to **Officer Workspace** (`/officer`).
2. Use the **Intake Mode Toggle** to upload batch documents or the demo archive.
3. Observe batch processing categorize applications into:
   - *Statutory Violations vs Unable to Assess vs Format Discrepancies*.
4. Click **Inspect** on any batch item to view the detailed **Batch Item Review Modal**.
5. Inspect the live comparison of the submitted document against the approved reference template.

---

## Important Architectural Notes
- **Template Match $\neq$ Genuine Legal Document**: Matching reference template structures establishes typographic, schema, and layout conformance. Legal authenticity requires authoritative government database verification (`UNABLE_TO_VERIFY` in demo).
- **Synthetic References are Distinct**: Seed reference templates are marked with `isSynthetic: true` and `provenance: 'synthetic_demo'`. They are never represented as authentic government records.
