# Scenario Manifest: SCENARIO-3-INCONSISTENT

**Scenario ID:** `SCENARIO-3-INCONSISTENT`  
**Application Type:** Form GST REG-01 Normal Taxpayer Registration  
**Authority:** Central Board of Indirect Taxes and Customs (CBIC) & GST Council  
**Variant Code:** `CBIC-GST-REG01`  
**Purpose:** Verify that cross-document discrepancies (mismatched GSTIN-to-PAN embedded substring and diverging legal entity names) are flagged as blocking issues under automated discrepancy checks.

---

## 1. Synthetic Applicant & Entity Profile

> [!IMPORTANT]
> **SYNTHETIC DEMONSTRATION DATA — NOT FOR OFFICIAL SUBMISSION**  
> Fictional data generated solely for TypeNull automated cross-document rule verification.

- **Declared Enterprise Name:** `Bharat Industrial Solutions Private Limited`
- **Declared GSTIN:** `27AAACB1234C1Z5` (State: 27, Embedded PAN: `AAACB1234C`)
- **Dossier Address:** `Plot 88, MIDC Industrial Area, Andheri East, Mumbai 400093`
- **Mismatched Promoter PAN:** `ZZZZZ9999Z` (Holder: `VIKRAM VERMA`)
- **Divergent Company Certificate Name:** `Zenith Enterprises Global Private Limited`

---

## 2. Files Included in Dossier

| File Name | Document Category | Canonical Key | Expected Role in Pre-Validation |
| :--- | :--- | :--- | :--- |
| `gst_reg01_application_summary.pdf` | `application_form` | `application_form` | Declares GSTIN `27AAACB1234C1Z5` and legal entity `Bharat Industrial Solutions Private Limited`. |
| `gstin_registration_certificate.pdf` | `tax_financial_document` | `tax_financial_document` | Contains official GSTIN registration `27AAACB1234C1Z5` for `Bharat Industrial Solutions Private Limited`. |
| `promoter_pan_card_mismatched.pdf` | `identity_document` | `pan_card` | **Deliberate Discrepancy A:** PAN on card is `ZZZZZ9999Z` (does not match `AAACB1234C`). |
| `corporate_name_divergent_certificate.pdf` | `registration_certificate` | `incorporation_certificate` | **Deliberate Discrepancy B:** Entity name is `Zenith Enterprises Global Private Limited` (diverges from declared name). |

---

## 3. Test Intentions & Requirement Mappings

### Requirements Expected to Pass
1. `FLD-REGISTRATION_NUMBER`: Format check passes because both `27AAACB1234C1Z5` (GSTIN regex) and `ZZZZZ9999Z` (PAN regex) are structurally valid strings.
2. `DOC-REQ-TAX_FINANCIAL_DOCUMENT`: Registration certificate document type is present.
3. `DOC-REQ-IDENTITY_DOCUMENT`: PAN document type is present.

### Requirements Intentionally Violated
1. **GSTIN Embedded PAN Substring Mismatch:**
   - *Rule ID:* `XDOC-GST-PAN-ALIGN`
   - *Expected Finding:* Status `failed`, severity `blocking`, isBlocking `true`.
   - *Observed vs Expected:* Expected PAN `ZZZZZ9999Z` (from submitted PAN card), but observed embedded slice `AAACB1234C` (from GSTIN characters 3 to 12).
   - *Statutory Basis:* CGST Rules 2017, Rule 8 mandates that a taxpayer GSTIN must strictly embed the PAN of the legal entity or proprietor.
2. **Entity Name Inconsistency Across Documents:**
   - *Rule ID:* `XDOC-NAME-ALIGN`
   - *Expected Finding:* Status `failed`, severity `major`, isBlocking `true`.
   - *Observed vs Expected:* Expected declared name `Bharat Industrial Solutions Private Limited`, but observed certificate name `Zenith Enterprises Global Private Limited` (token similarity $< 75\%$).

---

## 4. Expected Engine Findings vs Actual Results

- **Expected Outcome:** `Major Issues` (Badge: **Submission Blockers Detected: Mandatory Requirements Unfulfilled**)
- **Summary Counts:**
  - `majorIssues`: $\ge 2$ (Blocking cross-document discrepancy errors)
  - `unableToAssess`: 0
- **Expected Categorization:**
  - Both findings grouped under **Cross-Document Inconsistencies** (`cross_document`).
- **Actual Engine Outcome:** `Major Issues` (Confirmed in automated test suite `test_applicant_workflow_demo.ts`)
