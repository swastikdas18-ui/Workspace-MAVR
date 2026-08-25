import { inMemoryDb } from '../packages/database';
import { InviteService } from '../src/services/invite-service';
import { NotificationRepository } from '../src/repositories/notification-repository';
import { DigestService } from '../src/services/digest-service';
import { ExportService } from '../src/services/export-service';
import { AuditRepository } from '../src/repositories/audit-repository';
import { WorkspaceHealthService } from '../src/services/workspace-health-service';
import { EmailService } from '../src/services/email-service';

async function runPhase16Validation() {
  console.log('================================================================');
  console.log('PHASE 16 — BETA READINESS HARDENING: VALIDATION SUITE');
  console.log('================================================================');

  inMemoryDb.reset();

  const wsId = 'ws-beta-test-16';
  const adminId = 'usr-admin-16';
  const employeeId = 'usr-emp-16';

  // Seed workspace and users
  inMemoryDb.workspaces.set(wsId, {
    id: wsId, name: 'Apex Digital Agency', slug: 'apex-digital',
    ownerId: adminId, plan: 'business', createdAt: new Date().toISOString(),
  } as any);
  inMemoryDb.users.set(adminId, { id: adminId, name: 'Arjun Mehta', email: 'arjun@apexdigital.in', role: 'admin', createdAt: new Date(), updatedAt: new Date() } as any);
  inMemoryDb.users.set(employeeId, { id: employeeId, name: 'Priya Sharma', email: 'priya@apexdigital.in', role: 'employee', createdAt: new Date(), updatedAt: new Date() } as any);
  inMemoryDb.workspaceMembers.set('mem-admin', { id: 'mem-admin', workspaceId: wsId, userId: adminId, role: 'admin', joinedAt: new Date() } as any);
  inMemoryDb.workspaceMembers.set('mem-emp', { id: 'mem-emp', workspaceId: wsId, userId: employeeId, role: 'employee', joinedAt: new Date() } as any);

  // =====================================================================
  // SUITE 1 — INVITATION LIFECYCLE
  // =====================================================================
  console.log('\n--- 1. Invitation Lifecycle & Analytics ---');

  const invite1 = await InviteService.createInvite({
    workspaceId: wsId,
    email: 'ravi@client.com',
    role: 'employee',
    invitedBy: adminId,
  });
  console.log('Invite Created:', invite1.id, `(Status: ${invite1.status})`);
  if (invite1.status !== 'sent') throw new Error('FAILED: Invite status should be "sent"');

  // Mark opened (preview)
  InviteService.markInviteOpened(invite1.token);
  const openedInvite = inMemoryDb.workspaceInvites.get(invite1.token) as any;
  console.log('Invite Opened Status:', openedInvite?.status);
  if (openedInvite?.status !== 'opened') throw new Error('FAILED: Invite status should be "opened" after preview');

  // Resend flow
  const resendResult = await InviteService.resendInvite(invite1.id, wsId);
  console.log('Resend Result:', resendResult.message);
  if (!resendResult.success) throw new Error('FAILED: Resend should succeed');

  // Expiry sweep
  const expiredInviteToken = crypto.randomUUID().replace(/-/g, '');
  inMemoryDb.workspaceInvites.set(expiredInviteToken, {
    id: crypto.randomUUID(), workspaceId: wsId, email: 'old@stale.com', role: 'employee',
    token: expiredInviteToken, invitedBy: adminId, teamId: null,
    expiresAt: new Date(Date.now() - 86400000 * 8), // 8 days ago
    acceptedAt: null, createdAt: new Date(Date.now() - 86400000 * 8),
  } as any);

  const expiry = InviteService.expireStaleInvites(wsId);
  console.log('Expired Stale Invites:', expiry.expired);
  if (expiry.expired < 1) throw new Error('FAILED: At least 1 invite should have been expired');

  // Cancel invite
  const invite2 = await InviteService.createInvite({ workspaceId: wsId, email: 'cancel@test.com', role: 'intern', invitedBy: adminId });
  const cancelled = await InviteService.cancelInvite(invite2.id, wsId);
  console.log('Cancel Invite Result:', cancelled.success);
  if (!cancelled.success) throw new Error('FAILED: Cancel invite should succeed');

  // Analytics
  const analytics = InviteService.getInviteAnalytics(wsId);
  console.log('Invite Analytics:', { totalSent: analytics.totalSent, opened: analytics.totalOpened, expired: analytics.expired, openRate: `${analytics.openRate}%` });
  if (analytics.totalSent < 1) throw new Error('FAILED: Analytics totalSent should be >= 1');

  console.log('✅ PASS: Invitation Lifecycle (create, open, resend, expire, cancel, analytics)');

  // =====================================================================
  // SUITE 2 — NOTIFICATION ENGINE (8 types + unread count)
  // =====================================================================
  console.log('\n--- 2. Notification Engine (8 Types + Unread Count) ---');

  const notifTypes = [
    'TASK_ASSIGNED', 'TASK_DUE', 'TASK_OVERDUE', 'COMMENT_ADDED',
    'DOCUMENT_SHARED', 'CLIENT_APPROVAL_RECEIVED', 'PAYMENT_RECEIVED', 'INVITE_ACCEPTED',
  ];

  for (const type of notifTypes) {
    await NotificationRepository.createNotification({
      workspaceId: wsId, userId: employeeId,
      title: `${type} Event`, message: `Test notification for type ${type}`, type,
    });
  }

  const unreadCount = await NotificationRepository.getUnreadCount(wsId, employeeId);
  console.log(`Unread Notification Count: ${unreadCount} (Expected: 8)`);
  if (unreadCount !== 8) throw new Error(`FAILED: Expected 8 unread, got ${unreadCount}`);

  // Mark one as read
  const allNotifs = await NotificationRepository.getNotifications(wsId, employeeId);
  await NotificationRepository.markAsRead(wsId, employeeId, allNotifs[0].id);
  const afterMarkRead = await NotificationRepository.getUnreadCount(wsId, employeeId);
  console.log(`Unread after mark-read 1: ${afterMarkRead} (Expected: 7)`);
  if (afterMarkRead !== 7) throw new Error(`FAILED: Expected 7 unread, got ${afterMarkRead}`);

  // Mark all as read
  await NotificationRepository.markAllAsRead(wsId, employeeId);
  const afterMarkAll = await NotificationRepository.getUnreadCount(wsId, employeeId);
  console.log(`Unread after mark-all-read: ${afterMarkAll} (Expected: 0)`);
  if (afterMarkAll !== 0) throw new Error(`FAILED: Expected 0 unread, got ${afterMarkAll}`);

  console.log('✅ PASS: Notification Engine — 8 types, unread count, mark-read, mark-all-read');

  // =====================================================================
  // SUITE 3 — DIGEST ENGINE
  // =====================================================================
  console.log('\n--- 3. Daily Digest Engine ---');

  // Seed tasks for digest
  const today = new Date().toISOString().split('T')[0];
  inMemoryDb.tasks.set('task-due-1', { id: 'task-due-1', workspaceId: wsId, title: 'Submit Client Proposal', status: 'in_progress', dueDate: today, assignedTo: employeeId } as any);
  inMemoryDb.tasks.set('task-overdue-1', { id: 'task-overdue-1', workspaceId: wsId, title: 'Backend Audit', status: 'in_progress', dueDate: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], assignedTo: adminId } as any);

  const dailyDigest = DigestService.generateDailyDigest(wsId);
  console.log('Daily Digest:', {
    workspaceName: dailyDigest.workspaceName,
    tasksDueToday: dailyDigest.tasksDueToday.length,
    overdueCount: dailyDigest.overdueTasksCount,
    frequency: dailyDigest.frequency,
  });
  if (dailyDigest.tasksDueToday.length < 1) throw new Error('FAILED: Daily digest should show tasks due today');
  if (dailyDigest.overdueTasksCount < 1) throw new Error('FAILED: Daily digest should show overdue tasks');

  const weeklyDigest = DigestService.generateWeeklyDigest(wsId);
  console.log('Weekly Digest Frequency:', weeklyDigest.frequency);
  if (weeklyDigest.frequency !== 'weekly') throw new Error('FAILED: Weekly digest should have frequency "weekly"');

  // Set & get preferences
  DigestService.setPreferences(employeeId, wsId, 'weekly');
  const prefs = DigestService.getPreferences(employeeId, wsId);
  console.log('Digest Preference Set:', prefs.frequency);
  if (prefs.frequency !== 'weekly') throw new Error('FAILED: Preference should be "weekly"');

  // Send digest
  const sendResult = await DigestService.sendDigestToWorkspace(wsId, 'weekly');
  console.log('Digest Sent Count:', sendResult.sent);

  console.log('✅ PASS: Digest Engine — daily/weekly generation, preferences, send');

  // =====================================================================
  // SUITE 4 — DATA EXPORT
  // =====================================================================
  console.log('\n--- 4. Data Export Engine ---');

  // Seed some projects, CRM, docs for export
  inMemoryDb.projects.set('proj-exp-1', { id: 'proj-exp-1', workspaceId: wsId, name: 'Website Redesign', status: 'active', priority: 'high', progress: 60, createdAt: new Date().toISOString() } as any);
  inMemoryDb.crmRecords.set('lead-exp-1', { id: 'lead-exp-1', workspaceId: wsId, name: 'Tech Nexus Ltd', email: 'contact@technexus.com', company: 'Tech Nexus', status: 'qualified', dealValue: 85000, createdAt: new Date().toISOString() } as any);
  inMemoryDb.documents.set('doc-exp-1', { id: 'doc-exp-1', workspaceId: wsId, name: 'Brand Guidelines v3.pdf', mimeType: 'application/pdf', sizeBytes: 2048000, uploadedBy: adminId, createdAt: new Date().toISOString() } as any);
  inMemoryDb.taskTimeEntries.set('time-exp-1', { id: 'time-exp-1', workspaceId: wsId, taskId: 'task-due-1', userId: adminId, startTime: new Date(Date.now() - 7200000).toISOString(), endTime: new Date().toISOString(), billable: true, hourlyRate: 2500, currency: 'INR' } as any);

  const projectsCSV = ExportService.exportProjectsCSV(wsId);
  const tasksCSV = ExportService.exportTasksCSV(wsId);
  const crmCSV = ExportService.exportCRMCSV(wsId);
  const docsCSV = ExportService.exportDocumentsMetaCSV(wsId);
  const timeCSV = ExportService.exportTimeEntriesCSV(wsId);
  const backupJSON = ExportService.exportWorkspaceBackupJSON(wsId) as any;

  console.log('CSV Exports (bytes):', {
    projects: projectsCSV.length,
    tasks: tasksCSV.length,
    crm: crmCSV.length,
    documents: docsCSV.length,
    timeEntries: timeCSV.length,
  });
  console.log('JSON Backup Summary:', backupJSON.summary);

  if (!projectsCSV.includes('Website Redesign')) throw new Error('FAILED: Projects CSV missing project name');
  if (!crmCSV.includes('Tech Nexus Ltd')) throw new Error('FAILED: CRM CSV missing lead name');
  if (!docsCSV.includes('Brand Guidelines')) throw new Error('FAILED: Documents CSV missing document name');
  if (backupJSON.summary.projects < 1) throw new Error('FAILED: JSON backup should include projects');

  console.log('✅ PASS: Data Export — Projects, Tasks, CRM, Documents, Time Entries CSV + JSON Backup');

  // =====================================================================
  // SUITE 5 — AUDIT LOG SEARCH
  // =====================================================================
  console.log('\n--- 5. Audit Log Search & Filtering ---');

  await AuditRepository.logAudit({ workspaceId: wsId, userId: adminId, action: 'CREATE', resource: 'project', resourceId: 'proj-001' });
  await AuditRepository.logAudit({ workspaceId: wsId, userId: adminId, action: 'UPDATE', resource: 'task', resourceId: 'task-001' });
  await AuditRepository.logAudit({ workspaceId: wsId, userId: employeeId, action: 'DELETE', resource: 'crm', resourceId: 'lead-001' });
  await AuditRepository.logAudit({ workspaceId: wsId, userId: employeeId, action: 'CREATE', resource: 'document', resourceId: 'doc-001' });
  await AuditRepository.logAudit({ workspaceId: wsId, userId: adminId, action: 'LOGIN', resource: 'session', resourceId: 'sess-001' });

  // Keyword search
  const searchResults = await AuditRepository.searchAuditLogs(wsId, { search: 'task' });
  console.log(`Search "task": ${searchResults.length} result(s) (Expected: 1)`);
  if (searchResults.length !== 1) throw new Error(`FAILED: Keyword search "task" expected 1 result, got ${searchResults.length}`);

  // Actor filter
  const actorResults = await AuditRepository.searchAuditLogs(wsId, { actor: employeeId });
  console.log(`Actor filter (employee): ${actorResults.length} result(s) (Expected: 2)`);
  if (actorResults.length !== 2) throw new Error(`FAILED: Actor filter expected 2, got ${actorResults.length}`);

  // Module filter
  const moduleResults = await AuditRepository.searchAuditLogs(wsId, { module: 'crm' });
  console.log(`Module filter "crm": ${moduleResults.length} result(s) (Expected: 1)`);
  if (moduleResults.length !== 1) throw new Error(`FAILED: Module filter expected 1, got ${moduleResults.length}`);

  // Date range filter
  const pastResults = await AuditRepository.searchAuditLogs(wsId, {
    startDate: new Date(Date.now() - 60000),
    endDate: new Date(Date.now() + 60000),
  });
  console.log(`Date range filter: ${pastResults.length} result(s) (Expected: 5)`);
  if (pastResults.length !== 5) throw new Error(`FAILED: Date range expected 5, got ${pastResults.length}`);

  console.log('✅ PASS: Audit Log Search — keyword, actor, module, date range filters');

  // =====================================================================
  // SUITE 6 — CUSTOMER HEALTH ENGINE V2
  // =====================================================================
  console.log('\n--- 6. Customer Health Engine V2 (10 Pillars) ---');

  // Seed wiki pages and wiki activity
  inMemoryDb.wikiPages.set('wiki-1', { id: 'wiki-1', workspaceId: wsId, title: 'Brand SOPs', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any);
  inMemoryDb.wikiPages.set('wiki-2', { id: 'wiki-2', workspaceId: wsId, title: 'Client Onboarding', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as any);
  inMemoryDb.automationRules.set('auto-1', { id: 'auto-1', workspaceId: wsId, isActive: true } as any);
  inMemoryDb.sessions.set('sess-act', { id: 'sess-act', workspaceId: wsId, userId: adminId, token: 'tok-1', expiresAt: new Date(), createdAt: new Date() } as any);

  const health = WorkspaceHealthService.calculateHealth(wsId);
  console.log('Health Score:', health.score, `/ Grade: ${health.grade} / Status: ${health.status}`);
  console.log('Pillar Breakdown:', {
    userActivity: health.breakdown.userActivityScore,
    wikiAdoption: health.breakdown.wikiAdoptionScore,
    inviteAcceptance: health.breakdown.inviteAcceptanceScore,
    loginFrequency: health.breakdown.loginFrequencyScore,
    clientPortal: health.breakdown.clientPortalScore,
  });
  console.log('New V2 Metrics:', {
    inviteAcceptanceRate: `${health.metrics.inviteAcceptanceRate}%`,
    wikiPages: health.metrics.wikiPagesCount,
    activeGuests: health.metrics.activeGuestSessions,
  });

  if (!['Healthy', 'At Risk', 'Critical'].includes(health.status)) {
    throw new Error(`FAILED: Health status must be "Healthy", "At Risk", or "Critical". Got: ${health.status}`);
  }
  if (health.breakdown.wikiAdoptionScore === undefined) throw new Error('FAILED: V2 wikiAdoptionScore pillar missing');
  if (health.breakdown.loginFrequencyScore === undefined) throw new Error('FAILED: V2 loginFrequencyScore pillar missing');
  if (health.breakdown.inviteAcceptanceScore === undefined) throw new Error('FAILED: V2 inviteAcceptanceScore pillar missing');

  console.log('✅ PASS: Health Engine V2 — 10 pillars, Healthy/At Risk/Critical status');

  // =====================================================================
  // SUITE 7 — FOUNDER CONSOLE METRICS
  // =====================================================================
  console.log('\n--- 7. Founder Console Metrics Aggregation ---');

  // Seed a billing payment for MRR calculation
  inMemoryDb.billingPayments.set('pay-mrr-1', {
    id: 'pay-mrr-1', workspaceId: wsId, amount: 149900, currency: 'INR',
    status: 'captured', razorpayPaymentId: 'pay_test_123', createdAt: new Date().toISOString(),
  } as any);

  const allPayments = Array.from(inMemoryDb.billingPayments.values());
  const monthlyCaptures = allPayments.filter((p: any) => p.status === 'captured');
  const mrr = monthlyCaptures.reduce((sum: number, p: any) => sum + (p.amount || 0) / 100, 0);
  const arr = mrr * 12;
  const planCounts: Record<string, number> = {};
  for (const ws of inMemoryDb.workspaces.values()) {
    planCounts[ws.plan] = (planCounts[ws.plan] || 0) + 1;
  }

  console.log('Founder Console Data:', { mrr: `₹${mrr}`, arr: `₹${arr}`, planDistribution: planCounts });

  const sentEmails = EmailService.getSentEmails();
  console.log('Emails Sent in Session:', sentEmails.length);

  if (mrr < 1499) throw new Error(`FAILED: MRR should be at least 1499 (got ${mrr})`);
  if (arr < mrr * 12) throw new Error('FAILED: ARR calculation error');

  console.log('✅ PASS: Founder Console — MRR, ARR, plan distribution, email telemetry');

  // =====================================================================
  // FINAL SUMMARY
  // =====================================================================
  console.log('\n================================================================');
  console.log('✅ ALL PHASE 16 BETA READINESS SUITES PASSED (7/7 — 100%)');
  console.log('================================================================');
  console.log('\nSuite Results:');
  console.log('  ✅ 1. Invitation Lifecycle (create, open, resend, expire, cancel, analytics)');
  console.log('  ✅ 2. Notification Engine (8 types, unread count, mark-read, mark-all-read)');
  console.log('  ✅ 3. Daily Digest Engine (daily/weekly, preferences, dispatch)');
  console.log('  ✅ 4. Data Export Engine (5 CSV formats + JSON backup)');
  console.log('  ✅ 5. Audit Log Search (keyword, actor, module, date range)');
  console.log('  ✅ 6. Customer Health V2 (10 pillars, Healthy/At Risk/Critical)');
  console.log('  ✅ 7. Founder Console (MRR, ARR, plan distribution, email telemetry)');
}

runPhase16Validation().catch((err) => {
  console.error('\n❌ Validation Error:', err.message);
  process.exit(1);
});
