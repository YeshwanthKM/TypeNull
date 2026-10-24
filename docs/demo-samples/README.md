# TypeNull SIH 2026: Synthetic Demonstration Sample Library

**Directory Location:** `docs/demo-samples/`  
**Purpose:** Reusable, standard-compliant synthetic application forms and supporting documents for testing Module 1 (Applicant Application Pre-Validation).

---

## 1. Safety & Data Privacy Standards

> [!CAUTION]
> **SYNTHETIC DEMONSTRATION DATA — NOT FOR OFFICIAL SUBMISSION**  
> All files in this directory contain entirely synthetic data, fictional individuals, and artificial identifiers.  
> - Real personal data (actual Aadhaar numbers, real PAN numbers, genuine passport scans) are **strictly prohibited** in this repository.  
> - Every file header explicitly bears the statutory disclaimer watermark.

---

## 2. Directory Structure & Scenario Directory

```
docs/demo-samples/
├── README.md
│
├── scenario-1-complete/
│   ├── SCENARIO_MANIFEST.md
│   ├── spice_plus_inc32_application_summary.pdf
│   ├── director_pan_card_aarav_sharma.pdf
│   ├── certificate_of_incorporation_moa_aoa.pdf
│   └── registered_office_electricity_bill.pdf
│
├── scenario-2-missing-doc/
│   ├── SCENARIO_MANIFEST.md
│   ├── spice_plus_inc32_application_summary.pdf
│   ├── certificate_of_incorporation_moa_aoa.pdf
│   └── registered_office_electricity_bill.pdf
│
├── scenario-3-inconsistent/
│   ├── SCENARIO_MANIFEST.md
│   ├── gst_reg01_application_summary.pdf
│   ├── gstin_registration_certificate.pdf
│   ├── promoter_pan_card_mismatched.pdf
│   └── corporate_name_divergent_certificate.pdf
│
└── scenario-4-poor-quality/
    ├── SCENARIO_MANIFEST.md
    └── unreadable_corrupted_scan.pdf
```

---

## 3. How to Use These Samples in Manual Testing

1. **Scenario 1 (Complete Dossier):**  
   Upload all 4 files from `scenario-1-complete/` to a SPICe+ dossier. Run pre-validation $\to$ Observe outcome: **"No Configured Validation Issues Detected"** (`Complete`).

2. **Scenario 2 (Missing Document):**  
   Upload the 3 files from `scenario-2-missing-doc/` (omits PAN card). Run pre-validation $\to$ Observe outcome: **"Submission Blockers Detected: Mandatory Requirements Unfulfilled"** (`Major Issues`).

3. **Scenario 3 (Cross-Document Inconsistency):**  
   Upload the files from `scenario-3-inconsistent/` to a GST REG-01 dossier. Run pre-validation $\to$ Observe blocking errors under **Cross-Document Inconsistencies** (`GSTIN and PAN Mismatch Detected` and `Entity Name Inconsistency Across Documents`).

4. **Scenario 4 (Poor-Quality Scan):**  
   Upload `unreadable_corrupted_scan.pdf`. Run pre-validation $\to$ Observe warning under **Extraction & OCR Quality Review** (`unable_to_check`).
