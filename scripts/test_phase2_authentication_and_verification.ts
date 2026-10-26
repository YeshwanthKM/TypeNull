/**
 * Automated Verification: Authentication, Two-Role Model, and Institution Registration Verification
 * 
 * Verifies:
 * 1. Strict Two-Role Security Model: 'institution' and 'officer' (with is_admin clearance, no 3rd role)
 * 2. Institutional Profile schema fields & verification statuses
 * 3. Review workflow: approve, reject (requires reason), request info (requires message)
 * 4. Audit trail logging for review actions
 * 5. Institution clarification response transitions back to pending_verification
 * 6. Migration and rollback files integrity
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
  fetchAllInstitutionRegistrations,
  fetchInstitutionVerificationAudits,
  reviewInstitutionRegistration,
  respondToInformationRequest,
} from '../src/services/institutionVerificationService';
import { getRoleDisplayLabel, getRoleRedirectPath, ROLE_DISPLAY_LABELS } from '../src/utils/roleUtils';
import { UserRole, InstitutionVerificationStatus } from '../src/types';

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

async function runPhase2Tests() {
  console.log('\n======================================================');
  console.log('AUTHENTICATION & INSTITUTION VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  // ---------------------------------------------------------------------
  // TEST GROUP 1: TWO-ROLE SECURITY ARCHITECTURE & PERMISSIONS
  // ---------------------------------------------------------------------
  console.log('TEST GROUP 1: Two-Role Authorization & Routing');

  testAssert(ROLE_DISPLAY_LABELS.institution === 'Institution', 'ROLE_DISPLAY_LABELS defines institution');
  testAssert(ROLE_DISPLAY_LABELS.officer !== undefined, 'ROLE_DISPLAY_LABELS defines officer');
  testAssert(ROLE_DISPLAY_LABELS.applicant === 'User', 'Legacy applicant alias preserved for compatibility');
  testAssert(ROLE_DISPLAY_LABELS.administrator === 'Admin', 'Legacy administrator alias preserved for compatibility');

  testAssert(getRoleRedirectPath('institution') === '/dashboard', 'Institution redirects to /dashboard');
  testAssert(getRoleRedirectPath('officer') === '/officer', 'Officer redirects to /officer');
  testAssert(getRoleRedirectPath('officer', '/officer') === '/officer', 'Officer deep routing to /officer');
  testAssert(getRoleRedirectPath('applicant') === '/dashboard', 'Legacy applicant redirects to /dashboard');

  testAssert(getRoleDisplayLabel('institution') === 'Institution', 'getRoleDisplayLabel returns Institution');

  // ---------------------------------------------------------------------
  // TEST GROUP 2: INSTITUTION REGISTRATION FETCHING & SCHEMA INTEGRITY
  // ---------------------------------------------------------------------
  console.log('\nTEST GROUP 2: Institution Registration Fetching & Attributes');

  const { data: initialList, error: fetchErr } = await fetchAllInstitutionRegistrations();
  testAssert(fetchErr === null, 'fetchAllInstitutionRegistrations succeeds without error');
  testAssert(Array.isArray(initialList) && initialList.length >= 2, 'Returns registered institutions');

  const sampleInst = initialList[0];
  testAssert(Boolean(sampleInst.id), 'Institution has valid UUID/identifier');
  testAssert(Boolean(sampleInst.institution_name), 'Institution profile includes institution_name');
  testAssert(Boolean(sampleInst.institution_type), 'Institution profile includes institution_type');
  testAssert(Boolean(sampleInst.state), 'Institution profile includes state');
  testAssert(Boolean(sampleInst.verification_status), 'Institution profile includes verification_status');

  const allowedStatuses: InstitutionVerificationStatus[] = [
    'pending_verification',
    'additional_info_required',
    'verified',
    'rejected',
  ];
  for (const inst of initialList) {
    testAssert(
      allowedStatuses.includes(inst.verification_status as InstitutionVerificationStatus),
      `Institution status "${inst.verification_status}" is within statutory statuses`
    );
  }

  // ---------------------------------------------------------------------
  // TEST GROUP 3: INSTITUTION REVIEW WORKFLOW & AUDIT TRAIL
  // ---------------------------------------------------------------------
  console.log('\nTEST GROUP 3: AICTE Officer Review Operations & Audit Trail');

  // Rejection requires a mandatory reason
  const rejectionWithoutReason = await reviewInstitutionRegistration({
    institutionId: sampleInst.id,
    action: 'reject',
    reasonMessage: '',
  });
  testAssert(
    rejectionWithoutReason.success === false && Boolean(rejectionWithoutReason.error),
    'Rejecting an institution without reason is blocked'
  );

  // Request info requires a mandatory message
  const requestInfoWithoutMsg = await reviewInstitutionRegistration({
    institutionId: sampleInst.id,
    action: 'request_info',
    reasonMessage: '   ',
  });
  testAssert(
    requestInfoWithoutMsg.success === false && Boolean(requestInfoWithoutMsg.error),
    'Requesting additional info without message is blocked'
  );

  // Successful info request
  const infoRequestResult = await reviewInstitutionRegistration({
    institutionId: sampleInst.id,
    action: 'request_info',
    reasonMessage: 'Building occupancy certificate requires municipal endorsement stamp.',
  });
  testAssert(infoRequestResult.success === true, 'Officer request_info succeeds');
  testAssert(infoRequestResult.newStatus === 'additional_info_required', 'Status transitions to additional_info_required');

  // Verify audit trail logged the action
  const { data: auditsAfterReq } = await fetchInstitutionVerificationAudits(sampleInst.id);
  testAssert(Array.isArray(auditsAfterReq) && auditsAfterReq.length > 0, 'Audit trail logs request action');
  testAssert(auditsAfterReq[0].action === 'requested_info', 'Latest audit action is requested_info');
  testAssert(
    auditsAfterReq[0].reason_or_message?.includes('occupancy certificate') === true,
    'Audit record preserves officer note'
  );

  // Institution clarifies and responds
  const responseResult = await respondToInformationRequest(
    sampleInst.id,
    'Municipal occupancy certificate copy with zonal endorsement attached.'
  );
  testAssert(responseResult.success === true, 'Institution responds to information request');

  const { data: listAfterResponse } = await fetchAllInstitutionRegistrations();
  const updatedInst = listAfterResponse.find((i) => i.id === sampleInst.id);
  testAssert(
    updatedInst?.verification_status === 'pending_verification',
    'Response transitions institution status back to pending_verification'
  );

  // Officer approves verification
  const approvalResult = await reviewInstitutionRegistration({
    institutionId: sampleInst.id,
    action: 'approve',
    reasonMessage: 'All mandatory municipal approvals confirmed.',
  });
  testAssert(approvalResult.success === true, 'Officer approval succeeds');
  testAssert(approvalResult.newStatus === 'verified', 'Status transitions to verified');

  const { data: auditsAfterApprove } = await fetchInstitutionVerificationAudits(sampleInst.id);
  testAssert(auditsAfterApprove[0].action === 'approved', 'Audit trail records approved action');

  // ---------------------------------------------------------------------
  // TEST GROUP 4: DATABASE MIGRATION & RECOVERY CHECKPOINTS
  // ---------------------------------------------------------------------
  console.log('\nTEST GROUP 4: Database Migration & Rollback Checkpoints');

  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/011_authentication_and_institution_verification.sql'
  );
  testAssert(fs.existsSync(migrationPath), 'Migration 011 exists');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  testAssert(
    migrationSql.includes('institution_verification_audits'),
    'Migration 011 creates institution_verification_audits table'
  );
  testAssert(
    migrationSql.includes('protect_profile_role_and_permissions'),
    'Migration 011 defines trigger protecting roles and permissions'
  );
  testAssert(
    migrationSql.includes('review_institution_registration'),
    'Migration 011 defines review_institution_registration RPC'
  );
  testAssert(
    migrationSql.includes('is_admin'),
    'Migration 011 adds is_admin column for officer administrative clearance'
  );

  const rollbackPath = path.resolve(
    process.cwd(),
    'supabase/migrations/011_authentication_and_institution_verification_rollback.sql'
  );
  testAssert(fs.existsSync(rollbackPath), 'Rollback migration 011 exists');
  const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');
  testAssert(
    rollbackSql.includes('DROP TABLE IF EXISTS public.institution_verification_audits'),
    'Rollback script cleanly drops audit table'
  );
  testAssert(
    rollbackSql.includes('DROP FUNCTION IF EXISTS public.review_institution_registration'),
    'Rollback script cleans up RPC'
  );

  console.log(`\n======================================================`);
  console.log(`ALL VERIFICATION TESTS PASSED: ${passedTests}/${totalTests} assertions`);
  console.log(`======================================================\n`);
}

runPhase2Tests().catch((err) => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
