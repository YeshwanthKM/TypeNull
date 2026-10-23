# TypeNull

> **AI-Powered Application Validation, Document Authentication and Regulatory Compliance Intelligence**

TypeNull is a responsive, AI-assisted document and application verification platform designed for Smart India Hackathon (SIH) 2026. The platform bridges the gap between raw document submissions, applicant claims, and strict statutory compliance standards through structured verification pipelines.

---

## Project Overview

- **Problem Addressed**: Large-scale application processing across public, educational, and institutional bodies is frequently undermined by fraudulent submissions, cross-document discrepancies, manual inspection bottlenecks, and difficult compliance verification.
- **Solution**: TypeNull processes application submissions and document proof captured from desktop uploads or mobile cameras. It systematically verifies document integrity, cross-references claims against submitted evidence, performs reference-record matching, and compiles evidence-linked audit reports.
- **Development Strategy**: Phased, incremental implementation following strict software engineering and auditability standards.

---

## Phase 0: Safe Project Initialisation (Current Status)

This initial phase establishes the foundational codebase, build infrastructure, responsive frontend shell, and deployment configuration:

- [x] Modern React 18 + TypeScript + Vite architecture.
- [x] Tailwind CSS styling tailored for mobile-first responsiveness, high contrast, and accessibility.
- [x] React Router setup with SPA fallback.
- [x] Clean directory structure prepared for modular expansion.
- [x] Supabase integration architecture prepared (`.env.example` and `src/lib/supabase.ts`) without hardcoded or mock credentials.
- [x] Vercel deployment configuration (`vercel.json`).
- [x] Initial Git checkpoint created.

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
│       └── shield-check.svg     # SVG Favicon & platform emblem
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Navbar.tsx       # Accessible responsive navbar with mobile drawer
│   │   │   ├── Footer.tsx       # SIH metadata and platform information
│   │   │   └── PhaseModal.tsx   # Interactive Phase status modal
│   │   └── landing/
│   │       ├── Hero.tsx         # Hero section with primary & secondary CTAs
│   │       └── FeaturesOverview.tsx # 3-Pillar capability breakdown & pipeline
│   ├── layouts/
│   │   └── MainLayout.tsx       # Root layout coordinator
│   ├── lib/
│   │   └── supabase.ts          # Safe Supabase client initialiser (Phase 2 ready)
│   ├── pages/
│   │   ├── LandingPage.tsx      # Main landing presentation
│   │   └── NotFoundPage.tsx     # 404 client-side route fallback
│   ├── styles/
│   │   └── index.css            # Tailwind directives and base typography
│   ├── types/
│   │   └── index.ts             # Domain interfaces and type definitions
│   ├── App.tsx                  # Router configuration
│   └── main.tsx                 # Application DOM entry point
├── .env.example                 # Environment configuration template
├── .gitignore                   # Ignored files (node_modules, dist, envs)
├── index.html                   # HTML template
├── package.json                 # Project dependencies and npm scripts
├── postcss.config.js            # PostCSS configuration
├── tailwind.config.js           # Tailwind design tokens and theme extensions
├── tsconfig.json                # TypeScript compiler configuration
├── vercel.json                  # Vercel deployment and SPA routing rewrite rules
├── vite.config.ts               # Vite configuration with path aliases
└── README.md                    # Project documentation
```

---

## Local Development Instructions

### Prerequisites
- **Node.js**: `v18.0.0` or higher (verified on Node `v24.13.0`)
- **npm**: `v9.0.0` or higher (verified on npm `11.6.2`)
- **Git**

### Installation

1. Navigate to the project root directory:
   ```bash
   cd /Users/yeshwanth/Documents/Projects/TypeNull
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

4. Build for production:
   ```bash
   npm run build
   ```
   The production-ready assets will be compiled into the `dist/` directory.

5. Preview the production build locally:
   ```bash
   npm run preview
   ```

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
   - Create a new remote repository for `TypeNull`.
   - Add the remote and push your code:
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

4. **Environment Variables**:
   - For Phase 0, no environment variables are strictly required to build and run the landing page.
   - For Phase 2 (Supabase integration), add the following under **Project Settings &rarr; Environment Variables**:
     - `VITE_SUPABASE_URL`: Your Supabase project URL.
     - `VITE_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon / publishable key.

5. **Deploy**:
   - Click **Deploy**. Vercel will build the project and output a live preview URL.

---

## Upcoming Phases

- **Phase 1**: Application Form & Document Capture Architecture (File uploader, camera capture, applicant intake schemas).
- **Phase 2**: Supabase Integration (PostgreSQL schemas, Supabase Auth, Row Level Security, Supabase Storage buckets).
- **Phase 3**: OCR Extraction & Field Normalisation.
- **Phase 4**: Cross-Document Validation Engine & Discrepancy Matrix.
- **Phase 5**: Regulatory Rule Engine & Evidence-Linked Audit Reports.
