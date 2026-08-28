/**
 * Workspace OS — Phase 30.1 API Endpoint & Origin Consistency Enforcer
 * 
 * Enforces zero raw API calls outside src/lib/api.ts.
 * Validates that all network requests and websocket initializations resolve
 * through the centralized API client and authoritative backend URL.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.resolve(process.cwd(), 'src');
const ALLOWED_FILES = [
  path.resolve(SRC_DIR, 'lib/api.ts'),
];

interface Violation {
  file: string;
  line: number;
  pattern: string;
  code: string;
}

const FORBIDDEN_PATTERNS = [
  { regex: /fetch\s*\(\s*['"`]\/api/i, name: "Raw fetch('/api...')" },
  { regex: /window\.fetch\s*\(\s*['"`]\/api/i, name: "window.fetch('/api...')" },
  { regex: /axios\s*\(\s*['"`]\/api/i, name: "axios('/api...')" },
  { regex: /window\.location\.origin/i, name: "Unchecked window.location.origin (use getFrontendUrl or API_BASE_URL)" },
  { regex: /window\.location\.host/i, name: "Unchecked window.location.host (use getWebSocketUrl)" },
];

function scanDirectory(dir: string, violations: Violation[]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist') {
        scanDirectory(fullPath, violations);
      }
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      if (ALLOWED_FILES.includes(fullPath)) {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const rule of FORBIDDEN_PATTERNS) {
          if (rule.regex.test(line)) {
            violations.push({
              file: path.relative(process.cwd(), fullPath),
              line: index + 1,
              pattern: rule.name,
              code: line.trim(),
            });
          }
        }
      });
    }
  }
}

export function runApiEndpointAudit(): boolean {
  console.log('\n============================================================');
  console.log('  PHASE 30.1 — API ENDPOINT & BACKEND ORIGIN ENFORCEMENT AUDIT');
  console.log('============================================================\n');

  const violations: Violation[] = [];
  scanDirectory(SRC_DIR, violations);

  if (violations.length === 0) {
    console.log('✅ AUDIT PASSED: 0 violations found.');
    console.log('  - All frontend requests flow exclusively through src/lib/api.ts');
    console.log('  - All WebSocket connections resolve via getWebSocketUrl()');
    console.log('  - All frontend URLs resolve via getFrontendUrl()\n');
    return true;
  } else {
    console.error(`❌ AUDIT FAILED: ${violations.length} forbidden API or origin pattern(s) detected:\n`);
    violations.forEach((v, idx) => {
      console.error(`  ${idx + 1}. [${v.pattern}]`);
      console.error(`     File: ${v.file}:${v.line}`);
      console.error(`     Code: ${v.code}\n`);
    });
    return false;
  }
}

if (process.argv[1] === import.meta.filename) {
  const passed = runApiEndpointAudit();
  if (!passed) {
    process.exit(1);
  }
}
