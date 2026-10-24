# Scenario Manifest: SCENARIO-4-POOR-QUALITY

**Scenario ID:** `SCENARIO-4-POOR-QUALITY`  
**Application Type:** Generic / All Applications  
**Purpose:** Verify that a low-quality, corrupt, or unreadable document scan is gracefully identified by the OCR and text extraction review pipeline, triggering an `unable_to_check` finding and preventing false-positive approval.

---

## 1. Synthetic File Details

> [!IMPORTANT]
> **SYNTHETIC DEMONSTRATION DATA — NOT FOR OFFICIAL SUBMISSION**  
> Fictional sample crafted to test OCR extraction review thresholds without crashing.

- **File Name:** `unreadable_corrupted_scan.pdf`
- **Document Category:** `identity_document`
- **File Format:** PDF with low text density ($< 20$ characters) simulating an underexposed or unreadable digital scan.

---

## 2. Test Intentions & Requirement Mappings

### Expected Engine Findings
1. **Extraction Review Warning:**
   - *Rule ID:* `OCR-QUAL-LOW` / `OCR-QUAL-FAIL`
   - *Status:* `unable_to_check` or `warning`
   - *Severity:* `major` or `minor`
   - *Explanation:* Fewer than 20 characters detected in document stream.
   - *Recommended Action:* *"Upload a higher-contrast digital document scan (300 DPI or vector PDF) or verify document readability under human review."*
   - *Requires Manual Review:* `true`
2. **Outcome Gating (No False Issue-Free Result):**
   - In accordance with TypeNull statutory policy, unresolved mandatory checks with `unable_to_check` findings strictly block the `Complete` ("No Configured Validation Issues Detected") outcome.
   - Overall outcome evaluates to `Unable to Assess` (or `Major Issues` if combined with missing blockers).

---

## 3. Actual Engine Verification Result
- Status: Confirmed passed in automated test `test_applicant_workflow_demo.ts` (Test Suite 7: Graceful OCR & Extraction Quality Handling).
