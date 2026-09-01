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

export async function runDocumentsVisibilityTests() {
  console.log('\n===============================================================');
  console.log(' RUNNING DOCUMENTS & WIKI VISIBILITY ENGINE TESTS');
  console.log('===============================================================\n');

  inMemoryDb.reset();

  // 1. Setup Admin in Workspace A
  const regAdminReq = new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alpha Admin',
      email: 'admin@alpha-vis.io',
      password: 'Password123!',
      workspaceName: 'Alpha Vis Workspace'
    })
  });
  const regAdminRes = await app.fetch(regAdminReq);
  const adminData = attachSessionToken(regAdminRes, await regAdminRes.json());
  const adminToken = adminData.token;
  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  // 2. Create Department in Workspace A
  const createDeptReq = new Request('http://localhost:3000/api/people/departments', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      name: 'Engineering Department',
      description: 'Core dev team'
    })
  });
  const createDeptRes = await app.fetch(createDeptReq);
  assert(createDeptRes.status === 201, 'Department created (201 Created)');
  const dept = (await createDeptRes.json()).department;

  // 3. Create Employee in Workspace A
  const inviteEmpReq = new Request('http://localhost:3000/api/invites', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ email: 'eng-emp@alpha-vis.io', role: 'employee' })
  });
  const inviteEmpRes = await app.fetch(inviteEmpReq);
  const inviteEmpData = await inviteEmpRes.json();

  const acceptEmpReq = new Request('http://localhost:3000/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: inviteEmpData.invite?.token,
      name: 'Eng Employee',
      password: 'Password123!'
    })
  });
  await app.fetch(acceptEmpReq);

  const loginEmpReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'eng-emp@alpha-vis.io', password: 'Password123!' })
  });
  const loginEmpRes = await app.fetch(loginEmpReq);
  const empData = attachSessionToken(loginEmpRes, await loginEmpRes.json());
  const empToken = empData.token;
  const empUser = empData.user;
  const empHeaders = {
    'Authorization': `Bearer ${empToken}`,
    'Content-Type': 'application/json'
  };

  // Assign Employee to Engineering Department
  const assignDeptReq = new Request(`http://localhost:3000/api/people/profiles/${empUser.id}`, {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({ departmentId: dept.id })
  });
  await app.fetch(assignDeptReq);

  // 4. Create Intern in Workspace A
  const inviteInternReq = new Request('http://localhost:3000/api/invites', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ email: 'intern@alpha-vis.io', role: 'intern' })
  });
  const inviteInternRes = await app.fetch(inviteInternReq);
  const inviteInternData = await inviteInternRes.json();

  const acceptInternReq = new Request('http://localhost:3000/api/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: inviteInternData.invite?.token,
      name: 'Alpha Intern',
      password: 'Password123!'
    })
  });
  await app.fetch(acceptInternReq);

  const loginInternReq = new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'intern@alpha-vis.io', password: 'Password123!' })
  });
  const loginInternRes = await app.fetch(loginInternReq);
  const internData = attachSessionToken(loginInternRes, await loginInternRes.json());
  const internToken = internData.token;
  const internHeaders = {
    'Authorization': `Bearer ${internToken}`,
    'Content-Type': 'application/json'
  };

  // 5. Create Documents with various visibility types
  // 5a. Workspace Document
  const docWsReq = new Request('http://localhost:3000/api/documents', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ title: 'Workspace Strategy Handbook', visibility: 'workspace' })
  });
  const docWsRes = await app.fetch(docWsReq);
  assert(docWsRes.status === 201, 'Workspace document created (201 Created)');

  // 5b. Department Document
  const docDeptReq = new Request('http://localhost:3000/api/documents', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ title: 'Engineering Technical Specs', visibility: 'department', departmentId: dept.id })
  });
  const docDeptRes = await app.fetch(docDeptReq);
  assert(docDeptRes.status === 201, 'Department document created (201 Created)');

  // 5c. Private Document owned by Admin
  const docPrivReq = new Request('http://localhost:3000/api/documents', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ title: 'Admin Personal Draft', visibility: 'private' })
  });
  const docPrivRes = await app.fetch(docPrivReq);
  assert(docPrivRes.status === 201, 'Private document created (201 Created)');

  // 5d. Admin Only Document
  const docAdminReq = new Request('http://localhost:3000/api/documents', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ title: 'Executive Payroll Summary', visibility: 'admin_only' })
  });
  const docAdminRes = await app.fetch(docAdminReq);
  assert(docAdminRes.status === 201, 'Admin only document created (201 Created)');

  // 6. Access Verification
  // 6a. Admin Access Test -> Sees all 4 documents
  const adminListReq = new Request('http://localhost:3000/api/documents', { method: 'GET', headers: adminHeaders });
  const adminListRes = await app.fetch(adminListReq);
  const adminDocs = (await adminListRes.json()).documents;
  assert(adminDocs.length === 4, '✓ Admin access: Sees all 4 documents (private, department, workspace, admin_only)');

  // 6b. Employee Access Test -> Sees Workspace & Engineering Department documents (Not Admin Private or Admin Only)
  const empListReq = new Request('http://localhost:3000/api/documents', { method: 'GET', headers: empHeaders });
  const empListRes = await app.fetch(empListReq);
  const empDocs = (await empListRes.json()).documents;
  const empTitles = empDocs.map((d: any) => d.title);
  assert(empTitles.includes('Workspace Strategy Handbook'), '✓ Employee access: Sees workspace document');
  assert(empTitles.includes('Engineering Technical Specs'), '✓ Department visibility: Employee in Engineering sees department document');
  assert(!empTitles.includes('Admin Personal Draft'), '✓ Private visibility: Employee does NOT see private document owned by Admin');
  assert(!empTitles.includes('Executive Payroll Summary'), '✓ Admin_only visibility: Employee does NOT see admin_only document');

  // 6c. Intern Access Test -> Sees Workspace documents
  const internListReq = new Request('http://localhost:3000/api/documents', { method: 'GET', headers: internHeaders });
  const internListRes = await app.fetch(internListReq);
  const internDocs = (await internListRes.json()).documents;
  const internTitles = internDocs.map((d: any) => d.title);
  assert(internTitles.includes('Workspace Strategy Handbook'), '✓ Intern access: Sees workspace document');
  assert(!internTitles.includes('Admin Personal Draft'), '✓ Intern access: Blocked from private document');
  assert(!internTitles.includes('Executive Payroll Summary'), '✓ Intern access: Blocked from admin_only document');

  // 7. Employee Document Creation & Deletion Security Tests
  // 7a. Employee Upload Test -> Should succeed
  const empUploadReq = new Request('http://localhost:3000/api/documents', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({ title: 'Employee Design Doc', visibility: 'workspace' })
  });
  const empUploadRes = await app.fetch(empUploadReq);
  assert(empUploadRes.status === 201, '✓ Employee security: Employee can upload workspace document (201 Created)');
  const empDocId = (await empUploadRes.json()).document.id;

  // 7b. Employee Deleting Admin Document -> Should fail (403 Forbidden)
  const adminDocToProtect = adminDocs.find((d: any) => d.title === 'Executive Payroll Summary');
  const empDeleteAdminReq = new Request(`http://localhost:3000/api/documents/${adminDocToProtect.id}`, {
    method: 'DELETE',
    headers: empHeaders
  });
  const empDeleteAdminRes = await app.fetch(empDeleteAdminReq);
  assert(empDeleteAdminRes.status === 403, '✓ Employee security: Employee CANNOT delete Admin document (403 Forbidden)');

  // 7c. Employee Deleting Own Document -> Should succeed (200 OK)
  const empDeleteOwnReq = new Request(`http://localhost:3000/api/documents/${empDocId}`, {
    method: 'DELETE',
    headers: empHeaders
  });
  const empDeleteOwnRes = await app.fetch(empDeleteOwnReq);
  assert(empDeleteOwnRes.status === 200, '✓ Employee security: Employee CAN delete own document (200 OK)');

  // 7d. Intern Document Upload -> Should fail (403 Forbidden)
  const internUploadReq = new Request('http://localhost:3000/api/documents', {
    method: 'POST',
    headers: internHeaders,
    body: JSON.stringify({ title: 'Unauthorized Intern Doc', visibility: 'workspace' })
  });
  const internUploadRes = await app.fetch(internUploadReq);
  assert(internUploadRes.status === 403, '✓ Intern security: Intern CANNOT upload document (403 Forbidden)');

  // 7e. Intern Document Delete -> Should fail (403 Forbidden)
  const internDeleteReq = new Request(`http://localhost:3000/api/documents/${adminDocToProtect.id}`, {
    method: 'DELETE',
    headers: internHeaders
  });
  const internDeleteRes = await app.fetch(internDeleteReq);
  assert(internDeleteRes.status === 403, '✓ Intern security: Intern CANNOT delete document (403 Forbidden)');

  // 8. Multi-format Document Upload & Download Tests (PDF, DOCX, PNG)
  // 8a. Upload DOCX File
  const uploadDocxReq = new Request('http://localhost:3000/api/documents', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({ title: 'Product Specification Doc', fileType: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', visibility: 'workspace' })
  });
  const uploadDocxRes = await app.fetch(uploadDocxReq);
  assert(uploadDocxRes.status === 201, '✓ Documents upload: DOCX document uploaded successfully (201 Created)');
  const docxDoc = (await uploadDocxRes.json()).document;
  assert(docxDoc.file_type === 'docx', '✓ Documents upload: DOCX file_type stored correctly');

  // 8b. Upload PNG Image File
  const uploadPngReq = new Request('http://localhost:3000/api/documents', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({ title: 'Architecture Diagram Image', fileType: 'png', mimeType: 'image/png', visibility: 'workspace' })
  });
  const uploadPngRes = await app.fetch(uploadPngReq);
  assert(uploadPngRes.status === 201, '✓ Documents upload: PNG image document uploaded successfully (201 Created)');

  // 8c. Download Document payload
  const downloadReq = new Request(`http://localhost:3000/api/documents/${docxDoc.id}/download`, {
    method: 'GET',
    headers: empHeaders
  });
  const downloadRes = await app.fetch(downloadReq);
  assert(downloadRes.status === 200, '✓ Documents download: Signed download URL generated successfully (200 OK)');
  const downloadData = await downloadRes.json();
  assert(!!downloadData.signedUrl, '✓ Documents download: Payload contains valid signed URL');

  // 9. Wiki Creation, Edit, Delete & Strict Ownership Permission Tests
  // 9a. Admin Create Wiki Page
  const adminWikiReq = new Request('http://localhost:3000/api/wiki', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ title: 'Admin Master SOP', visibility: 'workspace' })
  });
  const adminWikiRes = await app.fetch(adminWikiReq);
  assert(adminWikiRes.status === 201, '✓ Wiki permission: Admin can create Wiki page (201 Created)');
  const adminWikiPage = (await adminWikiRes.json()).page;

  // 9b. Employee 1 Create Wiki Page
  const emp1WikiReq = new Request('http://localhost:3000/api/wiki', {
    method: 'POST',
    headers: empHeaders,
    body: JSON.stringify({ title: 'Engineering Onboarding SOP', visibility: 'workspace' })
  });
  const emp1WikiRes = await app.fetch(emp1WikiReq);
  assert(emp1WikiRes.status === 201, '✓ Wiki permission: Employee can create Wiki page (201 Created)');
  const emp1WikiPage = (await emp1WikiRes.json()).page;

  // 9c. Admin edits Admin page -> Allowed (200 OK)
  const adminEditAdminReq = new Request(`http://localhost:3000/api/wiki/${adminWikiPage.id}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ title: 'Admin Master SOP v2' })
  });
  const adminEditAdminRes = await app.fetch(adminEditAdminReq);
  assert(adminEditAdminRes.status === 200, '✓ Wiki permission: Admin edits Admin page -> Allowed (200 OK)');

  // 9d. Admin edits Employee page -> Allowed (200 OK)
  const adminEditEmpReq = new Request(`http://localhost:3000/api/wiki/${emp1WikiPage.id}`, {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ title: 'Engineering Onboarding SOP (Admin Revised)' })
  });
  const adminEditEmpRes = await app.fetch(adminEditEmpReq);
  assert(adminEditEmpRes.status === 200, '✓ Wiki permission: Admin edits Employee page -> Allowed (200 OK)');

  // 9e. Employee edits own page -> Allowed (200 OK)
  const empEditOwnReq = new Request(`http://localhost:3000/api/wiki/${emp1WikiPage.id}`, {
    method: 'PATCH',
    headers: empHeaders,
    body: JSON.stringify({ title: 'Engineering Onboarding SOP v3' })
  });
  const empEditOwnRes = await app.fetch(empEditOwnReq);
  assert(empEditOwnRes.status === 200, '✓ Wiki permission: Employee edits own page -> Allowed (200 OK)');

  // 9f. Employee edits Admin page -> 403 Forbidden
  const empEditAdminReq = new Request(`http://localhost:3000/api/wiki/${adminWikiPage.id}`, {
    method: 'PATCH',
    headers: empHeaders,
    body: JSON.stringify({ title: 'Unauthorized Edit Attempt' })
  });
  const empEditAdminRes = await app.fetch(empEditAdminReq);
  assert(empEditAdminRes.status === 403, '✓ Wiki security: Employee edits Admin page -> 403 Forbidden');

  // 9g. Employee deletes Admin page -> 403 Forbidden
  const empDeleteAdminWikiReq = new Request(`http://localhost:3000/api/wiki/${adminWikiPage.id}`, {
    method: 'DELETE',
    headers: empHeaders
  });
  const empDeleteAdminWikiRes = await app.fetch(empDeleteAdminWikiReq);
  assert(empDeleteAdminWikiRes.status === 403, '✓ Wiki security: Employee deletes Admin page -> 403 Forbidden');

  // 9h. Intern create page -> 403 Forbidden
  const internWikiReq = new Request('http://localhost:3000/api/wiki', {
    method: 'POST',
    headers: internHeaders,
    body: JSON.stringify({ title: 'Unauthorized Intern Wiki' })
  });
  const internWikiRes = await app.fetch(internWikiReq);
  assert(internWikiRes.status === 403, '✓ Wiki security: Intern create page -> 403 Forbidden');

  // 9i. Intern edit page -> 403 Forbidden
  const internEditWikiReq = new Request(`http://localhost:3000/api/wiki/${emp1WikiPage.id}`, {
    method: 'PATCH',
    headers: internHeaders,
    body: JSON.stringify({ title: 'Intern Unauthorized Edit' })
  });
  const internEditWikiRes = await app.fetch(internEditWikiReq);
  assert(internEditWikiRes.status === 403, '✓ Wiki security: Intern edit page -> 403 Forbidden');

  // 9j. Intern delete page -> 403 Forbidden
  const internDeleteWikiReq = new Request(`http://localhost:3000/api/wiki/${emp1WikiPage.id}`, {
    method: 'DELETE',
    headers: internHeaders
  });
  const internDeleteWikiRes = await app.fetch(internDeleteWikiReq);
  assert(internDeleteWikiRes.status === 403, '✓ Wiki security: Intern delete page -> 403 Forbidden');

  // 9k. Employee deletes own page -> Allowed (200 OK)
  const empDeleteOwnWikiReq = new Request(`http://localhost:3000/api/wiki/${emp1WikiPage.id}`, {
    method: 'DELETE',
    headers: empHeaders
  });
  const empDeleteOwnWikiRes = await app.fetch(empDeleteOwnWikiReq);
  assert(empDeleteOwnWikiRes.status === 200, '✓ Wiki permission: Employee deletes own page -> Allowed (200 OK)');

  console.log('\n===============================================================');
  console.log(' DOCUMENTS & WIKI VISIBILITY ENGINE TESTS: ALL CHECKS PASSED');
  console.log('===============================================================\n');
}

if (process.argv[1]?.endsWith('documents-visibility.test.ts')) {
  runDocumentsVisibilityTests().catch((err) => {
    console.error('Documents visibility test run failed:', err);
    process.exit(1);
  });
}
