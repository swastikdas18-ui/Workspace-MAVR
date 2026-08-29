import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { attachSessionToken } from './session-test-utils';

async function testApiIntegration() {
  console.log('--- Testing Wiki & Time & CRM API Endpoints ---');
  inMemoryDb.reset();

  // 1. Auth Setup (Register Admin)
  const regReq = new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'System Admin',
      email: 'admin@workspace.local',
      password: 'Password123!',
      workspaceName: 'Engineering Workspace'
    })
  });
  const regRes = await app.fetch(regReq);
  const regData = attachSessionToken(regRes, await regRes.json());
  const token = regData.token;
  const workspaceId = regData.workspace?.id;

  console.log('1. Admin Registered & Authenticated, token acquired:', !!token, 'ws:', workspaceId);

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // 2. Test /api/wiki
  console.log('\n--- 2. Testing Wiki API (/api/wiki) ---');
  const createWikiReq = new Request('http://localhost:3000/api/wiki', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'Engineering SOP & Architecture',
      icon: '📘',
      visibility: 'team',
      contentJson: { blocks: [{ type: 'header', text: 'Architecture Guide' }] }
    })
  });
  const createWikiRes = await app.fetch(createWikiReq);
  console.log('POST /api/wiki status:', createWikiRes.status);
  const createdWiki = await createWikiRes.json();
  console.log('Created wiki page ID:', createdWiki.page?.id);

  const listWikiReq = new Request('http://localhost:3000/api/wiki', {
    method: 'GET',
    headers: authHeaders
  });
  const listWikiRes = await app.fetch(listWikiReq);
  console.log('GET /api/wiki status:', listWikiRes.status);
  const wikiList = await listWikiRes.json();
  console.log('Total wiki pages returned:', wikiList.pages?.length);

  // 3. Test /api/time
  console.log('\n--- 3. Testing Time Tracking API (/api/time) ---');
  const startTimerReq = new Request('http://localhost:3000/api/time/start', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      notes: 'Developing Realtime Core',
      billable: true,
      hourlyRate: 2500
    })
  });
  const startTimerRes = await app.fetch(startTimerReq);
  console.log('POST /api/time/start status:', startTimerRes.status);
  const startTimerData = await startTimerRes.json();
  console.log('Active timer started ID:', startTimerData.entry?.id);

  const stopTimerReq = new Request('http://localhost:3000/api/time/stop', {
    method: 'POST',
    headers: authHeaders
  });
  const stopTimerRes = await app.fetch(stopTimerReq);
  console.log('POST /api/time/stop status:', stopTimerRes.status);

  const timeEntriesReq = new Request('http://localhost:3000/api/time/entries', {
    method: 'GET',
    headers: authHeaders
  });
  const timeEntriesRes = await app.fetch(timeEntriesReq);
  console.log('GET /api/time/entries status:', timeEntriesRes.status);
  const entriesData = await timeEntriesRes.json();
  console.log('Total time entries returned:', entriesData.entries?.length);

  // 4. Test /api/crm
  console.log('\n--- 4. Testing CRM API (/api/crm) ---');
  const createCrmReq = new Request('http://localhost:3000/api/crm', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      customer_name: 'Acme Enterprise',
      company: 'Acme Corp',
      deal_value: 75000,
      status: 'negotiation'
    })
  });
  const createCrmRes = await app.fetch(createCrmReq);
  console.log('POST /api/crm status:', createCrmRes.status);

  const crmListReq = new Request('http://localhost:3000/api/crm', {
    method: 'GET',
    headers: authHeaders
  });
  const crmListRes = await app.fetch(crmListReq);
  console.log('GET /api/crm status:', crmListRes.status);
  const crmData = await crmListRes.json();
  console.log('Total CRM leads returned:', crmData.leads?.length);

  if (
    createWikiRes.status !== 201 ||
    listWikiRes.status !== 200 ||
    startTimerRes.status !== 201 ||
    timeEntriesRes.status !== 200 ||
    createCrmRes.status !== 201 ||
    crmListRes.status !== 200
  ) {
    throw new Error('API Integration tests failed assertion!');
  }

  console.log('\n✅ ALL CRITICAL API INTEGRATIONS VERIFIED SUCCESSFULLY WITH 200/201 STATUS');
}

testApiIntegration().catch((e) => {
  console.error('Integration test failed:', e);
  process.exit(1);
});
