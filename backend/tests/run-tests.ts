process.env.NODE_ENV = 'test';

import { runAllTests } from './auth-rbac.test';
import { runSearchTests } from './search-intelligence.test';
import { runAutomationTests } from './automation-engine.test';
import { runRealtimeTests } from './realtime-collaboration.test';
import { runCommandPaletteRegressionTests } from './command-palette.test';
import { runInfrastructureHardeningTests } from './infrastructure-hardening.test';
import { runRevenueOperationsTests } from './revenue-operations.test';
import { runBetaUserAcceptanceTests } from './beta-acceptance.test';
import { runB2StorageTests } from './b2-storage.test';
import { runPhase19bTests } from './phase19b-production-validation';
import { runInviteMembershipAuditTests } from './invite-membership-audit.test';
import { runPhase29Audit } from './phase29-default-plan-audit';
import { runWikiRbacTests } from './wiki-rbac.test';
import { runTimeTrackingDeleteTests } from './time-tracking-delete.test';
import { runBillingRateRbacTests } from './billing-rate-rbac.test';
import { runUtilizationAnalyticsEngineTests } from './utilization-analytics-engine.test';
import { runB2StorageOrphanCleanupTests } from './b2-storage-orphan-cleanup.test';
import { runDataPersistenceAuditTests } from './data-persistence-audit.test';

async function main() {
  try {
    console.log('\n>>> Starting Suite 1: Auth & RBAC');
    await runAllTests();
    console.log('\n>>> Starting Suite 2: Search Intelligence');
    await runSearchTests();
    console.log('\n>>> Starting Suite 3: Automation Engine');
    await runAutomationTests();
    console.log('\n>>> Starting Suite 4: Command Palette');
    await runCommandPaletteRegressionTests();
    console.log('\n>>> Starting Suite 5: Infrastructure Hardening');
    await runInfrastructureHardeningTests();
    console.log('\n>>> Starting Suite 6: Revenue Operations');
    await runRevenueOperationsTests();
    console.log('\n>>> Starting Suite 7: Beta Acceptance');
    await runBetaUserAcceptanceTests();
    console.log('\n>>> Starting Suite 8: B2 Storage');
    await runB2StorageTests();
    console.log('\n>>> Starting Suite 9: Realtime Collaboration');
    await runRealtimeTests();
    console.log('\n>>> Starting Suite 10: Phase 19B Production Validation');
    await runPhase19bTests();
    console.log('\n>>> Starting Suite 11: Invite Lifecycle & Membership Audit');
    await runInviteMembershipAuditTests();
    console.log('\n>>> Starting Suite 12: Phase 29 Default Plan Audit');
    await runPhase29Audit();
    console.log('\n>>> Starting Suite 13: Wiki RBAC & Multi-Tenant Isolation');
    await runWikiRbacTests();
    console.log('\n>>> Starting Suite 14: Time Tracking Deletion & Recalculation');
    await runTimeTrackingDeleteTests();
    console.log('\n>>> Starting Suite 15: Billing Rate RBAC & Server Enforcement');
    await runBillingRateRbacTests();
    console.log('\n>>> Starting Suite 16: Enterprise Utilization Analytics Engine');
    await runUtilizationAnalyticsEngineTests();
    console.log('\n>>> Starting Suite 17: Backblaze B2 Orphan Storage Cleanup & Rollback');
    await runB2StorageOrphanCleanupTests();
    console.log('\n>>> Starting Suite 18: Data Persistence & Multi-Session Audit');
    await runDataPersistenceAuditTests();
    console.log('\n🌟 ALL 18 TEST SUITES PASSED CLEANLY 🌟\n');
    process.exit(0);
  } catch (err) {
    console.error('Test run failed:', err);
    process.exit(1);
  }
}

main();
