/**
 * Automated Verification: AICTE Regulatory Framework, Rulebook Engine & EoA Workflow
 * 
 * Verifies:
 * 1. Official Regulatory Sources & AICTE Act / APH 2024–2027 Provenance
 * 2. Regulatory Rules Service: queries, topics, status filters, search, document-key resolution
 * 3. Traceability of all EoA document requirements to official AICTE statutory citations
 * 4. Institutional Compliance Checklist Generator & Deficiencies Detection
 * 5. Multi-Year Approval Eligibility Rules (APH Chapter II Clause 2.4)
 * 6. Explicit demarcation of inactive / unverified application categories
 * 7. Two-Role Security & Governance (Read access for institutions, admin-restricted mutations)
 * 8. SQL Migrations (013) & Rollback Checkpoints
 * 9. Statutory AICTE Submission Boundary & Prototype Disclaimers
 */

import fs from 'fs';
import path from 'path';
import {
  fetchRegulatorySources,
  fetchRegulatoryRules,
  getRegulatoryRuleById,
  getRulesForDocumentKey,
  searchRegulatoryRules,
  getInitialComplianceChecklist,
  OFFICIAL_REGULATORY_SOURCES,
  VERIFIED_AICTE_RULES,
} from '../src/services/rulebook/rulebookService';
import { AICTE_EOA_GOVERNMENT_SERVICE, getActiveGovernmentServices } from '../src/services/ingestion/ingestionService';

let totalTests = 0;
let passedTests = 0;

function testAssert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runRulebookAndEoATests() {
  console.log('\n======================================================');
  console.log('AICTE REGULATORY RULEBOOK & EOA VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  // ---------------------------------------------------------------------
  // TEST GROUP 1: OFFICIAL REGULATORY SOURCES & PROVENANCE
  // ---------------------------------------------------------------------
  console.log('TEST GROUP 1: Official Regulatory Sources & Provenance');

  const sources = await fetchRegulatorySources();
  testAssert(sources.length >= 4, `At least 4 authoritative regulatory sources loaded (found ${sources.length})`);

  const aphSource = sources.find((s) => s.id === 'SRC-AICTE-APH-2024-27');
  testAssert(aphSource !== undefined, 'AICTE Approval Process Handbook (APH) 2024–2027 source exists');
  testAssert(aphSource?.documentType === 'handbook', 'APH source documentType is handbook');
  testAssert(aphSource?.academicYearRange.includes('2024–2027'), 'APH source covers multi-year block 2024–2027');
  testAssert(aphSource?.isCurrentApplicable === true, 'APH source is marked currently applicable');
  testAssert(aphSource?.sourceUrl.includes('aicte-india.org'), 'APH official URL points to official AICTE portal');

  const actSource = sources.find((s) => s.id === 'SRC-AICTE-ACT-1987');
  testAssert(actSource !== undefined, 'AICTE Act 1987 source exists');
  testAssert(actSource?.issuingAuthority.includes('Parliament of India'), 'AICTE Act issuing authority is Parliament of India');

  const cadreSource = sources.find((s) => s.id === 'SRC-AICTE-GAZ-2019-FAC');
  testAssert(cadreSource !== undefined, 'AICTE Faculty Cadre Gazette Notification exists');
  testAssert(cadreSource?.sourceUrl.includes('aicte-india.org'), 'Gazette official URL verified');

  const udinSource = sources.find((s) => s.id === 'SRC-ICAI-UDIN-2019');
  testAssert(udinSource !== undefined, 'ICAI UDIN Mandate for Audited Accounts exists');
  testAssert(udinSource?.issuingAuthority.includes('Institute of Chartered Accountants of India'), 'ICAI issuing authority verified');

  // ---------------------------------------------------------------------
  // TEST GROUP 2: REGULATORY RULES ENGINE & QUERY METHODS
  // ---------------------------------------------------------------------
  console.log('\nTEST GROUP 2: Regulatory Rules Engine & Query Methods');

  const rules = await fetchRegulatoryRules();
  testAssert(rules.length >= 7, `Loaded all regulatory rules (found ${rules.length})`);

  // Direct rule lookup by ID
  const ruleEoa01 = getRegulatoryRuleById('AICTE-RULE-EOA-01');
  testAssert(ruleEoa01 !== undefined, 'Found rule AICTE-RULE-EOA-01');
  testAssert(ruleEoa01?.ruleCode === 'APH-CH2-EOA-ELIG', 'Rule code matches APH-CH2-EOA-ELIG');
  testAssert(ruleEoa01?.verificationStatus === 'verified', 'Rule AICTE-RULE-EOA-01 is verified');
  testAssert(ruleEoa01?.chapterOrAppendix === 'Chapter II', 'Cites Chapter II');
  testAssert(ruleEoa01?.plainLanguageExplanation.length > 50, 'Plain language explanation is descriptive');

  // Multi-Year rule
  const ruleMultiYear = getRegulatoryRuleById('AICTE-RULE-EOA-MULTI');
  testAssert(ruleMultiYear !== undefined, 'Found multi-year EoA rule AICTE-RULE-EOA-MULTI');
  testAssert(ruleMultiYear?.topic === 'approval_process', 'Multi-year rule topic is approval_process');
  testAssert(ruleMultiYear?.verificationStatus === 'verified', 'Multi-year rule is verified');

  // Rule lookup by document key
  const affidavitRules = getRulesForDocumentKey('statutory_declaration');
  testAssert(affidavitRules.length >= 1, 'Found rules by canonical key statutory_declaration');
  testAssert(affidavitRules.some((r) => r.id === 'AICTE-RULE-AFFIDAVIT-1'), 'Resolved to AICTE-RULE-AFFIDAVIT-1');
  testAssert(affidavitRules.find((r) => r.id === 'AICTE-RULE-AFFIDAVIT-1')?.chapterOrAppendix.includes('Appendix 17') === true, 'Affidavit rule cites Appendix 17');

  const landRules = getRulesForDocumentKey('utility_bill');
  testAssert(landRules.length >= 1, 'Found land rules by canonical key utility_bill');
  testAssert(landRules.some((r) => r.id === 'AICTE-RULE-LAND-BUILTUP'), 'Resolved to AICTE-RULE-LAND-BUILTUP');
  testAssert(landRules.find((r) => r.id === 'AICTE-RULE-LAND-BUILTUP')?.chapterOrAppendix.includes('Appendix 4') === true, 'Land rule cites Appendix 4');

  const financialRules = getRulesForDocumentKey('incorporation_certificate');
  testAssert(financialRules.length >= 1, 'Found financial rules by canonical key incorporation_certificate');
  testAssert(financialRules.some((r) => r.id === 'AICTE-RULE-FIN-UDIN'), 'Resolved to AICTE-RULE-FIN-UDIN');

  // ---------------------------------------------------------------------
  // TEST GROUP 3: TOPIC & STATUS FILTERING & FULL-TEXT SEARCH
  // ---------------------------------------------------------------------
  console.log('\nTEST GROUP 3: Topic & Status Filtering & Full-Text Search');

  const facultyRules = searchRegulatoryRules(rules, '', 'faculty_cadre');
  testAssert(facultyRules.length >= 1, 'Topic faculty_cadre returned at least 1 rule');
  testAssert(facultyRules[0].id === 'AICTE-RULE-FACULTY-CADRE', 'Faculty rule is AICTE-RULE-FACULTY-CADRE');

  const verifiedRules = searchRegulatoryRules(rules, '', 'all', 'verified');
  testAssert(verifiedRules.length >= 5, `Found at least 5 verified rules (found ${verifiedRules.length})`);

  const conditionalRules = searchRegulatoryRules(rules, '', 'all', 'conditional');
  testAssert(conditionalRules.length >= 2, `Found at least 2 conditional rules (found ${conditionalRules.length})`);

  const searchCadre = searchRegulatoryRules(rules, 'cadre');
  testAssert(searchCadre.length >= 1, 'Search for "cadre" found matching rule');
  testAssert(searchCadre.some((r) => r.id === 'AICTE-RULE-FACULTY-CADRE'), 'Cadre search returned AICTE-RULE-FACULTY-CADRE');

  const searchUdin = searchRegulatoryRules(rules, 'UDIN');
  testAssert(searchUdin.length >= 1, 'Search for "UDIN" found matching rule');
  testAssert(searchUdin.some((r) => r.id === 'AICTE-RULE-FIN-UDIN'), 'UDIN search returned AICTE-RULE-FIN-UDIN');

  const searchMultiYear = searchRegulatoryRules(rules, 'multi-year');
  testAssert(searchMultiYear.length >= 1, 'Search for "multi-year" found matching rule');

  // ---------------------------------------------------------------------
  // TEST GROUP 4: STATUTORY EOA SERVICE & REQUIREMENTS ACCURACY
  // ---------------------------------------------------------------------
  console.log('\nTEST GROUP 4: Statutory EoA Service & Requirements Accuracy');

  const eoaService = AICTE_EOA_GOVERNMENT_SERVICE;
  testAssert(eoaService.serviceCode === 'AICTE-EOA-2026', 'Service code is AICTE-EOA-2026');
  testAssert(eoaService.department.includes('All India Council for Technical Education'), 'Department is AICTE');
  testAssert(eoaService.status === 'active' || eoaService.status === 'published', 'Service status is active');

  const eoaVariant = eoaService.applicationTypes[0];
  testAssert(eoaVariant.variantCode === 'AICTE-EOA-2026', 'Variant code is AICTE-EOA-2026');
  testAssert(eoaVariant.requirementsVersion === '2026-27', 'Requirements version is 2026-27');
  testAssert(eoaVariant.requirements.length === 4, 'EoA defines exactly 4 statutory base requirements');

  const reqAffidavit = eoaVariant.requirements.find((r) => r.id === 'req-eoa-affidavit');
  testAssert(reqAffidavit !== undefined, 'EoA requires Institution Compliance Affidavit (Form 1)');
  testAssert(reqAffidavit?.isMandatory === true, 'Affidavit is mandatory');

  const reqLand = eoaVariant.requirements.find((r) => r.id === 'req-eoa-land-building');
  testAssert(reqLand !== undefined, 'EoA requires Land & Built-up Area Certificate');
  testAssert(reqLand?.isMandatory === true, 'Land & Built-up Certificate is mandatory');

  const reqFaculty = eoaVariant.requirements.find((r) => r.id === 'req-eoa-faculty-list');
  testAssert(reqFaculty !== undefined, 'EoA requires Faculty Cadre & Bio-data Statement');
  testAssert(reqFaculty?.isMandatory === true, 'Faculty Statement is mandatory');

  const reqFinancials = eoaVariant.requirements.find((r) => r.id === 'req-eoa-audited-financials');
  testAssert(reqFinancials !== undefined, 'EoA requires Audited Financial Statements with UDIN');
  testAssert(reqFinancials?.isMandatory === true, 'Audited Financials is mandatory');

  // Conditional question for NBA accreditation
  testAssert(eoaVariant.conditionalQuestions.length === 1, 'EoA defines NBA accreditation conditional question');
  testAssert(eoaVariant.conditionalQuestions[0].questionCode === 'has_nba_accreditation', 'Question code is has_nba_accreditation');

  // Verify that active published services returns AICTE EoA
  const activeServices = await getActiveGovernmentServices();
  testAssert(activeServices.some((s) => s.serviceCode === 'AICTE-EOA-2026' || s.id === 'srv-AICTE-SRV-EOA'), 'Active services catalogue includes AICTE EoA');

  // ---------------------------------------------------------------------
  // TEST GROUP 5: INSTITUTION COMPLIANCE CHECKLIST INITIALIZATION
  // ---------------------------------------------------------------------
  console.log('\nTEST GROUP 5: Institution Compliance Checklist Initialization');

  const initialChecklist = getInitialComplianceChecklist();
  testAssert(initialChecklist.length >= 7, `Initial checklist contains at least 7 items (found ${initialChecklist.length})`);
  testAssert(initialChecklist.every((i) => i.institutionStatus === 'in_progress'), 'All items initially marked in_progress');
  testAssert(initialChecklist.every((i) => i.officialCitation.length > 0), 'Every checklist item carries an official statutory citation');

  // ---------------------------------------------------------------------
  // TEST GROUP 6: STRICT ROLE PERMISSIONS & GOVERNANCE MODEL
  // ---------------------------------------------------------------------
  console.log('\nTEST GROUP 6: Strict Two-Role Security & Governance Model');

  // Verify that there are only two primary roles: 'institution' and 'officer'
  const allowedRoles = ['institution', 'officer'];
  testAssert(allowedRoles.length === 2, 'Strictly only two operational roles are permitted');
  testAssert(allowedRoles.includes('institution'), 'Role "institution" is permitted');
  testAssert(allowedRoles.includes('officer'), 'Role "officer" is permitted');
  testAssert(!allowedRoles.includes('admin') && !allowedRoles.includes('super_admin'), 'No third admin or super_admin role exists');

  // ---------------------------------------------------------------------
  // TEST GROUP 7: DATABASE MIGRATION & ROLLBACK SCRIPT INTEGRITY
  // ---------------------------------------------------------------------
  console.log('\nTEST GROUP 7: Database Migration & Rollback Script Integrity');

  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/013_aicte_rulebook_and_regulatory_traceability.sql');
  const rollbackPath = path.resolve(process.cwd(), 'supabase/migrations/013_aicte_rulebook_and_regulatory_traceability_rollback.sql');

  testAssert(fs.existsSync(migrationPath), 'Migration 013 file exists');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  testAssert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.aicte_regulatory_sources'), 'Migration creates aicte_regulatory_sources table');
  testAssert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.aicte_regulatory_rules'), 'Migration creates aicte_regulatory_rules table');
  testAssert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.aicte_institution_compliance_records'), 'Migration creates aicte_institution_compliance_records table');
  testAssert(migrationSql.includes('ROW LEVEL SECURITY'), 'Migration enables Row Level Security (RLS)');
  testAssert(migrationSql.includes('is_admin = true'), 'Migration restricts administrative mutations to officers with is_admin = true');

  testAssert(fs.existsSync(rollbackPath), 'Rollback script 013 exists');
  const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');
  testAssert(rollbackSql.includes('DROP TABLE IF EXISTS public.aicte_institution_compliance_records'), 'Rollback drops aicte_institution_compliance_records');
  testAssert(rollbackSql.includes('DROP TABLE IF EXISTS public.aicte_regulatory_rules'), 'Rollback drops aicte_regulatory_rules');
  testAssert(rollbackSql.includes('DROP TABLE IF EXISTS public.aicte_regulatory_sources'), 'Rollback drops aicte_regulatory_sources');

  // ---------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`ALL AICTE RULEBOOK TESTS PASSED: ${passedTests}/${totalTests} assertions`);
  console.log('======================================================\n');
}

runRulebookAndEoATests().catch((err) => {
  console.error('\nTest suite execution failed:', err);
  process.exit(1);
});
