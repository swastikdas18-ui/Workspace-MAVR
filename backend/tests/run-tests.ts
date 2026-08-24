import { runAllTests } from './auth-rbac.test';
import { runSearchTests } from './search-intelligence.test';
import { runAutomationTests } from './automation-engine.test';
import { runRealtimeTests } from './realtime-collaboration.test';
import { runCommandPaletteRegressionTests } from './command-palette.test';
import { runInfrastructureHardeningTests } from './infrastructure-hardening.test';
import { runRevenueOperationsTests } from './revenue-operations.test';
import { runBetaUserAcceptanceTests } from './beta-acceptance.test';
import { runB2StorageTests } from './b2-storage.test';

async function main() {
  try {
    await runAllTests();
    await runSearchTests();
    await runAutomationTests();
    await runCommandPaletteRegressionTests();
    await runInfrastructureHardeningTests();
    await runRevenueOperationsTests();
    await runBetaUserAcceptanceTests();
    await runB2StorageTests();
    await runRealtimeTests();
    process.exit(0);
  } catch (err) {
    console.error('Test run failed:', err);
    process.exit(1);
  }
}

main();
