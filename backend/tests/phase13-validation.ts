import { WikiRepository } from '../src/repositories/wiki-repository';
import { TimeTrackingRepository } from '../src/repositories/time-tracking-repository';
import { GuestPortalRepository } from '../src/repositories/guest-portal-repository';
import { IntegrationRepository } from '../src/repositories/integration-repository';
import { inMemoryDb } from '../packages/database';
import { can } from '../src/lib/permissions';

async function validatePhase13() {
  console.log('====================================================');
  console.log('PHASE 13: WORKSPACE OS CUSTOMER READINESS & E2E TEST');
  console.log('====================================================');

  inMemoryDb.reset();

  const wsId = 'ws-customer-13';
  const adminId = 'usr-admin-13';
  const employeeId = 'usr-emp-13';
  const internId = 'usr-intern-13';

  // 1. WIKI OPERATIONAL WORKFLOW
  console.log('\n--- 1. Wiki: Full Lifecycle & Collaborative Comments ---');
  const handbook = await WikiRepository.createPage({
    workspaceId: wsId,
    title: 'GrowthForge Operating Playbook',
    icon: '📘',
    contentJson: { blocks: [{ type: 'header', text: 'Company Operating Manual' }] },
    createdBy: adminId,
    visibility: 'team',
  });
  console.log('Created Playbook:', handbook.title, `(Slug: ${handbook.slug})`);

  const updatedHandbook = await WikiRepository.updatePage(
    handbook.id,
    {
      title: 'GrowthForge Operating Playbook v2',
      contentJson: { blocks: [{ type: 'header', text: 'Company Operating Manual v2' }, { type: 'paragraph', text: 'Updated procedures.' }] },
    },
    adminId
  );
  console.log('Updated Playbook Title:', updatedHandbook?.title);

  const versions = await WikiRepository.getPageVersions(handbook.id);
  console.log('Page Versions Snapshot Count:', versions.length);

  const comment = await WikiRepository.addComment({
    pageId: handbook.id,
    userId: employeeId,
    userName: 'Senior Consultant',
    comment: 'Added section 4 on client onboarding.',
  });
  console.log('Added Team Comment:', comment.comment);

  if (versions.length >= 2 && comment.id) {
    console.log('✅ PASS: Wiki Creation, Revision Snapshots & Comments Verified');
  } else {
    throw new Error('FAILED: Wiki lifecycle test failed');
  }

  // 2. TIME TRACKING & BILLABLE UTILIZATION
  console.log('\n--- 2. Time Tracking: Stopwatch, Billing & Utilization ---');
  const timer = await TimeTrackingRepository.startTimer({
    workspaceId: wsId,
    taskId: 'task-seo-audit',
    userId: employeeId,
    billable: true,
    hourlyRate: 2500, // ₹2,500/hr
    notes: 'Technical SEO and schema optimization',
  });
  console.log('Live Timer Started:', timer.id);

  const stopped = await TimeTrackingRepository.stopActiveTimer(wsId, employeeId);
  console.log('Live Timer Stopped. Duration:', stopped?.durationMinutes, 'mins');

  const manualLog = await TimeTrackingRepository.logManualEntry({
    workspaceId: wsId,
    taskId: 'task-client-strategy',
    userId: employeeId,
    startTime: new Date(Date.now() - 7200000),
    durationMinutes: 180, // 3 hours
    billable: true,
    hourlyRate: 2500,
    notes: 'Quarterly growth review with founder',
  });
  console.log('Manual Entry Logged:', manualLog.durationMinutes, 'mins (Billable: true)');

  const utilReport = await TimeTrackingRepository.getUtilizationReport(wsId);
  console.log('Utilization Report Summary:', {
    totalHours: utilReport.totalHours,
    billableHours: utilReport.billableHours,
    revenue: `₹${utilReport.totalRevenue.toLocaleString()}`,
    utilization: `${utilReport.utilizationPercent}%`,
  });

  if (utilReport.totalHours >= 3 && utilReport.utilizationPercent === 100) {
    console.log('✅ PASS: Time Tracking & Revenue Utilization Calculation Verified');
  } else {
    throw new Error('FAILED: Time tracking calculation error');
  }

  // 3. CLIENT PORTAL & DELIVERABLE APPROVALS
  console.log('\n--- 3. Client Portal: Magic Link, Review & Sign-Off ---');
  const guest = await GuestPortalRepository.inviteGuest({
    workspaceId: wsId,
    email: 'client.vp@apexsolutions.com',
    name: 'Sarah Connor',
    company: 'Apex Solutions',
    projectId: 'proj-q3-scale',
  });
  console.log('Client Guest Invited:', guest.name, `(Magic Link: /portal?token=${guest.magicToken})`);

  const approval = await GuestPortalRepository.createApprovalRequest({
    workspaceId: wsId,
    projectId: 'proj-q3-scale',
    title: 'Q3 Go-To-Market Strategic Roadmap PDF',
    description: 'Target customer personas, CAC benchmarks, and marketing channels',
    fileUrl: 'https://docs.workspaceos.dev/gtm-roadmap.pdf',
    guestId: guest.id,
  });
  console.log('Approval Request Created:', approval.title);

  const signedApproval = await GuestPortalRepository.signDeliverable(
    approval.id,
    guest.id,
    'Sarah Connor',
    'Approved with immediate execution mandate.'
  );
  console.log('Deliverable Signed Off:', signedApproval?.status, `(Signature Hash: ${signedApproval?.signatureHash})`);

  if (signedApproval?.status === 'approved' && signedApproval?.signatureHash) {
    console.log('✅ PASS: Client Portal Magic Token & Sign-Off Verified');
  } else {
    throw new Error('FAILED: Deliverable approval sign-off failed');
  }

  // 4. GOOGLE CALENDAR & INBOUND EMAIL SYNC
  console.log('\n--- 4. Google Calendar & Email Synchronization ---');
  const meet = await IntegrationRepository.createCalendarEvent({
    workspaceId: wsId,
    crmRecordId: 'crm-apex-deal',
    title: 'Q3 Kickoff Call with Apex Solutions',
    startTime: new Date(),
    endTime: new Date(Date.now() + 45 * 60000),
    attendees: [{ email: 'founder@growthforge.com' }, { email: 'sarah@apexsolutions.com' }],
  });
  console.log('Google Meet Scheduled:', meet.title, `(URL: ${meet.meetingUrl})`);

  const email = await IntegrationRepository.logEmail({
    workspaceId: wsId,
    crmRecordId: 'crm-apex-deal',
    from: 'sarah@apexsolutions.com',
    to: 'founder@growthforge.com',
    subject: 'Approved: Scope and Retainer Agreement',
    snippet: 'We have approved the ₹2,50,000 monthly retainer. Looking forward to our kickoff call.',
    direction: 'inbound',
  });
  console.log('Inbound Lead Email Logged:', email.subject);

  if (meet.meetingUrl && email.id) {
    console.log('✅ PASS: Google Meet & CRM Email Synchronization Verified');
  } else {
    throw new Error('FAILED: Integrations verification failed');
  }

  // 5. 4-TIER ZERO-TRUST RBAC INTEGRATION CHECK
  console.log('\n--- 5. 4-Tier Zero-Trust RBAC Enforcement Check ---');
  const rbacMatrix = {
    adminWikiDelete: can('admin', 'wiki:delete'),
    employeeWikiDelete: can('employee', 'wiki:delete'),
    internWikiCreate: can('intern', 'wiki:create'),
    guestPortalAccess: can('guest', 'portal:access'),
    guestCrmRead: can('guest', 'crm:read'),
    guestBillingRead: can('guest', 'billing:read'),
  };
  console.log('RBAC Matrix Results:', rbacMatrix);

  if (
    rbacMatrix.adminWikiDelete === true &&
    rbacMatrix.employeeWikiDelete === false &&
    rbacMatrix.internWikiCreate === false &&
    rbacMatrix.guestPortalAccess === true &&
    rbacMatrix.guestCrmRead === false &&
    rbacMatrix.guestBillingRead === false
  ) {
    console.log('✅ PASS: Complete 4-Tier RBAC Policy Guard Verified');
  } else {
    throw new Error('FAILED: RBAC policy violation');
  }

  console.log('\n====================================================');
  console.log('✅ ALL PHASE 13 CUSTOMER READINESS SUITES PASSED (100%)');
  console.log('====================================================');
}

validatePhase13().catch((err) => {
  console.error('Phase 13 Validation Error:', err);
  process.exit(1);
});
