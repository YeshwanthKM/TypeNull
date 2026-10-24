# Scenario Manifest: SCENARIO-1-COMPLETE

**Scenario ID:** `SCENARIO-1-COMPLETE`  
**Application Type:** SPICe+ (INC-32) Company Registration  
**Authority:** Ministry of Corporate Affairs (MCA), Government of India  
**Variant Code:** `MCA-SPICE-INC32`  
**Purpose:** Verify that a complete, well-formed application with all mandatory and alternative documents uploaded passes pre-validation without false-positive defect reports.

---

## 1. Synthetic Applicant & Entity Profile

> [!IMPORTANT]
> **SYNTHETIC DEMONSTRATION DATA — NOT FOR OFFICIAL SUBMISSION**  
> All names, identifiers, registration numbers, and addresses are completely fictional and generated solely for automated testing of TypeNull validation rules.

- **Entity Legal Name:** `Sharma Innovations Technologies Private Limited`
- **Assigned CIN:** `U72900KA2024PTC189201`
- **Director Name:** `AARAV SHARMA`
- **Director Synthetic PAN:** `ABCDE1234F`
- **Director Date of Birth:** `1985-05-15`
- **Registered Office Address:** `No 42, Innovation Campus, Electronic City Phase 1, Bengaluru 560100`
- **Incorporation Date:** `2024-06-15`
- **Utility Bill Issue Date:** `2026-09-10`

---

## 2. Files Included in Dossier

| File Name | Document Category | Canonical Key | Expected Role in Pre-Validation |
| :--- | :--- | :--- | :--- |
| `spice_plus_inc32_application_summary.pdf` | `application_form` | `application_form` | Provides declared application metadata: Entity Name, CIN, Address, Director Name. |
| `director_pan_card_aarav_sharma.pdf` | `identity_document` | `pan_card` | Satisfies mandatory director identity proof requirement (`req-spice-pan`). |
| `certificate_of_incorporation_moa_aoa.pdf` | `registration_certificate` | `incorporation_certificate` | Satisfies mandatory charter / constitution proof (`req-spice-moa-aoa`). |
| `registered_office_electricity_bill.pdf` | `address_proof` | `utility_bill` | Satisfies alternative group requirement for Registered Office Address (`req-spice-utility`). |

---

## 3. Test Intentions & Requirement Mappings

### Requirements Expected to Pass
1. `GOV-REQ-PAN_CARD`: Director PAN Card present and legible.
2. `GOV-REQ-INCORPORATION_CERTIFICATE`: Certificate of Incorporation / MOA present.
3. `GOV-REQ-UTILITY_BILL`: Registered office address proof present via accepted alternative (Electricity Bill).
4. `FLD-REGISTRATION_NUMBER`: 21-digit alphanumeric CIN conforms to regex `^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$`.
5. `FLD-ORGANISATION_NAME`: Declared legal entity name detected on primary documentary proofs.
6. `FLD-ISSUE_DATE`: Date of incorporation verified as historical/contemporary date (non-future).
7. `XDOC-NAME-ALIGN`: Token similarity between declared entity name and certificate exceeds 75% threshold (100% match).
8. `DATE-VAL-FUTURE`: Issue date is in the past relative to verification timestamp.
9. `DOC-DUP-CHECK`: All submitted filenames are distinct.

### Requirements Intentionally Violated or Omitted
- **None.** This scenario tests the happy path of a compliant, fully supported application dossier.

---

## 4. Expected Engine Findings vs Actual Results

- **Expected Outcome:** `Complete` (Badge: **No Configured Validation Issues Detected**)
- **Summary Counts:**
  - `majorIssues`: 0
  - `minorIssues`: 0
  - `warnings`: 0
  - `unableToAssess`: 0
  - `passed`: $\ge 6$
- **Actual Engine Outcome:** `Complete` (Confirmed in automated test suite `test_applicant_workflow_demo.ts`)

---

## 5. Known Limitations
- The initial pre-validation checks verify foundational statutory requirements (incorporation certificate, director identity, address proof, CIN regex, name consistency).
- Auxiliary schedules under AGILE-PRO-S (EPFO, ESIC, Bank account integration) are not parsed in the initial pre-check.
