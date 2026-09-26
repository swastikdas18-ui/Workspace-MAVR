import assert from 'node:assert/strict';
import fs from 'node:fs';
import { app } from '../src/app';
import { inMemoryDb } from '../packages/database';
import { ROLE_PERMISSIONS } from '../../src/lib/auth';
import { can } from '../src/lib/permissions';
import { ObjectStorageService } from '../src/services/object-storage-service';
import { resolveMembershipRole } from '../src/middleware/rbac';
import { WorkspaceRepository } from '../src/repositories/workspace-repository';
import { Hono } from 'hono';
import { createUiRouteProbe } from './rbac-ui-render';
import { EventEmitter } from 'node:events';
import { WorkspaceWebSocketServer } from '../src/realtime/websocket-server';
import { ChannelManager } from '../src/realtime/channel-manager';
import { allowed, canonicalPath, expectedPolicy, Role, uiInventory } from './rbac-audit-inventory';

const roles: Role[] = ['admin', 'employee', 'intern', 'anonymous'];
const ws = 'audit-workspace';
const foreignWs = 'foreign-workspace';
const now = new Date();
const results: { name: string; pass: boolean; detail?: string }[] = [];

// Real session lookup + membership resolution; only the persistence adapter is in-memory.
function seed() {
  for (const value of Object.values(inMemoryDb)) if (value instanceof Map) value.clear();
  for (const workspaceId of [ws, foreignWs]) {
    inMemoryDb.workspaces.set(workspaceId, { id: workspaceId, name: workspaceId, slug: workspaceId,
      ownerId: workspaceId === ws ? 'admin' : 'foreign-admin', plan: 'business', createdAt: now } as any);
  }
  for (const role of ['admin', 'employee', 'intern', 'peer', 'foreign-admin']) {
    const workspaceId = role === 'foreign-admin' ? foreignWs : ws;
    const membershipRole = role === 'peer' ? 'employee' : role === 'foreign-admin' ? 'admin' : role;
    inMemoryDb.users.set(role, { id: role, name: role, email: `${role}@rbac.example`, role: membershipRole,
      passwordHash: 'unused-test-hash', platformRole: 'none', createdAt: now, updatedAt: now } as any);
    inMemoryDb.workspaceMembers.set(role, { id: role, workspaceId, userId: role, role: membershipRole, joinedAt: now } as any);
    inMemoryDb.sessions.set(`audit-${role}`, { id: `session-${role}`, token: `audit-${role}`, userId: role,
      workspaceId, createdAt: now, lastActiveAt: now, expiresAt: new Date(Date.now() + 3600000) } as any);
    inMemoryDb.employeeProfiles.set(role, { id: role, userId: role, workspaceId, departmentId: 'dept',
      employmentType: 'full_time', status: 'active', createdAt: now, updatedAt: now } as any);
  }
  inMemoryDb.departments.set('dept', { id: 'dept', workspaceId: ws, name: 'Audit Department', headId: 'admin', createdAt: now });
  for (const [id, workspaceId, owner] of [['project', ws, 'admin'], ['foreign-project', foreignWs, 'foreign-admin']]) {
    inMemoryDb.projects.set(id, { id, workspaceId, title: id, description: 'confidential project', createdBy: owner,
      status: 'planning', progress: 0, budget: '1000', startDate: now, dueDate: now, createdAt: now });
    inMemoryDb.projectMembers.set(`${id}-owner`, { id: `${id}-owner`, projectId: id, userId: owner });
  }
  inMemoryDb.teams.set('team', { id: 'team', workspaceId: ws, name: 'Private Team', leadId: 'admin', createdAt: now });
  for (const [id, workspaceId, assignedTo, learning] of [
    ['task', ws, 'peer', false], ['own-task', ws, 'employee', false], ['learning-task', ws, 'intern', true],
    ['nonlearning-task', ws, 'intern', false], ['foreign-task', foreignWs, 'foreign-admin', false],
  ] as const) {
    inMemoryDb.tasks.set(id, { id, workspaceId, projectId: workspaceId === ws ? 'project' : 'foreign-project',
      assignedTo, createdBy: workspaceId === ws ? 'admin' : 'foreign-admin', title: id, description: 'confidential task',
      status: 'todo', priority: 'medium', isLearningTask: learning, dueDate: now, createdAt: now });
    inMemoryDb.taskComments.set(`${id}-comment`, { id: `${id}-comment`, taskId: id, workspaceId, userId: assignedTo,
      content: 'CONFIDENTIAL_COMMENT', createdAt: now });
  }
  for (const visibility of ['private', 'admin_only', 'department', 'workspace', 'public', 'learning', 'team']) {
    const id = `doc-${visibility}`;
    inMemoryDb.documents.set(id, { id, workspaceId: ws, ownerId: 'admin', title: id, visibility,
      departmentId: 'other-dept', category: 'Audit', fileType: 'pdf', fileSize: '1 KB', fileSizeBytes: 1000,
      r2Url: 'https://storage.invalid/audit.pdf', storageKey: `${ws}/${id}`, createdAt: now, downloadCount: 0 });
    inMemoryDb.wikiPages.set(`wiki-${visibility}`, { id: `wiki-${visibility}`, workspaceId: ws, createdBy: 'admin',
      title: `wiki-${visibility}`, content: 'CONFIDENTIAL_WIKI', visibility, departmentId: 'other-dept',
      createdAt: now, updatedAt: now });
    inMemoryDb.wikiComments.set(`wiki-${visibility}-comment`, { id: `wiki-${visibility}-comment`,
      pageId: `wiki-${visibility}`, userId: 'admin', comment: 'CONFIDENTIAL_WIKI_COMMENT', createdAt: now });
  }
  inMemoryDb.wikiPages.set('foreign-wiki', { id: 'foreign-wiki', workspaceId: foreignWs, createdBy: 'foreign-admin',
    title: 'Foreign wiki', content: 'FOREIGN_SECRET', visibility: 'private', createdAt: now, updatedAt: now });
  inMemoryDb.crmRecords.set('lead', { id: 'lead', workspaceId: ws, ownerId: 'peer', customerName: 'Secret Customer',
    company: 'Secret Company', status: 'new_lead', dealValue: 1000, email: 'secret@rbac.example', notes: 'Secret note', createdAt: now, updatedAt: now });
  inMemoryDb.documents.set('foreign-document', { ...inMemoryDb.documents.get('doc-private'), id: 'foreign-document', workspaceId: foreignWs, ownerId: 'foreign-admin' });
  inMemoryDb.teams.set('foreign-team', { ...inMemoryDb.teams.get('team'), id: 'foreign-team', workspaceId: foreignWs, leadId: 'foreign-admin' });
  inMemoryDb.crmRecords.set('foreign-lead', { ...inMemoryDb.crmRecords.get('lead'), id: 'foreign-lead', workspaceId: foreignWs, ownerId: 'foreign-admin' });
  inMemoryDb.activityLogs.set('activity', { id: 'activity', workspaceId: ws, actorId: 'admin', action: 'project.created',
    entityType: 'project', entityId: 'project', details: { secret: 'CONFIDENTIAL_ACTIVITY' }, createdAt: now });
}

async function request(role: Role, method: string, path: string, body?: unknown, headers = {}) {
  const res = await app.fetch(new Request(`http://localhost:3000${path}`, { method,
    headers: { 'Content-Type': 'application/json', ...(role === 'anonymous' ? {} : { Authorization: `Bearer audit-${role}` }), ...headers },
    body: ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(body ?? {}) }));
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

async function check(name: string, test: () => unknown | Promise<unknown>) {
  seed();
  try { await test(); results.push({ name, pass: true }); }
  catch (error) { results.push({ name, pass: false, detail: error instanceof Error ? error.message : String(error) }); }
}
function denied(res: { status: number }) { assert.ok([401, 403, 404].includes(res.status), `Expected access denial, received ${res.status}`); }
function success(res: { status: number }) { assert.ok(res.status >= 200 && res.status < 300, `Expected success, received ${res.status}`); }

function concretePath(original: string) {
  const p = canonicalPath(original);
  const id = p.startsWith('/tasks') ? 'task' : p.startsWith('/projects') ? 'project' : p.startsWith('/teams') ? 'team'
    : p.startsWith('/documents') ? 'doc-admin_only' : p.startsWith('/wiki') ? 'wiki-admin_only'
    : p.startsWith('/crm') ? 'lead' : p.includes('department') ? 'dept' : 'missing-audit-resource';
  return original.replace(/:([\w]+)(?:\{[^}]+\})?/g, (_, key) => ({ userId: 'peer', memberId: 'peer',
    workspaceId: ws, crmId: 'lead', token: 'invalid-audit-token' }[key] || id)).replaceAll('*', 'audit-file');
}

async function focusedCases() {
  for (const base of ['/api']) {
    for (const role of ['admin', 'employee', 'intern'] as const) {
      await check(`${base || 'root'} ${role}: own assigned task read`, async () => {
        success(await request(role, 'GET', `${base}/tasks/${role === 'intern' ? 'learning-task' : role === 'employee' ? 'own-task' : 'task'}`));
      });
      for (const suffix of ['', '/comments', '/activity', '/discussion']) {
        await check(`${base || 'root'} ${role}: unassigned task${suffix} boundary`, async () => {
          const res = await request(role, 'GET', `${base}/tasks/task${suffix}`);
          role === 'admin' ? success(res) : denied(res);
        });
      }
      for (const action of ['start', 'submit-review', 'approve', 'request-changes', 'block', 'unblock']) {
        await check(`${base || 'root'} ${role}: ${action} unauthorized task must not mutate`, async () => {
          const task = inMemoryDb.tasks.get('task');
          task.status = ['approve', 'request-changes'].includes(action) ? 'review' : action === 'submit-review' ? 'in_progress' : 'todo';
          task.isBlocked = action === 'unblock';
          const before = JSON.stringify(task);
          const res = await request(role, 'POST', `${base}/tasks/task/${action}`, { reason: 'test reason', feedback: 'test feedback' });
          if (role === 'admin') success(res);
          else {
            assert.equal(JSON.stringify(inMemoryDb.tasks.get('task')), before, `Unauthorized ${action} persisted a task mutation (HTTP ${res.status})`);
            denied(res);
          }
        });
      }
      for (const module of ['projects', 'teams', 'crm']) {
        const id = { projects: 'project', teams: 'team', crm: 'lead' }[module];
        await check(`${base || 'root'} ${role}: ${module} unassigned detail`, async () => {
          const res = await request(role, 'GET', `${base}/${module}/${id}`);
          role === 'admin' ? success(res) : denied(res);
        });
      }
      for (const visibility of ['private', 'admin_only', 'department', 'workspace', 'public', 'learning']) {
        for (const module of ['documents', 'wiki']) {
          await check(`${base || 'root'} ${role}: ${module} ${visibility} detail`, async () => {
            const res = await request(role, 'GET', `${base}/${module}/${module === 'documents' ? 'doc' : 'wiki'}-${visibility}`);
            const permitted = role === 'admin' || ['public', 'learning'].includes(visibility) || (role === 'employee' && visibility === 'workspace');
            permitted ? success(res) : denied(res);
          });
        }
      }
      for (const method of ['GET', 'PATCH', 'DELETE']) {
        await check(`${base || 'root'} ${role}: foreign project ${method}`, async () => {
          denied(await request(role, method, `${base}/projects/foreign-project`, { title: 'tampered' }));
          assert.equal(inMemoryDb.projects.get('foreign-project')?.title, 'foreign-project');
        });
      }
      await check(`${base || 'root'} ${role}: foreign wiki comment must not persist`, async () => {
        const before = inMemoryDb.wikiComments.size;
        const res = await request(role, 'POST', `${base}/wiki/pages/foreign-wiki/comments`, { comment: 'tampered' });
        assert.equal(inMemoryDb.wikiComments.size, before, `Cross-tenant comment persisted (HTTP ${res.status})`);
        denied(res);
      });
      await check(`${base || 'root'} ${role}: restricted wiki comments`, async () => {
        const res = await request(role, 'GET', `${base}/wiki/pages/wiki-admin_only/comments`);
        role === 'admin' ? success(res) : denied(res);
      });
    }
  }
  for (const prefix of ['/api', '/api/v2']) {
    for (const role of ['admin', 'employee', 'intern'] as const) {
      for (const action of ['assignees', 'recurrence', 'dependency']) {
        await check(`${prefix} ${role}: foreign task ${action} cannot mutate`, async () => {
          const maps = [inMemoryDb.taskAssignees, inMemoryDb.taskRecurrenceRules, inMemoryDb.taskDependencies];
          const before = maps.map(m => JSON.stringify([...m]));
          const res = await request(role, 'POST', `${prefix}/tasks/foreign-task/${action}`, { userIds: ['employee'], dependsOnTaskId: 'task' });
          assert.deepEqual(maps.map(m => JSON.stringify([...m])), before, `Foreign task extension persisted (HTTP ${res.status})`);
          denied(res);
        });
      }
    }
  }
  for (const role of ['employee', 'intern'] as const) {
    await check(`${role}: forged identity fields cannot create project`, async () => {
      denied(await request(role, 'POST', '/api/projects', { title: 'forged', userId: 'admin', role: 'admin',
        workspaceId: foreignWs, ownerId: 'admin' }, { 'x-role': 'admin', 'x-user-id': 'admin', 'x-workspace-id': foreignWs }));
      assert.equal(inMemoryDb.projects.size, 2);
    });
    await check(`${role}: global admin role does not override membership`, async () => {
      inMemoryDb.users.get(role)!.role = 'admin';
      denied(await request(role, 'POST', '/api/projects', { title: 'forged' }));
    });
    await check(`${role}: revoked membership denies active workspace`, async () => {
      inMemoryDb.workspaceMembers.delete(role);
      denied(await request(role, 'GET', '/api/projects/project'));
    });
    await check(`${role}: document list omits restricted records`, async () => {
      const res = await request(role, 'GET', '/api/documents'); success(res);
      const documents = res.data.documents;
      assert.ok(Array.isArray(documents));
      assert.ok(!documents.some((d: any) => ['admin_only', 'private', 'department', ...(role === 'intern' ? ['workspace', 'team'] : [])].includes(d.visibility)), 'List contains restricted document');
    });
    await check(`${role}: workspace analytics denied`, async () => denied(await request(role, 'GET', '/api/dashboard/executive')));
  }
  await check('intern: assigned non-learning task hidden', async () => denied(await request('intern', 'GET', '/api/tasks/nonlearning-task')));
  await check('employee: assigned project metadata and membership remain admin-only', async () => {
    inMemoryDb.projectMembers.set('employee-project', { projectId: 'project', userId: 'employee' });
    const res = await request('employee', 'PATCH', '/api/projects/project', { title: 'tampered', memberIds: ['employee', 'intern'] });
    assert.equal(inMemoryDb.projects.get('project')?.title, 'project'); denied(res);
  });
  await check('employee: assigned project task creation allowed by specification', async () => {
    inMemoryDb.projectMembers.set('employee-project', { projectId: 'project', userId: 'employee' });
    success(await request('employee', 'POST', '/api/tasks', { title: 'Permitted task', projectId: 'project', assignedTo: 'employee' }));
  });
  await check('employee: admin-only organization upload permission denied', () => assert.equal(can('employee', 'documents:createOrg'), false));
  await check('UI employee task creation matches docs', () => assert.equal(ROLE_PERMISSIONS.employee.tasks.create, true));
  await check('UI employee personal document upload matches docs', () => assert.equal(ROLE_PERMISSIONS.employee.documents.createPersonalDoc, true));
  for (const role of ['admin', 'employee', 'intern'] as const) {
    for (const key of ['create', 'edit', 'delete'] as const) {
      await check(`UI ${role}: project ${key} administrative permission`, () => assert.equal(ROLE_PERMISSIONS[role].projects[key], role === 'admin'));
    }
    for (const key of ['manageTeams', 'inviteMembers'] as const) {
      await check(`UI ${role}: ${key}`, () => assert.equal(ROLE_PERMISSIONS[role].teams[key], role === 'admin'));
    }
    for (const feature of ['billing', 'analytics'] as const) {
      await check(`UI ${role}: ${feature} view`, () => assert.equal(ROLE_PERMISSIONS[role][feature].view, role === 'admin'));
    }
  }
  await additionalBoundaryCases();
}

async function additionalBoundaryCases() {
  for (const role of ['admin', 'employee', 'intern'] as const) {
    // Management actions need both successful administrator controls and denied non-admin controls.
    for (const [method, path, body] of [
      ['POST', '/api/people/departments', { name: 'New Department' }],
      ['PUT', '/api/people/departments/dept', { name: 'Changed Department' }],
      ['POST', '/api/departments/dept/members', { userId: 'peer' }],
      ['PATCH', '/api/departments/dept/lead', { leadId: 'peer' }],
      ['POST', '/api/teams', { name: 'New Team' }],
      ['PATCH', '/api/teams/team', { name: 'Changed Team' }],
      ['DELETE', '/api/teams/team', {}],
      ['POST', '/api/projects', { title: 'New Project' }],
      ['PATCH', '/api/projects/project', { title: 'Changed Project' }],
      ['DELETE', '/api/projects/project', {}],
      ['PATCH', '/api/workspace/settings', { name: 'Changed Workspace' }],
      ['POST', '/api/crm', { customerName: 'Test Customer', company: 'Test Company', dealValue: 1000 }],
      ['DELETE', '/api/crm/lead', {}],
      ['DELETE', '/api/tasks/task', {}],
      ['DELETE', '/api/members/peer', {}],
      ['POST', '/api/invites', { email: 'invitee@rbac.example', role: 'employee' }],
    ] as const) {
      await check(`${role}: management ${method} ${path}`, async () => {
        const res = await request(role, method, path, body);
        role === 'admin' ? success(res) : denied(res);
      });
    }
    for (const [module, id, store] of [
      ['tasks', 'foreign-task', inMemoryDb.tasks], ['teams', 'foreign-team', inMemoryDb.teams],
      ['crm', 'foreign-lead', inMemoryDb.crmRecords], ['documents', 'foreign-document', inMemoryDb.documents],
    ] as const) {
      for (const method of module === 'documents' ? ['GET', 'DELETE'] : ['GET', 'PATCH', 'DELETE']) {
        await check(`${role}: foreign ${module} ${method} does not expose or mutate`, async () => {
          const before = JSON.stringify(store.get(id));
          const res = await request(role, method, `/api/${module}/${id}`, { title: 'tampered', name: 'tampered', notes: 'tampered' });
          denied(res); assert.equal(JSON.stringify(store.get(id)), before);
        });
      }
    }
    await check(`${role}: owned document deletion`, async () => {
      const object = await ObjectStorageService.uploadObject({ workspaceId: ws, documentId: 'own-document', filename: 'own.txt', body: 'own document' });
      inMemoryDb.documents.set('own-document', { ...inMemoryDb.documents.get('doc-private'), id: 'own-document', ownerId: role,
        storageKey: object.key, r2Key: object.key, storageUrl: object.url, r2Url: object.url });
      const res = await request(role, 'DELETE', '/api/documents/own-document');
      if (role === 'intern') { denied(res); assert.ok(inMemoryDb.documents.has('own-document')); }
      else { success(res); assert.ok(!inMemoryDb.documents.has('own-document')); }
    });
    await check(`${role}: assigned task start positive control`, async () => {
      const taskId = role === 'intern' ? 'learning-task' : role === 'employee' ? 'own-task' : 'task';
      const res = await request(role, 'POST', `/api/tasks/${taskId}/start`); success(res);
      assert.equal(inMemoryDb.tasks.get(taskId)?.status, 'in_progress');
    });
for (const base of ['/api']) {
      await check(`${role}: ${base} cannot switch to foreign workspace`, async () => {
        denied(await request(role, 'POST', `${base}/workspace/switch`, { workspaceId: foreignWs }));
        assert.equal(inMemoryDb.sessions.get(`audit-${role}`)?.workspaceId, ws);
      });
      for (const target of ['doc-admin_only', 'doc-private', 'doc-department']) {
        for (const method of ['GET', 'POST']) {
          await check(`${role}: ${base} ${method} restricted download ${target}`, async () => {
            const res = await request(role, method, `${base}/documents/${target}/download`);
            role === 'admin' ? success(res) : denied(res);
          });
        }
      }
      for (const access of ['vault', 'download-stream']) {
        await check(`${role}: ${base} raw storage ${access} enforces document visibility`, async () => {
          const object = await ObjectStorageService.uploadObject({ workspaceId: ws, documentId: 'raw-secret', filename: 'secret.txt',
            body: 'CONFIDENTIAL_FILE_BYTES', contentType: 'text/plain' });
          inMemoryDb.documents.set('raw-secret', { ...inMemoryDb.documents.get('doc-admin_only'), id: 'raw-secret', storageKey: object.key });
          const path = access === 'vault' ? `${base}/documents/vault/${object.key}` : `${base}/documents/download-stream?key=${encodeURIComponent(object.key)}`;
          const res = await request(role, 'GET', path);
          if (role === 'admin') {
            // The legacy vault alias has a separate path-decoding bug; retain as a failed positive control.
            success(res); assert.equal(res.data, 'CONFIDENTIAL_FILE_BYTES');
          } else denied(res);
        });
      }
      for (const visibility of ['private', 'workspace', 'admin_only']) {
        await check(`${role}: ${base} upload ${visibility}`, async () => {
          const before = inMemoryDb.documents.size;
          const res = await request(role, 'POST', `${base}/documents`, { title: 'Upload test', content: 'test', visibility });
          const permitted = role === 'admin' || (role === 'employee' && visibility === 'private');
          if (permitted) success(res);
          else { assert.equal(inMemoryDb.documents.size, before, `Unauthorized upload persisted (${res.status})`); denied(res); }
        });
      }
      for (const action of ['start', 'manual']) {
        await check(`${role}: ${base} foreign task time ${action}`, async () => {
          const res = await request(role, 'POST', `${base}/time/${action}`, { taskId: 'foreign-task', durationMinutes: 30 });
          assert.equal(inMemoryDb.taskTimeEntries.size, 0, `Time entry linked to foreign task (${res.status})`); denied(res);
        });
      }
    }
    for (const action of ['read', 'archive', 'delete']) {
      await check(`${role}: cannot modify another recipient notification (${action})`, async () => {
        inMemoryDb.notifications.set('peer-notification', { id: 'peer-notification', workspaceId: ws, userId: 'peer',
          recipientId: 'peer', title: 'Private', message: 'Private', type: 'system', isRead: false, createdAt: now });
        const before = JSON.stringify(inMemoryDb.notifications.get('peer-notification'));
        const res = await request(role, action === 'delete' ? 'DELETE' : 'PATCH', `/api/notifications/peer-notification${action === 'delete' ? '' : '/' + action}`);
        denied(res); assert.equal(JSON.stringify(inMemoryDb.notifications.get('peer-notification')), before);
      });
    }
    await check(`${role}: task list with forged assignee filter cannot reveal peer task`, async () => {
      const res = await request(role, 'GET', '/api/tasks?assignedTo=peer'); success(res);
      if (role !== 'admin') assert.ok(!res.data.tasks.some((t: any) => t.id === 'task'));
    });
    await check(`${role}: task update cannot attach foreign project`, async () => {
      const target = role === 'intern' ? 'learning-task' : 'own-task';
      const res = await request(role, 'PATCH', `/api/tasks/${target}`, { projectId: 'foreign-project' });
      assert.equal(inMemoryDb.tasks.get(target)?.projectId, 'project', `Foreign project reference persisted (${res.status})`); denied(res);
    });
    await check(`${role}: cannot update peer goal progress`, async () => {
      inMemoryDb.goals.set('peer-goal', { id: 'peer-goal', workspaceId: ws, userId: 'peer', title: 'Peer Goal',
        progress: 0, currentValue: 0, status: 'active', createdAt: now });
      const res = await request(role, 'PATCH', '/api/people/goals/peer-goal/progress', { progressPercent: 100, progressValue: 100 });
      if (role === 'admin') success(res);
      else { assert.equal(inMemoryDb.goals.get('peer-goal')?.progress, 0, `Peer goal changed (HTTP ${res.status})`); denied(res); }
    });
  }
  for (const role of ['employee', 'intern'] as const) {
    await check(`${role}: activity feed does not expose unassigned project`, async () => {
      const res = await request(role, 'GET', '/api/activity'); success(res);
      assert.ok(!JSON.stringify(res.data).includes('CONFIDENTIAL_ACTIVITY'));
    });
    for (const module of ['projects', 'tasks', 'crm', 'documents', 'teams']) {
      await check(`${role}: search ${module} hides restricted records`, async () => {
        const res = await request(role, 'GET', `/api/search/${module}?q=Secret`);
        if (res.status === 403) return;
        success(res); assert.ok(!JSON.stringify(res.data).includes('Secret Customer') && !JSON.stringify(res.data).includes('Secret Company'));
      });
    }
    await check(`${role}: revoked membership cannot read foreign public wiki`, async () => {
      inMemoryDb.workspaceMembers.delete(role);
      inMemoryDb.wikiPages.get('foreign-wiki')!.visibility = 'public';
      denied(await request(role, 'GET', '/api/wiki/foreign-wiki'));
    });
  }
  await check('employee: assigned CRM lead permits notes but not ownership/value changes', async () => {
    inMemoryDb.crmRecords.get('lead')!.ownerId = 'employee';
    success(await request('employee', 'PATCH', '/api/crm/lead', { notes: 'Permitted operational note' }));
    const res = await request('employee', 'PATCH', '/api/crm/lead', { ownerId: 'intern', dealValue: 999999 });
    assert.equal(inMemoryDb.crmRecords.get('lead')?.ownerId, 'employee', `Lead ownership changed (${res.status})`);
    denied(res);
  });
  await check('employee: unassigned project timeline hidden', async () => denied(await request('employee', 'GET', '/api/projects/project/updates')));
  await check('employee: project membership alone cannot edit another assignee task details', async () => {
    inMemoryDb.projectMembers.set('employee-project', { projectId: 'project', userId: 'employee' });
    const res = await request('employee', 'PATCH', '/api/tasks/task', { title: 'Unauthorized edit' });
    assert.equal(inMemoryDb.tasks.get('task')?.title, 'task', `Project member changed non-owned task details (${res.status})`); denied(res);
  });
  for (const role of ['employee', 'intern'] as const) {
    await check(`${role}: HEAD cannot bypass executive analytics gate`, async () => denied(await request(role, 'HEAD', '/api/dashboard/executive')));
  }
  await check('anonymous: OPTIONS returns no business data', async () => {
    const res = await request('anonymous', 'OPTIONS', '/api/tasks/task');
    assert.equal(res.status, 204); assert.equal(res.data, '');
  });
  for (const role of roles) {
    await check(`${role}: invalid session cannot read tasks`, async () => {
      const res = await request(role, 'GET', '/api/tasks', undefined, { Authorization: 'Bearer invalid-session-token' });
      assert.equal(res.status, 401);
    });
  }
  for (const scenario of ['missing', 'lookup-failure']) {
    await check(`resolver: ${scenario} membership fails closed despite cached admin`, async () => {
      const original = WorkspaceRepository.getWorkspaceMember;
      if (scenario === 'lookup-failure') WorkspaceRepository.getWorkspaceMember = async () => { throw new Error('Simulated membership lookup failure'); };
      try {
        const probe = new Hono();
        probe.get('/', async c => {
          c.set('user', { id: 'removed-user', role: 'admin' } as any);
          c.set('workspace', { id: ws, ownerId: 'admin', roleInWorkspace: 'admin' } as any);
          const resolved = await resolveMembershipRole(c);
          return c.json({ role: resolved.role });
        });
        const res = await probe.request('/');
        if ([401, 403].includes(res.status)) return;
        assert.notEqual((await res.json()).role, 'admin', 'Unverified cached/global admin role was accepted');
      } finally { WorkspaceRepository.getWorkspaceMember = original; }
    });
  }
  for (const role of ['employee', 'intern'] as const) {
      await check(`${role}: cannot submit another employee self-review`, async () => {
      inMemoryDb.performanceReviews.set('peer-review', { id: 'peer-review', workspaceId: ws, userId: 'peer', reviewerId: 'admin',
        cycle: '2026-Q3', status: 'self_review', selfRatings: null, createdAt: now, updatedAt: now });
      const res = await request(role, 'POST', '/api/people/performance/reviews/peer-review/self', { selfRatings: { communication: 5 } });
      assert.equal(inMemoryDb.performanceReviews.get('peer-review')?.selfRatings, null, `Peer self-review overwritten (${res.status})`); denied(res);
    });
  }
  const renderRoute = await createUiRouteProbe();
  const permissionKeys = [
    'workspace.view', 'workspace.manage', 'projects.viewAll', 'projects.viewAssigned', 'projects.create', 'projects.edit',
    'projects.delete', 'projects.comment', 'projects.updateProgress', 'tasks.viewAll', 'tasks.viewAssigned', 'tasks.create',
    'tasks.updateStatus', 'tasks.delete', 'tasks.assign', 'documents.viewAll', 'documents.viewShared', 'documents.viewLearning',
    'documents.createOrgDoc', 'documents.createPersonalDoc', 'documents.delete', 'documents.download', 'crm.viewAll',
    'crm.viewAssigned', 'crm.managePipeline', 'crm.editNotes', 'crm.createRecord', 'crm.deleteRecord', 'teams.viewAll',
    'teams.viewMyTeam', 'teams.manageTeams', 'teams.inviteMembers', 'analytics.view', 'analytics.exportReports',
    'billing.view', 'billing.manage', 'settings.manage', 'settings.adminTools',
  ];
  const granted: Record<string, string[]> = {
    admin: permissionKeys,
    employee: ['workspace.view', 'projects.viewAssigned', 'projects.comment', 'projects.updateProgress',
      'tasks.viewAssigned', 'tasks.create', 'tasks.updateStatus', 'documents.viewShared', 'documents.viewLearning',
      'documents.createPersonalDoc', 'documents.download', 'crm.viewAssigned', 'crm.editNotes', 'teams.viewMyTeam'],
    intern: ['tasks.viewAssigned', 'tasks.updateStatus', 'documents.viewLearning', 'documents.download'],
  };
  for (const role of ['admin', 'employee', 'intern'] as const) {
    await check(`UI ${role}: every permission flag has an explicit contract`, () => {
      const keys = Object.entries(ROLE_PERMISSIONS[role]).flatMap(([module, permissions]) => Object.keys(permissions).map(key => `${module}.${key}`));
      assert.deepEqual(keys.sort(), [...permissionKeys].sort());
    });
    for (const key of permissionKeys) {
      await check(`UI permission ${role}: ${key}`, () => {
        const [module, action] = key.split('.');
        assert.equal((ROLE_PERMISSIONS[role] as any)[module][action], granted[role].includes(key));
      });
    }
  }
  const views: Record<string, string[]> = {
    dashboard: ['admin', 'employee', 'intern'], workspaces: ['admin', 'employee', 'intern'], onboarding: ['admin', 'employee', 'intern'],
    notifications: ['admin', 'employee', 'intern'], workspace: ['admin', 'employee'], projects: ['admin', 'employee'],
    tasks: ['admin', 'employee', 'intern'], knowledge: ['admin', 'employee', 'intern'], wiki: ['admin', 'employee', 'intern'],
    documents: ['admin', 'employee', 'intern'], time: ['admin', 'employee', 'intern'], integrations: ['admin', 'employee'],
    crm: ['admin', 'employee'], teams: ['admin', 'employee'], people: ['admin', 'employee'], analytics: ['admin'], billing: ['admin'],
    settings: ['admin'], automations: ['admin'], admin_tools: ['admin'],
  };
  for (const [view, allowedRoles] of Object.entries(views)) {
    for (const role of ['admin', 'employee', 'intern'] as const) {
      await check(`UI render ${role}: ${view} route guard`, () => {
        const markup = renderRoute(role, view);
        assert.equal(!markup.includes('data-rbac-view="ForbiddenPage"'), allowedRoles.includes(role), `Unexpected ${role} visibility for ${view}`);
      });
    }
  }
  await realtimeCases();
}

async function realtimeCases() {
  class Socket extends EventEmitter {
    readyState = 1;
    messages: any[] = [];
    send(value: string) { this.messages.push(JSON.parse(value)); }
    close() { this.readyState = 3; }
  }
  for (const role of ['admin', 'employee', 'intern'] as const) {
    for (const operation of ['subscribe-foreign', 'broadcast-foreign', 'revoked-session', 'project-event']) {
      await check(`WebSocket ${role}: ${operation}`, async () => {
        const server = new WorkspaceWebSocketServer();
        const socket = new Socket();
        const victimMessages: string[] = [];
        try {
          await (server as any).handleConnection(socket, { url: `/ws?token=audit-${role}`, headers: { host: 'localhost' }, socket: { remoteAddress: '127.0.0.1' } });
          assert.ok(socket.messages.some(m => m.type === 'connected'), 'Socket positive authentication control failed');
          ChannelManager.registerClient({ id: 'victim-socket', userId: 'foreign-admin', workspaceId: foreignWs, role: 'admin',
            connectedAt: now, lastActive: now, isAlive: true, send: s => victimMessages.push(s), close: () => {} });
          socket.messages.length = 0;
          const dispatch = async (data: unknown) => {
            for (const listener of socket.listeners('message')) await listener(Buffer.from(JSON.stringify(data)));
          };
          if (operation === 'subscribe-foreign') {
            await dispatch({ type: 'subscribe', channel: `workspace:${foreignWs}` });
            assert.ok(socket.messages.some(m => m.code === 'FORBIDDEN'));
          } else if (operation === 'broadcast-foreign') {
            await dispatch({ type: 'broadcast', channel: `workspace:${foreignWs}`, event: 'audit-injection', payload: { tampered: true } });
            assert.equal(victimMessages.length, 0, 'Foreign workspace received attacker broadcast');
          } else if (operation === 'revoked-session') {
            inMemoryDb.sessions.delete(`audit-${role}`);
            await dispatch({ type: 'subscribe', channel: `workspace:${ws}` });
            assert.ok(!socket.messages.some(m => m.type === 'subscribed'), 'Revoked socket session retained access');
          } else {
            (server as any).handleEventBusMessage({ type: 'project.created', workspaceId: ws, payload: { title: 'PRIVATE_PROJECT' }, timestamp: now.toISOString() });
            if (role === 'admin') assert.ok(socket.messages.some(m => m.payload?.title === 'PRIVATE_PROJECT'));
            else assert.ok(!socket.messages.some(m => m.payload?.title === 'PRIVATE_PROJECT'), 'Unassigned client received project event');
          }
        } finally { await server.close(); }
      });
    }
  }
}

export async function runRbacAudit(options: { writeReport?: boolean } = {}) {
  assert.equal(process.env.NODE_ENV, 'test', 'Use npm run test:rbac to isolate this audit');
  assert.equal(process.env.DATABASE_URL, '', 'Audit must not use a real database');
  results.length = 0;
  const log = console.log;
  const warn = console.warn;
  const error = console.error;
  const routeRows: any[] = [];
  let focusedCount = 0;
  console.log = console.warn = console.error = () => {};
  try {
    await focusedCases();
    focusedCount = results.length;
    const unique = new Map(app.routes.filter(r => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method)).map(r => [`${r.method} ${r.path}`, r]));
    for (const route of unique.values()) {
      const policy = expectedPolicy(route.method, route.path);
      if (policy === 'review') results.push({ name: `Unclassified endpoint ${route.method} ${route.path}`, pass: false,
        detail: 'Add an explicit permission contract and valid resource cases for this endpoint.' });
      const row: any = { method: route.method, path: route.path, policy, concretePath: concretePath(route.path), observations: {} };
      for (const role of roles) {
        seed();
        const res = await request(role, route.method, row.concretePath, { title: 'Audit', name: 'Audit', content: 'Audit', comment: 'Audit',
          reason: 'Audit', feedback: 'Audit', projectId: 'project', assignedTo: role, userIds: ['employee'], userId: 'employee',
          memberId: 'employee', role: 'employee', email: 'new@rbac.example', password: 'AuditPassword123!', workspaceId: ws,
          status: 'online', progress: 25, value: 1000, visibility: 'private', fileType: 'pdf', triggerType: 'task.created' });
        const expected = allowed(policy, role);
        const isSuccess = res.status >= 200 && res.status < 300;
        const violation = expected === false && isSuccess;
        const outcome = violation ? 'FAIL: forbidden access succeeded' : expected === false && [401, 403].includes(res.status)
          ? 'PASS: boundary denied' : expected === true && isSuccess ? 'REACHED: resource scope needs focused cases'
          : `INCONCLUSIVE: HTTP ${res.status}`;
        row.observations[role] = { status: res.status, outcome, code: res.data?.error?.code };
        if (violation) results.push({ name: `${role} ${route.method} ${route.path}: ${policy} boundary`, pass: false, detail: `Expected denial, got ${res.status}` });
      }
      routeRows.push(row);
    }
  } finally { console.log = log; console.warn = warn; console.error = error; }
  const ui = uiInventory();
  const failed = results.filter(r => !r.pass);
  const outcomes: Record<string, number> = {};
  for (const row of routeRows) for (const role of roles) {
    const outcome = row.observations[role].outcome.split(':')[0];
    outcomes[outcome] = (outcomes[outcome] || 0) + 1;
  }
  const summary = { endpointCount: routeRows.length, roleProbes: routeRows.length * roles.length,
    uiHandlerCount: ui.length, focusedChecks: focusedCount, focusedPassed: results.slice(0, focusedCount).filter(r => r.pass).length,
    focusedFailed: results.slice(0, focusedCount).filter(r => !r.pass).length, probeOutcomes: outcomes,
    failed: failed.length };
  if (options.writeReport) {
    fs.mkdirSync('docs/audits', { recursive: true });
    fs.writeFileSync('docs/audits/rbac-results.json', JSON.stringify({ summary, cases: results, routes: routeRows, ui }, null, 2) + '\n');
    const cell = (x: string) => x.replaceAll('|', '\\|').replaceAll('\n', ' ');
    fs.writeFileSync('docs/audits/rbac-endpoints.md', '# Mounted endpoint audit\n\nGenerated by `npm run audit:rbac`. Real Hono requests with test-only sessions and in-memory fixtures. Each alias is probed separately. A 400/404/500 is inconclusive, not proof of authorization. REACHED does not certify resource-level access. Platform endpoints must reject ordinary workspace admins. Public token/signature endpoints have separate credentials.\n\n| Method | Endpoint | Expected boundary | Admin | Employee | Intern | Anonymous |\n|---|---|---|---|---|---|---|\n' + routeRows.map(r => `| ${r.method} | ${r.path} | ${r.policy} | ${roles.map(role => `${r.observations[role].status} ${r.observations[role].outcome}`).join(' | ')} |`).join('\n') + '\n');
    fs.writeFileSync('docs/audits/rbac-ui-actions.md', '# UI action inventory\n\nStatic AST inventory of every JSX event binding, including form, click, keyboard, navigation and modal callbacks. Context is evidence to review, not proof of authorization: handler-local checks, parent routing, and disabled controls need separate verification. No browser interaction is claimed. Role permission table assertions are in the executable audit.\n\n| File | Line | Event | Handler | Enclosing condition |\n|---|---|---|---|---|\n' + ui.map(r => `| ${r.file} | ${r.line} | ${r.event} | ${cell(r.handler)} | ${cell(r.context)} |`).join('\n') + '\n');
    fs.writeFileSync('docs/audits/rbac-failed-cases.md', '# Failing regression expectations\n\nFailures include security violations, policy mismatches, and functional positive-control failures. Counts include aliases and roles; they are not distinct vulnerability counts. See the main audit for triage.\n\n| Case | Evidence |\n|---|---|\n' + failed.map(r => `| ${cell(r.name)} | ${cell((r.detail || '').split('\n')[0])} |`).join('\n') + '\n');
  }
  console.log('RBAC audit:', JSON.stringify(summary));
  for (const result of failed) console.error(`FAIL ${result.name}: ${result.detail?.slice(0, 200)}`);
  assert.equal(failed.length, 0, `${failed.length} RBAC expectations failed; see docs/audits/rbac-results.json (generate with npm run audit:rbac).`);
}
