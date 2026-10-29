/**
 * TypeNull Safe ASN.1 DER Parser
 *
 * Implements a bounds-checked, resilient parser for ASN.1 DER structures
 * used in PKCS#7 / CMS digital signatures and X.509 public-key certificates.
 *
 * Guarantees:
 * - Safe array bounds checking (no out-of-bounds access or buffer overruns)
 * - Safe recursion limits (prevents stack overflow on deeply nested inputs)
 * - Zero external native dependencies (runs in browser WebCrypto and Node)
 * - Neutral parsing of malformed or truncated inputs without unhandled crashes
 */

export interface Asn1Element {
  tag: number;
  isConstructed: boolean;
  headerLength: number;
  contentLength: number;
  totalLength: number;
  rawBytes: Uint8Array;
  contentBytes: Uint8Array;
  children?: Asn1Element[];
}
import { ParsedCertificateExtensions } from './certificateTrustTypes';

export interface ParsedX509Certificate {
  rawDer: Uint8Array;
  serialNumber: string;
  issuer: {
    commonName?: string;
    organization?: string;
    country?: string;
    rawText: string;
  };
  subject: {
    commonName?: string;
    organization?: string;
    country?: string;
    rawText: string;
  };
  validity: {
    notBefore: Date;
    notAfter: Date;
    isCurrentlyValid: boolean;
  };
  subjectPublicKeyInfo: Uint8Array;
  algorithmOid: string;
  rawTbsCertificate?: Uint8Array;
  certSignatureAlgorithmOid?: string;
  certSignatureValue?: Uint8Array;
  sha256Fingerprint?: string;
  extensions?: ParsedCertificateExtensions;
  isAlgorithmIdentifierConsistent?: boolean;
}

export interface ParsedPkcs7SignedData {
  version: number;
  digestAlgorithmOid: string;
  certificates: ParsedX509Certificate[];
  signerInfo: {
    version: number;
    digestAlgorithmOid: string;
    signatureAlgorithmOid: string;
    signedAttributesRaw?: Uint8Array; // Original bytes including tag
    setOfSignedAttributes?: Uint8Array; // RFC 5652: tag replaced with 0x31 for hashing
    messageDigest?: Uint8Array;
    signingTime?: Date;
    signatureBytes: Uint8Array;
    hasTimestampToken: boolean;
  };
}

/**
 * Standard OID mappings for cryptographic algorithms and attributes
 */
export const OID_MAP: Record<string, string> = {
  '1.2.840.113549.1.7.1': 'data',
  '1.2.840.113549.1.7.2': 'signedData',
  '1.2.840.113549.1.1.1': 'rsaEncryption',
  '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
  '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
  '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
  '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
  '1.2.840.10045.2.1': 'ecPublicKey',
  '1.2.840.10045.4.3.2': 'ecdsaWithSHA256',
  '1.3.14.3.2.26': 'sha1',
  '2.16.840.1.101.3.4.2.1': 'sha256',
  '2.16.840.1.101.3.4.2.2': 'sha384',
  '2.16.840.1.101.3.4.2.3': 'sha512',
  '1.2.840.113549.1.9.3': 'contentType',
  '1.2.840.113549.1.9.4': 'messageDigest',
  '1.2.840.113549.1.9.5': 'signingTime',
  '1.2.840.113549.1.9.16.2.14': 'timestampToken',
  '2.5.4.3': 'commonName',
  '2.5.4.6': 'countryName',
  '2.5.4.10': 'organizationName',
  '2.5.4.11': 'organizationalUnitName',
};

/**
 * Reads a single ASN.1 Tag-Length-Value header safely
 */
export function readAsn1Tlv(bytes: Uint8Array, offset: number): Asn1Element | null {
  if (offset >= bytes.length) return null;

  const tag = bytes[offset];
  const isConstructed = (tag & 0x20) !== 0 || (tag & 0xc0) === 0x80 || (tag & 0xc0) === 0xa0;

  if (offset + 1 >= bytes.length) return null;
  const initialLengthByte = bytes[offset + 1];

  let contentLength = 0;
  let headerLength = 2;

  if ((initialLengthByte & 0x80) === 0) {
    // Short form
    contentLength = initialLengthByte;
  } else {
    // Long form
    const numOctets = initialLengthByte & 0x7f;
    if (numOctets === 0 || numOctets > 4 || offset + 2 + numOctets > bytes.length) {
      return null; // Malformed length or indefinite length not allowed in DER
    }
    contentLength = 0;
    for (let i = 0; i < numOctets; i++) {
      contentLength = (contentLength << 8) | bytes[offset + 2 + i];
    }
    headerLength = 2 + numOctets;
  }

  const totalLength = headerLength + contentLength;
  if (offset + totalLength > bytes.length) {
    return null; // Truncated element
  }

  const rawBytes = bytes.subarray(offset, offset + totalLength);
  const contentBytes = bytes.subarray(offset + headerLength, offset + totalLength);

  return {
    tag,
    isConstructed,
    headerLength,
    contentLength,
    totalLength,
    rawBytes,
    contentBytes,
  };
}

/**
 * Recursively parses ASN.1 DER elements with depth protection
 */
export function parseAsn1(bytes: Uint8Array, maxDepth = 15, currentDepth = 0): Asn1Element[] {
  if (currentDepth >= maxDepth) return [];
  const elements: Asn1Element[] = [];
  let offset = 0;

  while (offset < bytes.length) {
    const tlv = readAsn1Tlv(bytes, offset);
    if (!tlv || tlv.totalLength === 0) {
      break;
    }

    if (tlv.isConstructed && tlv.contentLength > 0) {
      tlv.children = parseAsn1(tlv.contentBytes, maxDepth, currentDepth + 1);
    }

    elements.push(tlv);
    offset += tlv.totalLength;
  }

  return elements;
}

/**
 * Decodes an ASN.1 Object Identifier (OID) to string e.g. "1.2.840.113549.1.7.2"
 */
export function decodeOid(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  const firstByte = bytes[0];
  const parts: number[] = [Math.floor(firstByte / 40), firstByte % 40];

  let current = 0;
  for (let i = 1; i < bytes.length; i++) {
    const b = bytes[i];
    current = (current << 7) | (b & 0x7f);
    if ((b & 0x80) === 0) {
      parts.push(current);
      current = 0;
    }
  }

  return parts.join('.');
}

/**
 * Decodes ASN.1 UTCTime or GeneralizedTime to JavaScript Date
 */
export function decodeAsn1Time(bytes: Uint8Array, tag: number): Date | null {
  const str = new TextDecoder('ascii').decode(bytes).trim();
  try {
    if (tag === 0x17) {
      // UTCTime: YYMMDDhhmmssZ or YYMMDDhhmmZ
      const yearPrefix = parseInt(str.slice(0, 2), 10) >= 50 ? '19' : '20';
      const fullIso = `${yearPrefix}${str.slice(0, 2)}-${str.slice(2, 4)}-${str.slice(4, 6)}T${str.slice(6, 8)}:${str.slice(8, 10)}:${str.slice(10, 12) || '00'}Z`;
      const date = new Date(fullIso);
      return isNaN(date.getTime()) ? null : date;
    }
    if (tag === 0x18) {
      // GeneralizedTime: YYYYMMDDhhmmssZ
      const fullIso = `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}T${str.slice(8, 10)}:${str.slice(10, 12)}:${str.slice(12, 14) || '00'}Z`;
      const date = new Date(fullIso);
      return isNaN(date.getTime()) ? null : date;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Parses Relative Distinguished Name (RDN) components e.g. CN, O, C
 */
export function parseRdnSequence(nameSeqElement: Asn1Element): {
  commonName?: string;
  organization?: string;
  country?: string;
  rawText: string;
} {
  const result: { commonName?: string; organization?: string; country?: string; rawText: string } = {
    rawText: '',
  };
  const parts: string[] = [];

  const sets = nameSeqElement.children || [];
  for (const set of sets) {
    const rdnSeqs = set.children || [];
    for (const rdn of rdnSeqs) {
      const items = rdn.children || [];
      if (items.length >= 2 && items[0].tag === 0x06) {
        const oid = decodeOid(items[0].contentBytes);
        const valStr = new TextDecoder('utf-8').decode(items[1].contentBytes).trim();
        const attrName = OID_MAP[oid] || oid;

        parts.push(`${attrName}=${valStr}`);
        if (oid === '2.5.4.3') result.commonName = valStr;
        else if (oid === '2.5.4.10') result.organization = valStr;
        else if (oid === '2.5.4.6') result.country = valStr;
      }
    }
  }

  result.rawText = parts.join(', ');
  return result;
}

/**
 * Parses an X.509 Certificate in ASN.1 DER format
 */
export function parseX509Certificate(certBytes: Uint8Array): ParsedX509Certificate | null {
  try {
    const root = parseAsn1(certBytes, 8);
    if (root.length === 0 || root[0].tag !== 0x30 || !root[0].children) {
      return null;
    }

    const certSeq = root[0].children;
    if (certSeq.length < 3) return null;

    const tbsCert = certSeq[0];
    if (tbsCert.tag !== 0x30 || !tbsCert.children) return null;

    const tbsChildren = tbsCert.children;
    let idx = 0;

    // Optional version [0] EXPLICIT
    if (tbsChildren[idx]?.tag === 0xa0) {
      idx++;
    }

    // Serial Number
    const serialElem = tbsChildren[idx++];
    const serialNumber = Array.from(serialElem?.contentBytes || [])
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(':');

    // Signature algorithm identifier
    const sigAlgElem = tbsChildren[idx++];
    const sigAlgOid = sigAlgElem?.children?.[0] ? decodeOid(sigAlgElem.children[0].contentBytes) : '';

    // Issuer Name
    const issuerElem = tbsChildren[idx++];
    const issuer = issuerElem ? parseRdnSequence(issuerElem) : { rawText: 'Unknown Issuer' };

    // Validity
    const validityElem = tbsChildren[idx++];
    let notBefore = new Date(0);
    let notAfter = new Date(0);
    if (validityElem?.children && validityElem.children.length >= 2) {
      notBefore = decodeAsn1Time(validityElem.children[0].contentBytes, validityElem.children[0].tag) || notBefore;
      notAfter = decodeAsn1Time(validityElem.children[1].contentBytes, validityElem.children[1].tag) || notAfter;
    }

    const now = new Date();
    const isCurrentlyValid = now >= notBefore && now <= notAfter;

    // Subject Name
    const subjectElem = tbsChildren[idx++];
    const subject = subjectElem ? parseRdnSequence(subjectElem) : { rawText: 'Unknown Subject' };

    // SubjectPublicKeyInfo
    const spkiElem = tbsChildren[idx++];
    if (!spkiElem) return null;
    const subjectPublicKeyInfo = spkiElem.rawBytes;

    // Optional extensions [3] EXPLICIT
    let extensions: ParsedCertificateExtensions | undefined = undefined;
    for (let i = idx; i < tbsChildren.length; i++) {
      const child = tbsChildren[i];
      if (child.tag === 0xa3 && child.children && child.children.length > 0) {
        const extSeq = child.children[0];
        if (extSeq && extSeq.children) {
          extensions = parseCertificateExtensions(extSeq.children);
        }
      }
    }

    // Outer Certificate Signature info
    const certSigAlgElem = certSeq[1];
    const certSignatureAlgorithmOid = certSigAlgElem?.children?.[0]
      ? decodeOid(certSigAlgElem.children[0].contentBytes)
      : sigAlgOid;

    let certSignatureValue: Uint8Array | undefined = undefined;
    if (certSeq[2] && certSeq[2].tag === 0x03 && certSeq[2].contentBytes.length > 1) {
      // First byte is unused bits count
      certSignatureValue = certSeq[2].contentBytes.subarray(1);
    }

    const sha256Fingerprint = computeSha256Sync(certBytes);
    const isAlgorithmIdentifierConsistent =
      !certSignatureAlgorithmOid || !sigAlgOid || certSignatureAlgorithmOid === sigAlgOid;

    return {
      rawDer: certBytes,
      serialNumber,
      issuer,
      subject,
      validity: {
        notBefore,
        notAfter,
        isCurrentlyValid,
      },
      subjectPublicKeyInfo,
      algorithmOid: sigAlgOid,
      rawTbsCertificate: tbsCert.rawBytes,
      certSignatureAlgorithmOid,
      certSignatureValue,
      sha256Fingerprint,
      extensions,
      isAlgorithmIdentifierConsistent,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Parses X.509 certificate extension list and tracks critical extensions per RFC 5280
 */
export function parseCertificateExtensions(extList: Asn1Element[]): ParsedCertificateExtensions {
  const result: ParsedCertificateExtensions = {
    criticalExtensions: [],
    unsupportedCriticalExtensions: [],
  };

  const KNOWN_SUPPORTED_EXTENSION_OIDS = new Set([
    '2.5.29.19', // basicConstraints
    '2.5.29.15', // keyUsage
    '2.5.29.37', // extKeyUsage
    '2.5.29.14', // subjectKeyIdentifier
    '2.5.29.35', // authorityKeyIdentifier
  ]);

  for (const extElem of extList) {
    if (!extElem.children || extElem.children.length < 2) continue;

    // First child is OID
    if (extElem.children[0].tag !== 0x06) continue;
    const oid = decodeOid(extElem.children[0].contentBytes);

    // Value OCTET STRING is child[1] or child[2] if critical boolean is present
    let isCritical = false;
    let valElem = extElem.children[1];
    if (valElem.tag === 0x01 && extElem.children.length >= 3) {
      isCritical = valElem.contentBytes[0] !== 0;
      valElem = extElem.children[2];
    }
    if (!valElem || valElem.tag !== 0x04) continue;

    if (isCritical) {
      result.criticalExtensions?.push(oid);
      if (!KNOWN_SUPPORTED_EXTENSION_OIDS.has(oid)) {
        result.unsupportedCriticalExtensions?.push(oid);
      }
    }

    const extBytes = valElem.contentBytes;

    if (oid === '2.5.29.19') {
      // basicConstraints: SEQUENCE { cA BOOLEAN DEFAULT FALSE, pathLenConstraint INTEGER OPTIONAL }
      const inner = parseAsn1(extBytes, 4);
      let isCA = false;
      let pathLenConstraint: number | undefined = undefined;

      if (inner.length > 0 && inner[0].children) {
        const seqItems = inner[0].children;
        let sIdx = 0;
        if (seqItems[sIdx] && seqItems[sIdx].tag === 0x01) {
          isCA = seqItems[sIdx].contentBytes[0] !== 0;
          sIdx++;
        }
        if (seqItems[sIdx] && seqItems[sIdx].tag === 0x02) {
          let num = 0;
          for (const b of seqItems[sIdx].contentBytes) {
            num = (num << 8) | b;
          }
          pathLenConstraint = num;
        }
      }
      result.basicConstraints = { isCA, pathLenConstraint };
    } else if (oid === '2.5.29.15') {
      // keyUsage: BIT STRING
      const inner = parseAsn1(extBytes, 4);
      if (inner.length > 0 && inner[0].tag === 0x03 && inner[0].contentBytes.length > 1) {
        const b0 = inner[0].contentBytes[1] || 0;
        const b1 = inner[0].contentBytes[2] || 0;
        const rawBits = (b0 << 8) | b1;
        result.keyUsage = {
          digitalSignature: (b0 & 0x80) !== 0,
          nonRepudiation: (b0 & 0x40) !== 0,
          keyEncipherment: (b0 & 0x20) !== 0,
          dataEncipherment: (b0 & 0x10) !== 0,
          keyAgreement: (b0 & 0x08) !== 0,
          keyCertSign: (b0 & 0x04) !== 0,
          cRLSign: (b0 & 0x02) !== 0,
          encipherOnly: (b0 & 0x01) !== 0,
          decipherOnly: (b1 & 0x80) !== 0,
          rawBits,
        };
      }
    } else if (oid === '2.5.29.37') {
      // extendedKeyUsage: SEQUENCE OF OID
      const inner = parseAsn1(extBytes, 4);
      if (inner.length > 0 && inner[0].children) {
        const ekuList: string[] = [];
        for (const item of inner[0].children) {
          if (item.tag === 0x06) {
            ekuList.push(decodeOid(item.contentBytes));
          }
        }
        result.extendedKeyUsage = ekuList;
      }
    } else if (oid === '2.5.29.14') {
      // subjectKeyIdentifier: OCTET STRING
      const inner = parseAsn1(extBytes, 4);
      if (inner.length > 0 && inner[0].tag === 0x04) {
        result.subjectKeyIdentifier = Array.from(inner[0].contentBytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }
    } else if (oid === '2.5.29.35') {
      // authorityKeyIdentifier
      const inner = parseAsn1(extBytes, 4);
      if (inner.length > 0 && inner[0].children) {
        for (const item of inner[0].children) {
          if ((item.tag & 0x1f) === 0) {
            result.authorityKeyIdentifier = Array.from(item.contentBytes)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');
          }
        }
      }
    }
  }

  return result;
}

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

/**
 * Pure JavaScript synchronous SHA-256 for deterministic cert fingerprints
 */
export function computeSha256Sync(bytes: Uint8Array): string {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0x0bef9a3f, 0xc67178f2,
  ];

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const bitLen = bytes.length * 8;
  const newLen = ((bytes.length + 8 + 64) >>> 6) << 6;
  const padded = new Uint8Array(newLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(newLen - 4, bitLen >>> 0, false);
  view.setUint32(newLen - 8, Math.floor(bitLen / 0x100000000), false);

  const W = new Uint32Array(64);
  for (let i = 0; i < newLen; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = view.getUint32(i + (t * 4), false);
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, W[t - 15]) ^ rotr(18, W[t - 15]) ^ (W[t - 15] >>> 3);
      const s1 = rotr(17, W[t - 2]) ^ rotr(19, W[t - 2]) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = [h0, h1, h2, h3, h4, h5, h6, h7];
  return out.map((val) => val.toString(16).padStart(8, '0')).join('');
}

/**
 * Parses PKCS#7 / CMS SignedData structure
 */
export function parsePkcs7SignedData(derBytes: Uint8Array): ParsedPkcs7SignedData | null {
  try {
    const root = parseAsn1(derBytes, 12);
    if (root.length === 0 || root[0].tag !== 0x30 || !root[0].children) {
      return null;
    }

    const contentInfo = root[0].children;
    if (contentInfo.length < 2 || contentInfo[0].tag !== 0x06) {
      return null;
    }

    const contentTypeOid = decodeOid(contentInfo[0].contentBytes);
    if (contentTypeOid !== '1.2.840.113549.1.7.2') {
      // Not SignedData
      return null;
    }

    const signedDataWrapper = contentInfo[1];
    if ((signedDataWrapper.tag & 0xc0) !== 0x80 && signedDataWrapper.tag !== 0xa0) {
      return null;
    }

    const signedDataSeq = signedDataWrapper.children?.[0];
    if (!signedDataSeq || signedDataSeq.tag !== 0x30 || !signedDataSeq.children) {
      return null;
    }

    const sdChildren = signedDataSeq.children;
    let idx = 0;

    // Version
    const version = sdChildren[idx++]?.contentBytes[0] || 1;

    // DigestAlgorithms
    const digestAlgs = sdChildren[idx++];
    let digestAlgorithmOid = '2.16.840.1.101.3.4.2.1'; // default SHA-256
    if (digestAlgs?.children?.[0]?.children?.[0]?.tag === 0x06) {
      digestAlgorithmOid = decodeOid(digestAlgs.children[0].children[0].contentBytes);
    }

    // EncapsulatedContentInfo
    const encapContent = sdChildren[idx++];
    if (!encapContent) return null;

    // Certificates [0] IMPLICIT CertificateSet OPTIONAL
    const certificates: ParsedX509Certificate[] = [];
    if (sdChildren[idx] && sdChildren[idx].tag === 0xa0) {
      const certsWrapper = sdChildren[idx++];
      for (const certElem of certsWrapper.children || []) {
        if (certElem.tag === 0x30) {
          const parsedCert = parseX509Certificate(certElem.rawBytes);
          if (parsedCert) certificates.push(parsedCert);
        }
      }
    }

    // Skip optional CRLs [1] if present
    if (sdChildren[idx] && sdChildren[idx].tag === 0xa1) {
      idx++;
    }

    // SignerInfos
    const signerInfosWrapper = sdChildren[idx++];
    if (!signerInfosWrapper || !signerInfosWrapper.children || signerInfosWrapper.children.length === 0) {
      return null;
    }

    const signerInfoSeq = signerInfosWrapper.children[0];
    if (!signerInfoSeq || !signerInfoSeq.children) return null;

    const siChildren = signerInfoSeq.children;
    let siIdx = 0;

    const siVer = siChildren[siIdx++]?.contentBytes[0] || 1;
    siIdx++; // Skip IssuerAndSerialNumber
    const siDigestAlgElem = siChildren[siIdx++];
    const siDigestAlgOid = siDigestAlgElem?.children?.[0]?.tag === 0x06
      ? decodeOid(siDigestAlgElem.children[0].contentBytes)
      : digestAlgorithmOid;

    // SignedAttributes [0] IMPLICIT OPTIONAL
    let signedAttributesRaw: Uint8Array | undefined = undefined;
    let setOfSignedAttributes: Uint8Array | undefined = undefined;
    let messageDigest: Uint8Array | undefined = undefined;
    let signingTime: Date | undefined = undefined;

    if (siChildren[siIdx] && siChildren[siIdx].tag === 0xa0) {
      const signedAttrsElem = siChildren[siIdx++];
      signedAttributesRaw = signedAttrsElem.rawBytes;

      // RFC 5652 Section 5.4: replace 0xa0 with 0x31 (SET OF) for cryptographic verification
      setOfSignedAttributes = new Uint8Array(signedAttributesRaw);
      setOfSignedAttributes[0] = 0x31;

      // Parse individual signed attributes
      for (const attr of signedAttrsElem.children || []) {
        if (attr.children && attr.children.length >= 2 && attr.children[0].tag === 0x06) {
          const attrOid = decodeOid(attr.children[0].contentBytes);
          const attrValSet = attr.children[1];
          if (attrValSet.children && attrValSet.children.length > 0) {
            const firstVal = attrValSet.children[0];
            if (attrOid === '1.2.840.113549.1.9.4' && firstVal.tag === 0x04) {
              // messageDigest
              messageDigest = firstVal.contentBytes;
            } else if (attrOid === '1.2.840.113549.1.9.5') {
              // signingTime
              signingTime = decodeAsn1Time(firstVal.contentBytes, firstVal.tag) || undefined;
            }
          }
        }
      }
    }

    // SignatureAlgorithm
    const sigAlgElem = siChildren[siIdx++];
    const signatureAlgorithmOid = sigAlgElem?.children?.[0]?.tag === 0x06
      ? decodeOid(sigAlgElem.children[0].contentBytes)
      : '1.2.840.113549.1.1.11';

    // SignatureValue (OCTET STRING)
    const sigValueElem = siChildren[siIdx++];
    if (!sigValueElem || sigValueElem.tag !== 0x04) {
      return null;
    }
    const signatureBytes = sigValueElem.contentBytes;

    // Check for unsigned timestamp attribute [1]
    let hasTimestampToken = false;
    if (siChildren[siIdx] && siChildren[siIdx].tag === 0xa1) {
      const unsignedAttrsElem = siChildren[siIdx++];
      for (const attr of unsignedAttrsElem.children || []) {
        if (attr.children?.[0]?.tag === 0x06) {
          const uOid = decodeOid(attr.children[0].contentBytes);
          if (uOid === '1.2.840.113549.1.9.16.2.14') {
            hasTimestampToken = true;
          }
        }
      }
    }

    return {
      version,
      digestAlgorithmOid,
      certificates,
      signerInfo: {
        version: siVer,
        digestAlgorithmOid: siDigestAlgOid,
        signatureAlgorithmOid,
        signedAttributesRaw,
        setOfSignedAttributes,
        messageDigest,
        signingTime,
        signatureBytes,
        hasTimestampToken,
      },
    };
  } catch (err) {
    return null;
  }
}
