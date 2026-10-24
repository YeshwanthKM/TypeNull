# Archive Manifest: 2026-10-24 Live Real-World Acceptance Test Run

**Archival Timestamp:** 2026-10-24T22:47:00+05:30  
**Test Execution Date:** 2026-10-24  
**Target URL:** `https://type-null-rho.vercel.app/`  
**Git Baseline Commit:** `052f57623ac31f86d04dd6c1ae5745eabdc4035a` (Tag: `doc-compat-verified-checkpoint`)  
**Operating Environment:** macOS Darwin, Google Chrome Headless via Puppeteer Core v25.16.0  
**Live Backend Service:** Supabase PostgreSQL (`https://evpkolpyjlopyeqphdut.supabase.co`)  

---

## 1. Preserved Artifacts Inventory

### A. Reports (`reports/`)
- `live_real_world_document_test_report.md` (22.8 KB): Full human-readable markdown report detailing the live browser acceptance findings, Vercel edge routing defects, and real-world document compatibility analysis.
- `live_acceptance_test_log.json` (1.9 KB): Machine-readable execution log containing timestamped test results, console logs, and outcome statuses.

### B. Screenshots (`screenshots/`)
15 high-resolution PNG screenshots captured during the acceptance run:
- `01_live_landing_hero.png` (110.7 KB): Live landing page hero and branding at `https://type-null-rho.vercel.app/`.
- `01b_vercel_direct_deeplink_404.png` (19.7 KB): Direct HTTP GET on `/officer` capturing the Vercel Edge 404 NOT_FOUND response.
- `02_live_user_guides.png` (205.3 KB): Mounted User Guides interface via client-side routing.
- `03_live_login_screen.png` (53.4 KB): Unified portal login form rendered on live Vercel deployment.
- `03b_live_supabase_auth_rejected.png` (57.7 KB): Live Supabase Auth actively rejecting invalid test credentials.
- `04_officer_intake_workspace.png` (169.2 KB): Organisation bulk screening workspace before staging files.
- `05_staged_real_world_dossiers.png` (167.7 KB): Staged applicant dossiers containing real-world statutory files.
- `06_screening_results_breakdown.png` (153.8 KB): Itemized screening results tab surfacing findings and status badges.
- `07_applicant_passport_form.png` (232.0 KB): Applicant pre-validation wizard mounted with Passport Seva Form 1 conditional inputs.
- Additional run iteration captures (`01_landing_hero.png`, `02_user_guides.png`, `03_officer_workspace_intake.png`, `04_officer_files_staged.png`, `05_screening_results_dashboard.png`, `06_applicant_new_application.png`).

### C. Execution Task Logs (`logs/`)
- `task-5009.log` (4.5 KB): Initial live navigation audit identifying non-clickable DOM elements in desktop header view.
- `task-5026.log` (1.2 KB): Initial acceptance test run surfacing Vercel 404 and session re-mount behavior.
- `task-5054.log` (1.7 KB): Second acceptance run verifying bulk screening start trigger and Supabase 400 rejection.
- `task-5076.log` (1.7 KB): Third acceptance run confirming bulk screening execution on real-world document files.
- `task-5086.log` (1.7 KB): Final acceptance run confirming applicant wizard mounting with 5 interactive inputs.

### D. Executable Test Scripts (`scripts/`)
- `run_live_real_world_acceptance_suite.mjs` (13.6 KB): Full Puppeteer automation script executing live Vercel checks and local evaluation screening.
- `build_real_world_test_corpus.ts` (12.0 KB) & `build_real_world_test_corpus.mjs` (11.1 KB): Corpus organizer and fixture generators.
- `test_live_auth_flow.mjs` (2.2 KB): Standalone verification of live Supabase Auth and registration form DOM inputs.

### E. Corpus Manifest (`corpus_manifest/`)
- `manifest.json` & `manifest.txt`: Complete SHA-256 checksums and file sizes for all 20 files in `test_corpus/real_world_public/`.

---

## 2. Explicit Record of Unavailable Artifacts

In strict compliance with forensic integrity principles:
1. **CSV Export File on Disk:**
   - **Status:** **UNAVAILABLE ON DISK**
   - **Reason:** In `run_live_real_world_acceptance_suite.mjs`, the "Export Batch (CSV)" button click handler was triggered and executed without runtime errors; however, in headless Chrome without an explicit CDP `Page.setDownloadBehavior` path configured, the generated CSV blob remained in browser memory rather than saving to disk. The CSV generator itself is verified working via unit tests (`test_organisation_bulk_screening.ts`), but no physical CSV file from the live browser session was piped to disk.
2. **Deep-Route Live Screenshots for `/dashboard` and `/admin`:**
   - **Status:** **UNAVAILABLE**
   - **Reason:** Direct navigation to protected routes returned Vercel 404 (due to missing SPA rewrites), and client-side navigation was redirected to `/login` because live Supabase access requires active authentication credentials.
