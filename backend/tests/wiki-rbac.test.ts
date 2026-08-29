import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { attachSessionToken } from './session-test-utils';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

export async function runWikiRbacTests() {
  console.log('\n===============================================================');
  console.log(' RUNNING WIKI RBAC & MULTI-TENANT ISOLATION TESTS');
  console.log('===============================================================\n');

  inMemoryDb.reset();

  // 1. Setup Admin in Workspace A
  const regAdminReq = new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Admin',
      email: 'alice@alpha.io',
      password: 'Password123!',
      workspaceName: 'Alpha Workspace'
    })
  });
  const regAdminRes = await app.fetch(regAdminReq);
  const adminData = attachSessionToken(regAdminRes, await regAdminRes.json());
  const adminToken = adminData.token;
  const wsAlphaId = adminData.workspace.id;

  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  // 2. Setup Employee in Workspace A
  const inviteEmpReq = new Request('http://localhost:3000/api/invites', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      email: 'bob@alpha.io',
      role: 'employee'
    })
  });
  const inviteEmpRes = await app.fetch(inviteEmpReq);
  const inviteEmpData = await inviteEmpRes.json();
  const empTokenStr = inviteEmpData.invite?.token;

  const acceptEmpReq = new Request('http://localhost:3000/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: empTokenStr,
      name: 'Bob Employee',
      password: 'Password123!'
    })
  });
  const acceptEmpRes = await app.fetch(acceptEmpReq);
  const acceptEmpData = await acceptEmpRes.json();

  const loginEmpReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bob@alpha.io', password: 'Password123!' })
  });
  const loginEmpRes = await app.fetch(loginEmpReq);
  const empLoginData = attachSessionToken(loginEmpRes, await loginEmpRes.json());
  const empToken = empLoginData.token;
  const empHeaders = {
    'Authorization': `Bearer ${empToken}`,
    'Content-Type': 'application/json'
  };

  // 3. Setup Intern in Workspace A
  const inviteInternReq = new Request('http://localhost:3000/api/invites', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      email: 'ivan@alpha.io',
      role: 'intern'
    })
  });
  const inviteInternRes = await app.fetch(inviteInternReq);
  const inviteInternData = await inviteInternRes.json();
  const internTokenStr = inviteInternData.invite?.token;

  const acceptInternReq = new Request('http://localhost:3000/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: internTokenStr,
      name: 'Ivan Intern',
      password: 'Password123!'
    })
  });
  await app.fetch(acceptInternReq);

  const loginInternReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ivan@alpha.io', password: 'Password123!' })
  });
  const loginInternRes = await app.fetch(loginInternReq);
  const internLoginData = attachSessionToken(loginInternRes, await loginInternRes.json());
  const internToken = internLoginData.token;
  const internHeaders = {
    'Authorization': `Bearer ${internToken}`,
    'Content-Type': 'application/json'
  };

  // 4. Setup Foreign Workspace B
  const regBetaReq = new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Beta Admin',
      email: 'admin@beta.io',
      password: 'Password123!',
      workspaceName: 'Beta Workspace'
    })
  });
  const regBetaRes = await app.fetch(regBetaReq);
  const betaData = attachSessionToken(regBetaRes, await regBetaRes.json());
  const betaHeaders = {
    'Authorization': `Bearer ${betaData.token}`,
    'Content-Type': 'application/json'
  };

  console.log('--- 1. Admin Create Page ---');
  const createAdminPageReq = new Request('http://localhost:3000/api/wiki', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      title: 'Company Core SOP',
      icon: '📘',
      visibility: 'team',
      contentJson: { blocks: [{ type: 'paragraph', text: 'Confidential executive ops.' }] }
    })
  });
  const createAdminPageRes = await app.fetch(createAdminPageReq);
  assert(createAdminPageRes.status === 201, 'Admin can create wiki page (201 Created)');
  const adminPage = (await createAdminPageRes.json()).page;

  console.log('--- 2. Employee Read Page ---');
  const readEmpPageReq = new Request(`http://localhost:3000/api/wiki/${adminPage.id}`, {
    method: 'GET',
    headers: empHeaders
  });
  const readEmpPageRes = await app.fetch(readEmpPageReq);
  assert(readEmpPageRes.status === 200, 'Employee can read team wiki page (200 OK)');

  console.log('--- 3. Employee Delete Admin Page -> 403 ---');
  const empDeleteReq = new Request(`http://localhost:3000/api/wiki/${adminPage.id}`, {
    method: 'DELETE',
    headers: empHeaders
  });
  const empDeleteRes = await app.fetch(empDeleteReq);
  assert(empDeleteRes.status === 403, 'Employee cannot delete Admin wiki page (403 Forbidden)');

  console.log('--- 4. Intern Delete Page -> 403 ---');
  const internDeleteReq = new Request(`http://localhost:3000/api/wiki/${adminPage.id}`, {
    method: 'DELETE',
    headers: internHeaders
  });
  const internDeleteRes = await app.fetch(internDeleteReq);
  assert(internDeleteRes.status === 403, 'Intern cannot delete wiki page (403 Forbidden)');

  console.log('--- 5. Intern Create Page -> 403 ---');
  const internCreateReq = new Request('http://localhost:3000/api/wiki', {
    method: 'POST',
    headers: internHeaders,
    body: JSON.stringify({
      title: 'Intern Notes',
      icon: '📝',
      contentJson: { blocks: [] }
    })
  });
  const internCreateRes = await app.fetch(internCreateReq);
  assert(internCreateRes.status === 403, 'Intern cannot author team wiki page (403 Forbidden)');

  console.log('--- 6. Cross-Workspace Isolation Check ---');
  const crossReadReq = new Request(`http://localhost:3000/api/wiki/${adminPage.id}`, {
    method: 'GET',
    headers: betaHeaders
  });
  const crossReadRes = await app.fetch(crossReadReq);
  assert(crossReadRes.status === 404, 'Foreign tenant cannot access Workspace A wiki page (404 Not Found / Isolated)');

  console.log('--- 7. Admin Delete Page ---');
  const adminDeleteReq = new Request(`http://localhost:3000/api/wiki/${adminPage.id}`, {
    method: 'DELETE',
    headers: adminHeaders
  });
  const adminDeleteRes = await app.fetch(adminDeleteReq);
  assert(adminDeleteRes.status === 200, 'Admin can delete any wiki page in workspace (200 OK)');

  console.log('\n===============================================================');
  console.log(' WIKI RBAC & MULTI-TENANT ISOLATION TESTS: ALL CHECKS PASSED');
  console.log('===============================================================\n');
}

if (process.argv[1]?.endsWith('wiki-rbac.test.ts')) {
  runWikiRbacTests().catch((err) => {
    console.error('Wiki RBAC test run failed:', err);
    process.exit(1);
  });
}
