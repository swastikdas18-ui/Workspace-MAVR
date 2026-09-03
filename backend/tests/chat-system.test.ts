import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { attachSessionToken } from './session-test-utils';
import { ChatService } from '../src/services/chat-service';
import { PeopleRepository } from '../src/repositories/people-repository';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

export async function runChatSystemTests() {
  console.log('\n===============================================================');
  console.log(' RUNNING WORKSPACE CHAT & INTERNAL COMMUNICATION TESTS');
  console.log('===============================================================\n');

  inMemoryDb.reset();

  // ==========================================
  // SETUP: USERS & WORKSPACES
  // ==========================================
  console.log('--- Setting up Workspace & Users ---');

  // 1. Register Alice (Admin in Workspace A)
  const regAliceRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Admin',
        email: 'alice@chat.io',
        password: 'Password123!',
        workspaceName: 'Acme Corp',
      }),
    })
  );
  const aliceData = attachSessionToken(regAliceRes, await regAliceRes.json());
  const aliceHeaders = {
    Authorization: `Bearer ${aliceData.token}`,
    'Content-Type': 'application/json',
  };
  const aliceUser = aliceData.user;
  const workspaceA = aliceData.workspace;

  // 2. Invite Bob (Employee) to Workspace A
  const inviteBobRes = await app.fetch(
    new Request('http://localhost:3000/api/invites', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ email: 'bob@chat.io', role: 'employee' }),
    })
  );
  const bobInvite = await inviteBobRes.json();

  await app.fetch(
    new Request('http://localhost:3000/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: bobInvite.invite?.token || bobInvite.token,
        name: 'Bob Engineer',
        password: 'Password123!',
      }),
    })
  );
  const loginBobRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'bob@chat.io', password: 'Password123!' }),
    })
  );
  const bobData = attachSessionToken(loginBobRes, await loginBobRes.json());
  const bobHeaders = {
    Authorization: `Bearer ${bobData.token}`,
    'Content-Type': 'application/json',
  };
  const bobUser = bobData.user;

  // 3. Invite Charlie (Employee - Sales) to Workspace A
  const inviteCharlieRes = await app.fetch(
    new Request('http://localhost:3000/api/invites', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ email: 'charlie@chat.io', role: 'employee' }),
    })
  );
  const charlieInvite = await inviteCharlieRes.json();

  await app.fetch(
    new Request('http://localhost:3000/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: charlieInvite.invite?.token || charlieInvite.token,
        name: 'Charlie Sales',
        password: 'Password123!',
      }),
    })
  );
  const loginCharlieRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'charlie@chat.io', password: 'Password123!' }),
    })
  );
  const charlieData = attachSessionToken(loginCharlieRes, await loginCharlieRes.json());
  const charlieHeaders = {
    Authorization: `Bearer ${charlieData.token}`,
    'Content-Type': 'application/json',
  };
  const charlieUser = charlieData.user;

  // 4. Invite Dana (Intern) to Workspace A
  const inviteDanaRes = await app.fetch(
    new Request('http://localhost:3000/api/invites', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ email: 'dana@chat.io', role: 'intern' }),
    })
  );
  const danaInvite = await inviteDanaRes.json();

  await app.fetch(
    new Request('http://localhost:3000/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: danaInvite.invite?.token || danaInvite.token,
        name: 'Dana Intern',
        password: 'Password123!',
      }),
    })
  );
  const loginDanaRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dana@chat.io', password: 'Password123!' }),
    })
  );
  const danaData = attachSessionToken(loginDanaRes, await loginDanaRes.json());
  const danaHeaders = {
    Authorization: `Bearer ${danaData.token}`,
    'Content-Type': 'application/json',
  };
  const danaUser = danaData.user;

  // 5. Register Eve (Admin in separate Workspace B)
  const regEveRes = await app.fetch(
    new Request('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Eve OtherCorp',
        email: 'eve@othercorp.io',
        password: 'Password123!',
        workspaceName: 'Other Corp',
      }),
    })
  );
  const eveData = attachSessionToken(regEveRes, await regEveRes.json());
  const eveHeaders = {
    Authorization: `Bearer ${eveData.token}`,
    'Content-Type': 'application/json',
  };

  // Setup Departments in Workspace A
  const engDept = await PeopleRepository.createDepartment(workspaceA.id, {
    name: 'Engineering',
    description: 'Engineering and Product Development',
    headId: bobUser.id,
  });
  // Assign Bob to Engineering
  await PeopleRepository.upsertProfile(workspaceA.id, bobUser.id, {
    departmentId: engDept.id,
    designation: 'Senior Software Engineer',
  });

  const salesDept = await PeopleRepository.createDepartment(workspaceA.id, {
    name: 'Sales',
    description: 'Revenue and Growth',
    headId: charlieUser.id,
  });
  // Assign Charlie to Sales
  await PeopleRepository.upsertProfile(workspaceA.id, charlieUser.id, {
    departmentId: salesDept.id,
    designation: 'Account Executive',
  });

  console.log('✅ Users, Departments, and Workspaces initialized.');

  // ==========================================
  // TEST 1: ANNOUNCEMENT CHANNEL & PERMISSIONS
  // ==========================================
  console.log('\n--- TEST 1: Announcements Channel Permissions ---');

  // Alice lists conversations -> Announcements channel exists
  const aliceConvsRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/conversations', {
      method: 'GET',
      headers: aliceHeaders,
    })
  );
  const aliceConvs = await aliceConvsRes.json();
  const announcement = aliceConvs.conversations.find((c: any) => c.type === 'announcement');
  assert(!!announcement, 'Announcements channel was auto-created for workspace');

  // Alice (Admin) posts announcement -> 201 Created
  const postAnnouncementRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${announcement.id}/messages`, {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ content: '📢 Welcome everyone to the new fiscal quarter!' }),
    })
  );
  assert(postAnnouncementRes.status === 201, 'Admin successfully posted an announcement (Status 201)');

  // Bob (Employee) reads announcement -> 200 OK
  const bobReadRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${announcement.id}/messages`, {
      method: 'GET',
      headers: bobHeaders,
    })
  );
  const bobMessages = await bobReadRes.json();
  assert(bobReadRes.status === 200, 'Employee can read announcements');
  assert(bobMessages.messages.length >= 1, 'Employee sees posted announcement');

  // Bob (Employee) attempts to write to announcement -> 403 Forbidden
  const bobWriteRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${announcement.id}/messages`, {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ content: 'Can employees post announcements?' }),
    })
  );
  assert(bobWriteRes.status === 403, 'Employee write to announcements is strictly blocked (Status 403)');

  // Dana (Intern) attempts to write to announcement -> 403 Forbidden
  const danaWriteRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${announcement.id}/messages`, {
      method: 'POST',
      headers: danaHeaders,
      body: JSON.stringify({ content: 'Intern announcement test' }),
    })
  );
  assert(danaWriteRes.status === 403, 'Intern write to announcements is strictly blocked (Status 403)');

  // ==========================================
  // TEST 2: DIRECT MESSAGES (DM) & ISOLATION
  // ==========================================
  console.log('\n--- TEST 2: Direct Messages Permissions & Isolation ---');

  // Alice initiates DM with Bob
  const aliceDmRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/conversations/dm', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ targetUserId: bobUser.id }),
    })
  );
  const dmData = await aliceDmRes.json();
  assert(aliceDmRes.status === 200, 'Alice started DM with Bob (Status 200)');
  const dmId = dmData.conversation.id;

  // Alice sends message in DM
  const aliceDmMsgRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${dmId}/messages`, {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ content: 'Hey Bob, can you review the new backend auth schema?' }),
    })
  );
  assert(aliceDmMsgRes.status === 201, 'Alice sent DM to Bob');

  // Bob reads DM messages
  const bobDmReadRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${dmId}/messages`, {
      method: 'GET',
      headers: bobHeaders,
    })
  );
  const bobDmMessages = await bobDmReadRes.json();
  assert(bobDmReadRes.status === 200, 'Bob can access his DM with Alice');
  assert(bobDmMessages.messages.some((m: any) => m.content.includes('backend auth schema')), 'Bob sees Alice message');

  // Charlie (uninvited third party) attempts to read Alice & Bob DM -> 403 Forbidden
  const charlieSnoopRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${dmId}/messages`, {
      method: 'GET',
      headers: charlieHeaders,
    })
  );
  assert(charlieSnoopRes.status === 403, 'Unauthorized third party (Charlie) cannot access private DM (Status 403)');

  // Charlie attempts to send message into Alice & Bob DM -> 403 Forbidden
  const charliePostSnoopRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${dmId}/messages`, {
      method: 'POST',
      headers: charlieHeaders,
      body: JSON.stringify({ content: 'I want to see this DM' }),
    })
  );
  assert(charliePostSnoopRes.status === 403, 'Unauthorized third party cannot write into private DM (Status 403)');

  // ==========================================
  // TEST 3: DEPARTMENT CHANNELS & MEMBER SYNC
  // ==========================================
  console.log('\n--- TEST 3: Department Channels & Sync ---');

  // Trigger department channel auto-sync for Engineering
  const engChannel = await ChatService.getOrCreateDepartmentChannel(workspaceA.id, engDept.id, aliceUser.id);
  assert(!!engChannel, 'Engineering Department channel created');

  // Bob (Engineering) accesses channel and posts message
  const bobEngPostRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${engChannel!.id}/messages`, {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ content: 'Engineering team: database indexes migration complete.' }),
    })
  );
  assert(bobEngPostRes.status === 201, 'Engineering member (Bob) can post in #Engineering');

  // Alice (Admin) can access Engineering channel
  const aliceEngReadRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${engChannel!.id}/messages`, {
      method: 'GET',
      headers: aliceHeaders,
    })
  );
  assert(aliceEngReadRes.status === 200, 'Admin (Alice) can access department channel');

  // Charlie (Sales member) attempts to access Engineering channel -> 403 Forbidden
  const charlieEngRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${engChannel!.id}/messages`, {
      method: 'GET',
      headers: charlieHeaders,
    })
  );
  assert(charlieEngRes.status === 403, 'Non-department employee (Charlie) is blocked from #Engineering (Status 403)');

  // ==========================================
  // TEST 4: PROJECT CHANNELS AUTO-CREATION & ASSIGNED ACCESS
  // ==========================================
  console.log('\n--- TEST 4: Project Channel Auto-Creation & RBAC ---');

  // Alice creates a project assigned to Bob
  const createProjRes = await app.fetch(
    new Request('http://localhost:3000/api/projects', {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({
        title: 'Project Apollo',
        description: 'Next-gen analytics engine',
        departmentId: engDept.id,
        memberIds: [bobUser.id],
      }),
    })
  );
  assert(createProjRes.status === 201, 'Project created');
  const projData = await createProjRes.json();
  const projectId = projData.id || projData.project?.id;

  // Find project channel
  const bobConvsRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/conversations', {
      method: 'GET',
      headers: bobHeaders,
    })
  );
  const bobConvs = await bobConvsRes.json();
  const projChannel = bobConvs.conversations.find((c: any) => c.projectId === projectId);
  assert(!!projChannel, 'Project channel was automatically created and assigned to Bob');

  // Bob sends message in project channel
  const bobProjMsgRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${projChannel.id}/messages`, {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ content: 'Starting technical design document for Apollo.' }),
    })
  );
  assert(bobProjMsgRes.status === 201, 'Assigned member (Bob) can post in Project channel');

  // Charlie (unassigned) tries to access project channel -> 403 Forbidden
  const charlieProjRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${projChannel.id}/messages`, {
      method: 'GET',
      headers: charlieHeaders,
    })
  );
  assert(charlieProjRes.status === 403, 'Unassigned employee (Charlie) blocked from Project channel (Status 403)');

  // ==========================================
  // TEST 5: MENTIONS & NOTIFICATION INTEGRATION
  // ==========================================
  console.log('\n--- TEST 5: Mentions & Notification Integration ---');

  // Bob mentions Alice in project channel: "@Alice Please review milestone schedule"
  const mentionMsgRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${projChannel.id}/messages`, {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ content: '@Alice please check the Apollo milestone dates!' }),
    })
  );
  assert(mentionMsgRes.status === 201, 'Message with mention sent successfully');

  // Alice checks notifications -> receives high priority mention notification
  const aliceNotifsRes = await app.fetch(
    new Request('http://localhost:3000/api/notifications', {
      method: 'GET',
      headers: aliceHeaders,
    })
  );
  const aliceNotifs = await aliceNotifsRes.json();
  const mentionNotif = (aliceNotifs.notifications || []).find(
    (n: any) => n.type === 'mention_received' || n.title?.toLowerCase().includes('mention')
  );
  assert(!!mentionNotif, 'Alice received mention_received notification');
  assert(mentionNotif.priority === 'high', 'Mention notification is high priority');

  // Alice mentions @Engineering in department channel
  await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${engChannel!.id}/messages`, {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ content: 'Reminder to @Engineering team for sprint demo today' }),
    })
  );

  // Bob checks notifications -> received department mention
  const bobNotifsRes = await app.fetch(
    new Request('http://localhost:3000/api/notifications', {
      method: 'GET',
      headers: bobHeaders,
    })
  );
  const bobNotifs = await bobNotifsRes.json();
  const deptMention = (bobNotifs.notifications || []).find((n: any) => n.type === 'mention_received');
  assert(!!deptMention, 'Bob received department mention notification for @Engineering');

  // ==========================================
  // TEST 6: UNREAD COUNTS & MARK READ
  // ==========================================
  console.log('\n--- TEST 6: Unread Counts & Mark Read ---');

  // Bob sends new DM message to Alice
  await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${dmId}/messages`, {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ content: 'Are you free for a quick sync?' }),
    })
  );

  // Alice checks unread count
  const aliceUnreadRes = await app.fetch(
    new Request('http://localhost:3000/api/chat/unread-count', {
      method: 'GET',
      headers: aliceHeaders,
    })
  );
  const aliceUnread = await aliceUnreadRes.json();
  assert(aliceUnread.unreadCount >= 1, `Alice has unread messages count (${aliceUnread.unreadCount})`);

  // Alice marks DM as read
  const markReadRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${dmId}/read`, {
      method: 'POST',
      headers: aliceHeaders,
    })
  );
  assert(markReadRes.status === 200, 'Conversation marked as read');

  // Alice rechecks unread count for this DM
  const aliceConvDetails = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${dmId}`, {
      method: 'GET',
      headers: aliceHeaders,
    })
  );
  const convDetailsJson = await aliceConvDetails.json();
  assert(convDetailsJson.conversation.unreadCount === 0, 'Unread count reset to 0 after mark read');

  // ==========================================
  // TEST 7: MESSAGE EDITING, DELETION & REACTIONS
  // ==========================================
  console.log('\n--- TEST 7: Message Editing, Deletion & Reactions ---');

  // Bob posts a message in project channel
  const newMsgRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${projChannel.id}/messages`, {
      method: 'POST',
      headers: bobHeaders,
      body: JSON.stringify({ content: 'Typo in message here' }),
    })
  );
  const newMsg = (await newMsgRes.json()).message;

  // Bob edits his own message -> 200 OK
  const editRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/messages/${newMsg.id}`, {
      method: 'PUT',
      headers: bobHeaders,
      body: JSON.stringify({ content: 'Corrected message without typos' }),
    })
  );
  assert(editRes.status === 200, 'Author can edit own message');
  const editedJson = await editRes.json();
  assert(editedJson.message.isEdited === true, 'Message marked as isEdited: true');
  assert(editedJson.message.content === 'Corrected message without typos', 'Content updated');

  // Charlie tries to edit Bob's message -> 403 Forbidden
  const charlieEditRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/messages/${newMsg.id}`, {
      method: 'PUT',
      headers: charlieHeaders,
      body: JSON.stringify({ content: 'Charlie tampering' }),
    })
  );
  assert(charlieEditRes.status === 403, 'Non-author cannot edit someone else message (Status 403)');

  // Alice toggles reaction on message
  const reactRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/messages/${newMsg.id}/reactions`, {
      method: 'POST',
      headers: aliceHeaders,
      body: JSON.stringify({ emoji: '🚀' }),
    })
  );
  assert(reactRes.status === 200, 'Reaction toggled successfully');
  const reactJson = await reactRes.json();
  assert(reactJson.added === true, 'Reaction was added');

  // Bob deletes his own message -> 200 OK
  const deleteRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/messages/${newMsg.id}`, {
      method: 'DELETE',
      headers: bobHeaders,
    })
  );
  assert(deleteRes.status === 200, 'Author can delete own message');

  // ==========================================
  // TEST 8: WORKSPACE TENANT ISOLATION
  // ==========================================
  console.log('\n--- TEST 8: Cross-Workspace Tenant Isolation ---');

  // Eve (from Workspace B) tries to read Alice & Bob DM -> 403 or 404
  const eveAccessRes = await app.fetch(
    new Request(`http://localhost:3000/api/chat/conversations/${dmId}/messages`, {
      method: 'GET',
      headers: eveHeaders,
    })
  );
  assert(
    eveAccessRes.status === 403 || eveAccessRes.status === 404,
    'Cross-workspace user cannot access conversations from another workspace'
  );

  console.log('\n===============================================================');
  console.log(' ALL WORKSPACE CHAT & INTERNAL COMMUNICATION TESTS PASSED! 🎉');
  console.log('===============================================================\n');
}

if (process.argv[1]?.endsWith('chat-system.test.ts')) {
  runChatSystemTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
