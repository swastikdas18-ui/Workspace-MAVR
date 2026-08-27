import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../src/services/auth-service';
import { WorkspaceService } from '../src/services/workspace-service';
import { WorkspaceRepository } from '../src/repositories/workspace-repository';
import { inMemoryDb } from '../packages/database/connection';

export async function runPhase29Audit() {
  console.log('=================================================================');
  console.log('--- PHASE 29: BILLING PLAN DEFAULT AUDIT VERIFICATION ---');
  console.log('=================================================================');

  // Test 1: User Registration creates a workspace defaulting to FREE plan
  const testEmail = `founder-${Date.now()}@newstartup.io`;
  const regResult = await AuthService.registerAdmin({
    name: 'Jane Doe',
    email: testEmail,
    password: 'SecurePassword123!',
    workspaceName: 'Acme Clean Tech',
  });

  assert.ok(regResult.workspace, 'Workspace must be created during registration');
  assert.equal(
    regResult.workspace.plan,
    'free',
    `Expected new registration workspace plan to be "free", got "${regResult.workspace.plan}"`
  );
  console.log('  ✅ PASS: New user registration creates workspace with plan="free"');

  // Test 2: Database / In-Memory record verification
  const dbWs = inMemoryDb.workspaces.get(regResult.workspace.id);
  assert.ok(dbWs, 'Workspace must exist in persistence store');
  assert.equal(
    dbWs.plan,
    'free',
    `Expected database row to have plan="free", got "${dbWs.plan}"`
  );
  console.log('  ✅ PASS: Persistence store record has plan="free"');

  // Test 3: Session returns plan="free"
  const sessionResult = await AuthService.getSession(regResult.token);
  assert.ok(sessionResult?.workspace, 'Session must resolve active workspace');
  assert.equal(
    sessionResult.workspace.plan,
    'free',
    `Expected session workspace plan to be "free", got "${sessionResult.workspace.plan}"`
  );
  console.log('  ✅ PASS: Session token resolves workspace with plan="free"');

  // Test 4: WorkspaceService.createWorkspace without explicit plan defaults to FREE
  const newWs = await WorkspaceService.createWorkspace(regResult.user.id, {
    name: 'Secondary Testing Workspace',
  });
  assert.equal(
    newWs.plan,
    'free',
    `Expected WorkspaceService.createWorkspace to default to "free", got "${newWs.plan}"`
  );
  console.log('  ✅ PASS: WorkspaceService.createWorkspace defaults to "free"');

  // Test 5: WorkspaceService.createWorkspace with explicit plan respects chosen plan
  const enterpriseWs = await WorkspaceService.createWorkspace(regResult.user.id, {
    name: 'Enterprise Division',
    plan: 'enterprise',
  });
  assert.equal(
    enterpriseWs.plan,
    'enterprise',
    `Expected explicit plan="enterprise" to be honored, got "${enterpriseWs.plan}"`
  );
  console.log('  ✅ PASS: WorkspaceService.createWorkspace respects explicit plan choices');

  // Test 6: WorkspaceRepository.getWorkspaceById fallback defaults to FREE (never PRO)
  inMemoryDb.workspaces.set('ws-unspecified-plan', {
    id: 'ws-unspecified-plan',
    name: 'Unspecified Plan Co',
    slug: 'unspecified-plan',
    ownerId: regResult.user.id,
    plan: undefined as any,
    logo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const resolvedWs = await WorkspaceRepository.getWorkspaceById('ws-unspecified-plan');
  assert.ok(resolvedWs);
  assert.equal(
    resolvedWs.plan,
    'free',
    `Expected WorkspaceRepository fallback to be "free", got "${resolvedWs.plan}"`
  );
  console.log('  ✅ PASS: WorkspaceRepository fallback resolves missing plan as "free"');

  // Test 7: User workspaces query returns actual plan
  const userWorkspaces = await WorkspaceRepository.getUserWorkspaces(regResult.user.id);
  const primaryWsItem = userWorkspaces.find((w) => w.id === regResult.workspace!.id);
  assert.ok(primaryWsItem);
  assert.equal(
    primaryWsItem.plan,
    'free',
    `Expected userWorkspaces item plan to be "free", got "${primaryWsItem.plan}"`
  );
  console.log('  ✅ PASS: WorkspaceRepository.getUserWorkspaces returns actual "free" plan');

  console.log('=================================================================');
  console.log('✅ PHASE 29 VERIFICATION COMPLETE: ALL 7 AUDIT CHECKS PASSED');
  console.log('=================================================================');
}

runPhase29Audit().catch((err) => {
  console.error('❌ PHASE 29 AUDIT FAILED:', err);
  process.exit(1);
});
