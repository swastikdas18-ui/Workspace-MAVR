import { runAllTests } from './auth-rbac.test';

async function main() {
  try {
    await runAllTests();
    process.exit(0);
  } catch (err) {
    console.error('Test run failed:', err);
    process.exit(1);
  }
}

main();
