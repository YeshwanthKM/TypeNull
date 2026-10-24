# TypeNull SIH 2026 — Module 2: Organisation Bulk Screening Architecture & Testing Guide

## 1. System Overview

**TypeNull Module 2 (Organisation Bulk Screening)** extends the verified Module 1 baseline to institutional and governmental evaluation authorities (e.g. Ministry of Corporate Affairs, Central Board of Indirect Taxes & Customs, State Registrars, Licensing Boards).

While Module 1 provides single-application validation directly to citizen applicants, Module 2 empowers institutional officers to ingest, parse, validate, and summarize large intake batches of received dossiers with automated statutory compliance screening.

### Key Capabilities

1. **Multi-Tenant Institutional Isolation**: Batches are strictly segregated by `organisation_id` in both Supabase PostgreSQL (via Row Level Security) and in-memory caches. Officers can only access and evaluate batches belonging to their registered institutional organization.
2. **Statutory Publication Gating**: Safeguard mechanism restricting screening execution strictly to verified, published government application profiles (e.g., `MCA-SPICE-INC32`, `CBIC-GST-REG01`). Unverified candidate profiles (`MCA-DIR-3`, `UIDAI-SSUP-2024`, `CGPDTM-TM-A`) are visibly flagged as under review and locked from screening.
3. **Dual Intake Architecture**:
   - **Structured Multi-Application Builder**: Interactive intake allowing officers to construct batches, identify individual applicants (`applicantIdentifier`), attach distinct PDF/image proofs per applicant, or one-click load canonical demonstration test scenarios.
   - **Bulk Folder & ZIP Archive Upload**: In-browser client-side archive parser (`processFolderUpload` and `unpackZipArchive`) grouping files into applicant dossiers by directory hierarchy, sanitizing relative paths (`sanitizePath` stripping traversal sequences `../`), and validating file extensions (`isAllowedFileType`).
4. **Shared Validation Engine Re-use**: Every applicant dossier is evaluated by the shared TypeNull validation engine (`runValidationEngine`), guaranteeing identical statutory rule fidelity, cross-document checks, and outcome classifications between applicant self-checks and officer screenings.
5. **Partial-Failure Resilience**: Corrupted, empty, or unreadable files trigger an `Unable to Assess` finding or mark the single applicant dossier with `status: 'failed'`. The surrounding batch continues unaffected and finishes with `status: 'completed'`.
6. **Mutually Exclusive & Consistent KPIs**:
   $$\text{Total Applications} = \text{Complete} + \text{Minor Issues} + \text{Major Issues} + \text{Unable to Assess}$$
   Zero double counting. Clickable metric filter cards reactively update the screening queue view.
7. **Official Report Generation**: Sanitized CSV report export (`generateScreeningCsvReport`) containing batch headers, applicant identifiers, outcome categories, and top findings for offline archival and audit trails.

---

## 2. Architecture & Data Model

### Data Structures (`src/types/index.ts`)

```typescript
export interface ScreeningBatch {
  id: string;
  title: string;
  organisationId?: string;
  serviceCode?: string;
  variantCode?: string;
  targetCategory: string;
  totalApplications: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outcomeCounts: Record<ScreeningOutcome, number>; // Complete | Minor Issues | Major Issues | Unable to Assess
  items: ScreeningBatchItem[];
  isStale?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ScreeningBatchItem {
  id: string;
  batchId?: string;
  applicantIdentifier: string;
  targetCategory: string;
  serviceCode?: string;
  variantCode?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  outcome: ScreeningOutcome;
  documentCount: number;
  findings: ValidationFinding[];
  counts: ValidationSummaryCounts;
  extractedFields: Record<string, string>;
  sourceFiles: Array<{ name: string; size: number; mimeType: string }>;
  errorMessage?: string;
  isStale?: boolean;
  processedAt: string;
}
```

### Relational Schema & Row Level Security (`supabase/migrations/008_organisation_bulk_screening.sql`)

- Table `screening_batches` with `organisation_id`, `service_code`, `variant_code`, and `status`.
- Table `screening_batch_items` with `status`, `error_message`, and `findings` (JSONB).
- **RLS Policies**:
  - `screening_batches_officer_access`: Officers can only SELECT/INSERT/UPDATE where `auth.jwt() ->> 'organisation_id' = organisation_id`.
  - `screening_batch_items_officer_access`: Restricts item queries to parent batches owned by the officer's organization.
  - Applicants and unauthenticated roles are denied access.

---

## 3. Four Canonical Demonstration Scenarios

When clicking **"Load Demo Scenarios (4 Applications)"** in the Officer Workspace, the following 4 canonical test cases are staged:

| # | Scenario / Applicant | Target Application | Staged Evidence | Expected Outcome | Statutory Explanation |
|---|---|---|---|---|---|
| **1** | **Sharma Innovations Technologies Pvt Ltd** | SPICe+ (INC-32) Company Registration | `inc32_summary.pdf`, `director_pan.pdf`, `coi.pdf`, `utility_bill.pdf` | **Complete** | All mandatory documents uploaded, all 4 statutory fields (`CIN`, `Legal Name`, `Date of Incorporation`, `Address`) confirmed and valid. |
| **2** | **Rohan Verma Enterprises (Missing PAN)** | SPICe+ (INC-32) Company Registration | `inc32_summary.pdf`, `coi.pdf`, `utility_bill.pdf` (PAN omitted) | **Major Issues** | Blocking finding: Rule `GOV-REQ-PAN_CARD` triggers due to absence of promoter/director PAN. |
| **3** | **Zenith Global Solutions (Divergent GSTIN)** | GST REG-01 Registration | `gst_reg01.pdf`, `gstin_cert.pdf`, `pan_mismatched.pdf` | **Major Issues** | Cross-document blocking discrepancy: Rule `XDOC-GST-PAN-ALIGN` triggers because GSTIN embedded PAN does not match PAN credential. |
| **4** | **Unreadable Corrupted Scan Entity** | SPICe+ (INC-32) Company Registration | `unreadable_corrupted_scan.pdf` (800 bytes) | **Unable to Assess** | Document processing failure: Rule `OCR-QUAL-FAIL` triggers `unable_to_check`. No substantive violation is manufactured; human review required. |

---

## 4. Resilience & Partial-Failure Handling

Module 2 guarantees **per-applicant error isolation**:

```typescript
// Inside handleStartBulkScreening in OfficerWorkspacePage.tsx
for (let i = 0; i < effectiveStagedDossiers.length; i++) {
  try {
    // 1. Ingest files & run OCR / text extraction
    // 2. Map extracted intelligence to mandatory regulatory fields
    // 3. Execute runValidationEngine()
    // 4. Record successful item evaluation
  } catch (dossierError: any) {
    // Isolated application failure
    batchItems.push({
      status: 'failed',
      outcome: 'Unable to Assess',
      errorMessage: dossierError.message || 'Processing fault during dossier evaluation',
      ...
    });
  }
}
// Batch overall status updates to 'completed'
```

If an individual dossier has a corrupted stream or runtime exception:
1. That single dossier receives `status: 'failed'` and outcome `Unable to Assess`.
2. The remaining $(N-1)$ dossiers in the batch continue processing without interruption.
3. The overall batch achieves `status: 'completed'`.

---

## 5. Verification & Test Execution

The dedicated Module 2 automated test suite is located at `scripts/test_organisation_bulk_screening.ts` and integrated into the project's root test command.

### Running Automated Tests

```bash
# Run the entire TypeNull test suite (Module 1 + Module 2 + Security + Catalogue)
npm test

# Run only the Module 2 test suite bundle
npx esbuild scripts/test_organisation_bulk_screening.ts --bundle --platform=node --format=esm --outfile=scripts/test_screening_bundle.mjs && node scripts/test_screening_bundle.mjs && rm scripts/test_screening_bundle.mjs
```

### Test Case Matrix (All 17 Cases Verified)

1. **Case 1 (PASS)**: Authorised officer creates batch stamped with `organisation_id`.
2. **Case 2 (PASS)**: Applicant role is denied officer screening permissions.
3. **Case 3 (PASS)**: Tenancy isolation prevents cross-organization batch retrieval.
4. **Case 4 (PASS)**: Multi-application batch maintains proper `totalApplications` count.
5. **Case 5 (PASS)**: Multi-application document segregation (zero cross-dossier contamination).
6. **Case 6 (PASS)**: Catalogue integration allows screening against published profiles (`MCA-SPICE-INC32`, `CBIC-GST-REG01`).
7. **Case 7 (PASS)**: Publication safeguard strictly blocks unverified profiles (`MCA-DIR-3`, `UIDAI-SSUP-2024`, `CGPDTM-TM-A`).
8. **Case 8 (PASS)**: Valid application produces `Complete` screening outcome (0 major issues).
9. **Case 9 (PASS)**: Missing mandatory document produces `Major Issues` (blocking finding).
10. **Case 10 (PASS)**: Unreadable scan produces `Unable to Assess` without manufacturing false substantive defects.
11. **Case 11 (PASS)**: Individual dossier failure does not fail the entire batch (`batch.status === 'completed'`).
12. **Case 12 (PASS)**: Mutually exclusive outcome sum strictly equals `totalApplications`.
13. **Case 13 (PASS)**: Batch re-saving updates existing record without creating duplicate rows.
14. **Case 14 (PASS)**: Fingerprint mutation detection flags modified dossiers as stale.
15. **Case 15 (PASS)**: Spoofed organization ID in request payload is rejected.
16. **Case 16 (PASS)**: Path traversal sanitization (`../` stripped) and file extension enforcement (.pdf/.jpg/.png allowed, .exe/.sh blocked).
17. **Case 17 (PASS)**: CSV report generation produces sanitized report with headers and item records.

---

## 6. Demonstration Walkthrough (SIH 2026 Script)

1. **Navigate to Officer Workspace**: In the top navigation bar, click **"Officer Workspace"** (`/officer`).
2. **Review Clearance Header**: Observe the institutional authority clearance card indicating Officer role and active tenancy.
3. **Select Government Application Profile**:
   - Notice that published applications (`SPICe+ INC-32`, `GST REG-01`) show green verified status.
   - Select `MCA-DIR-3` from dropdown: observe immediate amber alert and disabled screening button (*"Screening Unavailable (Statutory Verification Pending)"*).
   - Re-select `MCA-SPICE-INC32`.
4. **Load Demo Intake Batch**: Click **"Load Demo Scenarios (4 Applications)"** to populate the builder with the 4 canonical test cases.
5. **Execute Batch Screening**:
   - Click **"Screen All 4 Applications"**.
   - Watch the animated progress bar advance through each dossier.
6. **Inspect Mutually Exclusive Results**:
   - Review KPI metric cards:
     - Total: 4
     - Complete: 1
     - Minor Issues: 0
     - Major Issues: 2
     - Unable to Assess: 1
   - Click the **"Major Issues"** card: note reactive filtering to show only the 2 defective dossiers.
   - Click **"Inspect Findings"** on Scenario 2: observe the missing Director PAN Card finding.
   - Click **"Inspect Findings"** on Scenario 4: observe the OCR extraction failure and statutory disclaimer banner.
7. **Export Official Report**: Click **"Export Report (CSV)"** to download the institutional CSV audit report.
