import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  RegulatorySource,
  AicteRegulatoryRule,
  RegulatoryTopic,
  RuleVerificationStatus,
  ComplianceChecklistItem,
} from '../../types/rulebook';

/**
 * Official AICTE Regulatory Sources Inventory
 * Authoritative starting points grounded in AICTE Approval Process Handbook (APH) 2024–2027
 */
export const OFFICIAL_REGULATORY_SOURCES: RegulatorySource[] = [
  {
    id: 'SRC-AICTE-APH-2024-27',
    title: 'Approval Process Handbook (APH) 2024–2027',
    shortTitle: 'AICTE APH 2024–2027',
    academicYearRange: '2024–2027',
    documentType: 'handbook',
    issuingAuthority: 'All India Council for Technical Education (AICTE), Ministry of Education',
    sourceUrl: 'https://www.aicte-india.org/bureaus/approval',
    publicationDate: '2023-12-15',
    effectiveDate: '2024-01-01',
    isCurrentApplicable: true,
    summary:
      'Multi-year statutory handbook establishing approval norms, multi-year Extension of Approval (up to 3 years), relaxed compliance, land/infrastructure standards, and self-disclosure requirements.',
  },
  {
    id: 'SRC-AICTE-ACT-1987',
    title: 'All India Council for Technical Education Act, 1987 (Act No. 52 of 1987)',
    shortTitle: 'AICTE Act 1987',
    academicYearRange: 'Statutory Act (Permanent)',
    documentType: 'statutory_act',
    issuingAuthority: 'Parliament of India',
    sourceUrl: 'https://www.aicte-india.org/about-us/overview',
    publicationDate: '1987-12-23',
    effectiveDate: '1988-03-28',
    isCurrentApplicable: true,
    summary:
      'Statutory enactment establishing AICTE for proper planning and coordinated development of the technical education system throughout the country.',
  },
  {
    id: 'SRC-AICTE-GAZ-2019-FAC',
    title: 'AICTE Regulations on Pay Scales, Minimum Qualifications and Cadre Ratio (7th CPC)',
    shortTitle: 'Faculty Cadre & Qualification Regulations',
    academicYearRange: '2019 onwards',
    documentType: 'gazette_notification',
    issuingAuthority: 'Gazette of India, Ministry of Human Resource Development',
    sourceUrl: 'https://www.aicte-india.org/sites/default/files/gazette.pdf',
    publicationDate: '2019-03-01',
    effectiveDate: '2019-03-01',
    isCurrentApplicable: true,
    summary:
      'Statutory gazette notification prescribing student-to-teacher cadre ratios (1:15 for Degree Engineering, 1:20 for Diploma/PG) and minimum faculty qualifications.',
  },
  {
    id: 'SRC-ICAI-UDIN-2019',
    title: 'ICAI Unique Document Identification Number (UDIN) Mandatory Regulation',
    shortTitle: 'ICAI UDIN Mandate',
    academicYearRange: '2019 onwards',
    documentType: 'statutory_act',
    issuingAuthority: 'Institute of Chartered Accountants of India (ICAI)',
    sourceUrl: 'https://udin.icai.org/',
    publicationDate: '2019-02-01',
    effectiveDate: '2019-07-01',
    isCurrentApplicable: true,
    summary:
      'Mandatory standard requiring every audit report, balance sheet attestation, and financial certification by a practicing CA to carry a verifiable 18-digit UDIN.',
  },
];

/**
 * Verified AICTE Regulatory Rules Matrix
 * Derived strictly from APH 2024–2027 Chapters and Appendices
 */
export const VERIFIED_AICTE_RULES: AicteRegulatoryRule[] = [
  {
    id: 'AICTE-RULE-EOA-01',
    sourceId: 'SRC-AICTE-APH-2024-27',
    ruleCode: 'APH-CH2-EOA-ELIG',
    title: 'Grant of Extension of Approval (EoA) to Existing Institutions',
    topic: 'approval_process',
    chapterOrAppendix: 'Chapter II',
    clauseOrSection: 'Clause 2.1 & 2.2',
    applicableCategory: 'extension_of_approval',
    institutionApplicability: 'All Existing Approved Technical Institutions with Permanent AICTE ID',
    verificationStatus: 'verified',
    officialTextExcerpt:
      'Existing Technical Institutions offering Degree / Diploma / Post Graduate programmes shall apply online for Extension of Approval on AICTE Web-Portal under Chapter II based on self-disclosure.',
    plainLanguageExplanation:
      'If your college or polytechnic is already approved by AICTE and holds a Permanent Institute ID, you must submit an annual Extension of Approval (EoA) to continue admissions and legally operate.',
    institutionalAction:
      'Verify that your institutional name, permanent ID, registered society/trust, and approved courses match the official AICTE portal records.',
    complianceEvidence: 'AICTE Permanent Institute ID, Previous Year EoA Letter, and active institutional registration record.',
    requiredDocumentKeys: ['statutory_declaration'],
    lastVerifiedDate: '2026-10-26',
    version: '2024-2027.1',
  },
  {
    id: 'AICTE-RULE-EOA-MULTI',
    sourceId: 'SRC-AICTE-APH-2024-27',
    ruleCode: 'APH-CH2-MULTI-YEAR',
    title: 'Multi-Year Extension of Approval (Up to 3 Years)',
    topic: 'approval_process',
    chapterOrAppendix: 'Chapter II',
    clauseOrSection: 'Clause 2.1 (Multi-Year Reform)',
    applicableCategory: 'extension_of_approval',
    institutionApplicability: 'Well-Performing, Compliant Technical Institutions with NBA/NAAC Accreditation',
    verificationStatus: 'verified',
    officialTextExcerpt:
      'Extension of Approval shall be granted for up to 3 years to well-performing institutions meeting prescribed quality thresholds, subject to annual digital self-disclosure and absence of punitive actions.',
    plainLanguageExplanation:
      'Under the 2024–2027 multi-year reform, institutions with clean regulatory records and accredited courses are eligible for a multi-year EoA (up to 3 years), reducing annual procedural paperwork.',
    institutionalAction:
      'Declare your current accreditation status and verify that no unresolved statutory penalties or deficiency notices exist on your institute dossier.',
    complianceEvidence: 'Valid NBA Accreditation letters or NAAC Grade certificate (Grade A or above).',
    requiredDocumentKeys: ['statutory_declaration'],
    dependenciesOrExceptions: 'Institutions under penal action or without valid accreditation receive single-year approvals.',
    lastVerifiedDate: '2026-10-26',
    version: '2024-2027.1',
  },
  {
    id: 'AICTE-RULE-AFFIDAVIT-1',
    sourceId: 'SRC-AICTE-APH-2024-27',
    ruleCode: 'APH-APP17-AFF1',
    title: 'Statutory Compliance Affidavit (Affidavit 1)',
    topic: 'financial_legal',
    chapterOrAppendix: 'Appendix 17',
    clauseOrSection: 'Format of Affidavit 1',
    applicableCategory: 'extension_of_approval',
    institutionApplicability: 'Mandatory for All Technical Institutions',
    verificationStatus: 'verified',
    officialTextExcerpt:
      'The Applicant shall upload Affidavit 1 duly sworn on a Non-Judicial Stamp Paper of ₹100/- and notarised, affirming compliance with all AICTE regulations, anti-ragging mandates, and non-commercialisation.',
    plainLanguageExplanation:
      'The Head of the Trust or Society must upload a legal affidavit on stamp paper confirming that the college follows all AICTE guidelines, does not collect capitation fees, and enforces anti-ragging policies.',
    institutionalAction:
      'Execute Affidavit 1 on non-judicial stamp paper, have it notarised by an authorised Public Notary, and upload a clear scanned copy.',
    complianceEvidence: 'Notarised Affidavit 1 with stamp paper serial number, notary seal, and authorized signatory signature.',
    requiredDocumentKeys: ['statutory_declaration'],
    lastVerifiedDate: '2026-10-26',
    version: '2024-2027.1',
  },
  {
    id: 'AICTE-RULE-FACULTY-CADRE',
    sourceId: 'SRC-AICTE-GAZ-2019-FAC',
    ruleCode: 'APH-APP7-CADRE',
    title: 'Faculty Cadre Ratio and Minimum Staffing Norms',
    topic: 'faculty_cadre',
    chapterOrAppendix: 'Appendix 7',
    clauseOrSection: 'Norms for Faculty Requirements',
    applicableCategory: 'extension_of_approval',
    institutionApplicability: 'All Technical Programs (Degree, Diploma, Post-Graduate)',
    verificationStatus: 'verified',
    officialTextExcerpt:
      'Institutions shall maintain the minimum student-to-faculty cadre ratio: 1:15 or 1:20 as applicable to the program, with the ideal cadre ratio of Professor : Associate Professor : Assistant Professor maintained at 1:2:6.',
    plainLanguageExplanation:
      'You must employ sufficient full-time qualified teachers so that there is at least 1 teacher for every 15 engineering students (or 1:20 for diploma/management), with a balanced ratio of senior professors and lecturers.',
    institutionalAction:
      'Maintain an updated faculty register verifying qualifications, cadre designations, biometric attendance records, and salary disbursement through bank transfers.',
    complianceEvidence: 'Certified Faculty Roll and Cadre Statement signed by the Principal/Director.',
    requiredDocumentKeys: ['statutory_declaration'],
    lastVerifiedDate: '2026-10-26',
    version: '2024-2027.1',
  },
  {
    id: 'AICTE-RULE-FIN-UDIN',
    sourceId: 'SRC-ICAI-UDIN-2019',
    ruleCode: 'APH-CH2-FIN-UDIN',
    title: 'Audited Financial Statements with CA UDIN Verification',
    topic: 'financial_legal',
    chapterOrAppendix: 'Chapter II',
    clauseOrSection: 'Financial Requirements Clause',
    applicableCategory: 'extension_of_approval',
    institutionApplicability: 'All Self-Financing & Private Technical Institutions',
    verificationStatus: 'verified',
    officialTextExcerpt:
      'Audited Financial Statements including Balance Sheet and Income & Expenditure Account for the preceding financial year, certified by a Chartered Accountant with valid UDIN, must be submitted.',
    plainLanguageExplanation:
      'Private and self-financed colleges must submit annual audited balance sheets. The auditor must generate and include a valid 18-digit UDIN from the ICAI portal to prevent forged certificates.',
    institutionalAction:
      'Obtain the signed audited balance sheet from your Chartered Accountant, ensuring the 18-digit UDIN is printed on the attestation page.',
    complianceEvidence: 'Audited Balance Sheet and Income/Expenditure Statement with visible, verifiable 18-digit UDIN.',
    requiredDocumentKeys: ['incorporation_certificate'],
    lastVerifiedDate: '2026-10-26',
    version: '2024-2027.1',
  },
  {
    id: 'AICTE-RULE-LAND-BUILTUP',
    sourceId: 'SRC-AICTE-APH-2024-27',
    ruleCode: 'APH-APP4-BUILTUP',
    title: 'Land and Built-up Area Maintenance Certification',
    topic: 'infrastructure',
    chapterOrAppendix: 'Appendix 4',
    clauseOrSection: 'Norms for Land and Built-up Area',
    applicableCategory: 'extension_of_approval',
    institutionApplicability: 'Conditional for Existing Technical Institutions',
    verificationStatus: 'conditional',
    officialTextExcerpt:
      'Existing institutions operating from their approved permanent site shall certify continuous maintenance of instructional, administrative, and amenities areas. Original land title deeds are required only if adding land or relocating.',
    plainLanguageExplanation:
      'You must prove that your campus maintains the required square meters of classrooms, labs, and libraries. Under 2024–2027 rules, you do NOT need to re-upload full land deeds every year unless your campus address or building changed.',
    institutionalAction:
      'Provide an Architect or Local Competent Authority certificate confirming existing built-up area and safety compliance.',
    complianceEvidence: 'Architect Certificate / Municipal Occupancy Certificate verifying instructional area square meters.',
    requiredDocumentKeys: ['utility_bill'],
    dependenciesOrExceptions: 'Mandatory full land title deeds are only demanded during campus expansion, addition of courses, or relocation.',
    lastVerifiedDate: '2026-10-26',
    version: '2024-2027.1',
  },
  {
    id: 'AICTE-RULE-NBA-ACCRED',
    sourceId: 'SRC-AICTE-APH-2024-27',
    ruleCode: 'APH-CH2-ACCRED',
    title: 'National Board of Accreditation (NBA) Certificate for Eligible Courses',
    topic: 'accreditation',
    chapterOrAppendix: 'Chapter II',
    clauseOrSection: 'Clause 2.4 (Accreditation Benefits)',
    applicableCategory: 'extension_of_approval',
    institutionApplicability: 'Conditional: Only applies if courses hold active NBA accreditation',
    verificationStatus: 'conditional',
    officialTextExcerpt:
      'Programmes with active accreditation from NBA shall be granted approval extension in accordance with the accreditation period, and qualify for intake flexibilities as prescribed in the handbook.',
    plainLanguageExplanation:
      'If your engineering or management programs are accredited by NBA, you can upload the award letter to unlock extended approval validity and intake cap exemptions.',
    institutionalAction: 'Upload the current NBA accreditation notification letter with course validity dates.',
    complianceEvidence: 'Official NBA Accreditation Award Letter showing valid academic years.',
    requiredDocumentKeys: ['statutory_declaration'],
    dependenciesOrExceptions: 'Non-accredited institutions remain fully eligible for standard annual EoA.',
    lastVerifiedDate: '2026-10-26',
    version: '2024-2027.1',
  },
];

// Offline in-memory cache for fast UI interactivity
let runtimeSources: RegulatorySource[] = [...OFFICIAL_REGULATORY_SOURCES];
let runtimeRules: AicteRegulatoryRule[] = [...VERIFIED_AICTE_RULES];

/**
 * Fetch all official regulatory sources (Handbooks, Gazettes, Acts)
 */
export async function fetchRegulatorySources(): Promise<RegulatorySource[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('aicte_regulatory_sources')
        .select('*')
        .order('publication_date', { ascending: false });
      if (!error && data && data.length > 0) {
        return data.map((d: any) => ({
          id: d.id,
          title: d.title,
          shortTitle: d.short_title,
          academicYearRange: d.academic_year_range,
          documentType: d.document_type,
          issuingAuthority: d.issuing_authority,
          sourceUrl: d.source_url,
          publicationDate: d.publication_date,
          effectiveDate: d.effective_date,
          isCurrentApplicable: d.is_current_applicable,
          summary: d.summary,
        }));
      }
    } catch {
      // Graceful fallback to verified in-memory sources
    }
  }
  return runtimeSources;
}

/**
 * Fetch all structured AICTE regulatory rules
 */
export async function fetchRegulatoryRules(): Promise<AicteRegulatoryRule[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('aicte_regulatory_rules')
        .select('*')
        .order('rule_code', { ascending: true });
      if (!error && data && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          sourceId: r.source_id,
          ruleCode: r.rule_code,
          title: r.title,
          topic: r.topic,
          chapterOrAppendix: r.chapter_or_appendix,
          clauseOrSection: r.clause_or_section,
          applicableCategory: r.applicable_category,
          institutionApplicability: r.institution_applicability,
          verificationStatus: r.verification_status,
          officialTextExcerpt: r.official_text_excerpt,
          plainLanguageExplanation: r.plain_language_explanation,
          institutionalAction: r.institutional_action,
          complianceEvidence: r.compliance_evidence,
          requiredDocumentKeys: r.required_document_keys || [],
          dependenciesOrExceptions: r.dependencies_or_exceptions,
          lastVerifiedDate: r.last_verified_date,
          version: r.version,
        }));
      }
    } catch {
      // Graceful fallback to verified in-memory rules
    }
  }
  return runtimeRules;
}

/**
 * Search and filter regulatory rules by keyword, topic, and verification status
 */
export function searchRegulatoryRules(
  rules: AicteRegulatoryRule[],
  query = '',
  topic: RegulatoryTopic | 'all' = 'all',
  status: RuleVerificationStatus | 'all' = 'all'
): AicteRegulatoryRule[] {
  const q = query.trim().toLowerCase();
  return rules.filter((rule) => {
    const matchesQuery =
      !q ||
      rule.title.toLowerCase().includes(q) ||
      rule.ruleCode.toLowerCase().includes(q) ||
      rule.plainLanguageExplanation.toLowerCase().includes(q) ||
      rule.officialTextExcerpt.toLowerCase().includes(q) ||
      rule.chapterOrAppendix.toLowerCase().includes(q);

    const matchesTopic = topic === 'all' || rule.topic === topic;
    const matchesStatus = status === 'all' || rule.verificationStatus === status;

    return matchesQuery && matchesTopic && matchesStatus;
  });
}

/**
 * Find single rule by ID (for contextual "Why is this required?" link in forms)
 */
export function getRegulatoryRuleById(ruleId: string): AicteRegulatoryRule | undefined {
  return runtimeRules.find((r) => r.id === ruleId || r.ruleCode === ruleId);
}

/**
 * Find rules relevant to a specific document requirement key
 */
export function getRulesForDocumentKey(documentKey: string): AicteRegulatoryRule[] {
  return runtimeRules.filter((r) => r.requiredDocumentKeys.includes(documentKey));
}

/**
 * Generate standard institutional compliance checklist for EoA
 */
export function getInitialComplianceChecklist(): ComplianceChecklistItem[] {
  return runtimeRules.map((rule) => ({
    id: `chk-${rule.id}`,
    ruleId: rule.id,
    title: rule.title,
    topic: rule.topic,
    chapterOrAppendix: rule.chapterOrAppendix,
    plainLanguageExplanation: rule.plainLanguageExplanation,
    verificationStatus: rule.verificationStatus,
    institutionStatus: rule.verificationStatus === 'conditional' ? 'in_progress' : 'in_progress',
    evidenceProvided: false,
    officialCitation: `${rule.chapterOrAppendix}, ${rule.clauseOrSection}`,
    actionRequired: rule.institutionalAction,
  }));
}
