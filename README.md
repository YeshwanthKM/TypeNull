# TypeNull

> **AI-Powered Application Validation, Document Authentication and Regulatory Compliance Intelligence**

TypeNull is a responsive, AI-assisted document and application verification platform designed for Smart India Hackathon (SIH) 2026. The platform bridges the gap between raw document submissions, applicant claims, and strict statutory compliance standards through structured verification pipelines.

---

## Project Overview

- **Problem Addressed**: Large-scale application processing across public, educational, and institutional bodies is frequently undermined by fraudulent submissions, cross-document discrepancies, manual inspection bottlenecks, and difficult compliance verification.
- **Solution**: TypeNull processes application submissions and document proof captured from desktop uploads or mobile cameras. It systematically verifies document integrity, cross-references claims against submitted evidence, performs reference-record matching, and compiles evidence-linked audit reports.
- **Development Strategy**: Phased, incremental implementation following strict software engineering and auditability standards.

---

## Phase Status Summary

- [x] **Phase 0: Safe Project Initialisation**
  - Modern React 18 + TypeScript + Vite architecture.
  - Tailwind CSS styling tailored for mobile-first responsiveness, high contrast, and accessibility.
  - Vercel deployment configuration (`vercel.json`).
  - Safe Supabase integration template (`.env.example` and `src/lib/supabase.ts`).
- [x] **Phase 1: Frontend Foundation and Responsive UI** *(Current)*
  - Reusable application layout (`AppLayout`) with desktop sidebar, mobile drawer, and bottom quick-bar.
  - Comprehensive design system components (`Button`, `FormInput`, `FormSelect`, `FormTextarea`, `StatusBadge`, `EmptyState`, `LoadingState`, `ErrorMessage`, `PageHeader`).
  - Active routes:
    - `/`: Landing page (with direct "Get Started" navigation to Dashboard).
    - `/dashboard`: Verification Dashboard with honest summary cards, empty states, and action triggers.
    - `/applications/new`: New Application Intake Form with client-side validation and prototype persistence notice.
    - `/applications/:id`: Application Details Review placeholder layout.
    - `/settings`: Settings and System Governance placeholder layout.
  - Verified responsive design across 360px, 390px, 768px, 1024px, and 1440px viewports.
- [ ] **Phase 2: Supabase Integration & Authentication** *(Next)*
  - PostgreSQL schema creation, Supabase Auth user sessions, and Supabase Storage buckets.
- [ ] **Phase 3: Document Ingestion, Camera Capture & OCR Extraction**
- [ ] **Phase 4: Cross-Document Validation Engine & Discrepancy Matrix**
- [ ] **Phase 5: Regulatory Compliance Intelligence & Evidence Reports**

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 (`react`, `react-dom`) | Declarative, component-based user interface |
| **Language** | TypeScript 5 | Static type safety and contract integrity |
| **Build Tool & Dev Server** | Vite 6 | Fast HMR and optimized production bundling |
| **Styling** | Tailwind CSS 3 | Utility-first, mobile-responsive layout system |
| **Routing** | React Router 6 | Client-side routing with SPA fallback |
| **Iconography** | Lucide React | Clean, lightweight SVG icons |
| **Backend & Storage** | Supabase *(Phase 2)* | PostgreSQL database, Supabase Auth, and Storage |
| **Deployment & Hosting** | Vercel | Global CDN edge hosting for modern SPAs |
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
│   │   │   └── PhaseModal.tsx       # Phase informational modal
│   │   ├── landing/
│   │   │   ├── Hero.tsx             # Hero section with primary & secondary CTAs
│   │   │   └── FeaturesOverview.tsx # 3-Pillar capability breakdown & pipeline
│   │   ├── layout/
│   │   │   ├── AppHeader.tsx        # Application console top navigation bar
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
│   ├── layouts/
│   │   ├── MainLayout.tsx           # Public website layout shell
│   │   └── AppLayout.tsx            # Authenticated console layout shell
│   ├── lib/
│   │   └── supabase.ts              # Safe Supabase client initialiser (Phase 2 ready)
│   ├── pages/
│   │   ├── LandingPage.tsx          # Public landing presentation
│   │   ├── DashboardPage.tsx        # Application console dashboard
│   │   ├── NewApplicationPage.tsx   # New application form with client validation
│   │   ├── ApplicationDetailsPlaceholder.tsx # Dossier inspection placeholder
│   │   ├── SettingsPage.tsx         # Operator settings & governance placeholder
│   │   └── NotFoundPage.tsx         # 404 client-side route fallback
│   ├── styles/
│   │   └── index.css                # Tailwind directives and base typography
│   ├── types/
│   │   └── index.ts                 # Domain interfaces and type definitions
│   ├── vite-env.d.ts                # Vite client type declarations
│   ├── App.tsx                      # Application routing matrix
│   └── main.tsx                     # Application DOM entry point
├── .env.example                     # Environment configuration template
├── .gitignore                       # Ignored files (node_modules, dist, envs)
├── index.html                       # HTML template
├── package.json                     # Project dependencies and npm scripts
├── postcss.config.js                # PostCSS configuration
├── tailwind.config.js               # Tailwind design tokens and theme extensions
├── tsconfig.json                    # TypeScript compiler configuration
├── vercel.json                      # Vercel deployment and SPA routing rewrite rules
├── vite.config.ts                   # Vite configuration with path aliases
└── README.md                        # Project documentation
```

---

## Local Development Instructions

### Prerequisites
- **Node.js**: `v18.0.0` or higher (verified on Node `v24.13.0`)
- **npm**: `v9.0.0` or higher (verified on npm `11.6.2`)

### Installation & Execution

1. Navigate to the project root directory:
   ```bash
   cd /Users/yeshwanth/Documents/Projects/TypeNull
   ```

2. Start the local development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

3. Test routes:
   - Landing Page: `http://localhost:5173/`
   - Dashboard: `http://localhost:5173/dashboard`
   - New Application Form: `http://localhost:5173/applications/new`
   - Application Review Preview: `http://localhost:5173/applications/preview-01`
   - Settings: `http://localhost:5173/settings`

4. Build for production:
   ```bash
   npm run build
   ```
   The production-ready assets will be compiled into the `dist/` directory.

---

## Deployment to Vercel

The project includes a ready `vercel.json` file ensuring single-page application (SPA) routing behaves properly on Vercel:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Steps to Deploy via Vercel Dashboard

1. **Push to Git Provider (GitHub / GitLab / Bitbucket)**:
   ```bash
   git remote add origin https://github.com/<your-username>/TypeNull.git
   git branch -M main
   git push -u origin main
   ```

2. **Import into Vercel**:
   - Log in to [vercel.com](https://vercel.com).
   - Click **Add New...** &rarr; **Project**.
   - Select your Git provider and import the `TypeNull` repository.

3. **Configure Project Settings**:
   - **Framework Preset**: Vite (detected automatically).
   - **Root Directory**: `./` (if repository root) or `Projects/TypeNull` (if monorepo).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Deploy**:
   - Click **Deploy**. Vercel will build the project and output a live preview URL.
