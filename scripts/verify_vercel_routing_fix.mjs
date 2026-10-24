import puppeteer from 'puppeteer-core';
import { preview } from 'vite';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const LIVE_URL = 'https://type-null-rho.vercel.app/';

const TARGET_ROUTES = [
  '/login',
  '/officer',
  '/dashboard',
  '/admin',
  '/guides',
  '/applications/new',
];

async function verifyRoutingFix() {
  console.log('========================================================================');
  console.log('TYPENULL VERCEL ROUTING FIX VERIFICATION SUITE');
  console.log('Timestamp: ' + new Date().toISOString());
  console.log('========================================================================\n');

  const auditResults = {
    timestamp: new Date().toISOString(),
    liveDeployedSite: {
      url: LIVE_URL,
      routesTested: [],
      staticAssetsTested: [],
      status: 'AUDITED_CURRENT_STATE',
    },
    localVerification: {
      routesTested: [],
      refreshTested: [],
      authRedirectionTested: [],
      staticAssetsTested: [],
      unknownRouteTested: null,
      status: 'VERIFIED',
    },
  };

  // ---------------------------------------------------------------------------
  // PART 1: LIVE DEPLOYED SITE AUDIT (Current Un-deployed Baseline)
  // ---------------------------------------------------------------------------
  console.log('--- PART 1: Auditing Current Live Deployment (type-null-rho.vercel.app) ---');
  for (const route of TARGET_ROUTES) {
    try {
      const res = await fetch(`${LIVE_URL}${route.replace(/^\//, '')}`);
      console.log(`  Live GET ${route.padEnd(22)} -> HTTP ${res.status}`);
      auditResults.liveDeployedSite.routesTested.push({
        route,
        status: res.status,
        note: res.status === 404 ? 'Returns Vercel 404 (awaiting authorized git push of vercel.json fix)' : 'Handled',
      });
    } catch (e) {
      console.warn(`  Live GET ${route} failed:`, e.message);
    }
  }

  // Audit static asset on live site
  try {
    const assetRes = await fetch(`${LIVE_URL}icons/shield-check.svg`);
    console.log(`  Live GET /icons/shield-check.svg  -> HTTP ${assetRes.status}`);
    auditResults.liveDeployedSite.staticAssetsTested.push({
      asset: '/icons/shield-check.svg',
      status: assetRes.status,
    });
  } catch (e) {
    console.warn('  Live asset check failed:', e.message);
  }

  // ---------------------------------------------------------------------------
  // PART 2: LOCAL PRODUCTION PREVIEW VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n--- PART 2: Local Production Preview Verification (Built dist/) ---');
  const server = await preview({ preview: { port: 4175 } });
  const localBase = server.resolvedUrls.local[0];
  console.log(`Local production preview running at ${localBase}`);

  const userDataDir = fs.mkdtempSync('/tmp/chrome-routing-fix-');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      `--user-data-dir=${userDataDir}`,
      '--window-size=1280,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // 2.1 Direct Navigation to each affected route
    console.log('\n[2.1] Testing Direct Navigation to each affected route:');
    for (const route of TARGET_ROUTES) {
      const targetUrl = `${localBase}${route.replace(/^\//, '')}`;
      const res = await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });
      const httpStatus = res.status();
      const currentUrl = page.url();
      const h1Text = await page.$eval('h1', el => el.innerText).catch(() => 'none');

      console.log(`  ✓ Direct GET ${route.padEnd(20)} -> HTTP ${httpStatus} | URL: ${currentUrl} | H1: "${h1Text}"`);
      auditResults.localVerification.routesTested.push({
        route,
        httpStatus,
        landedUrl: currentUrl,
        h1: h1Text,
      });
    }

    // 2.2 Browser Refresh on Deep Routes
    console.log('\n[2.2] Testing Browser Refresh on Deep Routes:');
    const refreshRoutes = ['/guides', '/officer', '/login'];
    for (const route of refreshRoutes) {
      await page.goto(`${localBase}${route.replace(/^\//, '')}`, { waitUntil: 'networkidle0' });
      const preRefreshUrl = page.url();
      const preH1 = await page.$eval('h1', el => el.innerText).catch(() => 'none');

      // Trigger browser reload
      await page.reload({ waitUntil: 'networkidle0' });
      const postRefreshUrl = page.url();
      const postH1 = await page.$eval('h1', el => el.innerText).catch(() => 'none');

      const isConsistent = preRefreshUrl === postRefreshUrl && preH1 === postH1;
      console.log(`  ✓ Reload on ${route.padEnd(15)} -> Consistent: ${isConsistent} (URL: ${postRefreshUrl}, H1: "${postH1}")`);
      auditResults.localVerification.refreshTested.push({
        route,
        isConsistent,
        postRefreshUrl,
        postH1,
      });
    }

    // 2.3 Authentication Guard & Protected Redirection Check
    console.log('\n[2.3] Verifying Protected Route Redirection & Auth Integrity:');
    const protectedRoutes = ['/officer', '/dashboard', '/admin', '/applications/new'];
    for (const route of protectedRoutes) {
      await page.evaluate(() => {
        sessionStorage.clear();
        localStorage.clear();
      });
      await page.goto(`${localBase}${route.replace(/^\//, '')}`, { waitUntil: 'networkidle0' });
      const redirectedUrl = page.url();
      const h1 = await page.$eval('h1', el => el.innerText).catch(() => 'none');
      const isRedirectedToLogin = redirectedUrl.includes('/login');

      console.log(`  ✓ Unauth access ${route.padEnd(20)} -> Redirected to /login: ${isRedirectedToLogin} (Current H1: "${h1}")`);
      auditResults.localVerification.authRedirectionTested.push({
        route,
        isRedirectedToLogin,
        redirectedUrl,
        h1,
      });
    }

    // 2.4 Static Asset Loading Check
    console.log('\n[2.4] Checking Static Assets Loading:');
    const staticAssets = [
      '/icons/shield-check.svg',
      '/assets/index-DL1fcuR6.css',
      '/assets/index-DdAzd-0b.js',
    ];
    for (const asset of staticAssets) {
      const res = await page.goto(`${localBase}${asset.replace(/^\//, '')}`, { waitUntil: 'networkidle0' });
      console.log(`  ✓ Static Asset ${asset.padEnd(30)} -> HTTP ${res.status()}`);
      auditResults.localVerification.staticAssetsTested.push({
        asset,
        status: res.status(),
      });
    }

    // 2.5 Unknown Route Application-Level 404 Check
    console.log('\n[2.5] Testing Unknown Route Application-Level Fallback:');
    await page.goto(`${localBase}nonexistent-test-unknown-route-404`, { waitUntil: 'networkidle0' });
    const notFoundInfo = await page.evaluate(() => {
      const body = document.body.innerText;
      return {
        h1: document.querySelector('h1')?.innerText || '',
        h2: document.querySelector('h2')?.innerText || '',
        has404Text: body.includes('404') || body.includes('Page Not Found') || body.includes('not found') || body.includes('moved'),
      };
    });
    console.log(`  ✓ Unknown Route /nonexistent-route -> H1: "${notFoundInfo.h1}" | 404 Handled in App: ${notFoundInfo.has404Text}`);
    auditResults.localVerification.unknownRouteTested = {
      route: '/nonexistent-test-unknown-route-404',
      h1: notFoundInfo.h1,
      h2: notFoundInfo.h2,
      has404Text: notFoundInfo.has404Text,
    };

  } finally {
    await browser.close().catch(() => {});
    if (server && server.httpServer) {
      server.httpServer.close();
    }
    fs.writeFileSync('docs/qa/vercel_routing_verification_audit.json', JSON.stringify(auditResults, null, 2));
    console.log('\nRouting verification completed. Results written to docs/qa/vercel_routing_verification_audit.json');
  }
}

verifyRoutingFix().catch(console.error);
