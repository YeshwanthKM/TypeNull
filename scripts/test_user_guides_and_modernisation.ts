/**
 * Automated Verification: Product Modernisation & User Guidance Module
 * Validates:
 * 1. Product Guides content completeness and search filtering
 * 2. Interactive Walkthrough step sequence and configuration
 * 3. Strict removal of hackathon, competition, and obsolete phase labels from src/
 * 4. Route consistency and legal notices
 */

import fs from 'fs';
import path from 'path';
import { PRODUCT_GUIDES, searchGuides, getGuideById } from '../src/components/guides/UserGuidesData';
import { WALKTHROUGH_STEPS } from '../src/components/guides/InteractiveWalkthrough';

let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition: boolean, message: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('\n======================================================');
console.log('TYPENULL PRODUCT MODERNISATION & GUIDES TEST SUITE');
console.log('======================================================\n');

// ---------------------------------------------------------------------
// TEST GROUP 1: USER GUIDANCE MODULE INTEGRITY
// ---------------------------------------------------------------------
console.log('TEST GROUP 1: Product Guides Data & Architecture');

assert(Array.isArray(PRODUCT_GUIDES), 'PRODUCT_GUIDES is an array');
assert(PRODUCT_GUIDES.length === 5, `Expected 5 complete product guides, found ${PRODUCT_GUIDES.length}`);

const expectedGuideIds = [
  'individual-validation',
  'organisation-screening',
  'application-catalogue',
  'understanding-results',
  'account-access',
];

for (const expectedId of expectedGuideIds) {
  const guide = getGuideById(expectedId);
  assert(Boolean(guide), `Guide with id '${expectedId}' exists`);
  if (guide) {
    assert(guide.title.length > 5, `Guide '${expectedId}' has a descriptive title (${guide.title})`);
    assert(guide.summary.length > 20, `Guide '${expectedId}' has a detailed summary`);
    assert(Boolean(guide.category), `Guide '${expectedId}' specifies category (${guide.category})`);
    assert(Boolean(guide.badge), `Guide '${expectedId}' specifies badge (${guide.badge})`);
    assert(guide.sections.length >= 3, `Guide '${expectedId}' contains at least 3 sections (found ${guide.sections.length})`);
    for (const section of guide.sections) {
      assert(section.heading.length > 3, `Section in '${expectedId}' has a heading`);
      assert(section.content.length > 20, `Section in '${expectedId}' has detailed instructional content`);
    }
  }
}

// ---------------------------------------------------------------------
// TEST GROUP 2: USER GUIDES SEARCH & FILTERING
// ---------------------------------------------------------------------
console.log('\nTEST GROUP 2: Guides Search Functionality');

const emptyQueryResults = searchGuides('');
assert(emptyQueryResults.length === 5, 'Empty query returns all 5 guides');

const screeningResults = searchGuides('screening');
assert(
  screeningResults.some((g) => g.id === 'organisation-screening'),
  "Query 'screening' matches Organisation Bulk Screening guide"
);

const gstResults = searchGuides('GST');
assert(
  gstResults.length >= 2,
  "Query 'GST' matches relevant guides (individual validation and catalogue)"
);

const nonexistentResults = searchGuides('zyxwvutsrqp12345');
assert(nonexistentResults.length === 0, "Nonsense query returns 0 results");

// ---------------------------------------------------------------------
// TEST GROUP 3: INTERACTIVE WALKTHROUGH STRUCTURE
// ---------------------------------------------------------------------
console.log('\nTEST GROUP 3: First-Time Walkthrough Configuration');

assert(Array.isArray(WALKTHROUGH_STEPS), 'WALKTHROUGH_STEPS is an array');
assert(WALKTHROUGH_STEPS.length === 5, `Expected exactly 5 onboarding walkthrough steps, found ${WALKTHROUGH_STEPS.length}`);

for (let i = 0; i < WALKTHROUGH_STEPS.length; i++) {
  const step = WALKTHROUGH_STEPS[i];
  assert(Boolean(step.title), `Walkthrough Step ${i + 1} has a title (${step.title})`);
  assert(Boolean(step.description), `Walkthrough Step ${i + 1} has descriptive text`);
  assert(Boolean(step.category), `Walkthrough Step ${i + 1} has a category (${step.category})`);
  assert(Array.isArray(step.highlights) && step.highlights.length >= 2, `Walkthrough Step ${i + 1} has highlights`);
}

// ---------------------------------------------------------------------
// TEST GROUP 4: ZERO COMPETITION & OBSOLETE PHASE LEAKAGE
// ---------------------------------------------------------------------
console.log('\nTEST GROUP 4: Strict Removal of Hackathon & Prototype Artifacts');

function scanDirectoryForPatterns(dir: string, patterns: RegExp[]): { file: string; match: string }[] {
  const results: { file: string; match: string }[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDirectoryForPatterns(fullPath, patterns));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          results.push({ file: fullPath, match: match[0] });
        }
      }
    }
  }
  return results;
}

const srcDir = path.resolve(process.cwd(), 'src');
const forbiddenPatterns = [
  /\bSIH\b/i,
  /\bSmart\s+India\s+Hackathon\b/i,
  /\bPhase\s+[0-9]\b/i,
  /Prototype\s+Record/i,
];

const violations = scanDirectoryForPatterns(srcDir, forbiddenPatterns);
assert(
  violations.length === 0,
  `Zero user-facing hackathon or obsolete phase labels in src/ (violations found: ${violations.length})`
);

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`    Violation: ${v.file} matched '${v.match}'`);
  }
}

// ---------------------------------------------------------------------
// TEST GROUP 5: STATUTORY DISCLAIMERS & COPYRIGHT VERIFICATION
// ---------------------------------------------------------------------
console.log('\nTEST GROUP 5: Legal & Statutory Disclaimers Verification');

const footerPath = path.join(srcDir, 'components', 'common', 'Footer.tsx');
assert(fs.existsSync(footerPath), 'Footer.tsx exists');
const footerContent = fs.readFileSync(footerPath, 'utf8');

assert(
  footerContent.includes('TypeNull. All rights reserved.'),
  'Footer includes standard copyright notice'
);
assert(
  footerContent.includes('Statutory Disclaimer'),
  'Footer includes prominent Statutory Disclaimer section'
);
assert(
  footerContent.includes('independent pre-validation tool') || footerContent.includes('pre-validation'),
  'Footer explicitly states TypeNull is a pre-validation tool'
);
assert(
  footerContent.includes('/guides?guide=individual-validation'),
  'Footer links specifically to individual validation guide'
);
assert(
  footerContent.includes('/guides?guide=organisation-screening'),
  'Footer links specifically to organisation screening guide'
);

const guidesPagePath = path.join(srcDir, 'pages', 'GuidesPage.tsx');
assert(fs.existsSync(guidesPagePath), 'GuidesPage.tsx exists');
const guidesPageContent = fs.readFileSync(guidesPagePath, 'utf8');
assert(
  guidesPageContent.includes('useSearchParams'),
  'GuidesPage uses useSearchParams for URL synchronization'
);

// Verify archive accuracy in documentation (no TAR/GZ or JSON/CSV manifest claims)
const guidesDataPath = path.join(srcDir, 'components', 'guides', 'UserGuidesData.ts');
const guidesDataContent = fs.readFileSync(guidesDataPath, 'utf8');
assert(
  !guidesDataContent.includes('.tar') && !guidesDataContent.includes('.gz'),
  'User guides do not make unsupported claims about .tar or .gz archives'
);
assert(
  !guidesDataContent.includes('manifest.json') && !guidesDataContent.includes('manifest.csv'),
  'User guides do not make unsupported claims about manifest.json/csv intake'
);

const appPath = path.join(srcDir, 'App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');
assert(
  appContent.includes("path=\"guides\"") || appContent.includes("path=\"/guides\""),
  'App.tsx registers /guides route'
);

console.log('\n======================================================');
console.log(`ALL TESTS PASSED: ${passedAssertions}/${totalAssertions} assertions passed`);
console.log('======================================================\n');
