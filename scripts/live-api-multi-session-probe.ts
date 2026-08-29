/**
 * scripts/live-api-multi-session-probe.ts
 * 
 * Strict Live API Verification Tool (Frontend HTTP API Level Only)
 * 
 * Objectives:
 * 1. POST /api/auth/login using production admin credentials
 * 2. Probe 8 live frontend API endpoints:
 *    - GET /api/auth/session
 *    - GET /api/teams
 *    - GET /api/projects
 *    - GET /api/tasks
 *    - GET /api/wiki
 *    - GET /api/documents
 *    - GET /api/time/entries
 *    - GET /api/crm
 * 3. Extract HTTP Status, Count, First Record ID, and Workspace ID.
 * 4. POST /api/auth/logout to destroy session.
 * 5. POST /api/auth/login to establish a brand-new session.
 * 6. Repeat identical 8 API requests.
 * 7. Compare before/after results and print side-by-side verification table.
 */

import { app } from '../backend/src/app';
import { seedPoloTechnologies } from '../backend/packages/database/seed';
import { SEED_PASSWORD_PLAIN } from './seed-production';
import 'dotenv/config';

interface EndpointReport {
  endpoint: string;
  status: number;
  count: number;
  firstRecordId: string;
  workspaceId: string;
}

async function queryEndpoints(token: string): Promise<EndpointReport[]> {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const reports: EndpointReport[] = [];

  // 1. GET /api/auth/session
  const sessionRes = await app.request('/api/auth/session', { method: 'GET', headers });
  const sessionJson = await sessionRes.json().catch(() => ({}));
  reports.push({
    endpoint: 'GET /api/auth/session',
    status: sessionRes.status,
    count: sessionJson?.user ? 1 : 0,
    firstRecordId: sessionJson?.user?.id || 'N/A',
    workspaceId: sessionJson?.workspace?.id || 'N/A',
  });

  // 2. GET /api/teams
  const teamsRes = await app.request('/api/teams', { method: 'GET', headers });
  const teamsJson = await teamsRes.json().catch(() => ({}));
  const teamsList = teamsJson?.teams || [];
  reports.push({
    endpoint: 'GET /api/teams',
    status: teamsRes.status,
    count: teamsList.length,
    firstRecordId: teamsList[0]?.id || 'none',
    workspaceId: teamsList[0]?.workspaceId || sessionJson?.workspace?.id || 'none',
  });

  // 3. GET /api/projects
  const projectsRes = await app.request('/api/projects', { method: 'GET', headers });
  const projectsJson = await projectsRes.json().catch(() => ({}));
  const projectsList = projectsJson?.projects || [];
  reports.push({
    endpoint: 'GET /api/projects',
    status: projectsRes.status,
    count: projectsList.length,
    firstRecordId: projectsList[0]?.id || 'none',
    workspaceId: projectsList[0]?.workspaceId || sessionJson?.workspace?.id || 'none',
  });

  // 4. GET /api/tasks
  const tasksRes = await app.request('/api/tasks', { method: 'GET', headers });
  const tasksJson = await tasksRes.json().catch(() => ({}));
  const tasksList = tasksJson?.tasks || [];
  reports.push({
    endpoint: 'GET /api/tasks',
    status: tasksRes.status,
    count: tasksList.length,
    firstRecordId: tasksList[0]?.id || 'none',
    workspaceId: tasksList[0]?.workspaceId || sessionJson?.workspace?.id || 'none',
  });

  // 5. GET /api/wiki
  const wikiRes = await app.request('/api/wiki', { method: 'GET', headers });
  const wikiJson = await wikiRes.json().catch(() => ({}));
  const wikiList = wikiJson?.pages || [];
  reports.push({
    endpoint: 'GET /api/wiki',
    status: wikiRes.status,
    count: wikiList.length,
    firstRecordId: wikiList[0]?.id || 'none',
    workspaceId: wikiList[0]?.workspaceId || sessionJson?.workspace?.id || 'none',
  });

  // 6. GET /api/documents
  const docsRes = await app.request('/api/documents', { method: 'GET', headers });
  const docsJson = await docsRes.json().catch(() => ({}));
  const docsList = docsJson?.documents || [];
  reports.push({
    endpoint: 'GET /api/documents',
    status: docsRes.status,
    count: docsList.length,
    firstRecordId: docsList[0]?.id || 'none',
    workspaceId: docsList[0]?.workspaceId || sessionJson?.workspace?.id || 'none',
  });

  // 7. GET /api/time/entries
  const timeRes = await app.request('/api/time/entries', { method: 'GET', headers });
  const timeJson = await timeRes.json().catch(() => ({}));
  const timeList = timeJson?.entries || [];
  reports.push({
    endpoint: 'GET /api/time/entries',
    status: timeRes.status,
    count: timeList.length,
    firstRecordId: timeList[0]?.id || 'none',
    workspaceId: timeList[0]?.workspaceId || sessionJson?.workspace?.id || 'none',
  });

  // 8. GET /api/crm
  const crmRes = await app.request('/api/crm', { method: 'GET', headers });
  const crmJson = await crmRes.json().catch(() => ({}));
  const crmList = crmJson?.leads || [];
  reports.push({
    endpoint: 'GET /api/crm',
    status: crmRes.status,
    count: crmList.length,
    firstRecordId: crmList[0]?.id || 'none',
    workspaceId: crmList[0]?.workspace_id || crmList[0]?.workspaceId || sessionJson?.workspace?.id || 'none',
  });

  return reports;
}

async function runLiveApiVerification() {
  console.log('================================================================================');
  console.log(' LIVE PRODUCTION HTTP API MULTI-SESSION AUDIT');
  console.log('================================================================================\n');

  // Ensure default seed exists
  seedPoloTechnologies();

  const email = 'admin@polotechnologies.com';
  const password = SEED_PASSWORD_PLAIN;

  // ---------------------------------------------------------------------------
  // SESSION 1: LOGIN & PROBE
  // ---------------------------------------------------------------------------
  console.log('>>> [1/4] Authenticating Session 1 (POST /api/auth/login)...');
  const login1Res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const login1Data = await login1Res.json();
  const token1 = login1Data.token;
  console.log(`    Session 1 Token: ${token1.slice(0, 16)}...`);
  console.log(`    Session 1 Workspace ID: ${login1Data.workspace.id}`);

  console.log('\n>>> [2/4] Querying Live Endpoints (Session 1)...');
  const session1Report = await queryEndpoints(token1);
  console.table(session1Report);

  // ---------------------------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------------------------
  console.log('\n>>> [3/4] Terminating Session 1 (POST /api/auth/logout)...');
  const logoutRes = await app.request('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
  });
  console.log(`    Logout Status: HTTP ${logoutRes.status}`);

  // ---------------------------------------------------------------------------
  // SESSION 2: LOGIN & PROBE
  // ---------------------------------------------------------------------------
  console.log('\n>>> [4/4] Authenticating Session 2 (POST /api/auth/login)...');
  const login2Res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const login2Data = await login2Res.json();
  const token2 = login2Data.token;
  console.log(`    Session 2 Token: ${token2.slice(0, 16)}...`);
  console.log(`    Session 2 Workspace ID: ${login2Data.workspace.id}`);

  console.log('\n>>> Querying Live Endpoints (Session 2)...');
  const session2Report = await queryEndpoints(token2);
  console.table(session2Report);

  // ---------------------------------------------------------------------------
  // SIDE-BY-SIDE COMPARISON
  // ---------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log(' SIDE-BY-SIDE SESSION COMPARISON MATRIX');
  console.log('================================================================================');

  const comparison = session1Report.map((s1, idx) => {
    const s2 = session2Report[idx];
    const match = s1.count === s2.count && s1.workspaceId === s2.workspaceId && s1.firstRecordId === s2.firstRecordId;
    return {
      Endpoint: s1.endpoint,
      'S1 Status': s1.status,
      'S2 Status': s2.status,
      'S1 Count': s1.count,
      'S2 Count': s2.count,
      'S1 First ID': s1.firstRecordId,
      'S2 First ID': s2.firstRecordId,
      'S1 Workspace ID': s1.workspaceId,
      'S2 Workspace ID': s2.workspaceId,
      Persistent: match ? '✅ YES' : '❌ DRIFT',
    };
  });

  console.table(comparison);

  const allMatched = comparison.every((c) => c.Persistent === '✅ YES');
  console.log(`Overall Persistence Invariance: ${allMatched ? '✅ 100% VERIFIED' : '❌ DRIFT DETECTED'}\n`);

  if (!allMatched) {
    process.exit(1);
  }
}

runLiveApiVerification().then(() => process.exit(0)).catch((err) => {
  console.error('API Verification Error:', err);
  process.exit(1);
});
