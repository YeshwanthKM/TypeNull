/**
 * Security & Safe Retrieval Utilities for Government Document Ingestion
 *
 * Enforces domain allowlists, SSRF prevention, content-type magic byte validation,
 * SHA-256 content hashing, and size quotas.
 */

const ALLOWED_DOMAIN_SUFFIXES = [
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

const DISALLOWED_HOSTS_OR_IPS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.', // Link-local / metadata service
  '10.', // Private Class A
  '192.168.', // Private Class C
];

const MAX_RESOURCE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Validates whether a URL belongs to an approved, authoritative Indian Government domain
 * and is safe against SSRF vulnerabilities.
 */
export function validateOfficialGovernmentUrl(rawUrl: string): { isValid: boolean; reason?: string } {
  try {
    const parsed = new URL(rawUrl);

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return { isValid: false, reason: `Disallowed protocol scheme "${parsed.protocol}". Only HTTP(S) permitted.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check SSRF blacklist
    for (const blocked of DISALLOWED_HOSTS_OR_IPS) {
      if (hostname === blocked || hostname.startsWith(blocked)) {
        return { isValid: false, reason: `Security restriction: internal address "${hostname}" is blocked.` };
      }
    }

    // Check private 172.16.0.0 - 172.31.255.255
    const octets = hostname.split('.');
    if (octets.length === 4 && octets[0] === '172') {
      const second = parseInt(octets[1], 10);
      if (second >= 16 && second <= 31) {
        return { isValid: false, reason: 'Private IP range 172.16.0.0/12 is forbidden.' };
      }
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
 * Computes SHA-256 hex hash from an ArrayBuffer
 */
export async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
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
  error?: string;
}

/**
 * Safely fetches a resource from an authorized government domain with timeout and size limits
 */
export async function safeFetchGovernmentResource(
  targetUrl: string,
  timeoutMs: number = 8000
): Promise<SafeFetchResult> {
  const urlValidation = validateOfficialGovernmentUrl(targetUrl);
  if (!urlValidation.isValid) {
    return {
      url: targetUrl,
      buffer: null,
      detectedFormat: 'other',
      contentHashSha256: '',
      byteLength: 0,
      statusCode: 400,
      error: urlValidation.reason,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/pdf, text/html, application/json, */*',
        'User-Agent': 'TypeNull-DocumentVerificationEngine/1.0 (+https://github.com/YeshwanthKM/TypeNull)',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        url: targetUrl,
        buffer: null,
        detectedFormat: 'other',
        contentHashSha256: '',
        byteLength: 0,
        statusCode: res.status,
        error: `HTTP Error: ${res.status} ${res.statusText}`,
      };
    }

    const buffer = await res.arrayBuffer();

    if (buffer.byteLength > MAX_RESOURCE_SIZE_BYTES) {
      return {
        url: targetUrl,
        buffer: null,
        detectedFormat: 'other',
        contentHashSha256: '',
        byteLength: buffer.byteLength,
        statusCode: 413,
        error: `Payload exceeds 15MB quota (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB).`,
      };
    }

    const contentHash = await computeSha256Hex(buffer);
    const format = detectMagicByteFormat(buffer);

    return {
      url: targetUrl,
      buffer,
      detectedFormat: format,
      contentHashSha256: contentHash,
      byteLength: buffer.byteLength,
      statusCode: res.status,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      url: targetUrl,
      buffer: null,
      detectedFormat: 'other',
      contentHashSha256: '',
      byteLength: 0,
      statusCode: 500,
      error: err.name === 'AbortError' ? 'Connection timed out.' : err.message || 'Fetch failed',
    };
  }
}
