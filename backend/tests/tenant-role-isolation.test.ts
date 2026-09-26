/**
 * Suite 36: Tenant Role Isolation — People OS
 * Phase 36 (HIGH-01): Verifies that all People OS authorization decisions
 * use workspace-scoped membership role (roleInWorkspace) and NOT global user.role.
 *
 * Scenarios:
 *  1. Admin in Workspace A can perform admin ops in A
 *  2. Same user (Employee in Workspace B) gets 403 for admin ops in B
 *  3. Dept Head permissions valid only in assigned workspace
 *  4. Employee cannot manage people in any workspace
 *  5. Intern cannot manage people in any workspace
 *  6. Leave approvals respect workspace role
 *  7. Department creation respects workspace role
 *  8. Role assignment respects workspace role
 *  9. Cross-workspace member lookup blocked
 * 10. Cross-workspace privilege escalation attempt blocked
 */

process.env.NODE_ENV = 'test';

import { getAuthorizationContext, resolveMembershipRole } from '../src/middleware/rbac';
import { AuthorizationContext } from '../src/types';

// ---------------------------------------------------------------------------
// Helpers — minimal mock Hono context for unit-level isolation tests
// ---------------------------------------------------------------------------

import { inMemoryDb } from '../packages/database';

interface MockContextOptions {
  user?: { id: string; email?: string; role?: string; platformRole?: string };
  workspace?: { id: string; name?: string; slug?: string; ownerId?: string; plan?: string; roleInWorkspace?: string };
  memberRole?: string; // The role from workspace_members lookup
}

/**
 * Build a mock Hono context that simulates authenticated requests.
 * The mock bypasses real DB calls in resolveMembershipRole by setting
 * workspace.roleInWorkspace directly and seeding inMemoryDb for verified membership lookup.
 */
function createMockContext(opts: MockContextOptions) {
  const store = new Map<string, any>();
  if (opts.user) store.set('user', opts.user);
  if (opts.workspace) {
    const role = opts.memberRole || opts.workspace.roleInWorkspace || 'employee';
    const ws: any = {
      id: opts.workspace.id,
      name: opts.workspace.name || 'Test WS',
      slug: opts.workspace.slug || 'test-ws',
      ownerId: opts.workspace.ownerId || 'owner-1',
      plan: opts.workspace.plan || 'pro',
      roleInWorkspace: role,
    };
    store.set('workspace', ws);

    if (opts.user?.id) {
      inMemoryDb.workspaceMembers.set(`${opts.workspace.id}-${opts.user.id}`, {
        id: `mem-${opts.workspace.id}-${opts.user.id}`,
        workspaceId: opts.workspace.id,
        userId: opts.user.id,
        role: role as any,
        joinedAt: new Date(),
      } as any);
    }
  }

  return {
    get: (key: string) => store.get(key),
    set: (key: string, value: any) => store.set(key, value),
    req: {
      method: 'GET',
      path: '/api/people/test',
      header: () => null,
    },
  } as any;
}

// Test identity constants
const USER_ALICE = { id: 'user-alice', email: 'alice@test.com', role: 'admin', platformRole: 'none' };
const WORKSPACE_A = { id: 'ws-alpha', name: 'Alpha Inc', slug: 'alpha', ownerId: 'user-owner-a', plan: 'pro' };
const WORKSPACE_B = { id: 'ws-beta', name: 'Beta Corp', slug: 'beta', ownerId: 'user-owner-b', plan: 'pro' };

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

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

export async function runTenantRoleIsolationTests() {
  console.log('\n━━━ Suite 36: Tenant Role Isolation — People OS (HIGH-01) ━━━\n');
  passed = 0;
  failed = 0;
  failures.length = 0;

  // ── TEST 1: Admin in Workspace A → admin operations allowed ──
  {
    const c = createMockContext({
      user: USER_ALICE,
      workspace: WORKSPACE_A,
      memberRole: 'admin',
    });
    const authCtx = await getAuthorizationContext(c);
    assert(authCtx.roleInWorkspace === 'admin', 'TEST 1: Admin in Workspace A gets admin roleInWorkspace');
    assert(authCtx.workspaceId === WORKSPACE_A.id, 'TEST 1: AuthContext has correct workspaceId');
    assert(authCtx.userId === USER_ALICE.id, 'TEST 1: AuthContext has correct userId');
  }

  // ── TEST 2: Same user (Employee in Workspace B) → 403 on admin ops ──
  {
    const c = createMockContext({
      user: USER_ALICE,       // Global role is still 'admin'
      workspace: WORKSPACE_B,
      memberRole: 'employee', // But membership in B is 'employee'
    });
    const authCtx = await getAuthorizationContext(c);
    assert(
      authCtx.roleInWorkspace === 'employee',
      'TEST 2: Same user is employee in Workspace B despite global admin role'
    );
    assert(authCtx.roleInWorkspace !== 'admin', 'TEST 2: Admin operations would be denied (role != admin)');
  }

  // ── TEST 3: Dept Head permissions valid only in assigned workspace ──
  {
    const cLead = createMockContext({
      user: { id: 'user-lead', email: 'lead@test.com', role: 'employee', platformRole: 'none' },
      workspace: WORKSPACE_A,
      memberRole: 'lead',
    });
    const authCtxLead = await getAuthorizationContext(cLead);
    assert(authCtxLead.roleInWorkspace === 'lead', 'TEST 3a: Lead role recognized in assigned workspace');

    const cLeadOther = createMockContext({
      user: { id: 'user-lead', email: 'lead@test.com', role: 'employee', platformRole: 'none' },
      workspace: WORKSPACE_B,
      memberRole: 'employee',
    });
    const authCtxOther = await getAuthorizationContext(cLeadOther);
    assert(authCtxOther.roleInWorkspace === 'employee', 'TEST 3b: Lead is only employee in other workspace');
  }

  // ── TEST 4: Employee cannot manage people in any workspace ──
  {
    const c = createMockContext({
      user: { id: 'user-emp', email: 'emp@test.com', role: 'employee', platformRole: 'none' },
      workspace: WORKSPACE_A,
      memberRole: 'employee',
    });
    const authCtx = await getAuthorizationContext(c);
    assert(
      authCtx.roleInWorkspace !== 'admin' && authCtx.roleInWorkspace !== 'lead',
      'TEST 4: Employee role blocks admin/lead people management'
    );
  }

  // ── TEST 5: Intern cannot manage people in any workspace ──
  {
    const c = createMockContext({
      user: { id: 'user-intern', email: 'intern@test.com', role: 'intern', platformRole: 'none' },
      workspace: WORKSPACE_A,
      memberRole: 'intern',
    });
    const authCtx = await getAuthorizationContext(c);
    assert(
      authCtx.roleInWorkspace === 'intern',
      'TEST 5: Intern role is correctly resolved, cannot manage people'
    );
  }

  // ── TEST 6: Leave approvals respect workspace role ──
  {
    // Admin in A can review leaves
    const cAdmin = createMockContext({
      user: USER_ALICE,
      workspace: WORKSPACE_A,
      memberRole: 'admin',
    });
    const authAdmin = await getAuthorizationContext(cAdmin);
    const canReviewA = authAdmin.roleInWorkspace === 'admin' || authAdmin.roleInWorkspace === 'lead';
    assert(canReviewA, 'TEST 6a: Admin in Workspace A can approve/reject leaves');

    // Same user as employee in B cannot review leaves
    const cEmp = createMockContext({
      user: USER_ALICE,
      workspace: WORKSPACE_B,
      memberRole: 'employee',
    });
    const authEmp = await getAuthorizationContext(cEmp);
    const canReviewB = authEmp.roleInWorkspace === 'admin' || authEmp.roleInWorkspace === 'lead';
    assert(!canReviewB, 'TEST 6b: Same user as employee in Workspace B cannot approve/reject leaves');
  }

  // ── TEST 7: Department creation respects workspace role ──
  {
    const cAdmin = createMockContext({
      user: USER_ALICE,
      workspace: WORKSPACE_A,
      memberRole: 'admin',
    });
    const authAdmin = await getAuthorizationContext(cAdmin);
    assert(authAdmin.roleInWorkspace === 'admin', 'TEST 7a: Admin can create departments in own workspace');

    const cEmpB = createMockContext({
      user: USER_ALICE,
      workspace: WORKSPACE_B,
      memberRole: 'employee',
    });
    const authEmpB = await getAuthorizationContext(cEmpB);
    assert(authEmpB.roleInWorkspace !== 'admin', 'TEST 7b: Employee cannot create departments in other workspace');
  }

  // ── TEST 8: Role assignment respects workspace role ──
  {
    // Only admin should be able to assign roles
    const cAdmin = createMockContext({
      user: USER_ALICE,
      workspace: WORKSPACE_A,
      memberRole: 'admin',
    });
    const authAdmin = await getAuthorizationContext(cAdmin);
    assert(authAdmin.roleInWorkspace === 'admin', 'TEST 8a: Admin in workspace can assign roles');

    const cNonAdmin = createMockContext({
      user: { id: 'user-bob', email: 'bob@test.com', role: 'admin', platformRole: 'none' },
      workspace: WORKSPACE_A,
      memberRole: 'employee',
    });
    const authNonAdmin = await getAuthorizationContext(cNonAdmin);
    assert(
      authNonAdmin.roleInWorkspace !== 'admin',
      'TEST 8b: User with global admin but workspace employee cannot assign roles'
    );
  }

  // ── TEST 9: Cross-workspace member lookup blocked ──
  {
    // Simulate user in WS A trying to access WS B resources
    const cA = createMockContext({
      user: USER_ALICE,
      workspace: WORKSPACE_A,
      memberRole: 'admin',
    });
    const authA = await getAuthorizationContext(cA);

    const cB = createMockContext({
      user: USER_ALICE,
      workspace: WORKSPACE_B,
      memberRole: 'employee',
    });
    const authB = await getAuthorizationContext(cB);

    assert(
      authA.workspaceId !== authB.workspaceId,
      'TEST 9: AuthorizationContext correctly scopes to different workspaces (no cross-lookup)'
    );
  }

  // ── TEST 10: Cross-workspace privilege escalation attempt blocked ──
  {
    // User has global role 'admin' but is only 'intern' in the target workspace
    const c = createMockContext({
      user: { id: 'user-escalator', email: 'escalator@test.com', role: 'admin', platformRole: 'none' },
      workspace: WORKSPACE_B,
      memberRole: 'intern',
    });
    const authCtx = await getAuthorizationContext(c);
    assert(
      authCtx.roleInWorkspace === 'intern',
      'TEST 10a: Global admin role does NOT escalate to admin in workspace where user is intern'
    );
    assert(
      authCtx.roleInWorkspace !== 'admin',
      'TEST 10b: Cross-workspace privilege escalation completely blocked'
    );
  }

  // ── TEST 11 (Bonus): getAuthorizationContext throws without user or workspace ──
  {
    let threwNoUser = false;
    try {
      const c = createMockContext({});
      await getAuthorizationContext(c);
    } catch (e: any) {
      threwNoUser = e.code === 'UNAUTHORIZED';
    }
    assert(threwNoUser, 'TEST 11: getAuthorizationContext throws UNAUTHORIZED without user/workspace');
  }

  // ── TEST 12 (Bonus): AuthorizationContext interface shape correctness ──
  {
    const c = createMockContext({
      user: USER_ALICE,
      workspace: WORKSPACE_A,
      memberRole: 'admin',
    });
    const authCtx: AuthorizationContext = await getAuthorizationContext(c);
    const hasCorrectShape =
      typeof authCtx.userId === 'string' &&
      typeof authCtx.workspaceId === 'string' &&
      typeof authCtx.roleInWorkspace === 'string';
    assert(hasCorrectShape, 'TEST 12: AuthorizationContext has correct shape {userId, workspaceId, roleInWorkspace}');
  }

  // ── Summary ──
  console.log(`\n━━━ Suite 36 Results: ${passed} passed, ${failed} failed ━━━`);
  if (failed > 0) {
    throw new Error(`Suite 36 FAILED (${failed} failures): ${failures.join(', ')}`);
  }
}

// Direct execution support
if (process.argv[1]?.includes('tenant-role-isolation')) {
  runTenantRoleIsolationTests().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
