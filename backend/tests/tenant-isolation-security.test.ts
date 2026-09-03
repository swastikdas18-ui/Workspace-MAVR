/**
 * Suite 38: Tenant Isolation Security Regression Tests
 * Target Modules: Projects, Tasks, Teams, CRM, Documents, Chat
 *
 * Requirements:
 * For each module, verify:
 *  1. Workspace A cannot read Workspace B records (403, 404, or empty list)
 *  2. Workspace A cannot update Workspace B records (403 or 404)
 *  3. Workspace A cannot delete Workspace B records (403 or 404)
 *  4. Workspace A cannot search Workspace B records (0 results, never foreign data)
 *  5. Workspace A cannot export Workspace B records (only own workspace data exported)
 *
 * CRITICAL INVARIANT:
 * NEVER return 200 with foreign tenant data.
 */

process.env.NODE_ENV = 'test';

import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { attachSessionToken } from './session-test-utils';
import { ProjectRepository } from '../src/repositories/project-repository';
import { TaskRepository } from '../src/repositories/task-repository';
import { TeamRepository } from '../src/repositories/team-repository';
import { CRMRepository } from '../src/repositories/crm-repository';
import { DocumentRepository } from '../src/repositories/document-repository';
import { ChatRepository } from '../src/repositories/chat-repository';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

export async function runTenantIsolationSecurityTests() {
  console.log('\n===============================================================');
  console.log(' RUNNING SUITE 38: CROSS-TENANT ISOLATION SECURITY REGRESSION');
  console.log(' Target Modules: Projects, Tasks, Teams, CRM, Documents, Chat');
  console.log('===============================================================\n');

  // ==========================================
  // 1. SETUP: Tenant A & Tenant B
  // ==========================================
  console.log('--- 1. Setting up Tenant A & Tenant B Workspaces & Admin Sessions ---');

  // Register Admin A in Workspace Alpha
  const regAlphaRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice AlphaAdmin',
        email: `alice.alpha.${Date.now()}@corp-alpha.io`,
        password: 'Password123!',
        workspaceName: 'Alpha Corporation',
      }),
    })
  );
  const alphaData = attachSessionToken(regAlphaRes, await regAlphaRes.json());
  const wsAlphaId = alphaData.workspace.id;
  const userAlphaId = alphaData.user.id;
  const alphaHeaders = {
    Authorization: `Bearer ${alphaData.token}`,
    'Content-Type': 'application/json',
  };

  // Register Admin B in Workspace Beta
  const regBetaRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob BetaAdmin',
        email: `bob.beta.${Date.now()}@corp-beta.io`,
        password: 'Password123!',
        workspaceName: 'Beta Enterprises',
      }),
    })
  );
  const betaData = attachSessionToken(regBetaRes, await regBetaRes.json());
  const wsBetaId = betaData.workspace.id;
  const userBetaId = betaData.user.id;
  const betaHeaders = {
    Authorization: `Bearer ${betaData.token}`,
    'Content-Type': 'application/json',
  };

  assert(wsAlphaId !== wsBetaId, 'Workspace Alpha and Beta have distinct IDs');

  // Seed Proprietary Records in Workspace Beta (Victim Tenant)
  console.log('--- Seeding proprietary business records in Workspace Beta ---');

  // Beta Project
  const betaProject = await ProjectRepository.createProject({
    workspaceId: wsBetaId,
    title: 'Secret Beta Project M&A',
    description: 'Highly confidential project for Beta acquisitions',
    createdBy: userBetaId,
    dueDate: new Date(Date.now() + 30 * 86400000),
  });

  // Beta Task
  const betaTask = await TaskRepository.createTask(wsBetaId, userBetaId, {
    title: 'Audit Beta Financial Statements',
    description: 'Internal private audit task for Beta ledger',
    projectId: betaProject.id,
    assignedTo: userBetaId,
    dueDate: new Date(Date.now() + 7 * 86400000),
  });

  // Beta Team
  const betaTeam = await TeamRepository.createTeam({
    workspaceId: wsBetaId,
    name: 'Beta Executive Board',
    description: 'Board members team',
    leadId: userBetaId,
    memberIds: [userBetaId],
  });

  // Beta CRM Lead
  const betaLead = await CRMRepository.createRecord({
    workspaceId: wsBetaId,
    customerName: 'MegaCorp Investor Beta',
    company: 'MegaCorp Capital',
    email: 'investor@megacorp.com',
    phone: '+1-555-BETA',
    dealValue: 5000000,
    status: 'proposal',
    ownerId: userBetaId,
    notes: 'Confidential valuation discussion',
  });

  // Beta Document
  const betaDoc = await DocumentRepository.createDocument({
    id: `doc-beta-${Date.now()}`,
    workspaceId: wsBetaId,
    title: 'Beta Proprietary Roadmap 2026',
    description: 'Classified roadmap document',
    fileUrl: `/api/documents/vault/${wsBetaId}/roadmap.pdf`,
    fileType: 'pdf',
    mimeType: 'application/pdf',
    fileSize: '2.5 MB',
    fileSizeBytes: 2621440,
    category: 'Legal',
    visibility: 'workspace',
    uploadedBy: userBetaId,
  });

  // Beta Chat Conversation & Message
  const betaConv = await ChatRepository.createConversation({
    workspaceId: wsBetaId,
    type: 'project',
    title: 'Beta Confidential Strategy Chat',
    createdById: userBetaId,
    projectId: betaProject.id,
  });
  await ChatRepository.addConversationMember({
    conversationId: betaConv.id,
    workspaceId: wsBetaId,
    userId: userBetaId,
    role: 'admin',
  });
  const betaMsg = await ChatRepository.createMessage({
    conversationId: betaConv.id,
    workspaceId: wsBetaId,
    senderId: userBetaId,
    content: 'TOP SECRET: Acquisition offer is $50M.',
  });

  // =========================================================================
  // MODULE 1: PROJECTS TENANT ISOLATION
  // =========================================================================
  console.log('\n--- [MODULE 1] PROJECTS ISOLATION TESTS ---');

  // Test 1.1: Alpha cannot read Beta project (GET /api/projects/:id)
  console.log('1.1: Alpha reading Beta project...');
  const readBetaProjectRes = await app.fetch(
    new Request(`http://localhost:3000/api/projects/${betaProject.id}`, {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(
    readBetaProjectRes.status === 403 || readBetaProjectRes.status === 404,
    `Reading foreign project returns 403 or 404 (received ${readBetaProjectRes.status})`
  );
  if (readBetaProjectRes.status === 200) {
    const data = await readBetaProjectRes.json();
    assert(!data.project || data.project.workspace_id !== wsBetaId, 'Must NEVER return foreign project data');
  }

  // Test 1.2: Alpha cannot update Beta project (PATCH /api/projects/:id)
  console.log('1.2: Alpha updating Beta project...');
  const updateBetaProjectRes = await app.fetch(
    new Request(`http://localhost:3000/api/projects/${betaProject.id}`, {
      method: 'PATCH',
      headers: alphaHeaders,
      body: JSON.stringify({ title: 'Hacked by Alpha Corp' }),
    })
  );
  assert(
    updateBetaProjectRes.status === 403 || updateBetaProjectRes.status === 404,
    `Updating foreign project returns 403 or 404 (received ${updateBetaProjectRes.status})`
  );
  const verifyBetaProject = await ProjectRepository.getProjectById(wsBetaId, betaProject.id);
  assert(verifyBetaProject?.title === 'Secret Beta Project M&A', 'Beta project title untouched');

  // Test 1.3: Alpha cannot delete Beta project (DELETE /api/projects/:id)
  console.log('1.3: Alpha deleting Beta project...');
  const deleteBetaProjectRes = await app.fetch(
    new Request(`http://localhost:3000/api/projects/${betaProject.id}`, {
      method: 'DELETE',
      headers: alphaHeaders,
    })
  );
  assert(
    deleteBetaProjectRes.status === 403 || deleteBetaProjectRes.status === 404,
    `Deleting foreign project returns 403 or 404 (received ${deleteBetaProjectRes.status})`
  );
  const verifyBetaProjectAlive = await ProjectRepository.getProjectById(wsBetaId, betaProject.id);
  assert(verifyBetaProjectAlive !== null, 'Beta project remains intact');

  // Test 1.4: Alpha cannot search Beta project (GET /api/search/projects?q=Secret+Beta)
  console.log('1.4: Alpha searching for Beta project...');
  const searchBetaProjectRes = await app.fetch(
    new Request('http://localhost:3000/api/search/projects?q=Secret+Beta', {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(searchBetaProjectRes.status === 200, 'Search endpoint returns 200');
  const searchProjectData = await searchBetaProjectRes.json();
  const foundForeignProject = (searchProjectData.projects || searchProjectData.results || []).some(
    (p: any) => p.id === betaProject.id || p.workspace_id === wsBetaId || p.title?.includes('Beta')
  );
  assert(!foundForeignProject, 'Search results must NEVER contain foreign tenant projects');

  // Test 1.5: Alpha export does not leak Beta projects (GET /api/export/projects)
  console.log('1.5: Alpha exporting projects...');
  const exportProjectsRes = await app.fetch(
    new Request('http://localhost:3000/api/export/projects', {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(exportProjectsRes.status === 200, 'Export projects returns 200');
  const exportProjectsText = await exportProjectsRes.text();
  assert(!exportProjectsText.includes(betaProject.id), 'Exported CSV must not contain Beta project ID');
  assert(!exportProjectsText.includes('Secret Beta Project M&A'), 'Exported CSV must not contain Beta project title');

  // =========================================================================
  // MODULE 2: TASKS TENANT ISOLATION
  // =========================================================================
  console.log('\n--- [MODULE 2] TASKS ISOLATION TESTS ---');

  // Test 2.1: Alpha cannot read Beta task (GET /api/tasks/:id)
  console.log('2.1: Alpha reading Beta task...');
  const readBetaTaskRes = await app.fetch(
    new Request(`http://localhost:3000/api/tasks/${betaTask.id}`, {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(
    readBetaTaskRes.status === 403 || readBetaTaskRes.status === 404,
    `Reading foreign task returns 403 or 404 (received ${readBetaTaskRes.status})`
  );

  // Test 2.2: Alpha cannot update Beta task (PATCH /api/tasks/:id)
  console.log('2.2: Alpha updating Beta task...');
  const updateBetaTaskRes = await app.fetch(
    new Request(`http://localhost:3000/api/tasks/${betaTask.id}`, {
      method: 'PATCH',
      headers: alphaHeaders,
      body: JSON.stringify({ title: 'Task Tampered by Alpha' }),
    })
  );
  assert(
    updateBetaTaskRes.status === 403 || updateBetaTaskRes.status === 404,
    `Updating foreign task returns 403 or 404 (received ${updateBetaTaskRes.status})`
  );
  const verifyBetaTask = await TaskRepository.getTaskById(wsBetaId, betaTask.id);
  assert(verifyBetaTask?.title === 'Audit Beta Financial Statements', 'Beta task title untouched');

  // Test 2.3: Alpha cannot delete Beta task (DELETE /api/tasks/:id)
  console.log('2.3: Alpha deleting Beta task...');
  const deleteBetaTaskRes = await app.fetch(
    new Request(`http://localhost:3000/api/tasks/${betaTask.id}`, {
      method: 'DELETE',
      headers: alphaHeaders,
    })
  );
  assert(
    deleteBetaTaskRes.status === 403 || deleteBetaTaskRes.status === 404,
    `Deleting foreign task returns 403 or 404 (received ${deleteBetaTaskRes.status})`
  );
  const verifyBetaTaskAlive = await TaskRepository.getTaskById(wsBetaId, betaTask.id);
  assert(verifyBetaTaskAlive !== null, 'Beta task remains intact');

  // Test 2.4: Alpha cannot search Beta task (GET /api/search/tasks?q=Financial+Statements)
  console.log('2.4: Alpha searching for Beta task...');
  const searchBetaTaskRes = await app.fetch(
    new Request('http://localhost:3000/api/search/tasks?q=Financial+Statements', {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(searchBetaTaskRes.status === 200, 'Search tasks returns 200');
  const searchTaskData = await searchBetaTaskRes.json();
  const foundForeignTask = (searchTaskData.tasks || searchTaskData.results || []).some(
    (t: any) => t.id === betaTask.id || t.workspace_id === wsBetaId || t.title?.includes('Financial Statements')
  );
  assert(!foundForeignTask, 'Search results must NEVER contain foreign tenant tasks');

  // Test 2.5: Alpha export does not leak Beta tasks (GET /api/export/tasks)
  console.log('2.5: Alpha exporting tasks...');
  const exportTasksRes = await app.fetch(
    new Request('http://localhost:3000/api/export/tasks', {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(exportTasksRes.status === 200, 'Export tasks returns 200');
  const exportTasksText = await exportTasksRes.text();
  assert(!exportTasksText.includes(betaTask.id), 'Exported tasks CSV must not contain Beta task ID');
  assert(!exportTasksText.includes('Audit Beta Financial Statements'), 'Exported tasks CSV must not contain Beta task title');

  // =========================================================================
  // MODULE 3: TEAMS TENANT ISOLATION
  // =========================================================================
  console.log('\n--- [MODULE 3] TEAMS ISOLATION TESTS ---');

  // Test 3.1: Alpha cannot read Beta team (GET /api/teams/:id)
  console.log('3.1: Alpha reading Beta team...');
  const readBetaTeamRes = await app.fetch(
    new Request(`http://localhost:3000/api/teams/${betaTeam.id}`, {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(
    readBetaTeamRes.status === 403 || readBetaTeamRes.status === 404,
    `Reading foreign team returns 403 or 404 (received ${readBetaTeamRes.status})`
  );

  // Test 3.2: Alpha cannot update Beta team (PATCH /api/teams/:id)
  console.log('3.2: Alpha updating Beta team...');
  const updateBetaTeamRes = await app.fetch(
    new Request(`http://localhost:3000/api/teams/${betaTeam.id}`, {
      method: 'PATCH',
      headers: alphaHeaders,
      body: JSON.stringify({ name: 'Alpha Infiltrated Team' }),
    })
  );
  assert(
    updateBetaTeamRes.status === 403 || updateBetaTeamRes.status === 404,
    `Updating foreign team returns 403 or 404 (received ${updateBetaTeamRes.status})`
  );
  const verifyBetaTeam = await TeamRepository.getTeamById(wsBetaId, betaTeam.id);
  assert(verifyBetaTeam?.name === 'Beta Executive Board', 'Beta team name untouched');

  // Test 3.3: Alpha cannot delete Beta team (DELETE /api/teams/:id)
  console.log('3.3: Alpha deleting Beta team...');
  const deleteBetaTeamRes = await app.fetch(
    new Request(`http://localhost:3000/api/teams/${betaTeam.id}`, {
      method: 'DELETE',
      headers: alphaHeaders,
    })
  );
  assert(
    deleteBetaTeamRes.status === 403 || deleteBetaTeamRes.status === 404,
    `Deleting foreign team returns 403 or 404 (received ${deleteBetaTeamRes.status})`
  );
  const verifyBetaTeamAlive = await TeamRepository.getTeamById(wsBetaId, betaTeam.id);
  assert(verifyBetaTeamAlive !== null, 'Beta team remains intact');

  // Test 3.4: Alpha cannot search Beta team (GET /api/search/teams?q=Executive+Board)
  console.log('3.4: Alpha searching for Beta team...');
  const searchBetaTeamRes = await app.fetch(
    new Request('http://localhost:3000/api/search/teams?q=Executive+Board', {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(searchBetaTeamRes.status === 200, 'Search teams returns 200');
  const searchTeamData = await searchBetaTeamRes.json();
  const foundForeignTeam = (searchTeamData.teams || searchTeamData.results || []).some(
    (t: any) => t.id === betaTeam.id || t.workspace_id === wsBetaId || t.name?.includes('Executive Board')
  );
  assert(!foundForeignTeam, 'Search results must NEVER contain foreign tenant teams');

  // Test 3.5: Alpha cannot remove/delete member from Beta team (DELETE /api/teams/:id/members/:userId)
  console.log('3.5: Alpha removing member from Beta team...');
  const removeBetaTeamMemberRes = await app.fetch(
    new Request(`http://localhost:3000/api/teams/${betaTeam.id}/members/${userBetaId}`, {
      method: 'DELETE',
      headers: alphaHeaders,
    })
  );
  assert(
    removeBetaTeamMemberRes.status === 403 || removeBetaTeamMemberRes.status === 404,
    `Removing member from foreign team returns 403 or 404 (received ${removeBetaTeamMemberRes.status})`
  );
  const verifyBetaTeamMembers = await TeamRepository.getTeamMembers(betaTeam.id);
  const stillMember = verifyBetaTeamMembers.some((m) => m.userId === userBetaId);
  assert(stillMember, 'Beta team membership remains intact');

  // =========================================================================
  // MODULE 4: CRM TENANT ISOLATION
  // =========================================================================
  console.log('\n--- [MODULE 4] CRM ISOLATION TESTS ---');

  // Test 4.1: Alpha cannot read Beta CRM lead (GET /api/crm/:id)
  console.log('4.1: Alpha reading Beta CRM lead...');
  const readBetaLeadRes = await app.fetch(
    new Request(`http://localhost:3000/api/crm/${betaLead.id}`, {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(
    readBetaLeadRes.status === 403 || readBetaLeadRes.status === 404,
    `Reading foreign CRM lead returns 403 or 404 (received ${readBetaLeadRes.status})`
  );

  // Test 4.2: Alpha cannot update Beta CRM lead (PATCH /api/crm/:id)
  console.log('4.2: Alpha updating Beta CRM lead...');
  const updateBetaLeadRes = await app.fetch(
    new Request(`http://localhost:3000/api/crm/${betaLead.id}`, {
      method: 'PATCH',
      headers: alphaHeaders,
      body: JSON.stringify({ deal_value: 0, customer_name: 'Stolen Lead' }),
    })
  );
  assert(
    updateBetaLeadRes.status === 403 || updateBetaLeadRes.status === 404,
    `Updating foreign CRM lead returns 403 or 404 (received ${updateBetaLeadRes.status})`
  );
  const verifyBetaLead = await CRMRepository.getRecordById(wsBetaId, betaLead.id);
  assert(verifyBetaLead?.customerName === 'MegaCorp Investor Beta', 'Beta CRM lead customer untouched');
  assert(verifyBetaLead?.dealValue === 5000000, 'Beta CRM deal value untouched');

  // Test 4.3: Alpha cannot delete Beta CRM lead (DELETE /api/crm/:id)
  console.log('4.3: Alpha deleting Beta CRM lead...');
  const deleteBetaLeadRes = await app.fetch(
    new Request(`http://localhost:3000/api/crm/${betaLead.id}`, {
      method: 'DELETE',
      headers: alphaHeaders,
    })
  );
  assert(
    deleteBetaLeadRes.status === 403 || deleteBetaLeadRes.status === 404,
    `Deleting foreign CRM lead returns 403 or 404 (received ${deleteBetaLeadRes.status})`
  );
  const verifyBetaLeadAlive = await CRMRepository.getRecordById(wsBetaId, betaLead.id);
  assert(verifyBetaLeadAlive !== null, 'Beta CRM record remains intact');

  // Test 4.4: Alpha cannot search Beta CRM leads (GET /api/search/crm?q=MegaCorp)
  console.log('4.4: Alpha searching for Beta CRM lead...');
  const searchBetaCrmRes = await app.fetch(
    new Request('http://localhost:3000/api/search/crm?q=MegaCorp', {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(searchBetaCrmRes.status === 200, 'Search CRM returns 200');
  const searchCrmData = await searchBetaCrmRes.json();
  const foundForeignLead = (searchCrmData.crm || searchCrmData.leads || searchCrmData.results || []).some(
    (l: any) => l.id === betaLead.id || l.workspace_id === wsBetaId || l.customer_name?.includes('MegaCorp')
  );
  assert(!foundForeignLead, 'Search results must NEVER contain foreign tenant CRM records');

  // Test 4.5: Alpha export does not leak Beta CRM records (GET /api/export/crm)
  console.log('4.5: Alpha exporting CRM leads...');
  const exportCrmRes = await app.fetch(
    new Request('http://localhost:3000/api/export/crm', {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(exportCrmRes.status === 200, 'Export CRM returns 200');
  const exportCrmText = await exportCrmRes.text();
  assert(!exportCrmText.includes(betaLead.id), 'Exported CRM CSV must not contain Beta lead ID');
  assert(!exportCrmText.includes('MegaCorp Investor Beta'), 'Exported CRM CSV must not contain Beta customer name');

  // =========================================================================
  // MODULE 5: DOCUMENTS TENANT ISOLATION
  // =========================================================================
  console.log('\n--- [MODULE 5] DOCUMENTS ISOLATION TESTS ---');

  // Test 5.1: Alpha cannot read Beta document metadata (GET /api/documents/:id)
  console.log('5.1: Alpha reading Beta document metadata...');
  const readBetaDocRes = await app.fetch(
    new Request(`http://localhost:3000/api/documents/${betaDoc.id}`, {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(
    readBetaDocRes.status === 403 || readBetaDocRes.status === 404,
    `Reading foreign document metadata returns 403 or 404 (received ${readBetaDocRes.status})`
  );

  // Test 5.2: Alpha cannot access or stream Beta document bytes (GET /api/documents/vault/:key)
  console.log('5.2: Alpha streaming foreign vault file...');
  const streamBetaVaultRes = await app.fetch(
    new Request(`http://localhost:3000/api/documents/vault/${wsBetaId}/roadmap.pdf`, {
      method: 'GET',
      headers: alphaHeaders, // Authenticated in Alpha
    })
  );
  assert(
    streamBetaVaultRes.status === 403 || streamBetaVaultRes.status === 404,
    `Streaming foreign document vault file returns 403 or 404 (received ${streamBetaVaultRes.status})`
  );

  // Test 5.3: Alpha cannot delete Beta document (DELETE /api/documents/:id)
  console.log('5.3: Alpha deleting Beta document...');
  const deleteBetaDocRes = await app.fetch(
    new Request(`http://localhost:3000/api/documents/${betaDoc.id}`, {
      method: 'DELETE',
      headers: alphaHeaders,
    })
  );
  assert(
    deleteBetaDocRes.status === 403 || deleteBetaDocRes.status === 404,
    `Deleting foreign document returns 403 or 404 (received ${deleteBetaDocRes.status})`
  );
  const verifyBetaDocAlive = await DocumentRepository.getDocumentById(wsBetaId, betaDoc.id);
  assert(verifyBetaDocAlive !== null, 'Beta document record remains intact');

  // Test 5.4: Alpha cannot search Beta documents (GET /api/search/documents?q=Proprietary+Roadmap)
  console.log('5.4: Alpha searching for Beta documents...');
  const searchBetaDocRes = await app.fetch(
    new Request('http://localhost:3000/api/search/documents?q=Proprietary+Roadmap', {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(searchBetaDocRes.status === 200, 'Search documents returns 200');
  const searchDocData = await searchBetaDocRes.json();
  const foundForeignDoc = (searchDocData.documents || searchDocData.results || []).some(
    (d: any) => d.id === betaDoc.id || d.workspace_id === wsBetaId || d.title?.includes('Proprietary Roadmap')
  );
  assert(!foundForeignDoc, 'Search results must NEVER contain foreign tenant documents');

  // Test 5.5: Alpha export does not leak Beta documents (GET /api/export/documents)
  console.log('5.5: Alpha exporting documents metadata...');
  const exportDocsRes = await app.fetch(
    new Request('http://localhost:3000/api/export/documents', {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(exportDocsRes.status === 200, 'Export documents returns 200');
  const exportDocsText = await exportDocsRes.text();
  assert(!exportDocsText.includes(betaDoc.id), 'Exported documents CSV must not contain Beta doc ID');
  assert(!exportDocsText.includes('Beta Proprietary Roadmap 2026'), 'Exported documents CSV must not contain Beta doc title');

  // =========================================================================
  // MODULE 6: CHAT TENANT ISOLATION
  // =========================================================================
  console.log('\n--- [MODULE 6] CHAT ISOLATION TESTS ---');

  // Test 6.1: Alpha cannot read Beta chat conversation or messages (GET /api/chat/conversations/:id/messages)
  console.log('6.1: Alpha reading Beta chat conversation messages...');
  const readBetaChatRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${betaConv.id}/messages`, {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(
    readBetaChatRes.status === 403 || readBetaChatRes.status === 404,
    `Reading foreign chat messages returns 403 or 404 (received ${readBetaChatRes.status})`
  );

  // Test 6.2: Alpha cannot update/edit Beta chat message (PUT /api/chat/messages/:id)
  console.log('6.2: Alpha editing Beta chat message...');
  const editBetaMsgRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/messages/${betaMsg.id}`, {
      method: 'PUT',
      headers: alphaHeaders,
      body: JSON.stringify({ content: 'Tampered message by Alpha' }),
    })
  );
  assert(
    editBetaMsgRes.status === 403 || editBetaMsgRes.status === 404,
    `Editing foreign chat message returns 403 or 404 (received ${editBetaMsgRes.status})`
  );
  const verifyBetaMsg = await ChatRepository.getMessageById(betaMsg.id);
  assert(verifyBetaMsg?.content === 'TOP SECRET: Acquisition offer is $50M.', 'Beta chat message content untouched');

  // Test 6.3: Alpha cannot delete Beta chat message (DELETE /api/chat/messages/:id)
  console.log('6.3: Alpha deleting Beta chat message...');
  const deleteBetaMsgRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/messages/${betaMsg.id}`, {
      method: 'DELETE',
      headers: alphaHeaders,
    })
  );
  assert(
    deleteBetaMsgRes.status === 403 || deleteBetaMsgRes.status === 404,
    `Deleting foreign chat message returns 403 or 404 (received ${deleteBetaMsgRes.status})`
  );
  const verifyBetaMsgAlive = await ChatRepository.getMessageById(betaMsg.id);
  assert(verifyBetaMsgAlive !== null, 'Beta chat message remains in database');

  // Test 6.4: Alpha global search does not leak Beta chat messages or conversations
  console.log('6.4: Alpha searching globally for Beta confidential chat string...');
  const searchBetaGlobalRes = await app.fetch(
    new Request('http://localhost:3000/api/search?q=Acquisition+offer', {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(searchBetaGlobalRes.status === 200, 'Global search returns 200');
  const searchGlobalData = await searchBetaGlobalRes.json();
  const searchGlobalString = JSON.stringify(searchGlobalData);
  assert(!searchGlobalString.includes(betaMsg.id), 'Global search must not contain Beta message ID');
  assert(!searchGlobalString.includes('TOP SECRET: Acquisition offer'), 'Global search must not contain Beta message content');

  // Test 6.5: Alpha full workspace backup export does not contain Beta records (GET /api/export/workspace)
  console.log('6.5: Alpha exporting full workspace archive JSON...');
  const exportWorkspaceRes = await app.fetch(
    new Request('http://localhost:3000/api/export/workspace', {
      method: 'GET',
      headers: alphaHeaders,
    })
  );
  assert(exportWorkspaceRes.status === 200, 'Workspace export returns 200');
  const exportArchive = await exportWorkspaceRes.json();
  const exportArchiveStr = JSON.stringify(exportArchive);
  assert(!exportArchiveStr.includes(wsBetaId), 'Alpha export archive must NEVER contain Beta workspace ID');
  assert(!exportArchiveStr.includes(betaProject.id), 'Alpha export archive must NEVER contain Beta project ID');
  assert(!exportArchiveStr.includes(betaTask.id), 'Alpha export archive must NEVER contain Beta task ID');
  assert(!exportArchiveStr.includes(betaLead.id), 'Alpha export archive must NEVER contain Beta CRM ID');
  assert(!exportArchiveStr.includes(betaDoc.id), 'Alpha export archive must NEVER contain Beta document ID');

  console.log('\n===============================================================');
  console.log(' ✅ ALL 30 TENANT ISOLATION SECURITY REGRESSION TESTS PASSED!');
  console.log(' Zero foreign tenant records leaked across Projects, Tasks, Teams, CRM, Documents, and Chat.');
  console.log('===============================================================\n');
}

// Direct execution support
runTenantIsolationSecurityTests().catch((err) => {
  console.error('❌ Suite 38 Tenant Isolation Test Error:', err);
  process.exit(1);
});

