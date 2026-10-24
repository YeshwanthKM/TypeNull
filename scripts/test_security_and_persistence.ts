/**
 * TypeNull SIH 2026: Security Hardening & Ingestion Persistence Test Suite
 *
 * Automated verification of:
 * 1. Network-level IP & DNS SSRF protection (IPv4, IPv6, IPv4-mapped, link-local, cloud metadata, CGNAT).
 * 2. Redirect-based SSRF defense (manual redirect following, per-hop revalidation, loop detection, hop limits).
 * 3. Bounded streaming downloads (immediate cancellation on 15 MiB limit, no full buffering).
 * 4. Cryptographic SHA-256 provenance and magic byte inspection.
 * 5. Ingestion persistence and strict lifecycle state preservation (verified/published state retention).
 * 6. Controlled official-link discovery bounds (depth 1, max 5 per domain, max 15 total budget, query cleansing).
 */

import {
  isProhibitedIpv4,
  isProhibitedIpv6,
  isProhibitedIpAddress,
  validateOfficialGovernmentUrl,
  safeFetchGovernmentResource,
  computeSha256Hex,
  detectMagicByteFormat,
  MAX_RESOURCE_SIZE_BYTES,
  MAX_REDIRECT_LIMIT,
} from '../src/services/ingestion/safeFetch';

import {
  normalizeAndFilterGovernmentLink,
  discoverCandidateLinksFromHtml,
} from '../src/services/ingestion/discoveryPipeline';

import {
  triggerDiscoveryRun,
  getGovernmentServices,
  updateApplicationTypeLifecycle,
} from '../src/services/ingestion/ingestionService';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, description: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${description}`);
  } else {
    console.error(`  ✗ FAIL: ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
}

console.log('\n=== TypeNull SIH 2026 Security & Persistence Test Suite ===\n');

// -----------------------------------------------------------------------------
// Test Suite 1: Network-Level IP & SSRF Classification
// -----------------------------------------------------------------------------
console.log('Test Suite 1: Network-Level IP & SSRF Address Classification');

// 1. Loopback
assert(isProhibitedIpv4('127.0.0.1'), 'blocks IPv4 loopback 127.0.0.1');
assert(isProhibitedIpv4('127.0.0.100'), 'blocks entire 127.0.0.0/8 loopback subnet');
assert(isProhibitedIpv6('::1'), 'blocks IPv6 loopback ::1');

// 2. Private Subnets
assert(isProhibitedIpv4('10.0.0.1'), 'blocks Class A private IP 10.0.0.1');
assert(isProhibitedIpv4('10.254.254.254'), 'blocks Class A private boundary 10.254.254.254');
assert(isProhibitedIpv4('172.16.0.1'), 'blocks Class B private lower boundary 172.16.0.1');
assert(isProhibitedIpv4('172.31.255.255'), 'blocks Class B private upper boundary 172.31.255.255');
assert(!isProhibitedIpv4('172.32.0.1'), 'permits non-private public IP 172.32.0.1');
assert(isProhibitedIpv4('192.168.1.1'), 'blocks Class C private IP 192.168.1.1');

// 3. Link-Local & Cloud Metadata
assert(isProhibitedIpv4('169.254.169.254'), 'blocks AWS/GCP/Azure Cloud Metadata IP 169.254.169.254');
assert(isProhibitedIpv4('169.254.1.1'), 'blocks entire link-local subnet 169.254.0.0/16');
assert(isProhibitedIpv6('fe80::1'), 'blocks IPv6 link-local fe80::1');

// 4. Carrier-Grade NAT (RFC 6598)
assert(isProhibitedIpv4('100.64.0.1'), 'blocks Carrier-Grade NAT lower bound 100.64.0.1');
assert(isProhibitedIpv4('100.127.255.255'), 'blocks Carrier-Grade NAT upper bound 100.127.255.255');

// 5. Multicast & Reserved
assert(isProhibitedIpv4('224.0.0.1'), 'blocks IPv4 multicast 224.0.0.1');
assert(isProhibitedIpv4('240.0.0.1'), 'blocks IPv4 reserved/future range 240.0.0.1');
assert(isProhibitedIpv6('ff02::1'), 'blocks IPv6 multicast ff02::1');
assert(isProhibitedIpv6('fc00::1'), 'blocks IPv6 Unique Local Address (ULA) fc00::1');
assert(isProhibitedIpv6('fd12:3456::1'), 'blocks IPv6 Unique Local Address fd00::/8');

// 6. IPv4-Mapped IPv6
assert(isProhibitedIpv6('::ffff:127.0.0.1'), 'blocks IPv4-mapped IPv6 loopback ::ffff:127.0.0.1');
assert(isProhibitedIpv6('::ffff:169.254.169.254'), 'blocks IPv4-mapped IPv6 metadata ::ffff:169.254.169.254');
assert(isProhibitedIpv6('::ffff:10.0.0.5'), 'blocks IPv4-mapped IPv6 private IP ::ffff:10.0.0.5');

// 7. General isProhibitedIpAddress dispatcher
assert(isProhibitedIpAddress('127.0.0.1'), 'isProhibitedIpAddress detects IPv4 loopback');
assert(isProhibitedIpAddress('::1'), 'isProhibitedIpAddress detects IPv6 loopback');
assert(isProhibitedIpAddress('169.254.169.254'), 'isProhibitedIpAddress detects metadata IP');

// -----------------------------------------------------------------------------
// Test Suite 2: Redirect-Based SSRF Hardening & Manual Navigation
// -----------------------------------------------------------------------------
console.log('\nTest Suite 2: Redirect-Based SSRF Hardening & Manual Navigation');

const originalFetch = globalThis.fetch;

function setupMockFetch(routes: Record<string, { status: number; headers?: Record<string, string>; body?: string | Uint8Array }>) {
  globalThis.fetch = async (input: any) => {
    const urlStr = typeof input === 'string' ? input : input.url || input.toString();
    const route = routes[urlStr];
    if (route) {
      const headers = new Headers(route.headers || {});
      const body = route.body ?? 'Sample content';
      return new Response(body as any, {
        status: route.status,
        headers,
      });
    }
    return new Response('Not Found', { status: 404 });
  };
}

// 1. Block redirect to localhost / loopback
setupMockFetch({
  'https://www.mca.gov.in/redirect-to-localhost': {
    status: 302,
    headers: { Location: 'http://127.0.0.1:8080/admin' },
  },
});
const resLocalhost = await safeFetchGovernmentResource('https://www.mca.gov.in/redirect-to-localhost');
assert(resLocalhost.statusCode === 400 || resLocalhost.statusCode === 403, 'blocks redirect to loopback 127.0.0.1');
assert(resLocalhost.error?.includes('internal address') || resLocalhost.error?.includes('prohibited') || resLocalhost.error?.includes('approved'), 'reports clear security restriction for redirect to 127.0.0.1');

// 2. Block redirect to AWS metadata service
setupMockFetch({
  'https://www.mca.gov.in/redirect-to-metadata': {
    status: 302,
    headers: { Location: 'http://169.254.169.254/latest/meta-data/' },
  },
});
const resMetadata = await safeFetchGovernmentResource('https://www.mca.gov.in/redirect-to-metadata');
assert(resMetadata.statusCode === 400 || resMetadata.statusCode === 403, 'blocks redirect to cloud metadata 169.254.169.254');
assert(resMetadata.error?.includes('internal address') || resMetadata.error?.includes('prohibited') || resMetadata.error?.includes('approved'), 'reports security rejection for metadata redirect');

// 3. Block redirect to off-domain attacker portal
setupMockFetch({
  'https://www.mca.gov.in/redirect-to-attacker': {
    status: 302,
    headers: { Location: 'https://evil-attacker-site.com/steal-token' },
  },
});
const resAttacker = await safeFetchGovernmentResource('https://www.mca.gov.in/redirect-to-attacker');
assert(resAttacker.statusCode === 400, 'blocks redirect to non-allowlisted off-domain site');
assert(resAttacker.error?.includes('approved official government domains'), 'identifies unauthorized destination domain');

// 4. Successfully follow relative redirect within allowed official domain
setupMockFetch({
  'https://www.mca.gov.in/old-form-page': {
    status: 301,
    headers: { Location: '/MinistryV2/new_guidelines.pdf' },
  },
  'https://www.mca.gov.in/MinistryV2/new_guidelines.pdf': {
    status: 200,
    headers: { 'Content-Type': 'application/pdf' },
    body: '%PDF-1.7 Official Guidelines Sample Content',
  },
});
const resRelative = await safeFetchGovernmentResource('https://www.mca.gov.in/old-form-page');
assert(resRelative.statusCode === 200, 'successfully resolves and follows relative redirect on allowed domain');
assert(resRelative.url === 'https://www.mca.gov.in/MinistryV2/new_guidelines.pdf', 'records final resolved destination URL');
assert(resRelative.redirectHops === 1, 'accurately records 1 redirect hop');
assert(resRelative.detectedFormat === 'pdf', 'identifies PDF format after following redirect');

// 5. Detect and abort redirect loop
setupMockFetch({
  'https://www.mca.gov.in/loop-a': {
    status: 302,
    headers: { Location: 'https://www.mca.gov.in/loop-b' },
  },
  'https://www.mca.gov.in/loop-b': {
    status: 302,
    headers: { Location: 'https://www.mca.gov.in/loop-a' },
  },
});
const resLoop = await safeFetchGovernmentResource('https://www.mca.gov.in/loop-a');
assert(resLoop.statusCode === 310, 'detects redirect loop and aborts with status 310');
assert(resLoop.error?.includes('Redirect loop detected'), 'provides explicit redirect loop error');

// 6. Abort redirect chain exceeding max hop limit (5 hops)
const chainRoutes: Record<string, any> = {};
for (let i = 1; i <= 7; i++) {
  chainRoutes[`https://www.mca.gov.in/hop-${i}`] = {
    status: 302,
    headers: { Location: `https://www.mca.gov.in/hop-${i + 1}` },
  };
}
chainRoutes['https://www.mca.gov.in/hop-8'] = {
  status: 200,
  body: '%PDF-1.4 Done',
};
setupMockFetch(chainRoutes);
const resChain = await safeFetchGovernmentResource('https://www.mca.gov.in/hop-1');
assert(resChain.statusCode === 310, 'aborts when redirect chain exceeds maximum limit');
assert(resChain.redirectHops !== undefined && resChain.redirectHops > MAX_REDIRECT_LIMIT, 'confirms hops exceeded MAX_REDIRECT_LIMIT (5)');

// -----------------------------------------------------------------------------
// Test Suite 3: Bounded Streaming Downloads & Immediate Size Abort
// -----------------------------------------------------------------------------
console.log('\nTest Suite 3: Bounded Streaming Downloads & Immediate Size Abort');

// 1. Simulate oversized stream (>15 MiB)
let streamAborted = false;
const oversizedStreamUrl = 'https://www.mca.gov.in/oversized_document.pdf';

globalThis.fetch = async (input: any) => {
  const urlStr = typeof input === 'string' ? input : input.url || input.toString();
  if (urlStr === oversizedStreamUrl) {
    let bytesProduced = 0;
    const totalBytes = 20 * 1024 * 1024; // 20 MiB
    const chunkSize = 1024 * 1024; // 1 MiB chunks

    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (bytesProduced >= totalBytes) {
          controller.close();
          return;
        }
        const chunk = new Uint8Array(chunkSize);
        chunk.fill(0x41); // 'A'
        bytesProduced += chunkSize;
        controller.enqueue(chunk);
      },
      cancel() {
        streamAborted = true;
      },
    });

    return new Response(stream, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    });
  }
  return new Response('Not Found', { status: 404 });
};

const resOversized = await safeFetchGovernmentResource(oversizedStreamUrl);
assert(resOversized.statusCode === 413, 'immediately returns HTTP 413 for stream exceeding 15 MiB limit');
assert(streamAborted, 'dynamically aborted the streaming reader via reader.cancel()');
assert(resOversized.buffer === null, 'does NOT buffer oversized payload in memory');
assert(resOversized.error?.includes('15MB quota'), 'provides descriptive 15MB quota error message');

// 2. Cryptographic SHA-256 Provenance & Magic Bytes on Valid Stream
const validPdfText = '%PDF-1.5\nAuthoritative Gazette Notification for Central Regulations 2024';
const validPdfBuffer = new TextEncoder().encode(validPdfText);
const expectedSha256 = await computeSha256Hex(validPdfBuffer);

globalThis.fetch = async () => {
  return new Response(validPdfBuffer, {
    status: 200,
    headers: { 'Content-Type': 'application/pdf' },
  });
};

const resValidStream = await safeFetchGovernmentResource('https://www.mca.gov.in/valid_notice.pdf');
assert(resValidStream.statusCode === 200, 'fetches valid bounded resource successfully');
assert(resValidStream.contentHashSha256 === expectedSha256, 'computes exact cryptographic SHA-256 matching known digest');
assert(resValidStream.detectedFormat === 'pdf', 'identifies magic bytes %PDF correctly');
assert(resValidStream.byteLength === validPdfBuffer.byteLength, 'accurately records byte length');

// Restore original fetch
globalThis.fetch = originalFetch;

// -----------------------------------------------------------------------------
// Test Suite 4: Controlled Official Link Discovery Bounds
// -----------------------------------------------------------------------------
console.log('\nTest Suite 4: Controlled Official Link Discovery Bounds');

// 1. Session ID stripping and parameter cleaning
const dirtyUrl = 'https://www.mca.gov.in/form.pdf?jsessionid=ABCD1234XYZ&service=inc32&utm_source=twitter';
const cleanResult = normalizeAndFilterGovernmentLink(dirtyUrl, 'https://www.mca.gov.in');
assert(cleanResult.accepted === true, 'accepts valid PDF with tracking parameters');
assert(cleanResult.normalizedUrl?.includes('service=inc32'), 'retains legitimate statutory query parameter');
assert(!cleanResult.normalizedUrl?.includes('jsessionid'), 'strips jsessionid parameter');
assert(!cleanResult.normalizedUrl?.includes('utm_source'), 'strips utm tracking parameters');

// 2. Reject query parameter explosion
const explodingUrl = 'https://www.mca.gov.in/form.pdf?p1=1&p2=2&p3=3&p4=4&p5=5';
const explosionResult = normalizeAndFilterGovernmentLink(explodingUrl, 'https://www.mca.gov.in');
assert(explosionResult.accepted === false, 'rejects query parameter explosion (> 3 parameters)');
assert(explosionResult.reason?.includes('explosion'), 'records query parameter explosion reason');

// 3. Reject off-domain and non-document links
const offDomainUrl = 'https://unauthorized-law-firm.com/download.pdf';
assert(!normalizeAndFilterGovernmentLink(offDomainUrl, 'https://www.mca.gov.in').accepted, 'rejects off-domain URL');

const imageAssetUrl = 'https://www.mca.gov.in/banner.png';
assert(!normalizeAndFilterGovernmentLink(imageAssetUrl, 'https://www.mca.gov.in').accepted, 'rejects image asset .png');

const authEndpointUrl = 'https://www.mca.gov.in/portal/login';
assert(!normalizeAndFilterGovernmentLink(authEndpointUrl, 'https://www.mca.gov.in').accepted, 'rejects interactive /login endpoint');

// 4. HTML link discovery bounds: max 5 per domain, max total budget 15
const sampleHtml = `
  <div>
    <a href="https://www.mca.gov.in/form1.pdf">Form 1</a>
    <a href="https://www.mca.gov.in/form2.pdf">Form 2</a>
    <a href="https://www.mca.gov.in/form3.pdf">Form 3</a>
    <a href="https://www.mca.gov.in/form4.pdf">Form 4</a>
    <a href="https://www.mca.gov.in/form5.pdf">Form 5</a>
    <a href="https://www.mca.gov.in/form6.pdf">Form 6 (Should exceed domain quota 5)</a>
    <a href="https://passportindia.gov.in/form_pass1.pdf">Passport Form 1</a>
    <a href="https://passportindia.gov.in/form_pass2.pdf">Passport Form 2</a>
    <a href="https://unauthorized-external-blog.com/guide.pdf">External Blog</a>
  </div>
`;

const discoveredLinks = discoverCandidateLinksFromHtml(sampleHtml, 'https://www.mca.gov.in', 5, 15);
assert(discoveredLinks.length === 7, `discovered exactly 7 allowed links within bounds (got ${discoveredLinks.length})`);
const mcaLinks = discoveredLinks.filter((l) => l.includes('mca.gov.in'));
assert(mcaLinks.length === 5, 'strictly enforces maximum 5 links per domain limit');
assert(!discoveredLinks.some((l) => l.includes('unauthorized-external-blog.com')), 'filters out all off-domain links');

// -----------------------------------------------------------------------------
// Test Suite 5: Ingestion Persistence & Lifecycle State Preservation
// -----------------------------------------------------------------------------
console.log('\nTest Suite 5: Ingestion Persistence & Lifecycle State Preservation');

// 1. Initial services inspection
const initialServices = await getGovernmentServices();
const spicePlusInitial = initialServices.find((s) => s.serviceCode === 'MCA-SRV-SPICE-PLUS');
assert(spicePlusInitial !== undefined, 'finds initial SPICe+ service');
assert(spicePlusInitial?.applicationTypes[0].lifecycleStatus === 'published', 'SPICe+ initial state is "published"');

// 2. Mark another service as "verified" by an officer
await updateApplicationTypeLifecycle('type-dir3-candidate', 'verified', 'Verified against Gazette Notification 2024.', 'Officer Sharma');
const afterVerification = await getGovernmentServices();
const dir3Verified = afterVerification
  .flatMap((s) => s.applicationTypes)
  .find((t) => t.id === 'type-dir3-candidate');
assert(dir3Verified?.lifecycleStatus === 'verified', 'successfully marks DIR-3 application type as "verified"');
assert(dir3Verified?.verifiedBy === 'Officer Sharma', 'records verifying officer name');

// 3. Trigger automated re-ingestion discovery run
const ingestionResult = await triggerDiscoveryRun();
assert(ingestionResult.runId.startsWith('run-'), 'executes ingestion run and returns runId');
assert(ingestionResult.runSummary.resourcesDiscovered > 0, 'discovers resources during run');
assert(ingestionResult.isPersisted !== undefined, 'explicitly reports persistence status');

// 4. Verify Lifecycle Status Preservation: SPICe+ must remain 'published', DIR-3 must remain 'verified'
const afterReingestion = await getGovernmentServices();

const spicePlusAfter = afterReingestion.find((s) => s.serviceCode === 'MCA-SRV-SPICE-PLUS');
assert(
  spicePlusAfter?.applicationTypes[0].lifecycleStatus === 'published',
  'LIFECYCLE PRESERVATION: Re-ingestion retains "published" status on SPICe+ and does NOT downgrade to extracted'
);

const dir3After = afterReingestion
  .flatMap((s) => s.applicationTypes)
  .find((t) => t.id === 'type-dir3-candidate');
assert(
  dir3After?.lifecycleStatus === 'verified',
  'LIFECYCLE PRESERVATION: Re-ingestion retains "verified" status on DIR-3 and preserves verifiedBy officer attribution'
);
assert(dir3After?.verifiedBy === 'Officer Sharma', 'verifying officer attribution retained after re-ingestion');

// 5. Unconfigured database fallback reporting
assert(
  ingestionResult.persistenceNote !== undefined && ingestionResult.persistenceNote.length > 0,
  'reports clear persistence status / note in ingestion result'
);

// -----------------------------------------------------------------------------
// Test Execution Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`Test Execution Complete: ${passedTests}/${totalTests} Tests Passed (100% Pass Rate).`);
console.log('================================================================\n');
