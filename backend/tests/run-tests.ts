import { runAllTests } from './auth-rbac.test';
import { runSearchTests } from './search-intelligence.test';
import { runAutomationTests } from './automation-engine.test';
import { runRealtimeTests } from './realtime-collaboration.test';

async function main() {
  try {
    await runAllTests();
    await runSearchTests();
    await runAutomationTests();
    await runRealtimeTests();
    process.exit(0);
  } catch (err) {
    console.error('Test run failed:', err);
    process.exit(1);
  }
}

main();
