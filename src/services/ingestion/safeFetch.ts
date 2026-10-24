/**
 * Security & Safe Retrieval Utilities for Government Document Ingestion
 *
 * Enforces:
 * 1. Authoritative Indian Government domain allowlisting (.gov.in, .nic.in).
 * 2. Network-level SSRF prevention for IPv4, IPv6, IPv4-mapped IPv6, CGNAT, loopback, link-local, and cloud metadata.
 * 3. DNS resolution validation failing closed if any address is prohibited.
 * 4. Secure redirect handling (redirect: 'manual', hop limit, loop detection, per-hop revalidation).
 * 5. Bounded streaming download with immediate cancellation on 15 MiB limit.
 * 6. Content-type magic byte validation and cryptographic SHA-256 hashing.
 */

export const ALLOWED_DOMAIN_SUFFIXES = [
  '.gov.in',
  '.nic.in',
  '.res.in',
  '.ac.in',
  'services.india.gov.in',
  'india.gov.in',
  'igod.gov.in',
  'passportindia.gov.in',
  'indiacode.nic.in',
  'mca.gov.in',
  'cbic.gov.in',
  'uidai.gov.in',
  'gst.gov.in',
];

export const DISALLOWED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'instance-data',
];

export const MAX_RESOURCE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MiB
export const MAX_REDIRECT_LIMIT = 5;

/**
 * Checks whether an IPv4 address falls into prohibited ranges:
 * - 0.0.0.0/8 (Current network)
 * - 10.0.0.0/8 (Private Class A)
 * - 100.64.0.0/10 (Carrier-Grade NAT / Shared Space)
 * - 127.0.0.0/8 (Loopback)
 * - 169.254.0.0/16 (Link-local & Cloud Metadata 169.254.169.254)
 * - 172.16.0.0/12 (Private Class B)
 * - 192.0.0.0/24 (IETF Protocol Assignments)
 * - 192.0.2.0/24 (TEST-NET-1)
 * - 192.168.0.0/16 (Private Class C)
 * - 198.18.0.0/15 (Network Benchmark Tests)
 * - 198.51.100.0/24 (TEST-NET-2)
 * - 203.0.113.0/24 (TEST-NET-3)
 * - 224.0.0.0/4 (Multicast)
 * - 240.0.0.0/4 (Reserved / Future Use)
 * - 255.255.255.255 (Broadcast)
 */
export function isProhibitedIpv4(ip: string): boolean {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;

  const octets = parts.map((p) => parseInt(p, 10));
  if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) return false;

  const [a, b, c] = octets;

  // 0.0.0.0/8
  if (a === 0) return true;

  // 10.0.0.0/8
  if (a === 10) return true;

  // 100.64.0.0/10 (100.64.0.0 - 100.127.255.255)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 169.254.0.0/16 (Link-local & Cloud Metadata)
  if (a === 169 && b === 254) return true;

  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.0.0.0/24 (IETF assignments)
  if (a === 192 && b === 0 && c === 0) return true;

  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true;

  // 192.168.0.0/16 (Private Class C)
  if (a === 192 && b === 168) return true;

  // 198.18.0.0/15 (198.18.0.0 - 198.19.255.255 Benchmark)
  if (a === 198 && (b === 18 || b === 19)) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;

  // 224.0.0.0/4 (Multicast 224-239)
  if (a >= 224 && a <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future Use 240-255)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks whether an IPv6 address falls into prohibited ranges:
 * - :: (Unspecified)
 * - ::1 (Loopback)
 * - ::ffff:0:0/96 (IPv4-mapped IPv6) -> parsed against IPv4 restrictions
 * - fc00::/7 (Unique Local Address / ULA)
 * - fe80::/10 (Link-Local Unicast)
 * - ff00::/8 (Multicast)
 * - 2001:db8::/32 (Documentation)
 * - 100::/64 (Discard-only)
 */
export function isProhibitedIpv6(ip: string): boolean {
  const clean = ip.trim().toLowerCase();

  // Unspecified
  if (clean === '::' || clean === '0:0:0:0:0:0:0:0') return true;

  // Loopback
  if (clean === '::1' || clean === '0:0:0:0:0:0:0:1') return true;

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or 0:0:0:0:0:ffff:10.0.0.1)
  const ipv4MappedMatch = clean.match(/^(?:::ffff:|(?:0+:){5}ffff:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4MappedMatch) {
    return isProhibitedIpv4(ipv4MappedMatch[1]);
  }

  // IPv4-compatible IPv6 (deprecated ::127.0.0.1)
  const ipv4CompatMatch = clean.match(/^(?:::|(?:0+:){6})(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (ipv4CompatMatch) {
    return isProhibitedIpv4(ipv4CompatMatch[1]);
  }

  // Unique Local Addresses (fc00::/7 -> fc00 to fdff)
  if (clean.startsWith('fc') || clean.startsWith('fd')) return true;

  // Link-Local (fe80::/10 -> fe80 to febf)
  if (/^fe[89ab][0-9a-f]/i.test(clean) || clean.startsWith('fe80:')) return true;

  // Multicast (ff00::/8)
  if (clean.startsWith('ff')) return true;

  // Documentation (2001:db8::/32)
  if (clean.startsWith('2001:db8:') || clean.startsWith('2001:0db8:')) return true;

  // Discard (100::/64)
  if (clean.startsWith('100::')) return true;

  return false;
}

/**
 * Validates any IP address (IPv4 or IPv6) against all internal, private, and SSRF ranges
 */
export function isProhibitedIpAddress(ip: string): boolean {
  if (ip.includes(':')) {
    return isProhibitedIpv6(ip);
  }
  return isProhibitedIpv4(ip);
}

/**
 * Resolves all DNS A and AAAA records for a hostname when executed in a Node.js/server runtime.
 * Returns an empty array in browser environments where raw socket DNS resolution is unavailable.
 */
export async function resolveDnsAddresses(hostname: string): Promise<string[]> {
  // If already an IP address, return it directly
  if (hostname.split('.').length === 4 || hostname.includes(':')) {
    return [hostname];
  }

  if (typeof globalThis !== 'undefined' && (globalThis as any).process?.versions?.node) {
    try {
      const dnsModuleName = 'node:dns';
      const dns: any = await import(/* @vite-ignore */ dnsModuleName);
      const lookup = dns.promises?.lookup || dns.lookup;
      if (lookup) {
        const results = await dns.promises.lookup(hostname, { all: true });
        return results.map((r: { address: string }) => r.address);
      }
    } catch (err: any) {
      throw new Error(`DNS resolution failed for "${hostname}": ${err.message}`);
    }
  }

  return [];
}

/**
 * Validates whether a URL belongs to an approved, authoritative Indian Government domain
 * and is safe against SSRF vulnerabilities (both hostname syntax and direct IP literals).
 */
export function validateOfficialGovernmentUrl(rawUrl: string): { isValid: boolean; reason?: string } {
  try {
    const parsed = new URL(rawUrl);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { isValid: false, reason: `Disallowed protocol scheme "${parsed.protocol}". Only HTTP(S) permitted.` };
    }

    // Strip any userinfo credentials (e.g., http://user:pass@host)
    if (parsed.username || parsed.password) {
      return { isValid: false, reason: 'URL userinfo credentials are not permitted for security reasons.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check disallowed hostname list
    for (const blocked of DISALLOWED_HOSTNAMES) {
      if (hostname === blocked || hostname.endsWith(`.${blocked}`)) {
        return { isValid: false, reason: `Security restriction: internal address "${hostname}" is blocked.` };
      }
    }

    // Check if hostname is directly an IP literal or SSRF target
    if (isProhibitedIpAddress(hostname)) {
      return { isValid: false, reason: `Security restriction: destination IP "${hostname}" is prohibited.` };
    }

    // Check approved government domain suffix
    const isAllowedDomain = ALLOWED_DOMAIN_SUFFIXES.some(
      (suffix) => hostname === suffix || hostname.endsWith(suffix)
    );

    if (!isAllowedDomain) {
      return {
        isValid: false,
        reason: `Domain "${hostname}" does not match approved official government domains (.gov.in / .nic.in).`,
      };
    }

    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, reason: `Malformed URL string: ${err.message}` };
  }
}

/**
 * Convenient boolean check for government domains (.gov.in / .nic.in)
 */
export function isGovInOrNicInDomain(rawUrl: string): boolean {
  return validateOfficialGovernmentUrl(rawUrl).isValid;
}

/**
 * Computes SHA-256 hex hash from an ArrayBuffer or Uint8Array
 */
export async function computeSha256Hex(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Detects actual file format from header magic bytes
 */
export function detectMagicByteFormat(buffer: ArrayBuffer): 'pdf' | 'docx' | 'png' | 'jpeg' | 'html' | 'json' | 'other' {
  const bytes = new Uint8Array(buffer.slice(0, 32));

  // PDF: %PDF (0x25, 0x50, 0x44, 0x46)
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'pdf';
  }

  // PNG: 0x89 0x50 0x4E 0x47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'png';
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  // ZIP / DOCX: PK (0x50, 0x4B, 0x03, 0x04)
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return 'docx';
  }

  // Check ASCII text for HTML or JSON
  const snippet = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 32)).trim();
  if (snippet.startsWith('<!DOCTYPE') || snippet.startsWith('<html') || snippet.startsWith('<?xml')) {
    return 'html';
  }
  if (snippet.startsWith('{') || snippet.startsWith('[')) {
    return 'json';
  }

  return 'other';
}

export interface SafeFetchResult {
  url: string;
  buffer: ArrayBuffer | null;
  detectedFormat: 'pdf' | 'docx' | 'png' | 'jpeg' | 'html' | 'json' | 'other';
  contentHashSha256: string;
  byteLength: number;
  statusCode: number;
  redirectHops?: number;
  resolvedIp?: string;
  error?: string;
}

/**
 * Safely fetches a resource from an authorized government domain:
 * 1. Independently checks every redirect (redirect: 'manual', max 5 hops, loop detection).
 * 2. Resolves DNS records in server runtime and fails closed if ANY resolved IP is prohibited.
 * 3. Enforces download limits dynamically during streaming (aborts immediately upon exceeding 15 MiB).
 * 4. Computes SHA-256 cryptographic provenance and inspects magic bytes.
 */
export async function safeFetchGovernmentResource(
  initialUrl: string,
  timeoutMs: number = 8000
): Promise<SafeFetchResult> {
  let currentUrl = initialUrl;
  let redirectCount = 0;
  const visitedUrls = new Set<string>();
  visitedUrls.add(currentUrl);

  while (true) {
    // 1. Static URL & domain allowlist validation
    const urlValidation = validateOfficialGovernmentUrl(currentUrl);
    if (!urlValidation.isValid) {
      return {
        url: currentUrl,
        buffer: null,
        detectedFormat: 'other',
        contentHashSha256: '',
        byteLength: 0,
        statusCode: 400,
        redirectHops: redirectCount,
        error: urlValidation.reason,
      };
    }

    const parsedUrl = new URL(currentUrl);

    // 2. Network-level DNS resolution & IP check (server-side runtime)
    try {
      const resolvedAddresses = await resolveDnsAddresses(parsedUrl.hostname);
      for (const addr of resolvedAddresses) {
        if (isProhibitedIpAddress(addr)) {
          return {
            url: currentUrl,
            buffer: null,
            detectedFormat: 'other',
            contentHashSha256: '',
            byteLength: 0,
            statusCode: 403,
            redirectHops: redirectCount,
            error: `Security restriction: resolved IP "${addr}" for host "${parsedUrl.hostname}" is prohibited (SSRF prevention).`,
          };
        }
      }
    } catch (dnsErr: any) {
      return {
        url: currentUrl,
        buffer: null,
        detectedFormat: 'other',
        contentHashSha256: '',
        byteLength: 0,
        statusCode: 502,
        redirectHops: redirectCount,
        error: dnsErr.message || 'DNS resolution failed',
      };
    }

    // 3. Prepare bounded request with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          Accept: 'application/pdf, text/html, application/json, */*',
          'User-Agent': 'TypeNull-DocumentVerificationEngine/1.0 (+https://github.com/YeshwanthKM/TypeNull)',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 4. Handle HTTP Redirects Explicitly (301, 302, 303, 307, 308)
      const isRedirect = [301, 302, 303, 307, 308].includes(res.status);
      if (isRedirect) {
        redirectCount++;
        if (redirectCount > MAX_REDIRECT_LIMIT) {
          return {
            url: currentUrl,
            buffer: null,
            detectedFormat: 'other',
            contentHashSha256: '',
            byteLength: 0,
            statusCode: 310,
            redirectHops: redirectCount,
            error: `Exceeded maximum redirect limit (${MAX_REDIRECT_LIMIT} hops).`,
          };
        }

        const locationHeader = res.headers.get('location');
        if (!locationHeader) {
          return {
            url: currentUrl,
            buffer: null,
            detectedFormat: 'other',
            contentHashSha256: '',
            byteLength: 0,
            statusCode: res.status,
            redirectHops: redirectCount,
            error: `Redirect response (${res.status}) missing Location header.`,
          };
        }

        let nextUrl: string;
        try {
          nextUrl = new URL(locationHeader, currentUrl).toString();
        } catch {
          return {
            url: currentUrl,
            buffer: null,
            detectedFormat: 'other',
            contentHashSha256: '',
            byteLength: 0,
            statusCode: 400,
            redirectHops: redirectCount,
            error: `Invalid redirect Location header "${locationHeader}".`,
          };
        }

        // Detect redirect loops
        if (visitedUrls.has(nextUrl)) {
          return {
            url: nextUrl,
            buffer: null,
            detectedFormat: 'other',
            contentHashSha256: '',
            byteLength: 0,
            statusCode: 310,
            redirectHops: redirectCount,
            error: `Redirect loop detected for URL: "${nextUrl}".`,
          };
        }

        visitedUrls.add(nextUrl);
        currentUrl = nextUrl;
        // Proceed to next iteration to revalidate domain allowlist, SSRF, DNS, and fetch destination
        continue;
      }

      // Check for non-ok response
      if (!res.ok) {
        return {
          url: currentUrl,
          buffer: null,
          detectedFormat: 'other',
          contentHashSha256: '',
          byteLength: 0,
          statusCode: res.status,
          redirectHops: redirectCount,
          error: `HTTP Error: ${res.status} ${res.statusText}`,
        };
      }

      // 5. Bounded Streaming Download
      // Enforce MAX_RESOURCE_SIZE_BYTES dynamically on incoming stream chunks
      let receivedBytes = 0;
      const chunks: Uint8Array[] = [];

      if (res.body && typeof res.body.getReader === 'function') {
        const reader = res.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              receivedBytes += value.byteLength;
              if (receivedBytes > MAX_RESOURCE_SIZE_BYTES) {
                await reader.cancel('Exceeded maximum allowed download size');
                return {
                  url: currentUrl,
                  buffer: null,
                  detectedFormat: 'other',
                  contentHashSha256: '',
                  byteLength: receivedBytes,
                  statusCode: 413,
                  redirectHops: redirectCount,
                  error: `Payload exceeds 15MB quota (${(receivedBytes / 1024 / 1024).toFixed(1)}MB). Aborted during stream.`,
                };
              }
              chunks.push(value);
            }
          }
        } catch (streamErr: any) {
          if (streamErr.name === 'AbortError') {
            return {
              url: currentUrl,
              buffer: null,
              detectedFormat: 'other',
              contentHashSha256: '',
              byteLength: receivedBytes,
              statusCode: 408,
              redirectHops: redirectCount,
              error: 'Download stream timed out.',
            };
          }
          throw streamErr;
        }
      } else if (res.body && typeof (res.body as any)[Symbol.asyncIterator] === 'function') {
        // Node.js Readable stream fallback
        for await (const chunk of (res.body as any)) {
          const chunkLen = chunk.byteLength || chunk.length;
          receivedBytes += chunkLen;
          if (receivedBytes > MAX_RESOURCE_SIZE_BYTES) {
            if (typeof (res.body as any).destroy === 'function') {
              (res.body as any).destroy();
            }
            return {
              url: currentUrl,
              buffer: null,
              detectedFormat: 'other',
              contentHashSha256: '',
              byteLength: receivedBytes,
              statusCode: 413,
              redirectHops: redirectCount,
              error: `Payload exceeds 15MB quota (${(receivedBytes / 1024 / 1024).toFixed(1)}MB). Aborted during stream.`,
            };
          }
          chunks.push(chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
        }
      } else {
        // Non-streaming fallback: arrayBuffer
        const rawBuf = await res.arrayBuffer();
        if (rawBuf.byteLength > MAX_RESOURCE_SIZE_BYTES) {
          return {
            url: currentUrl,
            buffer: null,
            detectedFormat: 'other',
            contentHashSha256: '',
            byteLength: rawBuf.byteLength,
            statusCode: 413,
            redirectHops: redirectCount,
            error: `Payload exceeds 15MB quota (${(rawBuf.byteLength / 1024 / 1024).toFixed(1)}MB).`,
          };
        }
        chunks.push(new Uint8Array(rawBuf));
        receivedBytes = rawBuf.byteLength;
      }

      // Reassemble bounded stream buffer
      const combined = new Uint8Array(receivedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.byteLength;
      }

      const finalBuffer = combined.buffer.slice(combined.byteOffset, combined.byteOffset + combined.byteLength);
      const contentHash = await computeSha256Hex(finalBuffer);
      const format = detectMagicByteFormat(finalBuffer);

      return {
        url: currentUrl,
        buffer: finalBuffer,
        detectedFormat: format,
        contentHashSha256: contentHash,
        byteLength: receivedBytes,
        statusCode: res.status,
        redirectHops: redirectCount,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      return {
        url: currentUrl,
        buffer: null,
        detectedFormat: 'other',
        contentHashSha256: '',
        byteLength: 0,
        statusCode: err.name === 'AbortError' ? 408 : 500,
        redirectHops: redirectCount,
        error: err.name === 'AbortError' ? 'Connection timed out.' : err.message || 'Fetch failed',
      };
    }
  }
}
