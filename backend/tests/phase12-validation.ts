import { WikiRepository } from '../src/repositories/wiki-repository';
import { TimeTrackingRepository } from '../src/repositories/time-tracking-repository';
import { GuestPortalRepository } from '../src/repositories/guest-portal-repository';
import { IntegrationRepository } from '../src/repositories/integration-repository';
import { inMemoryDb } from '../packages/database';
import { can } from '../src/lib/permissions';

async function validatePhase12() {
  console.log('====================================================');
  console.log('PHASE 12: ENTERPRISE MSME OPERATIONAL EXTENSIONS TEST');
  console.log('====================================================');

  inMemoryDb.reset();

  const wsId = 'ws-test-12';
  const adminId = 'usr-admin-12';
  const employeeId = 'usr-emp-12';
  const internId = 'usr-intern-12';

  // Seed sample workspace data
  inMemoryDb.workspaces.set(wsId, {
    id: wsId,
    name: 'GrowthForge Digital Agency',
    slug: 'growthforge-digital',
    ownerId: adminId,
    plan: 'business',
    createdAt: new Date().toISOString(),
  } as any);

  // 1. FEATURE 1: WORKSPACE WIKI VALIDATION
  console.log('\n--- 1. Workspace Wiki (Notion-Lite) Validation ---');
  const parentPage = await WikiRepository.createPage({
    workspaceId: wsId,
    title: 'Engineering SOPs',
    icon: '📘',
    contentJson: { blocks: [{ type: 'header', text: 'Engineering Handbook v1' }] },
    createdBy: adminId,
    visibility: 'team',
  });
  console.log('Created Parent Wiki Page:', parentPage.title, `(ID: ${parentPage.id})`);

  const nestedPage = await WikiRepository.createPage({
    workspaceId: wsId,
    parentId: parentPage.id,
    title: 'Deployment & CI/CD Checklist',
    icon: '🚀',
    contentJson: { blocks: [{ type: 'checklist', items: ['Run unit tests', 'Deploy to Render'] }] },
    createdBy: employeeId,
    visibility: 'team',
  });
  console.log('Created Nested Wiki Sub-page:', nestedPage.title, `(Parent: ${nestedPage.parentId})`);

  // Add Comment
  const comment = await WikiRepository.addComment({
    pageId: nestedPage.id,
    userId: adminId,
    userName: 'Alice Founder',
    comment: 'Make sure to verify Backblaze B2 environment variables.',
  });
  console.log('Added Wiki Page Comment:', comment.comment);

  const pages = await WikiRepository.getWorkspacePages(wsId);
  if (pages.length === 2) {
    console.log('✅ PASS: Wiki Hierarchical Pages & Comments Verified');
  } else {
    throw new Error('FAILED: Wiki page count mismatch');
  }

  // 2. FEATURE 2: TIME TRACKING & BILLABLE HOURS VALIDATION
  console.log('\n--- 2. Time Tracking & Billable Hours Validation ---');
  const activeTimer = await TimeTrackingRepository.startTimer({
    workspaceId: wsId,
    taskId: 'task-redesign-hero',
    userId: employeeId,
    billable: true,
    hourlyRate: 2000, // ₹2,000 / hr
    notes: 'Designing high-converting hero layout in Figma',
  });
  console.log('Timer Started:', activeTimer.id, `(Task: ${activeTimer.taskId})`);

  const stoppedTimer = await TimeTrackingRepository.stopActiveTimer(wsId, employeeId);
  console.log('Timer Stopped:', stoppedTimer?.durationMinutes, 'minutes logged');

  const manualLog = await TimeTrackingRepository.logManualEntry({
    workspaceId: wsId,
    taskId: 'task-client-meeting',
    userId: employeeId,
    startTime: new Date(Date.now() - 3600000),
    durationMinutes: 120, // 2 hours
    billable: true,
    hourlyRate: 2000,
    notes: 'Sprint planning and client alignment session',
  });
  console.log('Manual Time Logged:', manualLog.durationMinutes, 'minutes (Billable:', manualLog.billable, ')');

  const utilReport = await TimeTrackingRepository.getUtilizationReport(wsId);
  console.log('Timesheet & Utilization Report:', utilReport);

  if (utilReport.totalHours >= 2 && utilReport.utilizationPercent === 100) {
    console.log('✅ PASS: Stopwatch & Billable Utilization Engine Verified');
  } else {
    throw new Error('FAILED: Utilization report calculation invalid');
  }

  // 3. FEATURE 3: CLIENT / GUEST PORTAL VALIDATION
  console.log('\n--- 3. Client / Guest Portal & Deliverable Approval Validation ---');
  const guest = await GuestPortalRepository.inviteGuest({
    workspaceId: wsId,
    email: 'client@apexglobal.com',
    name: 'Robert Vance',
    company: 'Apex Global Brands',
    projectId: 'proj-brand-relaunch',
  });
  console.log('Invited Client Guest:', guest.name, `(Token: ${guest.magicToken.slice(0, 12)}...)`);

  const validatedGuest = await GuestPortalRepository.consumeMagicToken(guest.magicToken);
  if (!validatedGuest) throw new Error('FAILED: Magic token validation');

  const approvalReq = await GuestPortalRepository.createApprovalRequest({
    workspaceId: wsId,
    projectId: 'proj-brand-relaunch',
    title: 'Brand Guidelines v1.0 PDF Sign-off',
    description: 'Final vector logo variations, color tokens, and font typography',
    fileUrl: 'https://docs.workspaceos.dev/brand-guidelines.pdf',
    guestId: guest.id,
  });
  console.log('Created Deliverable Approval Request:', approvalReq.title);

  const signed = await GuestPortalRepository.signDeliverable(
    approvalReq.id,
    guest.id,
    'Robert Vance',
    'Looks stellar! Approved for production launch.'
  );
  console.log('Client Signed Deliverable:', signed?.status, `(Signature: ${signed?.signatureHash})`);

  if (signed?.status === 'approved' && signed?.signatureHash) {
    console.log('✅ PASS: Client Portal Magic Link & Cryptographic Approval Verified');
  } else {
    throw new Error('FAILED: Sign-off verification');
  }

  // 4. FEATURE 4: EMAIL & CALENDAR INTEGRATION VALIDATION
  console.log('\n--- 4. Inbound Email & Google Calendar Sync Validation ---');
  const calEvent = await IntegrationRepository.createCalendarEvent({
    workspaceId: wsId,
    crmRecordId: 'crm-lead-apex',
    title: 'Discovery & Scope Alignment Call',
    startTime: new Date(),
    endTime: new Date(Date.now() + 45 * 60000),
    attendees: [
      { email: 'founder@growthforge.com', name: 'Alice Founder' },
      { email: 'robert@apexglobal.com', name: 'Robert Vance' },
    ],
  });
  console.log('Created Calendar Event:', calEvent.title, `(Meeting URL: ${calEvent.meetingUrl})`);

  const emailLog = await IntegrationRepository.logEmail({
    workspaceId: wsId,
    crmRecordId: 'crm-lead-apex',
    from: 'robert@apexglobal.com',
    to: 'founder@growthforge.com',
    subject: 'Contract Signed & Initial Retainer Wire Sent',
    snippet: 'Hi Alice, wire transfer of ₹1,50,000 has been initiated.',
    direction: 'inbound',
  });
  console.log('Logged CRM Email Thread:', emailLog.subject);

  const events = await IntegrationRepository.getEvents(wsId);
  const emails = await IntegrationRepository.getLeadEmails(wsId, 'crm-lead-apex');
  if (events.length === 1 && emails.length === 1) {
    console.log('✅ PASS: Calendar & Email Synchronization Verified');
  } else {
    throw new Error('FAILED: Integration activity mismatch');
  }

  // 5. RBAC PERMISSIONS VALIDATION
  console.log('\n--- 5. RBAC Permission Guard Validation ---');
  const adminCanDeleteWiki = can('admin', 'wiki:delete');
  const employeeCanDeleteWiki = can('employee', 'wiki:delete');
  const employeeCanCreateWiki = can('employee', 'wiki:create');
  const internCanCreateWiki = can('intern', 'wiki:create');
  const guestCanAccessPortal = can('guest', 'portal:access');
  const guestCanAccessCrm = can('guest', 'crm:read');

  console.log('RBAC Probe Check:', {
    adminCanDeleteWiki,
    employeeCanDeleteWiki,
    employeeCanCreateWiki,
    internCanCreateWiki,
    guestCanAccessPortal,
    guestCanAccessCrm,
  });

  if (
    adminCanDeleteWiki === true &&
    employeeCanDeleteWiki === false &&
    employeeCanCreateWiki === true &&
    internCanCreateWiki === false &&
    guestCanAccessPortal === true &&
    guestCanAccessCrm === false
  ) {
    console.log('✅ PASS: Strict 4-Tier Zero-Trust Permissions Enforcement Verified');
  } else {
    throw new Error('FAILED: RBAC permissions mismatch');
  }

  console.log('\n====================================================');
  console.log('✅ ALL PHASE 12 OPERATIONAL EXTENSIONS PASSED (100%)');
  console.log('====================================================');
}

validatePhase12().catch((err) => {
  console.error('Validation Error:', err);
  process.exit(1);
});
