import { preview } from 'vite';
import puppeteer from 'puppeteer-core';

const VIEWPORTS = [
  { name: '1440x900 (Desktop)', width: 1440, height: 900 },
  { name: '1280x800 (Laptop)', width: 1280, height: 800 },
  { name: '768x1024 (Tablet)', width: 768, height: 1024 },
  { name: '390x844 (Mobile)', width: 390, height: 844 },
  { name: '375x667 (Small Mobile)', width: 375, height: 667 },
  { name: '320x700 (Narrow Mobile)', width: 320, height: 700 },
];

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function runQaMatrix() {
  console.log('======================================================================');
  console.log('TYPENULL REAL BROWSER & MOBILE RESPONSIVENESS AUTOMATED QA SUITE');
  console.log('======================================================================\n');

  // 1. Start Vite Preview Server
  console.log('[Server] Starting Vite preview server...');
  const server = await preview({ preview: { port: 4173 } });
  const baseUrl = server.resolvedUrls.local[0];
  console.log(`[Server] Live preview server listening at ${baseUrl}\n`);

  const results = [];

  // Helper to test a page at a viewport
  async function testPage(page, url, routeName, viewport, options = {}) {
    const pageErrors = [];
    const consoleListener = (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon.ico')) {
          pageErrors.push(text);
        }
      }
    };
    page.on('console', consoleListener);

    try {
      await new Promise((r) => setTimeout(r, 60));

      // Set demo role in sessionStorage if specified
      if (options.role) {
        await page.evaluateOnNewDocument((role) => {
          sessionStorage.setItem('typenull_demo_role', role);
        }, options.role);
      }

      await page.goto(baseUrl + url.replace(/^\//, ''), {
        waitUntil: 'networkidle0',
        timeout: 12000,
      });

      // Check horizontal overflow
      const overflowInfo = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const winWidth = window.innerWidth;
        const bodyWidth = document.body.scrollWidth;
        const hasOverflow = docWidth > winWidth + 1;

        let offendingElements = [];
        if (hasOverflow) {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const rect = el.getBoundingClientRect();
            if (rect.right > winWidth + 2 && !el.closest('.overflow-x-auto, [data-allow-overflow]')) {
              offendingElements.push({
                tag: el.tagName,
                class: el.className?.toString?.().slice(0, 50) || '',
                right: Math.round(rect.right),
                width: Math.round(rect.width),
              });
              if (offendingElements.length >= 3) break;
            }
          }
        }

        return {
          docWidth,
          winWidth,
          bodyWidth,
          hasOverflow,
          offendingElements,
        };
      });

      let interactionResult = 'N/A';
      if (options.interact) {
        interactionResult = await options.interact(page);
      }

      const passed = !overflowInfo.hasOverflow;
      results.push({
        route: routeName,
        url,
        viewport: viewport.name,
        width: viewport.width,
        height: viewport.height,
        hasOverflow: overflowInfo.hasOverflow,
        docWidth: overflowInfo.docWidth,
        winWidth: overflowInfo.winWidth,
        offendingElements: overflowInfo.offendingElements,
        pageErrors,
        interactionResult,
        status: passed ? 'PASS' : 'FAIL',
      });

      const icon = passed ? '✓' : '✗';
      console.log(
        `  ${icon} [${viewport.name}] ${routeName} (${url}) -> ${passed ? 'PASS' : 'OVERFLOW FAIL'} ` +
          `(scrollWidth: ${overflowInfo.docWidth}px, innerWidth: ${overflowInfo.winWidth}px)`
      );
      if (overflowInfo.hasOverflow) {
        console.warn('    Offending elements:', JSON.stringify(overflowInfo.offendingElements));
      }
    } catch (err) {
      console.error(`  ✗ [${viewport.name}] ${routeName} -> ERROR: ${err.message}`);
      results.push({
        route: routeName,
        url,
        viewport: viewport.name,
        width: viewport.width,
        height: viewport.height,
        hasOverflow: false,
        error: err.message,
        status: 'FAIL',
      });
    } finally {
      page.off('console', consoleListener);
    }
  }

  // 2. EXECUTE VIEWPORT MATRIX
  console.log('--- PHASE 1: RESPONSIVENESS & OVERFLOW MATRIX ACROSS 6 VIEWPORTS ---');

  for (const vp of VIEWPORTS) {
    console.log(`\nTesting Viewport: ${vp.name} (${vp.width}x${vp.height})`);
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        `--window-size=${vp.width},${vp.height}`,
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });

      // 1. Landing Page
      await testPage(page, '/', 'Landing Page', vp, {
        interact: async (p) => {
          if (vp.width < 1024) {
            const menuBtn = await p.$('button[aria-label="Toggle navigation menu"]');
            if (menuBtn) {
              await menuBtn.click();
              await new Promise((r) => setTimeout(r, 100));
              await menuBtn.click();
            }
          }
          return 'Nav menu verified';
        },
      });

      // 2. Guides Page
      await testPage(page, '/guides', 'User Guides', vp, {
        interact: async (p) => {
          const searchInput = await p.$('input[placeholder*="Search"]');
          if (searchInput) {
            await searchInput.type('screening', { delay: 10 });
            await new Promise((r) => setTimeout(r, 80));
            await searchInput.click({ clickCount: 3 });
            await searchInput.press('Backspace');
          }
          return 'Search filter functional';
        },
      });

      // 3. Guides Interactive Walkthrough Tour
      await testPage(page, '/guides?walkthrough=true', 'Interactive Product Tour Modal', vp, {
        interact: async (p) => {
          const modal = await p.$('div[role="dialog"]');
          if (modal) {
            await p.keyboard.press('Escape');
            return 'Walkthrough modal opened and dismissed via Escape';
          }
          return 'Modal checked';
        },
      });

      // 4. Login Page
      await testPage(page, '/login', 'Authentication: Login', vp);

      // 5. Register Page
      await testPage(page, '/register', 'Authentication: Register', vp);

      // 6. Forgot Password Page
      await testPage(page, '/forgot-password', 'Authentication: Forgot Password', vp);

      // 7. Reset Password Page
      await testPage(page, '/reset-password', 'Authentication: Reset Password', vp);

      // 8. Applicant Dashboard (in demo evaluation mode)
      await testPage(page, '/dashboard', 'Applicant Dashboard', vp, { role: 'applicant' });

      // 9. Application Catalogue
      await testPage(page, '/applications/explore', 'Government Applications Catalogue', vp, {
        role: 'applicant',
        interact: async (p) => {
          const search = await p.$('input[placeholder*="Search"]');
          if (search) {
            await search.type('incorporation', { delay: 10 });
          }
          return 'Catalogue search tested';
        },
      });

      // 10. New Application Builder
      await testPage(page, '/applications/new', 'New Application & Questionnaire', vp, {
        role: 'applicant',
        interact: async (p) => {
          const select = await p.$('select#serviceType');
          if (select) {
            await select.select('company_incorporation');
          }
          return 'Service selection tested';
        },
      });

      // 11. Application Details Dossier
      await testPage(page, '/applications/app-demo-1', 'Application Details Dossier', vp, {
        role: 'applicant',
      });

      // 12. Officer Workspace
      await testPage(page, '/officer', 'Officer Bulk Screening Workspace', vp, {
        role: 'officer',
        interact: async (p) => {
          await p.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const zipBtn = btns.find((b) => b.textContent && b.textContent.includes('ZIP Archive'));
            if (zipBtn) zipBtn.click();
          });
          return 'Officer intake toggle tested';
        },
      });

      // 13. Admin Workspace
      await testPage(page, '/admin', 'Administration Console', vp, {
        role: 'administrator',
        interact: async (p) => {
          await p.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const orgBtn = btns.find((b) => b.textContent && b.textContent.includes('Organisations'));
            if (orgBtn) orgBtn.click();
          });
          return 'Admin tabs tested';
        },
      });

      // 14. Settings Page
      await testPage(page, '/settings', 'User Settings & Clearance', vp, { role: 'applicant' });

      // 15. 404 Fallback Page
      await testPage(page, '/non-existent-qa-path', '404 Fallback', vp);

      await page.close();
    } finally {
      await browser.close().catch(() => {});
    }
  }

  // 3. SUMMARY & REPORTING
  console.log('\n======================================================================');
  console.log('BROWSER QA EXECUTION SUMMARY');
  console.log('======================================================================');

  const totalRuns = results.length;
  const passedRuns = results.filter((r) => r.status === 'PASS').length;
  const failedRuns = results.filter((r) => r.status === 'FAIL').length;

  console.log(`Total Route-Viewport Test Runs: ${totalRuns}`);
  console.log(`Passed: ${passedRuns}`);
  console.log(`Failed: ${failedRuns}`);
  console.log(`Pass Rate: ${Math.round((passedRuns / totalRuns) * 100)}%\n`);

  if (failedRuns > 0) {
    console.log('FAILED VIEWPORT-ROUTE COMBINATIONS:');
    for (const f of results.filter((r) => r.status === 'FAIL')) {
      console.log(`  - [${f.viewport}] ${f.route} (${f.url})`);
      if (f.offendingElements?.length) {
        console.log(`    Offending elements:`, f.offendingElements);
      }
      if (f.error) {
        console.log(`    Error: ${f.error}`);
      }
    }
  }

  await server.httpServer.close();
  console.log('[Teardown] Preview server stopped.\n');

  if (failedRuns > 0) {
    process.exit(1);
  }
}

runQaMatrix().catch((err) => {
  console.error('QA Suite Fatal Error:', err);
  process.exit(1);
});
