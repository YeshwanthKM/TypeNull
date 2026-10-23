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
- [x] **Phase 2: Supabase Integration & Authentication** *(Current)*
  - Reusable, persistent Supabase client with safe unconfigured fallbacks.
  - User Authentication with Supabase Auth (`/login`, `/register`, `/forgot-password`, `/reset-password`).
  - Protected route guard (`ProtectedRoute`) redirecting unauthenticated users to `/login`.
  - Database migration (`supabase/migrations/001_initial_schema.sql`) for `profiles` and `applications` tables.
  - Automatic `handle_new_user` trigger for profile initialization.
  - Strict Row-Level Security (RLS) policies enforcing user isolation (`auth.uid() = user_id`).
  - Real database persistence connecting `/applications/new`, `/dashboard`, and `/applications/:id`.
  - Real profile name management and sign-out in `/settings`.
- [ ] **Phase 3: Document Ingestion, Camera Capture & OCR Extraction** *(Next)*
- [ ] **Phase 4: Cross-Document Validation Engine & Discrepancy Matrix**
- [ ] **Phase 5: Regulatory Compliance Intelligence & Evidence Reports**

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
| **Authentication** | Supabase Auth | Secure session management, JWTs, password resets |
| **Hosting & Deployment** | Vercel | Global CDN edge hosting for modern SPAs |
| **Version Control** | Git | Distributed version tracking and audit checkpoints |

---

## Directory Structure

```text
TypeNull/
├── public/
│   └── icons/
│       └── shield-check.svg         # SVG Favicon & platform emblem
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Navbar.tsx           # Public landing navigation with mobile drawer
│   │   │   ├── Footer.tsx           # SIH metadata and platform information
│   │   │   ├── PhaseModal.tsx       # Phase informational modal
│   │   │   └── ProtectedRoute.tsx   # Session guard for application routes
│   │   ├── landing/
│   │   │   ├── Hero.tsx             # Hero section with primary & secondary CTAs
│   │   │   └── FeaturesOverview.tsx # 3-Pillar capability breakdown & pipeline
│   │   ├── layout/
│   │   │   ├── AppHeader.tsx        # Console top navbar with user profile & sign-out
│   │   │   ├── AppSidebar.tsx       # Desktop sidebar with active route highlights
│   │   │   └── MobileNavigation.tsx # Slide-out drawer and bottom quick-bar
│   │   └── ui/
│   │       ├── Button.tsx           # Accessible button (variants, sizes, loading)
│   │       ├── FormInput.tsx        # Accessible text input with error states
│   │       ├── FormSelect.tsx       # Accessible select with option mapping
│   │       ├── FormTextarea.tsx     # Accessible multi-line input
│   │       ├── StatusBadge.tsx      # Lifecycle status pill badges
│   │       ├── EmptyState.tsx       # Reusable empty list / zero-data placeholder
│   │       ├── LoadingState.tsx     # Reusable loading spinner & skeleton rows
│   │       ├── ErrorMessage.tsx     # Reusable error banner with retry support
│   │       └── PageHeader.tsx       # Standardized header with breadcrumb navigation
│   ├── contexts/
│   │   └── AuthContext.tsx          # Real Supabase user sessions & profile state
│   ├── layouts/
│   │   ├── MainLayout.tsx           # Public website layout shell
│   │   └── AppLayout.tsx            # Authenticated console layout shell
│   ├── lib/
│   │   └── supabase.ts              # Reusable Supabase client with persistent session config
│   ├── pages/
│   │   ├── LandingPage.tsx          # Public landing presentation
│   │   ├── LoginPage.tsx            # Email & password authentication
│   │   ├── RegisterPage.tsx         # Account registration with email verification
│   │   ├── ForgotPasswordPage.tsx   # Password reset dispatch
│   │   ├── ResetPasswordPage.tsx    # Password update view
│   │   ├── DashboardPage.tsx        # Real applications dashboard querying Supabase
│   │   ├── NewApplicationPage.tsx   # Form inserting applications with authenticated user_id
│   │   ├── ApplicationDetailsPlaceholder.tsx # Dossier review fetching by ID with RLS
│   │   ├── SettingsPage.tsx         # Profile name updates & sign out
│   │   └── NotFoundPage.tsx         # 404 client-side route fallback
│   ├── services/
│   │   └── applications.ts          # Supabase query functions (CRUD & RLS bounded)
│   ├── styles/
│   │   └── index.css                # Tailwind directives and base typography
│   ├── types/
│   │   └── index.ts                 # Domain interfaces and database models
│   ├── vite-env.d.ts                # Vite client type declarations
│   ├── App.tsx                      # Router and AuthProvider matrix
│   └── main.tsx                     # Application DOM entry point
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # SQL migration (profiles, applications, RLS)
├── .env.example                     # Environment configuration template
├── .gitignore                       # Ignored files (node_modules, dist, envs)
├── index.html                       # HTML template
├── package.json                     # Project dependencies and npm scripts
├── postcss.config.js                # PostCSS configuration
├── tailwind.config.js               # Tailwind design tokens and theme extensions
├── tsconfig.json                    # TypeScript compiler configuration
├── vercel.json                      # Vercel deployment and SPA routing rewrite rules
├── vite.config.ts                   # Vite configuration with chunk splitting
└── README.md                        # Project documentation
```

---

## Supabase Setup & Configuration

### 1. Create a Supabase Project
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard) and click **New project**.
2. Select an organization, choose your preferred region (e.g., `ap-south-1` for India), and set a secure database password.

### 2. Apply the Database Migration
1. In the Supabase Dashboard, go to the **SQL Editor** tab on the left sidebar.
2. Open the migration file from this repository: [`supabase/migrations/001_initial_schema.sql`](file:///Users/yeshwanth/Documents/Projects/TypeNull/supabase/migrations/001_initial_schema.sql).
3. Paste the entire SQL script into the SQL Editor and click **Run**.
4. This script sets up:
   - `public.profiles` table with automatic `handle_new_user` signup trigger.
   - `public.applications` table with check constraints (`status IN ('draft', 'submitted', 'under_review')`).
   - Performance indexes on `user_id`, `status`, and `created_at`.
   - Strict Row-Level Security (RLS) policies guaranteeing that authenticated users can only view, create, edit, or delete their own records (`auth.uid() = user_id`).

### 3. Configure Supabase Auth Redirect URLs
1. In the Supabase Dashboard, go to **Authentication &rarr; URL Configuration**.
2. Set **Site URL**:
   - Local: `http://localhost:5173`
   - Production: `https://<your-project>.vercel.app`
3. Under **Redirect URLs**, add:
   - `http://localhost:5173/**`
   - `https://<your-project>.vercel.app/**`

### 4. Configure Local Environment Variables
Create a `.env` file in the project root (never committed to Git) based on `.env.example`:

```bash
cp .env.example .env
```

Populate the public keys from **Project Settings &rarr; API** in Supabase:

```env
# Supabase Project URL
VITE_SUPABASE_URL=https://your-project-ref.supabase.co

# Supabase Anon / Publishable Key
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
```

> **Security Rule**: Never place the `service_role` key or database password in `.env` or frontend code. Only the anon/publishable key is safe for client-side use.

---

## Local Development Instructions

### Prerequisites
- **Node.js**: `v18.0.0` or higher (verified on Node `v24.13.0`)
- **npm**: `v9.0.0` or higher (verified on npm `11.6.2`)

### Running Locally

1. Navigate to the project root directory:
   ```bash
   cd /Users/yeshwanth/Documents/Projects/TypeNull
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

3. Build for production:
   ```bash
   npm run build
   ```

4. Preview the production build locally:
   ```bash
   npm run preview
   ```

---

## Authentication & Authorization Flow

- **Registration (`/register`)**:
  - Registers a new user via `supabase.auth.signUp()`.
  - The PostgreSQL `handle_new_user` trigger automatically provisions a linked record in `public.profiles`.
  - If email confirmation is enabled, a verification email is sent and the UI presents clear instructions.
- **Login (`/login`)**:
  - Authenticates credentials with `supabase.auth.signInWithPassword()`.
  - On success, stores the JWT securely in browser local storage and redirects to `/dashboard` (or the intended protected route).
- **Password Reset (`/forgot-password` & `/reset-password`)**:
  - Dispatches an official recovery link via `supabase.auth.resetPasswordForEmail()`.
  - Clicking the recovery link redirects the user to `/reset-password` where `supabase.auth.updateUser({ password })` updates their credentials.
- **Protected Routes (`ProtectedRoute`)**:
  - Routes under `/dashboard`, `/applications/new`, `/applications/:id`, and `/settings` require an active Supabase session.
  - Unauthenticated users are redirected to `/login` with return-state preservation.
- **Data Isolation**:
  - When creating an application, `user_id` is stamped directly from `session.user.id`.
  - Row-Level Security (RLS) ensures queries to `applications` return only records belonging to the authenticated user.

---

## Deployment to Vercel

### 1. Push to Remote Repository
```bash
git remote add origin https://github.com/<your-username>/TypeNull.git
git branch -M main
git push -u origin main
```

### 2. Import into Vercel
1. Log in to [vercel.com](https://vercel.com) and click **Add New... &rarr; Project**.
2. Select your Git provider and import the `TypeNull` repository.
3. Settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. **Environment Variables**: Add your Supabase credentials under **Project Settings &rarr; Environment Variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. Click **Deploy**.
