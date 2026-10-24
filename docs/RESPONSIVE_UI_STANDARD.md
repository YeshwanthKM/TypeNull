# TypeNull Permanent Mobile-First Responsive UI Standard

**Target Track:** Smart India Hackathon (SIH 2026)  
**Problem Statement:** AI-Powered Application Validation, Document Authentication, and Regulatory Compliance Verification  
**Enforcement Policy:** Mandatory across every current screen and every future UI modification.

---

## 1. Core Principles

1. **Mobile-First Foundation**: Every component, form, table, dialog, and dashboard must be designed and styled for narrow viewports (320px – 390px) first, and progressively enhanced for tablet (768px) and desktop (1024px – 1440px) using Tailwind CSS responsive prefixes (`sm:`, `md:`, `lg:`, `xl:`).
2. **Zero Unintended Horizontal Overflow**: No page may scroll horizontally. Wrap text, break long identifiers (CIN, GSTIN, PAN, UUIDs), configure flexible flexbox/grid containers with `min-w-0` on children, and contain wide tabular data within dedicated scrollable regions.
3. **Touch Ergonomics**: Interactive targets (buttons, links, select triggers, modal close icons) must target an effective touch area of approximately **44 × 44 CSS pixels** on mobile.
4. **Legibility & Input Zoom Prevention**: Mobile text inputs must use at least `16px` (`text-base md:text-sm`) font sizing to prevent unwanted mobile browser auto-zooming.
5. **No Mobile Feature Parity Loss**: Every primary action available on desktop (pre-validation, file upload, manual review, filtering, search, export) must remain discoverable and functional on mobile viewports.

---

## 2. Supported Test Viewport Targets

All layouts must be verified against these representative viewport widths:

| Viewport Width | Class | Representative Hardware / Devices | Layout Expectation |
| :--- | :--- | :--- | :--- |
| **320px** | Ultra-narrow Mobile | iPhone SE (1st gen), small Android handhelds | Single column, stacked cards, full-width actions, compact padding (`px-3`) |
| **375px** | Standard Mobile | iPhone SE (2nd/3rd gen), iPhone 12/13 Mini | Single column, responsive buttons, readable badges |
| **390px** | Modern Mobile | iPhone 12/13/14/15/16, Google Pixel, Samsung Galaxy | Single column with comfortable spacing (`px-4`), legible cards |
| **768px** | Tablet | iPad Mini / Air, Android Tablets (portrait) | 2-column grids, sidebar toggle, balanced density |
| **1024px** | Small Desktop / Tablet Landscape | iPad Pro landscape, smaller laptops | Persistent sidebar navigation, multi-column grids |
| **1440px** | Large Desktop | Modern desktop monitors, wide workstations | Centered max-width containers (`max-w-7xl mx-auto`), full data tables |

---

## 3. Screen-by-Screen Implementation Standard

### 3.1 Global Layout & Navigation
- **Header**: Persistent brand mark, touch-friendly menu toggle on mobile (`md:hidden`), profile and settings quick access.
- **Sidebar**: Desktop persistent (`hidden md:flex md:w-64`), containing portal navigation and role-based items.
- **Mobile Drawer**: Slide-out overlay drawer on mobile with backdrop blur, locked body scroll when open, ESC key dismiss, and touch close target.
- **Mobile Bottom Nav**: Sticky bottom navigation (`md:hidden fixed bottom-0 inset-x-0 z-30`) with role-specific quick links and padding-bottom offset (`pb-24`) on `<main>` so content is never obscured.
- **Root Overflow Prevention**: Root layout elements must enforce `overflow-x-hidden w-full max-w-full`.

### 3.2 Government Applications Catalogue
- **Layout**: Single column on mobile (`grid-cols-1`), expanding to 2 columns on tablet (`md:grid-cols-2`), and 3 columns on desktop (`lg:grid-cols-3`).
- **Search & Filters**: Search bar and category selector stack vertically on mobile and align horizontally on desktop (`flex-col sm:flex-row`).
- **Card Content**: Long official titles must wrap cleanly (`break-words`). Pre-validation button spans full width on narrow screens (`w-full sm:w-auto`).
- **Detail Modal**: Modal wrapper uses `p-3 sm:p-6`, `max-h-[90vh] overflow-y-auto`, and responsive sticky header with touch-accessible close button.

### 3.3 New Application & Conditional Questionnaire
- **Form Layout**: Form inputs stack in single column on mobile (`grid-cols-1 md:grid-cols-2`).
- **Questionnaire Cards**: Situational questions render full-width cards with clear radio/boolean pill selectors.
- **Tailored Checklist**: Required proofs preview renders single column on mobile with clear status badges (`Mandatory`, `Conditional`, `Alternative`).

### 3.4 Document Upload & OCR Ingestion
- **Upload Modal**: File dropzone provides touch-friendly tap targets (`p-6 text-center cursor-pointer`) and camera capture inputs.
- **Document List**: Document cards stack vertically, displaying original filename, file size, processing status, and action buttons (`Preview`, `Extract`, `Delete`).
- **Long Filenames**: Filenames enforce `truncate max-w-[200px] sm:max-w-xs md:max-w-md` so they never expand container width.

### 3.5 Pre-Validation Engine & Categorized Findings
- **KPI Summary Pills**: Render 2x2 grid on mobile (`grid-cols-2 sm:grid-cols-4`).
- **Categorized Sections**: Grouped findings headers include category icon, label, statutory distinction badge, and blocker count.
- **Card Items**: Finding items stack observed vs expected syntax grids vertically on mobile (`grid-cols-1 sm:grid-cols-3`).
- **Stale Invalidation Banner**: Notice stacks vertically with full-width refresh button on mobile (`flex-col sm:flex-row`).

### 3.6 Officer Bulk Screening & Admin Console
- **Screening Batch Cards**: Wide data tables provide deliberate horizontal scrolling wrappers (`overflow-x-auto`) or transform into stacked candidate summary cards on handheld devices.
- **Bulk Action Bar**: Action buttons wrap gracefully on small screens (`flex-wrap gap-2`).
- **Admin Tab Navigation**: Horizontal tab navigation allows touch scrolling (`overflow-x-auto whitespace-nowrap`) with hidden scrollbars for clean presentation.

---

## 4. Developer Verification Checklist (Mandatory for Every PR / UI Change)

Before any UI change is declared complete, the developer or AI agent must verify:

- [ ] Tested on 320px/375px viewport (no horizontal page scroll, no clipped buttons).
- [ ] Tested on 768px tablet viewport (grid layout behaves cleanly).
- [ ] Tested on 1024px+ desktop viewport (sidebar and max-width containers intact).
- [ ] All inputs use `text-base md:text-sm` font sizing to prevent iOS Safari auto-zoom.
- [ ] Primary buttons and touch targets have at least 40–44px height.
- [ ] Long strings (IDs, filenames, regulatory citations) have `break-all` or `truncate`.
- [ ] Dialogs and modals fit within mobile viewports with scrollable content bodies.
- [ ] Role-based access controls and permissions remain unaltered.
- [ ] `npm test` passes 100% of automated tests.
- [ ] `npm run build` succeeds cleanly with zero TypeScript errors.
