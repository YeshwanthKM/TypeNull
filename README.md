# TypeNull

> **AI-Powered Application Validation, Document Authentication and Regulatory Compliance Intelligence**

TypeNull is a responsive, AI-assisted document and application verification platform designed for Smart India Hackathon (SIH) 2026. The platform bridges the gap between raw document submissions, applicant claims, and strict statutory compliance standards through structured verification pipelines.

---

## Project Overview

- **Problem Addressed**: Large-scale application processing across public, educational, and institutional bodies is frequently undermined by fraudulent submissions, cross-document discrepancies, manual inspection bottlenecks, and difficult compliance verification.
- **Solution**: TypeNull processes application submissions and document proof captured from desktop uploads or mobile cameras. It systematically verifies document integrity, cross-references claims against submitted evidence, performs reference-record matching, and compiles evidence-linked audit reports.
- **Development Strategy**: Phased, incremental implementation following strict software engineering, data privacy, and auditability standards.

---

## Phase Status Summary

- [x] **Phase 0: Safe Project Initialisation**
  - Modern React 18 + TypeScript + Vite architecture.
  - Tailwind CSS styling tailored for mobile-first responsiveness, high contrast, and accessibility.
  - Vercel deployment configuration (`vercel.json`).
  - Safe Supabase integration template (`.env.example` and `src/lib/supabase.ts`).
- [x] **Phase 1: Frontend Foundation and Responsive UI**
  - Reusable application layout (`AppLayout`) with desktop sidebar, mobile drawer, and bottom quick-bar.
  - Comprehensive design system components (`Button`, `FormInput`, `FormSelect`, `FormTextarea`, `StatusBadge`, `EmptyState`, `LoadingState`, `ErrorMessage`, `PageHeader`).
  - Active routes: `/`, `/dashboard`, `/applications/new`, `/applications/:id`, `/settings`.
- [x] **Phase 2: Supabase Integration & Authentication**
  - Reusable, persistent Supabase client with safe unconfigured fallbacks.
  - User Authentication with Supabase Auth (`/login`, `/register`, `/forgot-password`, `/reset-password`).
  - Protected route guard (`ProtectedRoute`) redirecting unauthenticated users to `/login`.
  - Database migration (`supabase/migrations/001_initial_schema.sql`) for `profiles` and `applications` tables.
  - Automatic `handle_new_user` trigger for profile initialization.
  - Strict Row-Level Security (RLS) policies enforcing user isolation (`auth.uid() = user_id`).
- [x] **Phase 3: Secure Document Ingestion & Storage** *(Current)*
  - Private Supabase Storage bucket (`application-documents`) with strict RLS storage policies.
  - Secure path layout: `{user_id}/{application_id}/{unique_file_id}.{extension}`.
  - Document metadata persistence table (`public.application_documents`) via `002_document_storage.sql`.
  - Supported uploads: PDF, JPG, PNG up to 10 MB with format validation.
  - Native mobile camera scanner (`capture="environment"` and image preview stage).
  - Short-lived signed URLs (15 minutes) for private document previews and downloads.
  - Safe document deletion removing both database metadata and storage objects.
  - Atomic cleanup: removes orphaned storage objects if database metadata insertion fails.
- [ ] **Phase 4: OCR Text Extraction & Cross-Document Validation** *(Next)*
- [ ] **Phase 5: Regulatory Compliance Intelligence & Audit Reports**

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 (`react`, `react-dom`) | Declarative, component-based user interface |
| **Language** | TypeScript 5 | Static type safety and contract integrity |
| **Build Tool & Dev Server** | Vite 6 | Fast HMR, Rollup vendor code-splitting |
| **Styling** | Tailwind CSS 3 | Utility-first, mobile-responsive layout system |
| **Routing** | React Router 6 | Client-side routing with SPA fallback |
| **Iconography** | Lucide React | Lightweight SVG icons |
| **Backend & Database** | Supabase (PostgreSQL 15) | Relational persistence, Row-Level Security |
| **File Storage** | Supabase Storage (Private) | Private S3-compatible document storage vault |
| **Authentication** | Supabase Auth | Secure session management, JWTs, password resets |
| **Hosting & Deployment** | Vercel | Global CDN edge hosting for modern SPAs |
| **Version Control** | Git | Distributed version tracking and audit checkpoints |

---

## Database Migrations

### Migration 001: Core Schema & Auth
File: [`supabase/migrations/001_initial_schema.sql`](file:///Users/yeshwanth/Documents/Projects/TypeNull/supabase/migrations/001_initial_schema.sql)
- Creates `public.profiles` and `public.applications`.
- Provisions `handle_new_user` signup trigger on `auth.users`.
- Enables Row-Level Security (RLS) on both tables with `auth.uid() = user_id`.

### Migration 002: Document Metadata & Storage Bucket
File: [`supabase/migrations/002_document_storage.sql`](file:///Users/yeshwanth/Documents/Projects/TypeNull/supabase/migrations/002_document_storage.sql)
- Creates `public.application_documents` table with foreign keys and RLS.
- Creates private `application-documents` storage bucket (10 MB file size limit).
- Configures RLS policies on `storage.objects` enforcing user isolation:
  - Users can only read, upload, and delete objects prefixed with their own `auth.uid()`.

---

## Document Intake Architecture (Phase 3)

### 1. File Upload & Mobile Camera Capture
- **Choose File**: Standard desktop and mobile file picker for PDF, JPG, and PNG files.
- **Take Photo**: Direct camera access on mobile devices using `accept="image/*"` and `capture="environment"`.
- **Pre-upload Validation**:
  - Enforces 10 MB per file maximum.
  - Rejects HEIC/HEIF with an informative message requesting conversion.
  - Provides instant image preview and retake options before uploading.
- **Storage Path Partitioning**:
  `{user_id}/{application_id}/{unique_file_id}.{extension}`
  Prevents filename collisions and user enumeration attacks.

### 2. Document Access Security
- Storage bucket is strictly **private**. Direct public object URLs do not exist.
- Documents are viewed and downloaded via **short-lived signed URLs** generated on demand (15-minute expiration).
- Deleting a document removes both the PostgreSQL metadata row and the physical object from Supabase Storage.

---

## Local Development Instructions

```bash
cd /Users/yeshwanth/Documents/Projects/TypeNull

# Start dev server
npm run dev

# Run production build
npm run build

# Preview build locally
npm run preview
```

---

## Deployment & Supabase Setup

1. **Apply Migration 002 in Supabase**:
   - Open **Supabase Dashboard &rarr; SQL Editor**.
   - Copy and paste [`supabase/migrations/002_document_storage.sql`](file:///Users/yeshwanth/Documents/Projects/TypeNull/supabase/migrations/002_document_storage.sql).
   - Click **Run**.
2. **Push Code to GitHub**:
   - Any push to `main` auto-deploys to Vercel.
