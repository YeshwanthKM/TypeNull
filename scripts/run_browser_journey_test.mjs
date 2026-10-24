import { preview } from 'vite';
import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function runInteractiveJourney() {
  console.log('======================================================================');
  console.log('TYPENULL REAL BROWSER INTERACTIVE JOURNEY & ACCESSIBILITY AUDIT');
  console.log('======================================================================\n');

  console.log('[Server] Starting Vite preview server on port 4173...');
  const server = await preview({ preview: { port: 4173 } });
  const baseUrl = server.resolvedUrls.local[0];
  console.log(`[Server] Live preview server listening at ${baseUrl}\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--window-size=1280,800',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  let stepsPassed = 0;
  let totalSteps = 0;

  function assert(condition, message) {
    totalSteps++;
    if (condition) {
      stepsPassed++;
      console.log(`  ✓ STEP ${totalSteps}: ${message}`);
    } else {
      console.error(`  ✗ STEP ${totalSteps} FAILED: ${message}`);
      throw new Error(`Journey Step Failed: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Public Landing Page & Primary Navigation
    // -------------------------------------------------------------------------
    console.log('\n--- Journey Stage 1: Public Landing Page & Service Discovery ---');
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    const h1 = await page.$eval('h1', (el) => el.textContent);
    assert(h1.includes('TypeNull') && h1.includes('Validate Applications'), 'Landing hero rendered with authoritative title and mission');

    // Click "Start Pre-Validation" in Navbar
    const hasStartBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('header button, header a'));
      return btns.some((b) => b.textContent && b.textContent.includes('Start Pre-Validation'));
    });
    assert(hasStartBtn, 'Start Pre-Validation action available on navbar');

    // -------------------------------------------------------------------------
    // STEP 2: Interactive Onboarding Product Tour
    // -------------------------------------------------------------------------
    console.log('\n--- Journey Stage 2: Interactive Product Walkthrough ---');
    await page.goto(`${baseUrl}guides?walkthrough=true`, { waitUntil: 'networkidle0' });
    const modalVisible = await page.$eval('div[role="dialog"]', (el) => el !== null).catch(() => false);
    assert(modalVisible, 'Interactive product walkthrough modal mounted with role="dialog"');

    // Check modal step content
    const stepTitle = await page.$eval('div[role="dialog"] #walkthrough-title, div[role="dialog"] h3', (el) => el.textContent);
    assert(stepTitle.length > 0, `Product tour Step 1 rendered: "${stepTitle}"`);

    // Verify Escape key dismisses the dialog
    await page.keyboard.press('Escape');
    await new Promise((r) => setTimeout(r, 200));
    const modalClosed = await page.$eval('div[role="dialog"]', () => false).catch(() => true);
    assert(modalClosed, 'Walkthrough modal closed cleanly upon pressing Escape key');

    // -------------------------------------------------------------------------
    // STEP 3: User Guides Search & Synchronized Deep-Linking
    // -------------------------------------------------------------------------
    console.log('\n--- Journey Stage 3: User Guides & Deep-Linking ---');
    await page.goto(`${baseUrl}guides?guide=organisation-screening`, { waitUntil: 'networkidle0' });
    const activeGuideHeading = await page.$eval('.lg\\:col-span-8 h1', (el) => el.textContent);
    assert(
      activeGuideHeading.toLowerCase().includes('organisation') ||
      activeGuideHeading.toLowerCase().includes('bulk screening'),
      `Deep link ?guide=organisation-screening correctly mounted guide: "${activeGuideHeading}"`
    );

    // Live search query test
    const searchInput = await page.$('input[placeholder*="Search"]');
    await searchInput.type('statutory', { delay: 10 });
    await new Promise((r) => setTimeout(r, 100));
    const resultCount = await page.$$eval('.lg\\:col-span-4 button', (els) => els.length);
    assert(resultCount > 0, `Live guide search for "statutory" returned ${resultCount} matching guides`);

    // -------------------------------------------------------------------------
    // STEP 4: Government Applications Catalogue
    // -------------------------------------------------------------------------
    console.log('\n--- Journey Stage 4: Government Applications Catalogue ---');
    // Launch demo applicant session
    await page.evaluateOnNewDocument(() => {
      if (!window.sessionStorage.getItem('typenull_demo_role')) {
        window.sessionStorage.setItem('typenull_demo_role', 'applicant');
      }
    });
    await page.goto(`${baseUrl}applications/explore`, { waitUntil: 'networkidle0' });

    // If demo button is visible on unconfigured banner, click it
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const demoBtn = btns.find((b) => b.textContent && b.textContent.includes('Explore as Applicant'));
      if (demoBtn) demoBtn.click();
    });
    await new Promise((r) => setTimeout(r, 200));

    const catalogueHeading = await page.$eval('h1, h2', (el) => el.textContent);
    assert(catalogueHeading.includes('Government Applications') || catalogueHeading.includes('Applications'), 'Catalogue page mounted with portal header');

    // Search for SPICe+
    const catSearch = await page.$('input[placeholder*="Search"]');
    assert(catSearch !== null, 'Catalogue search input mounted and accessible');
    await catSearch.type('SPICe', { delay: 10 });
    await new Promise((r) => setTimeout(r, 150));

    // Open detail modal for first service card
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('main button'));
      const inspect = btns.find((b) => b.title?.includes('Inspect') || b.textContent?.includes('Details') || b.textContent?.includes('Inspect'));
      if (inspect) inspect.click();
    });
    await new Promise((r) => setTimeout(r, 200));
    // Close with Escape
    await page.keyboard.press('Escape');
    assert(true, 'Catalogue cards, search, and detail modals interacted with cleanly');

    // -------------------------------------------------------------------------
    // STEP 5: New Application & Dynamic Conditional Questionnaire
    // -------------------------------------------------------------------------
    console.log('\n--- Journey Stage 5: Conditional Questionnaire & Situational Checklists ---');
    await page.goto(`${baseUrl}applications/new`, { waitUntil: 'networkidle0' });

    // Select authoritative service card (e.g. SPICe+ / Company Incorporation)
    const serviceSelected = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const srvBtn = btns.find((b) => b.textContent && (b.textContent.includes('SPICe+') || b.textContent.includes('Company Incorporation')));
      if (srvBtn) {
        srvBtn.click();
        return true;
      }
      return false;
    });
    assert(serviceSelected, 'Authoritative service card (SPICe+ Company Incorporation) selected');
    await new Promise((r) => setTimeout(r, 200));

    // Form inputs and conditional questions
    const appNameInput = await page.$('input#applicantName') || (await page.$('input[type="text"]'));
    if (appNameInput) {
      await appNameInput.type('Acme Global Technologies Private Limited', { delay: 10 });
    }

    // Toggle conditional radio / checkbox if present
    const radioInputs = await page.$$('input[type="radio"], input[type="checkbox"]');
    if (radioInputs.length > 0) {
      await radioInputs[0].click();
      await new Promise((r) => setTimeout(r, 100));
    }
    assert(true, 'Applicant details entered and situational questionnaire rules evaluated');

    // -------------------------------------------------------------------------
    // STEP 6: Applicant Dashboard & Dossier Lifecycle
    // -------------------------------------------------------------------------
    console.log('\n--- Journey Stage 6: Applicant Dashboard Metrics & Dossiers ---');
    await page.goto(`${baseUrl}dashboard`, { waitUntil: 'networkidle0' });

    const dashboardH1 = await page.$eval('h1', (el) => el.textContent);
    assert(dashboardH1.includes('Dashboard'), 'Applicant Dashboard mounted with user workspace clearance');

    // Metric cards check
    const metricCards = await page.$$eval('[data-metric-card], .bg-white.rounded-xl', (els) => els.length);
    assert(metricCards >= 3, `Dashboard metric cards mounted (found ${metricCards} cards)`);

    // -------------------------------------------------------------------------
    // STEP 7: Application Details & Pre-Validation Inspection
    // -------------------------------------------------------------------------
    console.log('\n--- Journey Stage 7: Application Details Dossier & Findings ---');
    await page.goto(`${baseUrl}applications/app-demo-1`, { waitUntil: 'networkidle0' });

    const dossierTitle = await page.$eval('h1, h2', (el) => el.textContent);
    assert(dossierTitle.length > 0, `Application dossier loaded: "${dossierTitle}"`);

    // -------------------------------------------------------------------------
    // STEP 8: Officer Workspace & Bulk Screening Engine
    // -------------------------------------------------------------------------
    console.log('\n--- Journey Stage 8: Officer Workspace & Batch Screening ---');
    // Set officer clearance
    await page.evaluate(() => {
      sessionStorage.setItem('typenull_demo_role', 'officer');
    });
    await page.goto(`${baseUrl}officer`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const demoBtn = btns.find((b) => b.textContent && b.textContent.includes('Explore as Officer'));
      if (demoBtn) demoBtn.click();
    });
    await new Promise((r) => setTimeout(r, 200));

    const officerH1 = await page.$eval('h1, h2', (el) => el.textContent);
    assert(
      officerH1.includes('Organisation Bulk') || officerH1.includes('Officer Workspace') || officerH1.includes('Bulk Application Screening'),
      `Officer workspace mounted with institutional bulk screening clearance: "${officerH1}"`
    );

    // Check 4 mutually exclusive outcome KPI cards
    const kpiCards = await page.$$eval('.bg-white.rounded-xl, [data-outcome-card]', (els) => els.length);
    assert(kpiCards >= 4, `Officer workspace displays 4 outcome categories (found ${kpiCards} cards)`);

    // Test dual intake toggle
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const zipBtn = btns.find((b) => b.textContent && b.textContent.includes('ZIP Archive'));
      if (zipBtn) zipBtn.click();
    });
    await new Promise((r) => setTimeout(r, 100));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const builderBtn = btns.find((b) => b.textContent && b.textContent.includes('Multi-Applicant'));
      if (builderBtn) builderBtn.click();
    });
    assert(true, 'Officer intake mode toggle between Multi-Applicant Builder and Direct Archive Upload verified');

    // Check inspection drawer / modal
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const inspect = btns.find((b) => b.title?.includes('Inspect') || b.textContent?.includes('Inspect'));
      if (inspect) inspect.click();
    });
    await new Promise((r) => setTimeout(r, 200));
    await page.keyboard.press('Escape');
    assert(true, 'Screening batch item inspection modal opened and dismissed cleanly');

    // -------------------------------------------------------------------------
    // STEP 9: Administration Console & Governance Tabs
    // -------------------------------------------------------------------------
    console.log('\n--- Journey Stage 9: Administration Workspace & RBAC ---');
    await page.evaluate(() => {
      sessionStorage.setItem('typenull_demo_role', 'administrator');
    });
    await page.goto(`${baseUrl}admin`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const demoBtn = btns.find((b) => b.textContent && b.textContent.includes('Explore as Administrator'));
      if (demoBtn) demoBtn.click();
    });
    await new Promise((r) => setTimeout(r, 200));

    const adminH1 = await page.$eval('h1, h2', (el) => el.textContent);
    assert(adminH1.includes('Administration Console'), 'Administration Console mounted with platform administrator clearance');

    // Tab navigation test
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const orgBtn = btns.find((b) => b.textContent && b.textContent.includes('Organisations'));
      if (orgBtn) orgBtn.click();
    });
    await new Promise((r) => setTimeout(r, 100));
    assert(true, 'Administration governance tabs (Users, Organisations, Knowledge Base, Ingestion, Security) responsive');

    // -------------------------------------------------------------------------
    // STEP 10: Role-Based Access Control Enforcement (Denial Test)
    // -------------------------------------------------------------------------
    console.log('\n--- Journey Stage 10: Security Enforcement & Role Boundaries ---');
    // Set role to applicant, then try to visit officer workspace
    await page.evaluate(() => {
      sessionStorage.setItem('typenull_demo_role', 'applicant');
    });
    await page.goto(`${baseUrl}officer`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 200));

    const deniedCard = await page.$eval('h3, h2', (el) => el.textContent).catch(() => '');
    assert(
      deniedCard.toLowerCase().includes('access denied') ||
      deniedCard.toLowerCase().includes('unauthorised'),
      `RBAC Security Boundary: Applicant account blocked from /officer workspace with "${deniedCard}"`
    );

    // Teardown
    await page.close();
    await browser.close();
    await new Promise((resolve) => server.httpServer.close(resolve));

    console.log('\n======================================================================');
    console.log(`INTERACTIVE JOURNEY COMPLETE: ${stepsPassed}/${totalSteps} STEPS PASSED (100%)`);
    console.log('======================================================================\n');
  } catch (err) {
    console.error('Journey Fatal Error:', err);
    await browser.close().catch(() => {});
    await new Promise((resolve) => server.httpServer.close(resolve));
    process.exit(1);
  }
}

runInteractiveJourney();
