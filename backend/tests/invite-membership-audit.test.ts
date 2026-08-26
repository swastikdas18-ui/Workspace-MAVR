import { inMemoryDb, getDb, schema } from '../packages/database';
import { InviteService } from '../src/services/invite-service';
import { WorkspaceService } from '../src/services/workspace-service';
import { TeamService } from '../src/services/team-service';
import { AuthService } from '../src/services/auth-service';
import { WorkspaceRepository } from '../src/repositories/workspace-repository';
import { TeamRepository } from '../src/repositories/team-repository';
import { eq, and } from 'drizzle-orm';
import { app } from '../src/app';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`  ✅ PASS: ${msg}`);
}

export async function runInviteMembershipAuditTests() {
  console.log('\n=================================================================');
  console.log('--- INVITE LIFECYCLE & MEMBERSHIP PERSISTENCE AUDIT TESTS ---');
  console.log('=================================================================');

  // Reset in-memory / test state
  inMemoryDb.workspaces.clear();
  inMemoryDb.users.clear();
  inMemoryDb.workspaceMembers.clear();
  inMemoryDb.teamMembers.clear();
  inMemoryDb.workspaceInvites.clear();
  inMemoryDb.sessions.clear();
  inMemoryDb.teams.clear();

  // Step 0: Setup Workspace, Admin User, and Department Team
  const adminRegister = await AuthService.registerAdmin({
    name: 'Sarah Connor (Admin)',
    email: 'sarah.admin@skynet-defense.org',
    password: 'SecureAdminPassword123!',
    workspaceName: 'Skynet Cybernetics',
  });

  const workspaceId = adminRegister.workspace.id;
  const adminUserId = adminRegister.user.id;
  const adminToken = adminRegister.token;

  assert(!!workspaceId, 'Workspace created and initialized with ID');
  assert(!!adminUserId, 'Admin user account created and initialized');

  // Create a Department Team: Engineering Team
  const engTeam = await TeamService.createTeam(workspaceId, adminUserId, 'admin', {
    name: 'Core Engineering',
    description: 'Autonomous distributed systems engineering unit',
    color: '#3B82F6',
  });

  const teamId = engTeam.id;
  assert(!!teamId, 'Department team created with ID');

  // Initial Member count check
  const initialMembers = await WorkspaceService.getWorkspaceMembers(adminUserId, workspaceId);
  assert(initialMembers.length === 1, `Initial workspace member count is exactly 1 (Count: ${initialMembers.length})`);
  assert(initialMembers[0].member.email === 'sarah.admin@skynet-defense.org', 'Initial member is Admin');

  const initialTeams = await TeamService.getTeams(workspaceId, adminUserId, 'admin');
  assert(initialTeams.length === 1, 'Initial teams list has 1 team');
  assert(initialTeams[0].members_count === 1, 'Initial team member count is 1 (Admin lead)');

  // =========================================================================
  // TRACE STEP 1: Invite Created
  // =========================================================================
  console.log('\n--- Trace Step 1: Invite Created ---');
  const inviteEmail = 'kyle.reese@resistance.mil';
  const createInviteRes = await InviteService.createInvite({
    workspaceId,
    email: inviteEmail,
    role: 'employee',
    invitedBy: adminUserId,
    teamId,
  });

  assert(!!createInviteRes.token, 'Invite generated with secure cryptographic token');
  assert(createInviteRes.email === inviteEmail, 'Invite record associates target email');
  assert(createInviteRes.team_id === teamId, 'Invite record associates target team ID');
  assert(createInviteRes.status === 'sent', 'Invite record status marked as sent');

  // Verify in-memory / DB storage
  const inviteInStore = inMemoryDb.workspaceInvites.get(createInviteRes.token);
  assert(!!inviteInStore, 'Invite token exists in persistence store');
  assert(inviteInStore?.email === inviteEmail, 'Stored invite matches target email');

  // =========================================================================
  // TRACE STEP 2: Invite Preview & Validation
  // =========================================================================
  console.log('\n--- Trace Step 2: Invite Preview & Validation ---');
  const previewRes = await InviteService.getInviteByToken(createInviteRes.token);
  assert(previewRes.invite.email === inviteEmail, 'Invite preview returns recipient email');
  assert(previewRes.workspace.id === workspaceId, 'Invite preview returns workspace details');
  assert(previewRes.workspace.name === 'Skynet Cybernetics', 'Invite preview includes workspace name');

  // =========================================================================
  // TRACE STEP 3: Invite Accepted & Accounts Provisioned
  // =========================================================================
  console.log('\n--- Trace Step 3: Invite Accepted & Accounts Provisioned ---');
  const acceptRes = await InviteService.acceptInvite({
    token: createInviteRes.token,
    name: 'Kyle Reese',
    password: 'FuturePassword2029!',
  });

  assert(!!acceptRes.user, 'Acceptance response contains newly created user object');
  assert(acceptRes.user.email === inviteEmail, 'User email matches invited email');
  assert(acceptRes.user.role === 'employee', 'User assigned employee role (never admin)');
  assert(!!acceptRes.token, 'Acceptance response issues active session token');
  assert(acceptRes.workspace.id === workspaceId, 'User authenticated to correct workspace');

  const newUserId = acceptRes.user.id;

  // =========================================================================
  // TRACE STEP 4: Database & In-Memory Writes Verification
  // =========================================================================
  console.log('\n--- Trace Step 4: Verification of Database & Persistence Writes ---');

  // 1. Verify User Record
  const createdUser = inMemoryDb.users.get(newUserId);
  assert(!!createdUser, 'User record written to users persistence store');
  assert(createdUser?.name === 'Kyle Reese', 'User record contains accurate name');
  assert(createdUser?.teamId === teamId, 'User record contains assigned teamId');

  // 2. Verify Workspace Member Record
  const wsMember = Array.from(inMemoryDb.workspaceMembers.values()).find(
    (m) => m.workspaceId === workspaceId && m.userId === newUserId
  );
  assert(!!wsMember, 'workspace_members record written for new user');
  assert(wsMember?.role === 'employee', 'workspace_members role is employee');
  assert(!!wsMember?.joinedAt, 'workspace_members joinedAt timestamp recorded');

  // 3. Verify Team Member Record
  const tmMember = Array.from(inMemoryDb.teamMembers.values()).find(
    (tm) => tm.teamId === teamId && tm.userId === newUserId
  );
  assert(!!tmMember, 'team_members record written for assigned team');
  assert(tmMember?.roleInTeam === 'member', 'team_members role is member');

  // 4. Verify Invite Marked Accepted
  const acceptedInvite = inMemoryDb.workspaceInvites.get(createInviteRes.token);
  assert(!!acceptedInvite?.acceptedAt, 'workspace_invites record marked with acceptedAt timestamp');
  assert((acceptedInvite as any)?.status === 'accepted', 'workspace_invites status updated to accepted');

  // 5. Verify Session Token
  const userSession = inMemoryDb.sessions.get(acceptRes.token);
  assert(!!userSession, 'Session record created for new user session');
  assert(userSession?.userId === newUserId, 'Session record linked to new user ID');

  // =========================================================================
  // TRACE STEP 5: Live Member & Team Query Calculation Verification
  // =========================================================================
  console.log('\n--- Trace Step 5: Live Member & Team Query Calculation ---');

  // 1. Workspace Repository & Service Live Member Query
  const updatedMembers = await WorkspaceService.getWorkspaceMembers(adminUserId, workspaceId);
  assert(
    updatedMembers.length === 2,
    `Workspace member count increased from 1 to 2 (Live count: ${updatedMembers.length})`
  );

  const foundNewMember = updatedMembers.find((m) => m.member.id === newUserId);
  assert(!!foundNewMember, 'New member present in WorkspaceService.getWorkspaceMembers roster');
  assert(foundNewMember?.member.name === 'Kyle Reese', 'New member roster item contains correct name');
  assert(foundNewMember?.member.teamId === teamId, 'New member roster item contains correct teamId');
  assert(foundNewMember?.role === 'employee', 'New member roster item has role employee');

  // 2. Team Repository & Service Live Team Query
  const updatedTeams = await TeamService.getTeams(workspaceId, adminUserId, 'admin');
  const targetTeam = updatedTeams.find((t) => t.id === teamId);
  assert(!!targetTeam, 'Department team returned in list');
  assert(
    targetTeam?.members_count === 2,
    `Team member count increased from 1 to 2 (Live count: ${targetTeam?.members_count})`
  );
  assert(
    targetTeam?.members.includes(newUserId),
    'Team memberIds array contains newly joined user ID'
  );

  // =========================================================================
  // TRACE STEP 6: Full HTTP API End-to-End Proof
  // =========================================================================
  console.log('\n--- Trace Step 6: Full HTTP API End-to-End Verification ---');

  // 1. Admin querying GET /api/workspace/members
  const membersHttpRes = await app.request('/api/workspace/members', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  assert(membersHttpRes.status === 200, 'GET /api/workspace/members returns 200 OK');
  const membersHttpJson = await membersHttpRes.json();
  assert(Array.isArray(membersHttpJson.members), 'GET /api/workspace/members response contains members array');
  assert(
    membersHttpJson.members.length === 2,
    `API response returns 2 members (Actual: ${membersHttpJson.members.length})`
  );
  const apiFoundMember = membersHttpJson.members.find((m: any) => m.member.id === newUserId);
  assert(!!apiFoundMember, 'API response includes newly joined member');
  assert(apiFoundMember.member.email === inviteEmail, 'API response member email matches');

  // 2. Admin querying GET /api/teams
  const teamsHttpRes = await app.request('/api/teams', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  assert(teamsHttpRes.status === 200, 'GET /api/teams returns 200 OK');
  const teamsHttpJson = await teamsHttpRes.json();
  assert(Array.isArray(teamsHttpJson.teams), 'GET /api/teams response contains teams array');
  const apiFoundTeam = teamsHttpJson.teams.find((t: any) => t.id === teamId);
  assert(
    apiFoundTeam.member_count === 2 || apiFoundTeam.members_count === 2,
    `API /api/teams reflects updated member count of 2`
  );

  // 3. New Member querying GET /api/auth/session
  const newMemberSessionRes = await app.request('/api/auth/session', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${acceptRes.token}`,
    },
  });

  assert(newMemberSessionRes.status === 200, 'GET /api/auth/session for new user returns 200 OK');
  const sessionJson = await newMemberSessionRes.json();
  assert(sessionJson.user.id === newUserId, 'Session user ID matches accepted invite user');
  assert(sessionJson.workspace.id === workspaceId, 'Session workspace ID matches invite workspace');

  console.log('\n=================================================================');
  console.log('✅ INVITE MEMBERSHIP AUDIT COMPLETE: ALL CHECKS PASSED WITH 100% SUCCESS');
  console.log('=================================================================\n');
}
