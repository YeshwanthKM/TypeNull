/**
 * TypeNull Cross-Document Field Comparison Service
 *
 * Compares extracted statutory fields across uploaded documents and against
 * the institution's claimed profile/application metadata:
 * - Institution Legal Name
 * - AICTE Permanent Institute ID
 * - Academic / Financial Year
 * - Document Identifier / CA UDIN
 *
 * Normalizes values and categorizes comparison results:
 * - exact_match
 * - formatting_difference
 * - genuine_discrepancy
 * - insufficient_evidence
 */

export type ComparisonOutcome =
  | 'exact_match'
  | 'formatting_difference'
  | 'genuine_discrepancy'
  | 'insufficient_evidence';

export interface FieldComparisonResult {
  fieldName: string;
  fieldLabel: string;
  expectedValue: string;
  expectedSource: string;
  comparedValues: Array<{
    documentId: string;
    documentName: string;
    extractedValue: string;
    pageNumber?: number;
    evidenceSnippet?: string;
    confidence?: number;
  }>;
  outcome: ComparisonOutcome;
  similarityScore: number;
  explanation: string;
  isBlocking: boolean;
}

/**
 * Normalizes institution name by removing corporate/statutory suffix tokens,
 * punctuation, and excessive whitespace for deterministic comparison.
 */
export function normalizeEntityName(rawName: string): string {
  if (!rawName) return '';
  return rawName
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ')
    .replace(
      /\b(private|pvt|limited|ltd|trust|society|foundation|board|institute|institution|college|engineering|technology)\b/gi,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes alphanumeric identifiers (e.g. AICTE ID 1-43289012, PAN, UDIN)
 */
export function normalizeIdentifier(rawId: string): string {
  if (!rawId) return '';
  return rawId.replace(/[\s\-_]/g, '').toUpperCase().trim();
}

/**
 * Calculates token overlap similarity between two normalized strings (0.0 to 1.0)
 */
export function calculateTokenSimilarity(a: string, b: string): number {
  const normA = a.toLowerCase().trim();
  const normB = b.toLowerCase().trim();
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;
  if (normA.includes(normB) || normB.includes(normA)) return 0.9;

  const tokensA = new Set(normA.split(/\s+/).filter(Boolean));
  const tokensB = new Set(normB.split(/\s+/).filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) intersection++;
  });

  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Compares institution legal name across all documents against application metadata
 */
export function compareInstitutionName(
  claimedName: string,
  documentExtractions: Array<{
    documentId: string;
    documentName: string;
    extractedName?: string;
    pageNumber?: number;
    evidenceSnippet?: string;
    confidence?: number;
  }>
): FieldComparisonResult {
  const compared = documentExtractions
    .filter((d) => d.extractedName && d.extractedName.trim().length > 0)
    .map((d) => ({
      documentId: d.documentId,
      documentName: d.documentName,
      extractedValue: d.extractedName!.trim(),
      pageNumber: d.pageNumber,
      evidenceSnippet: d.evidenceSnippet,
      confidence: d.confidence,
    }));

  if (!claimedName || !claimedName.trim()) {
    return {
      fieldName: 'institution_name',
      fieldLabel: 'Institution Legal Name',
      expectedValue: claimedName || 'Not Declared',
      expectedSource: 'Application Metadata / Registration Profile',
      comparedValues: compared,
      outcome: 'insufficient_evidence',
      similarityScore: 0,
      explanation:
        'No declared institution legal name was found in application metadata to compare supporting documents against.',
      isBlocking: false,
    };
  }

  if (compared.length === 0) {
    return {
      fieldName: 'institution_name',
      fieldLabel: 'Institution Legal Name',
      expectedValue: claimedName,
      expectedSource: 'Application Metadata / Registration Profile',
      comparedValues: [],
      outcome: 'insufficient_evidence',
      similarityScore: 0,
      explanation:
        'No clear institution legal name could be extracted from uploaded supporting documents for cross-comparison.',
      isBlocking: false,
    };
  }

  const normClaim = normalizeEntityName(claimedName);
  let minScore = 1.0;
  let hasFormattingDiff = false;
  let hasDiscrepancy = false;

  for (const item of compared) {
    const rawMatch = item.extractedValue.toLowerCase() === claimedName.toLowerCase();
    if (rawMatch) {
      continue;
    }
    const normExtracted = normalizeEntityName(item.extractedValue);
    const score = calculateTokenSimilarity(normClaim, normExtracted);
    if (score < minScore) minScore = score;

    if (score >= 0.75) {
      hasFormattingDiff = true;
    } else {
      hasDiscrepancy = true;
    }
  }

  if (hasDiscrepancy) {
    return {
      fieldName: 'institution_name',
      fieldLabel: 'Institution Legal Name',
      expectedValue: claimedName,
      expectedSource: 'Application Metadata / Registration Profile',
      comparedValues: compared,
      outcome: 'genuine_discrepancy',
      similarityScore: minScore,
      explanation: `Extracted entity name in supporting documents differs significantly from the declared institution name "${claimedName}". Ensure documents belong to the registered legal entity.`,
      isBlocking: true,
    };
  }

  if (hasFormattingDiff) {
    return {
      fieldName: 'institution_name',
      fieldLabel: 'Institution Legal Name',
      expectedValue: claimedName,
      expectedSource: 'Application Metadata / Registration Profile',
      comparedValues: compared,
      outcome: 'formatting_difference',
      similarityScore: minScore,
      explanation: `Minor punctuation, spacing, or legal suffix variation detected between declared name "${claimedName}" and supporting documents. Core identity tokens match.`,
      isBlocking: false,
    };
  }

  return {
    fieldName: 'institution_name',
    fieldLabel: 'Institution Legal Name',
    expectedValue: claimedName,
    expectedSource: 'Application Metadata / Registration Profile',
    comparedValues: compared,
    outcome: 'exact_match',
    similarityScore: 1.0,
    explanation: 'Institution name matches exactly across declared claims and all supporting documentary evidence.',
    isBlocking: false,
  };
}

/**
 * Compares AICTE Permanent Institute ID across documents against application metadata
 */
export function comparePermanentId(
  claimedId: string,
  documentExtractions: Array<{
    documentId: string;
    documentName: string;
    extractedId?: string;
    pageNumber?: number;
    evidenceSnippet?: string;
    confidence?: number;
  }>
): FieldComparisonResult {
  const compared = documentExtractions
    .filter((d) => d.extractedId && d.extractedId.trim().length > 0)
    .map((d) => ({
      documentId: d.documentId,
      documentName: d.documentName,
      extractedValue: d.extractedId!.trim(),
      pageNumber: d.pageNumber,
      evidenceSnippet: d.evidenceSnippet,
      confidence: d.confidence,
    }));

  if (!claimedId || !claimedId.trim()) {
    return {
      fieldName: 'aicte_permanent_id',
      fieldLabel: 'AICTE Permanent Institute ID',
      expectedValue: claimedId || 'Not Declared',
      expectedSource: 'Institution Registration Profile',
      comparedValues: compared,
      outcome: 'insufficient_evidence',
      similarityScore: 0,
      explanation:
        'No AICTE Permanent Institute ID was declared in institution profile to compare supporting documents against.',
      isBlocking: false,
    };
  }

  if (compared.length === 0) {
    return {
      fieldName: 'aicte_permanent_id',
      fieldLabel: 'AICTE Permanent Institute ID',
      expectedValue: claimedId,
      expectedSource: 'Institution Registration Profile',
      comparedValues: [],
      outcome: 'insufficient_evidence',
      similarityScore: 0,
      explanation:
        'No AICTE Permanent ID was explicitly detected in supporting documents (e.g. Affidavit or previous EoA letter) for cross-comparison.',
      isBlocking: false,
    };
  }

  const normClaim = normalizeIdentifier(claimedId);
  let hasDiscrepancy = false;
  let hasFormattingDiff = false;

  for (const item of compared) {
    const normExtracted = normalizeIdentifier(item.extractedValue);
    if (normExtracted === normClaim) {
      if (item.extractedValue !== claimedId) {
        hasFormattingDiff = true;
      }
    } else {
      hasDiscrepancy = true;
    }
  }

  if (hasDiscrepancy) {
    return {
      fieldName: 'aicte_permanent_id',
      fieldLabel: 'AICTE Permanent Institute ID',
      expectedValue: claimedId,
      expectedSource: 'Institution Registration Profile',
      comparedValues: compared,
      outcome: 'genuine_discrepancy',
      similarityScore: 0,
      explanation: `Permanent Institute ID in supporting document (${compared.map((c) => c.extractedValue).join(', ')}) contradicts declared ID "${claimedId}".`,
      isBlocking: true,
    };
  }

  if (hasFormattingDiff) {
    return {
      fieldName: 'aicte_permanent_id',
      fieldLabel: 'AICTE Permanent Institute ID',
      expectedValue: claimedId,
      expectedSource: 'Institution Registration Profile',
      comparedValues: compared,
      outcome: 'formatting_difference',
      similarityScore: 0.95,
      explanation: `Permanent ID matches the declared ID "${claimedId}" after standardizing hyphens and whitespace.`,
      isBlocking: false,
    };
  }

  return {
    fieldName: 'aicte_permanent_id',
    fieldLabel: 'AICTE Permanent Institute ID',
    expectedValue: claimedId,
    expectedSource: 'Institution Registration Profile',
    comparedValues: compared,
    outcome: 'exact_match',
    similarityScore: 1.0,
    explanation: `Permanent Institute ID "${claimedId}" matches exactly across declared application metadata and supporting documents.`,
    isBlocking: false,
  };
}

/**
 * Validates 18-digit ICAI UDIN format for Audited Financial Statements
 */
export function validateUdinFormat(udin: string): { isValid: boolean; explanation: string } {
  if (!udin) return { isValid: false, explanation: 'UDIN is missing.' };
  const clean = udin.replace(/[\s\-_]/g, '').trim();

  // ICAI UDIN is typically 18 alphanumeric characters
  // First 6 digits: Membership number of CA
  // Next 10 characters: Year/Date/Unique reference
  // Last 2 characters: Checksum / alphanumeric
  if (/^[0-9]{6}[0-9A-Za-z]{12}$/.test(clean)) {
    return {
      isValid: true,
      explanation: `Valid 18-character ICAI UDIN syntax (${clean}). CA Membership prefix: ${clean.slice(0, 6)}.`,
    };
  }

  return {
    isValid: false,
    explanation: `Value "${udin}" does not comply with the statutory 18-character ICAI UDIN syntax standard.`,
  };
}
