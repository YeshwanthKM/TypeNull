import assert from 'node:assert';
import {
  getRoleDisplayLabel,
  getRoleBadgeStyle,
  getRoleRedirectPath,
  ROLE_DISPLAY_LABELS,
} from '../src/utils/roleUtils';
import {
  createOrganisation,
  fetchOrganisations,
  submitAccessRequest,
  fetchUserAccessRequests,
  fetchAllAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  fetchUserMemberships,
  revokeMembership,
  DEFAULT_DEMO_ORGANISATIONS,
} from '../src/services/organisationAccessService';
import { UserRole } from '../src/types';

console.log('================================================================');
console.log('TYPENULL ORGANISATION ACCESS WORKFLOW & ROLE LABELS TEST SUITE');
console.log('================================================================\n');

let passedAssertions = 0;
function testAssert(condition: any, message: string) {
  assert(condition, message);
  passedAssertions++;
  console.log(`  ✓ PASS: ${message}`);
}

async function runOrganisationAccessTestSuite() {
  // ---------------------------------------------------------------------------
  // GROUP 1: User-Facing Role Labels & Display Mapping
  // ---------------------------------------------------------------------------
  console.log('TEST GROUP 1: Role Display Mapping & Presentation');

  testAssert(getRoleDisplayLabel('applicant') === 'User', 'Applicant role maps to user-facing display label "User"');
  testAssert(getRoleDisplayLabel('officer') === 'Organisation', 'Officer role maps to user-facing display label "Organisation"');
  testAssert(getRoleDisplayLabel('administrator') === 'Admin', 'Administrator role maps to user-facing display label "Admin"');
  testAssert(getRoleDisplayLabel(null) === 'User', 'Unauthenticated / null role safely defaults to "User"');
  testAssert(ROLE_DISPLAY_LABELS.applicant === 'User', 'ROLE_DISPLAY_LABELS has applicant -> User');
  testAssert(ROLE_DISPLAY_LABELS.officer === 'Organisation', 'ROLE_DISPLAY_LABELS has officer -> Organisation');
  testAssert(ROLE_DISPLAY_LABELS.administrator === 'Admin', 'ROLE_DISPLAY_LABELS has administrator -> Admin');

  // Verify badge styles
  const applicantBadge = getRoleBadgeStyle('applicant');
  testAssert(applicantBadge.bg.includes('slate'), 'User badge has neutral slate styling');
  const officerBadge = getRoleBadgeStyle('officer');
  testAssert(officerBadge.bg.includes('teal'), 'Organisation badge has institutional teal styling');
  const adminBadge = getRoleBadgeStyle('administrator');
  testAssert(adminBadge.bg.includes('indigo'), 'Admin badge has privileged indigo styling');

  // Verify role redirect paths
  testAssert(getRoleRedirectPath('applicant') === '/dashboard', 'Applicant role redirects to /dashboard');
  testAssert(getRoleRedirectPath('officer') === '/officer', 'Officer role redirects to /officer');
  testAssert(getRoleRedirectPath('administrator') === '/admin', 'Administrator role redirects to /admin');
  testAssert(getRoleRedirectPath('officer', '/officer/batches') === '/officer/batches', 'Officer preserves deep officer paths');

  // ---------------------------------------------------------------------------
  // GROUP 2: Simplified Organisation Registration
  // ---------------------------------------------------------------------------
  console.log('\nTEST GROUP 2: Simplified Organisation Registration');

  const { data: initialOrgs } = await fetchOrganisations();
  testAssert(Array.isArray(initialOrgs) && initialOrgs.length >= 3, 'Pre-seeded default organisations available');

  // Create organisation with explicit code
  const { data: newOrg1, error: org1Err } = await createOrganisation(
    'Directorate General of Foreign Trade',
    'DGFT-CENTRAL',
    'regulatory_body',
    'Oversees foreign trade policy and importer-exporter code issuance.'
  );
  testAssert(!org1Err && newOrg1 !== null, 'Organisation created successfully with explicit code');
  testAssert(newOrg1?.code === 'DGFT-CENTRAL', 'Explicit organisation code is preserved and uppercased');

  // Create organisation with omitted code (auto-derived slug)
  const { data: newOrg2, error: org2Err } = await createOrganisation(
    'Central Drugs Standard Control Organisation'
  );
  testAssert(!org2Err && newOrg2 !== null, 'Organisation created successfully with omitted code');
  testAssert(newOrg2?.code.length! >= 3, 'Auto-generated organisation code meets minimum slug length');

  // ---------------------------------------------------------------------------
  // GROUP 3: Request Organisation Access Submission
  // ---------------------------------------------------------------------------
  console.log('\nTEST GROUP 3: Organisation Access Request Submission');

  const testUserId = 'usr-test-applicant-01';
  const testUserEmail = 'applicant01@test.typenull.local';
  const targetOrgId = initialOrgs[0].id; // MCA-ROC

  const { data: req1, error: req1Err } = await submitAccessRequest(
    testUserId,
    testUserEmail,
    'Rajesh Applicant',
    targetOrgId,
    'Assigned to handle MCA corporate filings for regional compliance cell.'
  );

  testAssert(!req1Err && req1 !== null, 'Access request submitted successfully');
  testAssert(req1?.status === 'pending', 'Submitted access request initial status is "pending"');
  testAssert(req1?.user_id === testUserId, 'Access request records correct requesting user ID');
  testAssert(req1?.organisation_id === targetOrgId, 'Access request records correct target organisation ID');
  testAssert(req1?.explanation?.includes('MCA corporate filings'), 'Submitted explanation is preserved');

  // ---------------------------------------------------------------------------
  // GROUP 4: Duplicate Pending Request Prevention
  // ---------------------------------------------------------------------------
  console.log('\nTEST GROUP 4: Duplicate Pending Request Prevention');

  const { data: duplicateReq, error: duplicateErr } = await submitAccessRequest(
    testUserId,
    testUserEmail,
    'Rajesh Applicant',
    targetOrgId,
    'Second redundant attempt'
  );

  testAssert(duplicateReq === null, 'Duplicate pending request is rejected');
  testAssert(
    duplicateErr !== null && duplicateErr.message.toLowerCase().includes('already have an active pending access request'),
    'Duplicate attempt returns informative error message explaining pending status'
  );

  // ---------------------------------------------------------------------------
  // GROUP 5: User Viewing Request Status in Settings
  // ---------------------------------------------------------------------------
  console.log('\nTEST GROUP 5: User Viewing Request Status in Settings');

  const { data: userRequests } = await fetchUserAccessRequests(testUserId);
  testAssert(Array.isArray(userRequests) && userRequests.length === 1, 'User can fetch their submitted access requests');
  testAssert(userRequests[0].id === req1?.id, 'Returned request matches submitted request ID');
  testAssert(userRequests[0].status === 'pending', 'User sees "pending" status badge in their account settings');

  // ---------------------------------------------------------------------------
  // GROUP 6: Admin Approval Workflow & Tenancy Isolation
  // ---------------------------------------------------------------------------
  console.log('\nTEST GROUP 6: Admin Approval Workflow & Tenancy Isolation');

  const adminId = 'usr-system-admin-01';

  // Security Guard: Prevent Self-Approval
  const { success: selfApproveSuccess, error: selfApproveErr } = await approveAccessRequest(
    testUserId, // User attempting to approve their own request!
    req1!.id,
    'Self-promotion attempt'
  );
  testAssert(!selfApproveSuccess, 'Self-approval attempt is strictly rejected');
  testAssert(
    selfApproveErr !== null && selfApproveErr.message.toLowerCase().includes('cannot approve their own'),
    'Self-approval blocked with explicit security violation notice'
  );

  // Valid Administrator Approval
  const { success: approveSuccess, error: approveErr } = await approveAccessRequest(
    adminId,
    req1!.id,
    'Verified credentials with MCA regional registry. Access granted.'
  );

  testAssert(approveSuccess && !approveErr, 'Administrator successfully approves access request');

  // Verify updated request state
  const { data: updatedRequests } = await fetchUserAccessRequests(testUserId);
  const approvedReq = updatedRequests.find((r) => r.id === req1!.id);
  testAssert(approvedReq?.status === 'approved', 'Request status transitioned to "approved"');
  testAssert(approvedReq?.reviewed_by === adminId, 'Reviewing administrator ID is recorded');
  testAssert(Boolean(approvedReq?.reviewed_at), 'Review timestamp is recorded');
  testAssert(approvedReq?.review_note?.includes('Verified credentials'), 'Administrator review note is stored');

  // Verify membership granted specifically for the approved organisation
  const { data: userMemberships } = await fetchUserMemberships(testUserId);
  testAssert(userMemberships.length === 1, 'User has gained exactly 1 approved organisation membership');
  testAssert(userMemberships[0].organisation_id === targetOrgId, 'Membership granted strictly for target organisation (MCA-ROC)');
  testAssert(userMemberships[0].member_role === 'officer', 'Assigned organisation member role is "officer"');

  // ---------------------------------------------------------------------------
  // GROUP 7: Cross-Organisation Access Protection
  // ---------------------------------------------------------------------------
  console.log('\nTEST GROUP 7: Cross-Organisation Access Protection');

  const otherOrgId = initialOrgs[1].id; // CBDT-DIR
  const isMemberOfOtherOrg = userMemberships.some((m) => m.organisation_id === otherOrgId);
  testAssert(!isMemberOfOtherOrg, 'Approval for Organisation A does NOT grant access to Organisation B');

  // ---------------------------------------------------------------------------
  // GROUP 8: Admin Rejection Workflow & Re-Request Policy
  // ---------------------------------------------------------------------------
  console.log('\nTEST GROUP 8: Admin Rejection Workflow & Re-Request Policy');

  // User submits request to Organisation B (CBDT)
  const { data: req2 } = await submitAccessRequest(
    testUserId,
    testUserEmail,
    'Rajesh Applicant',
    otherOrgId,
    'Requesting CBDT tax returns screening access'
  );
  testAssert(req2 !== null && req2.status === 'pending', 'Request to Organisation B submitted');

  // Admin rejects request to Organisation B
  const { success: rejectSuccess, error: rejectErr } = await rejectAccessRequest(
    adminId,
    req2!.id,
    'Insufficient institutional documentation provided. Please resubmit with official delegation memo.'
  );

  testAssert(rejectSuccess && !rejectErr, 'Administrator successfully rejects access request');

  // Verify request is rejected and user does not gain membership in Organisation B
  const { data: afterRejectRequests } = await fetchUserAccessRequests(testUserId);
  const rejectedReq = afterRejectRequests.find((r) => r.id === req2!.id);
  testAssert(rejectedReq?.status === 'rejected', 'Request status transitioned to "rejected"');
  testAssert(rejectedReq?.reviewed_by === adminId, 'Reviewing admin recorded on rejected request');

  const { data: afterRejectMemberships } = await fetchUserMemberships(testUserId);
  testAssert(afterRejectMemberships.length === 1, 'Rejected request granted zero additional memberships');
  testAssert(
    !afterRejectMemberships.some((m) => m.organisation_id === otherOrgId),
    'User still has no membership in Organisation B after rejection'
  );

  // Policy verification: A rejected user CAN submit a new request later with updated justification
  const { data: reRequest, error: reRequestErr } = await submitAccessRequest(
    testUserId,
    testUserEmail,
    'Rajesh Applicant',
    otherOrgId,
    'Resubmission with attached official delegation letter CBDT-MEMO-2026-09.'
  );
  testAssert(!reRequestErr && reRequest !== null, 'Rejected user can submit a new access request with updated justification');
  testAssert(reRequest?.status === 'pending', 'New request is placed into "pending" review queue');

  // ---------------------------------------------------------------------------
  // GROUP 9: Membership Revocation
  // ---------------------------------------------------------------------------
  console.log('\nTEST GROUP 9: Membership Revocation');

  const membershipToRevoke = userMemberships[0];
  const { success: revokeSuccess, error: revokeErr } = await revokeMembership(
    adminId,
    membershipToRevoke.id
  );

  testAssert(revokeSuccess && !revokeErr, 'Administrator successfully revokes organisation membership');

  const { data: finalMemberships } = await fetchUserMemberships(testUserId);
  testAssert(finalMemberships.length === 0, 'Revoked membership is removed; user has 0 active memberships');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`ALL TESTS PASSED: ${passedAssertions} assertions passed across 9 test groups.`);
  console.log('================================================================\n');
}

runOrganisationAccessTestSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
