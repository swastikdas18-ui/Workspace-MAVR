/**
 * Suite 37: Workspace OS — Global API Rate Limiter Protection (HIGH-02 Remediation)
 *
 * Verifies that all externally accessible HTTP endpoints are protected by
 * the single source of truth applyGlobalRateLimiting() with zero bypass routes:
 *
 * TEST 1:  /api route limited
 * TEST 2:  /chat route limited (root mount)
 * TEST 3:  /tasks route limited (root mount)
 * TEST 4:  /people route limited (root mount)
 * TEST 5:  /crm route limited (root mount)
 * TEST 6:  /inbox route limited (root mount)
 * TEST 7:  /dashboard route limited (root mount)
 * TEST 8:  Health endpoint exempt (/health, /api/health, /storage/health)
 * TEST 9:  Rate limiter resets after window
 * TEST 10: Root alias and API alias behave identically (shared protection bucket)
 */

process.env.NODE_ENV = 'test';

import { app } from '../src/app';
import {
  enableRateLimiterInTest,
  setTestMaxRequestsOverride,
  resetRateLimits,
  advanceRateLimitClock,
  resetRateLimitClock,
} from '../src/middleware/rate-limiter';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.error(`  ❌ FAIL: ${label}`);
  }
}

export async function runRateLimitProtectionTests() {
  console.log('\n━━━ Suite 37: Global API Rate Limiter Protection (HIGH-02) ━━━\n');
  passed = 0;
  failed = 0;
  failures.length = 0;

  // Configure test environment for rate limit enforcement
  enableRateLimiterInTest(true);
  setTestMaxRequestsOverride(5); // 5 requests allowed, 6th will be 429
  resetRateLimits();
  resetRateLimitClock();

  try {
    // ── TEST 1: /api route limited ──
    {
      const ip = '198.51.100.1';
      for (let i = 1; i <= 5; i++) {
        const res = await app.request('/api/projects', {
          headers: { 'x-forwarded-for': ip },
        });
        assert(res.status !== 429, `TEST 1: Request ${i}/5 to /api/projects is not 429 (got ${res.status})`);
      }

      // 6th request must be rate limited
      const limitedRes = await app.request('/api/projects', {
        headers: { 'x-forwarded-for': ip },
      });
      assert(limitedRes.status === 429, 'TEST 1: 6th request to /api/projects is 429 Too Many Requests');
      const body = await limitedRes.json();
      assert(body.error?.code === 'TOO_MANY_REQUESTS', 'TEST 1: Error code is TOO_MANY_REQUESTS');
      assert(limitedRes.headers.get('X-RateLimit-Limit') === '5', 'TEST 1: X-RateLimit-Limit header matches max requests');
      assert(limitedRes.headers.get('X-RateLimit-Remaining') === '0', 'TEST 1: X-RateLimit-Remaining is 0');
      assert(limitedRes.headers.has('Retry-After'), 'TEST 1: Retry-After header is present');
    }

    // ── TEST 2: /chat route limited (root mount) ──
    {
      const ip = '198.51.100.2';
      for (let i = 1; i <= 5; i++) {
        const res = await app.request('/chat', {
          headers: { 'x-forwarded-for': ip },
        });
        assert(res.status !== 429, `TEST 2: Request ${i}/5 to root /chat is not 429 (got ${res.status})`);
      }

      const limitedRes = await app.request('/chat', {
        headers: { 'x-forwarded-for': ip },
      });
      assert(limitedRes.status === 429, 'TEST 2: 6th request to root /chat is 429 Too Many Requests (no bypass)');
    }

    // ── TEST 3: /tasks route limited (root mount) ──
    {
      const ip = '198.51.100.3';
      for (let i = 1; i <= 5; i++) {
        const res = await app.request('/tasks', {
          headers: { 'x-forwarded-for': ip },
        });
        assert(res.status !== 429, `TEST 3: Request ${i}/5 to root /tasks is not 429 (got ${res.status})`);
      }

      const limitedRes = await app.request('/tasks', {
        headers: { 'x-forwarded-for': ip },
      });
      assert(limitedRes.status === 429, 'TEST 3: 6th request to root /tasks is 429 Too Many Requests (no bypass)');
    }

    // ── TEST 4: /people route limited (root mount) ──
    {
      const ip = '198.51.100.4';
      for (let i = 1; i <= 5; i++) {
        const res = await app.request('/people/departments', {
          headers: { 'x-forwarded-for': ip },
        });
        assert(res.status !== 429, `TEST 4: Request ${i}/5 to root /people/departments is not 429 (got ${res.status})`);
      }

      const limitedRes = await app.request('/people/departments', {
        headers: { 'x-forwarded-for': ip },
      });
      assert(limitedRes.status === 429, 'TEST 4: 6th request to root /people/departments is 429 Too Many Requests (no bypass)');
    }

    // ── TEST 5: /crm route limited (root mount) ──
    {
      const ip = '198.51.100.5';
      for (let i = 1; i <= 5; i++) {
        const res = await app.request('/crm', {
          headers: { 'x-forwarded-for': ip },
        });
        assert(res.status !== 429, `TEST 5: Request ${i}/5 to root /crm is not 429 (got ${res.status})`);
      }

      const limitedRes = await app.request('/crm', {
        headers: { 'x-forwarded-for': ip },
      });
      assert(limitedRes.status === 429, 'TEST 5: 6th request to root /crm is 429 Too Many Requests (no bypass)');
    }

    // ── TEST 6: /inbox route limited (root mount) ──
    {
      const ip = '198.51.100.6';
      for (let i = 1; i <= 5; i++) {
        const res = await app.request('/inbox', {
          headers: { 'x-forwarded-for': ip },
        });
        assert(res.status !== 429, `TEST 6: Request ${i}/5 to root /inbox is not 429 (got ${res.status})`);
      }

      const limitedRes = await app.request('/inbox', {
        headers: { 'x-forwarded-for': ip },
      });
      assert(limitedRes.status === 429, 'TEST 6: 6th request to root /inbox is 429 Too Many Requests (no bypass)');
    }

    // ── TEST 7: /dashboard route limited (root mount) ──
    {
      const ip = '198.51.100.7';
      for (let i = 1; i <= 5; i++) {
        const res = await app.request('/dashboard', {
          headers: { 'x-forwarded-for': ip },
        });
        assert(res.status !== 429, `TEST 7: Request ${i}/5 to root /dashboard is not 429 (got ${res.status})`);
      }

      const limitedRes = await app.request('/dashboard', {
        headers: { 'x-forwarded-for': ip },
      });
      assert(limitedRes.status === 429, 'TEST 7: 6th request to root /dashboard is 429 Too Many Requests (no bypass)');
    }

    // ── TEST 8: Health endpoint exempt ──
    {
      const ip = '198.51.100.8';
      // Even after 10 requests (double the limit of 5), health probes are never throttled
      for (let i = 1; i <= 10; i++) {
        const healthRes = await app.request('/health', {
          headers: { 'x-forwarded-for': ip },
        });
        assert(healthRes.status === 200, `TEST 8a: /health probe request ${i} returns 200 OK`);
        assert(!healthRes.headers.has('X-RateLimit-Limit'), 'TEST 8a: /health has no rate limit headers');
      }

      // Test /api/health exemption
      for (let i = 1; i <= 5; i++) {
        const apiHealthRes = await app.request('/api/health', {
          headers: { 'x-forwarded-for': ip },
        });
        assert(apiHealthRes.status === 200, `TEST 8b: /api/health probe request ${i} returns 200 OK`);
      }

      // Test /storage/health exemption
      const storageHealthRes = await app.request('/storage/health', {
        headers: { 'x-forwarded-for': ip },
      });
      assert(storageHealthRes.status !== 429, `TEST 8c: /storage/health is exempt from 429 (got ${storageHealthRes.status})`);
    }

    // ── TEST 9: Rate limiter resets after window ──
    {
      const ip = '198.51.100.9';
      // Exhaust rate limit
      for (let i = 1; i <= 5; i++) {
        await app.request('/api/projects', {
          headers: { 'x-forwarded-for': ip },
        });
      }
      const throttledRes = await app.request('/api/projects', {
        headers: { 'x-forwarded-for': ip },
      });
      assert(throttledRes.status === 429, 'TEST 9a: Rate limit reached (429)');

      // Advance clock by 61 seconds (window is 60 seconds)
      advanceRateLimitClock(61_000);

      // Next request must be allowed because window has reset
      const resetRes = await app.request('/api/projects', {
        headers: { 'x-forwarded-for': ip },
      });
      assert(resetRes.status !== 429, `TEST 9b: After window expiration, request is allowed (got ${resetRes.status})`);
      assert(resetRes.headers.get('X-RateLimit-Remaining') === '4', 'TEST 9b: Remaining requests reset to maxRequests - 1');

      resetRateLimitClock();
    }

    // ── TEST 10: Root alias and API alias behave identically ──
    {
      const ip = '198.51.100.10';
      // 3 requests to root alias /tasks
      for (let i = 1; i <= 3; i++) {
        const res = await app.request('/tasks', {
          headers: { 'x-forwarded-for': ip },
        });
        assert(res.status !== 429, `TEST 10: /tasks request ${i} allowed`);
      }

      // 2 requests to API alias /api/tasks (total: 5)
      for (let i = 1; i <= 2; i++) {
        const res = await app.request('/api/tasks', {
          headers: { 'x-forwarded-for': ip },
        });
        assert(res.status !== 429, `TEST 10: /api/tasks request ${i} allowed`);
      }

      // 6th request via root alias: blocked
      const blockedRoot = await app.request('/tasks', {
        headers: { 'x-forwarded-for': ip },
      });
      assert(blockedRoot.status === 429, 'TEST 10a: /tasks blocked (cannot evade limit by alternating aliases)');

      // 7th request via API alias: blocked
      const blockedApi = await app.request('/api/tasks', {
        headers: { 'x-forwarded-for': ip },
      });
      assert(blockedApi.status === 429, 'TEST 10b: /api/tasks also blocked (shared rate limit bucket)');
    }

    console.log(`\n━━━ Suite 37 Results: ${passed} passed, ${failed} failed ━━━`);
    if (failed > 0) {
      throw new Error(`Suite 37 FAILED (${failed} failures): ${failures.join(', ')}`);
    }
  } finally {
    // Teardown: restore standard test mode
    enableRateLimiterInTest(false);
    setTestMaxRequestsOverride(null);
    resetRateLimits();
    resetRateLimitClock();
  }
}

// Direct execution support
if (process.argv[1]?.includes('rate-limit-protection')) {
  runRateLimitProtectionTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
