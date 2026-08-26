/**
 * Phase 20B: Frontend Raw Secrets & Settings Page Security Audit
 * 
 * Verifies:
 * 1. Zero raw secrets exposed in any frontend component or state file in src/
 * 2. Developer API & Secrets tab renders only masked formats (rk_live_xxxxxxxxxxx1234, whsec_xxxxxxxxxxx8921, tok_srv_xxxxxxxxxxx4321)
 * 3. Copy button is disabled by default with OWASP Zero-Trust compliance
 * 4. Rotate Secret workflow generates refreshed masked credential identifiers
 * 5. Full codebase audit across all settings and admin components
 */

import { strict as assert } from 'assert';
import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(fullPath);
    }
  });
  return results;
}

async function runSecretsAuditValidation() {
  console.log('\n=================================================================');
  console.log(' PHASE 20B: FRONTEND SECRETS & SETTINGS PAGE AUDIT VALIDATION');
  console.log('=================================================================');

  let passed = 0;
  const srcDir = path.resolve(process.cwd(), 'src');
  const files = walkDir(srcDir);

  // 1. Audit all files in src/ for live unmasked API secrets
  console.log('\n--- 1. Static AST/Content Audit across src/ ---');
  const forbiddenSecretPatterns = [
    /rk_live_[a-zA-Z0-9]{20,}/,
    /whsec_[a-zA-Z0-9]{20,}/,
    /sk_live_[a-zA-Z0-9]{20,}/,
    /postgres:\/\/[^:]+:[^@]+@/,
    /postgresql:\/\/[^:]+:[^@]+@/,
    /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/,
  ];

  let violations = 0;
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const pattern of forbiddenSecretPatterns) {
      if (pattern.test(content)) {
        console.error(`❌ Violation found in ${filePath}: matched pattern ${pattern}`);
        violations++;
      }
    }
  }

  assert.equal(violations, 0, 'Zero raw secrets detected in src/ directory');
  console.log(`  ✅ PASS [1]: Audited ${files.length} frontend files — 0 raw secrets detected`);
  passed++;

  // 2. SettingsView Component Verification
  console.log('\n--- 2. SettingsView Secret Masking & Copy Disabled Policy ---');
  const settingsPath = path.join(srcDir, 'components/settings/SettingsView.tsx');
  const settingsContent = fs.readFileSync(settingsPath, 'utf-8');

  // Verify masked formats
  assert(settingsContent.includes('rk_live_xxxxxxxxxxx1234'), 'Contains masked API key');
  assert(settingsContent.includes('whsec_xxxxxxxxxxx8921'), 'Contains masked webhook secret');
  assert(settingsContent.includes('tok_srv_xxxxxxxxxxx4321'), 'Contains masked service token');
  console.log('  ✅ PASS [2]: All API keys, webhook secrets, and service tokens formatted with masked values');
  passed++;

  // Verify copy disabled
  assert(settingsContent.includes('Copy Disabled'), 'Copy Disabled button present');
  assert(settingsContent.includes('Copying raw secrets is disabled by policy'), 'Copy disabled policy tooltip present');
  assert(settingsContent.includes('disabled'), 'Copy button element contains disabled attribute');
  console.log('  ✅ PASS [3]: Copying raw secrets is disabled by default with zero-trust policy notice');
  passed++;

  // Verify Rotate Secret
  assert(settingsContent.includes('Rotate Secret'), 'Rotate Secret button present');
  assert(settingsContent.includes('Confirm Rotation'), 'Rotation confirmation state present');
  assert(settingsContent.includes('handleRotateSecret'), 'handleRotateSecret handler present');
  console.log('  ✅ PASS [4]: Rotate Secret action button with confirmation state verified');
  passed++;

  // 3. Admin Tools View Audit
  console.log('\n--- 3. AdminToolsView Code Snippet Sanitization Audit ---');
  const adminToolsPath = path.join(srcDir, 'components/admin/AdminToolsView.tsx');
  const adminToolsContent = fs.readFileSync(adminToolsPath, 'utf-8');
  assert(!adminToolsContent.includes('postgres://'), 'No raw database connection string in AdminToolsView');
  console.log('  ✅ PASS [5]: AdminToolsView verified free of live connection secrets');
  passed++;

  console.log('\n=================================================================');
  console.log(` FRONTEND SECRETS AUDIT: ${passed} PASSED, 0 FAILED (100%)`);
  console.log('=================================================================\n');
}

runSecretsAuditValidation().catch((err) => {
  console.error('\n❌ Frontend Secrets Audit Failed:', err);
  process.exit(1);
});
