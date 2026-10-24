import { ValidationFinding } from '../../types';

export type FindingCategoryKey =
  | 'missing_documents'
  | 'missing_fields'
  | 'cross_document'
  | 'date_format_issues'
  | 'extraction_review'
  | 'unassessed_requirements';

export type FindingDistinction =
  | 'statutory_defect'
  | 'ocr_quality'
  | 'unassessed_evidence';

export interface FindingCategoryMeta {
  key: FindingCategoryKey;
  label: string;
  badgeLabel: string;
  shortDescription: string;
  explanation: string;
  distinction: FindingDistinction;
  distinctionLabel: string;
}

export const FINDING_CATEGORIES: Record<FindingCategoryKey, FindingCategoryMeta> = {
  missing_documents: {
    key: 'missing_documents',
    label: 'Required Document Proofs',
    badgeLabel: 'Document Proofs',
    shortDescription: 'Presence of mandatory, conditional, and alternative statutory documentary evidence.',
    explanation: 'Official regulations require specific primary documents before an application can be legally processed.',
    distinction: 'statutory_defect',
    distinctionLabel: 'Statutory Requirement',
  },
  missing_fields: {
    key: 'missing_fields',
    label: 'Missing Mandatory Fields',
    badgeLabel: 'Mandatory Fields',
    shortDescription: 'Core statutory identifiers and declarations required on submitted documents.',
    explanation: 'Key application fields (e.g. entity name, registration number, address) must be detectable in evidence.',
    distinction: 'statutory_defect',
    distinctionLabel: 'Statutory Requirement',
  },
  cross_document: {
    key: 'cross_document',
    label: 'Cross-Document Inconsistencies',
    badgeLabel: 'Cross-Document',
    shortDescription: 'Alignment of entity names, PAN numbers, and registrations across separate documents.',
    explanation: 'Verifies that information declared on application forms concurs with all supporting certificates without discrepancy.',
    distinction: 'statutory_defect',
    distinctionLabel: 'Consistency Check',
  },
  date_format_issues: {
    key: 'date_format_issues',
    label: 'Date & Format Issues',
    badgeLabel: 'Format & Dates',
    shortDescription: 'Prescribed statutory syntax patterns and temporal document validity.',
    explanation: 'Validates that identifiers match official regulatory formats (e.g. CIN, GSTIN, PAN) and credentials remain unexpired.',
    distinction: 'statutory_defect',
    distinctionLabel: 'Regulatory Syntax',
  },
  extraction_review: {
    key: 'extraction_review',
    label: 'Extraction Problems Requiring Manual Review',
    badgeLabel: 'Extraction / OCR',
    shortDescription: 'Automated OCR confidence, scan resolution, and text recognition quality.',
    explanation: 'Flags low-confidence scans, unreadable files, or image density limitations. These reflect scan quality rather than statutory non-compliance.',
    distinction: 'ocr_quality',
    distinctionLabel: 'Scan Quality / Review Needed',
  },
  unassessed_requirements: {
    key: 'unassessed_requirements',
    label: 'Requirements That Cannot Yet Be Assessed',
    badgeLabel: 'Unassessed Checks',
    shortDescription: 'Rules deferred because prerequisite documentary evidence has not yet been uploaded.',
    explanation: 'These statutory checks cannot be completed until the applicant provides the corresponding supporting documents.',
    distinction: 'unassessed_evidence',
    distinctionLabel: 'Prerequisite Pending',
  },
};

/**
 * Classifies a validation finding into a structured statutory category.
 */
export function categorizeFinding(finding: ValidationFinding): FindingCategoryKey {
  const ruleId = (finding.ruleId || '').toUpperCase();
  const title = (finding.title || '').toLowerCase();
  const explanation = (finding.explanation || '').toLowerCase();

  // 1. Unassessed Requirements (unable to check due to missing prerequisite evidence)
  if (
    finding.status === 'unable_to_check' &&
    !ruleId.startsWith('OCR-') &&
    !title.includes('extraction') &&
    !title.includes('ocr') &&
    !finding.sourceDocument
  ) {
    return 'unassessed_requirements';
  }

  // 2. Extraction & OCR Quality Problems
  if (
    ruleId.startsWith('OCR-') ||
    ruleId.startsWith('EXT-') ||
    title.includes('text extraction') ||
    title.includes('low text density') ||
    title.includes('ocr scan') ||
    (finding.requiresManualReview &&
      (finding.status === 'unable_to_check' || finding.status === 'warning') &&
      title.includes('extraction'))
  ) {
    return 'extraction_review';
  }

  // 3. Required Document Proofs (Missing or Uploaded)
  if (
    ruleId.startsWith('DOC-REQ') ||
    ruleId.startsWith('GOV-REQ') ||
    title.includes('document missing') ||
    title.includes('document present') ||
    title.includes('required document')
  ) {
    return 'missing_documents';
  }

  // 4. Cross-Document Consistency & Duplicates
  if (
    ruleId.startsWith('XDOC-') ||
    ruleId.includes('DUP') ||
    title.includes('inconsistency') ||
    title.includes('diverges') ||
    title.includes('alignment') ||
    title.includes('concurrency') ||
    title.includes('mismatch') ||
    title.includes('duplicate document')
  ) {
    return 'cross_document';
  }

  // 5. Date & Temporal Validity
  if (
    ruleId.startsWith('DATE-') ||
    title.includes('future issue date') ||
    title.includes('expired') ||
    title.includes('temporal sequence') ||
    title.includes('validity active')
  ) {
    return 'date_format_issues';
  }

  // 6. Mandatory Fields vs Regulatory Format Syntax
  if (ruleId.startsWith('FLD-') || title.includes('field')) {
    if (
      title.includes('missing') ||
      finding.observedValue === 'Missing / Unspecified' ||
      explanation.includes('was not detected')
    ) {
      return 'missing_fields';
    }
    // E.g., statutory format discrepancy (CIN regex, GSTIN regex)
    return 'date_format_issues';
  }

  // Fallbacks
  if (finding.status === 'unable_to_check') {
    return 'unassessed_requirements';
  }

  return 'missing_documents';
}

export interface GroupedCategoryFindings {
  category: FindingCategoryMeta;
  findings: ValidationFinding[];
  issuesCount: number;
  passedCount: number;
  warningsCount: number;
  blockingCount: number;
}

/**
 * Groups a collection of validation findings into statutory categories.
 */
export function groupFindingsByCategory(
  findings: ValidationFinding[],
  filter: 'all' | 'issues' | 'passed' | 'warnings' = 'all'
): GroupedCategoryFindings[] {
  const map = new Map<FindingCategoryKey, ValidationFinding[]>();
  for (const key of Object.keys(FINDING_CATEGORIES) as FindingCategoryKey[]) {
    map.set(key, []);
  }

  // Filter findings according to current filter tab
  const activeFindings = findings.filter((f) => {
    if (filter === 'issues') return f.status === 'failed' || f.status === 'unable_to_check';
    if (filter === 'passed') return f.status === 'passed';
    if (filter === 'warnings') return f.status === 'warning';
    return true;
  });

  for (const finding of activeFindings) {
    const catKey = categorizeFinding(finding);
    map.get(catKey)?.push(finding);
  }

  const result: GroupedCategoryFindings[] = [];
  const priorityOrder: FindingCategoryKey[] = [
    'missing_documents',
    'missing_fields',
    'cross_document',
    'date_format_issues',
    'extraction_review',
    'unassessed_requirements',
  ];

  for (const key of priorityOrder) {
    const catFindings = map.get(key) || [];
    if (catFindings.length > 0) {
      result.push({
        category: FINDING_CATEGORIES[key],
        findings: catFindings,
        issuesCount: catFindings.filter(
          (f) => f.status === 'failed' || f.status === 'unable_to_check'
        ).length,
        passedCount: catFindings.filter((f) => f.status === 'passed').length,
        warningsCount: catFindings.filter((f) => f.status === 'warning').length,
        blockingCount: catFindings.filter((f) => f.isBlocking).length,
      });
    }
  }

  return result;
}
