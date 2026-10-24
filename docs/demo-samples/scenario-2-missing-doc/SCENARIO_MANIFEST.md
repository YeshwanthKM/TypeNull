# Scenario Manifest: SCENARIO-2-MISSING-DOC

**Scenario ID:** `SCENARIO-2-MISSING-DOC`  
**Application Type:** SPICe+ (INC-32) Company Registration  
**Authority:** Ministry of Corporate Affairs (MCA), Government of India  
**Variant Code:** `MCA-SPICE-INC32`  
**Purpose:** Verify that omitting a mandatory statutory document (Director PAN Card) is immediately detected as a blocking submission defect, preventing a false `Complete` evaluation.

---

## 1. Synthetic Applicant & Entity Profile

> [!IMPORTANT]
> **SYNTHETIC DEMONSTRATION DATA — NOT FOR OFFICIAL SUBMISSION**  
> Fictional data generated solely for TypeNull automated rule verification.

- **Entity Legal Name:** `Sharma Innovations Technologies Private Limited`
- **Assigned CIN:** `U72900KA2024PTC189201`
- **Director Name:** `AARAV SHARMA`
- **Registered Office Address:** `No 42, Innovation Campus, Electronic City Phase 1, Bengaluru 560100`

---

## 2. Files Included in Dossier

| File Name | Document Category | Canonical Key | Expected Role in Pre-Validation |
| :--- | :--- | :--- | :--- |
| `spice_plus_inc32_application_summary.pdf` | `application_form` | `application_form` | Provides declared application metadata. |
| `certificate_of_incorporation_moa_aoa.pdf` | `registration_certificate` | `incorporation_certificate` | Satisfies mandatory charter / constitution proof (`req-spice-moa-aoa`). |
| `registered_office_electricity_bill.pdf` | `address_proof` | `utility_bill` | Satisfies alternative group requirement for Registered Office Address (`req-spice-utility`). |

*(Notice: `director_pan_card_aarav_sharma.pdf` is intentionally omitted from this dossier).*

---

## 3. Test Intentions & Requirement Mappings

### Requirements Expected to Pass
1. `GOV-REQ-INCORPORATION_CERTIFICATE`: Certificate of Incorporation / MOA present.
2. `GOV-REQ-UTILITY_BILL`: Registered office address proof present via accepted alternative.
3. `FLD-REGISTRATION_NUMBER`: 21-digit CIN syntax valid.
4. `FLD-ORGANISATION_NAME`: Declared company name detected.
5. `XDOC-NAME-ALIGN`: Company name on certificate matches declared name.

### Requirements Intentionally Violated or Omitted
1. **Omitted Document:** `pan_card` (Director Identity Proof).
   - *Rule ID:* `GOV-REQ-PAN_CARD` / `DOC-REQ-IDENTITY_DOCUMENT`
   - *Expected Finding:* Status `failed`, severity `blocking`, isBlocking `true`.
   - *Statutory Basis:* Section 7(1) of the Companies Act, 2013 mandates director PAN proof for Indian resident subscribers.

---

## 4. Expected Engine Findings vs Actual Results

- **Expected Outcome:** `Major Issues` (Badge: **Submission Blockers Detected: Mandatory Requirements Unfulfilled**)
- **Summary Counts:**
  - `majorIssues`: $\ge 1$ (Blocking missing document)
  - `unableToAssess`: 0
  - `passed`: $\ge 4$
- **Expected Finding Detail:**
  - **Title:** `Required Document Missing: Permanent Account Number (PAN) Card`
  - **Category:** `Missing Mandatory Documents` (`missing_documents`)
  - **Severity:** `blocking`
  - **Recommended Action:** *"Upload a clear, legible copy of Permanent Account Number (PAN) Card or an accepted alternative."*
- **Actual Engine Outcome:** `Major Issues` (Confirmed in automated test suite `test_applicant_workflow_demo.ts`)

---

## 5. Verification Transition (Remediation)
When the applicant subsequently uploads `director_pan_card_aarav_sharma.pdf`:
1. The fingerprint invalidation banner triggers: *"New documents have been added since this validation was recorded."*
2. Clicking **Refresh Pre-Validation** clears the defect and upgrades the dossier to `Complete`.
