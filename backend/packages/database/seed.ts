import { inMemoryDb } from './connection';
import bcrypt from 'bcryptjs';

const DEMO_PASSWORD_HASH = bcrypt.hashSync('PoloPassword2026!', 10);

export function seedPoloTechnologies() {
  // Clear or idempotent check
  if (inMemoryDb.workspaces.has('ws-polo-tech')) {
    return;
  }

  const now = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const nextWeek = new Date(Date.now() + 7 * 86400000);
  const nextMonth = new Date(Date.now() + 30 * 86400000);

  // 1. Workspace
  inMemoryDb.workspaces.set('ws-polo-tech', {
    id: 'ws-polo-tech',
    name: 'Polo Technologies',
    slug: 'polo-technologies',
    ownerId: 'user-polo-admin',
    plan: 'pro',
    logo: null,
    createdAt: yesterday,
    updatedAt: now,
  });

  // 2. Users
  const users = [
    {
      id: 'user-polo-admin',
      name: 'Swastik',
      email: 'swastik@polotech.com',
      password: DEMO_PASSWORD_HASH,
      role: 'admin',
      title: 'Chief Executive & Founder',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      teamId: 'team-polo-growth',
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: 'user-polo-pm',
      name: 'Product Manager',
      email: 'pm@polotech.com',
      password: DEMO_PASSWORD_HASH,
      role: 'employee',
      title: 'Senior Product Manager',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      teamId: 'team-polo-design',
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: 'user-polo-frontend',
      name: 'Frontend Developer',
      email: 'frontend@polotech.com',
      password: DEMO_PASSWORD_HASH,
      role: 'employee',
      title: 'Senior Frontend Engineer',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      teamId: 'team-polo-eng',
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: 'user-polo-backend',
      name: 'Backend Developer',
      email: 'backend@polotech.com',
      password: DEMO_PASSWORD_HASH,
      role: 'employee',
      title: 'Staff Backend Engineer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      teamId: 'team-polo-eng',
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: 'user-polo-ui-intern',
      name: 'UI Intern',
      email: 'ui.intern@polotech.com',
      password: DEMO_PASSWORD_HASH,
      role: 'intern',
      title: 'UI/UX Design Intern',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      teamId: 'team-polo-design',
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: 'user-polo-mkt-intern',
      name: 'Marketing Intern',
      email: 'mkt.intern@polotech.com',
      password: DEMO_PASSWORD_HASH,
      role: 'intern',
      title: 'Growth & Marketing Intern',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      teamId: 'team-polo-growth',
      createdAt: yesterday,
      updatedAt: now,
    },
  ];

  users.forEach((u) => {
    inMemoryDb.users.set(u.id, u as any);
  });

  // 3. Workspace Memberships
  users.forEach((u) => {
    const memId = `mem-${u.id}`;
    inMemoryDb.workspaceMembers.set(memId, {
      id: memId,
      workspaceId: 'ws-polo-tech',
      userId: u.id,
      role: u.role,
      joinedAt: yesterday,
    });
  });

  // 4. Teams
  const teams = [
    {
      id: 'team-polo-design',
      name: 'Product & Design',
      description: 'User experience research, UI architecture, and feature planning.',
      workspaceId: 'ws-polo-tech',
      leadId: 'user-polo-pm',
      color: '#8b5cf6',
      createdAt: yesterday,
    },
    {
      id: 'team-polo-eng',
      name: 'Engineering & Infrastructure',
      description: 'Core backend APIs, database scalability, and web client systems.',
      workspaceId: 'ws-polo-tech',
      leadId: 'user-polo-backend',
      color: '#3b82f6',
      createdAt: yesterday,
    },
    {
      id: 'team-polo-growth',
      name: 'Growth & Marketing',
      description: 'Customer acquisition, brand outreach, and corporate partnerships.',
      workspaceId: 'ws-polo-tech',
      leadId: 'user-polo-admin',
      color: '#10b981',
      createdAt: yesterday,
    },
  ];

  teams.forEach((t) => inMemoryDb.teams.set(t.id, t));

  // 5. Projects
  const projects = [
    {
      id: 'proj-polo-1',
      title: 'Polo OS Core Platform v3',
      description: 'High-performance organizational operating system with enterprise RBAC and PostgreSQL persistence.',
      workspaceId: 'ws-polo-tech',
      createdBy: 'user-polo-admin',
      status: 'in_progress',
      progress: 75,
      startDate: yesterday,
      dueDate: nextMonth,
      budget: '$180,000',
      createdAt: yesterday,
    },
    {
      id: 'proj-polo-2',
      title: 'Design System 2.0 & Component Library',
      description: 'Production-ready Tailwind design tokens, accessible components, and theme presets.',
      workspaceId: 'ws-polo-tech',
      createdBy: 'user-polo-pm',
      status: 'in_progress',
      progress: 60,
      startDate: yesterday,
      dueDate: nextWeek,
      budget: '$45,000',
      createdAt: yesterday,
    },
    {
      id: 'proj-polo-3',
      title: 'Enterprise SSO & Multi-Tenant Security',
      description: 'SAML 2.0 / OIDC integrations, audit logs, and granular permission enforcement.',
      workspaceId: 'ws-polo-tech',
      createdBy: 'user-polo-admin',
      status: 'planning',
      progress: 20,
      startDate: yesterday,
      dueDate: nextMonth,
      budget: '$90,000',
      createdAt: yesterday,
    },
  ];

  projects.forEach((p) => inMemoryDb.projects.set(p.id, p));

  // 6. Tasks
  const tasks = [
    {
      id: 'task-polo-1',
      title: 'Implement Strict RBAC Guards & 403 Pages',
      description: 'Audit route guards and ensure unauthorized access is blocked across all roles.',
      status: 'in_progress',
      priority: 'critical',
      assignedTo: 'user-polo-frontend',
      projectId: 'proj-polo-1',
      workspaceId: 'ws-polo-tech',
      dueDate: nextWeek,
      isLearningTask: false,
      createdAt: yesterday,
    },
    {
      id: 'task-polo-2',
      title: 'Migrate Auth Session Validation to Postgres',
      description: 'Ensure token verification is fast, secure, and isolated per workspace.',
      status: 'completed',
      priority: 'urgent',
      assignedTo: 'user-polo-backend',
      projectId: 'proj-polo-3',
      workspaceId: 'ws-polo-tech',
      dueDate: yesterday,
      isLearningTask: false,
      createdAt: yesterday,
    },
    {
      id: 'task-polo-3',
      title: 'Design Onboarding Flow for Intern Sandbox',
      description: 'Create interactive guides and learning milestones for incoming design interns.',
      status: 'review',
      priority: 'high',
      assignedTo: 'user-polo-ui-intern',
      projectId: 'proj-polo-2',
      workspaceId: 'ws-polo-tech',
      dueDate: nextWeek,
      isLearningTask: true,
      createdAt: yesterday,
    },
    {
      id: 'task-polo-4',
      title: 'Product Roadmap Review & Q3 Sprint Planning',
      description: 'Align cross-functional priorities with executive leadership and team leads.',
      status: 'in_progress',
      priority: 'medium',
      assignedTo: 'user-polo-pm',
      projectId: 'proj-polo-1',
      workspaceId: 'ws-polo-tech',
      dueDate: nextWeek,
      isLearningTask: false,
      createdAt: yesterday,
    },
    {
      id: 'task-polo-5',
      title: 'Create UI Kit Tokens & Tailwind Color Palettes',
      description: 'Build reusable Figma component variants and translate to Tailwind CSS tokens.',
      status: 'todo',
      priority: 'medium',
      assignedTo: 'user-polo-ui-intern',
      projectId: 'proj-polo-2',
      workspaceId: 'ws-polo-tech',
      dueDate: nextWeek,
      isLearningTask: true,
      createdAt: yesterday,
    },
    {
      id: 'task-polo-6',
      title: 'Draft Marketing Campaign for Workspace OS Launch',
      description: 'Prepare launch notes, social copy, and product tour documentation.',
      status: 'in_progress',
      priority: 'low',
      assignedTo: 'user-polo-mkt-intern',
      projectId: 'proj-polo-1',
      workspaceId: 'ws-polo-tech',
      dueDate: nextWeek,
      isLearningTask: true,
      createdAt: yesterday,
    },
  ];

  tasks.forEach((t) => inMemoryDb.tasks.set(t.id, t));

  // 7. Task Comments
  const comments = [
    {
      id: 'comment-polo-1',
      taskId: 'task-polo-1',
      workspaceId: 'ws-polo-tech',
      userId: 'user-polo-admin',
      content: 'Make sure the 403 Forbidden page is clean and allows users to navigate back to their dashboard.',
      createdAt: yesterday,
    },
    {
      id: 'comment-polo-2',
      taskId: 'task-polo-1',
      workspaceId: 'ws-polo-tech',
      userId: 'user-polo-frontend',
      content: 'Understood. Implemented with RoleGuard, RequireRole, and Can components.',
      createdAt: now,
    },
  ];

  comments.forEach((c) => inMemoryDb.taskComments.set(c.id, c));

  // 8. Documents
  const docs = [
    {
      id: 'doc-polo-1',
      title: 'Polo Technologies Engineering Handbook',
      fileUrl: 'https://docs.polotech.internal/engineering-handbook.pdf',
      fileType: 'pdf',
      fileSize: '3.4 MB',
      ownerId: 'user-polo-admin',
      workspaceId: 'ws-polo-tech',
      visibility: 'public',
      category: 'Technical',
      downloadCount: 42,
      createdAt: yesterday,
    },
    {
      id: 'doc-polo-2',
      title: 'Company Architecture & Security Whitepaper',
      fileUrl: 'https://docs.polotech.internal/security-whitepaper.pdf',
      fileType: 'pdf',
      fileSize: '5.1 MB',
      ownerId: 'user-polo-backend',
      workspaceId: 'ws-polo-tech',
      visibility: 'team',
      category: 'Technical',
      downloadCount: 18,
      createdAt: yesterday,
    },
    {
      id: 'doc-polo-3',
      title: 'Intern Onboarding Guide & Development Playbook',
      fileUrl: 'https://docs.polotech.internal/intern-playbook.pdf',
      fileType: 'pdf',
      fileSize: '2.0 MB',
      ownerId: 'user-polo-pm',
      workspaceId: 'ws-polo-tech',
      visibility: 'learning',
      category: 'Onboarding',
      downloadCount: 29,
      createdAt: yesterday,
    },
    {
      id: 'doc-polo-4',
      title: 'UI Design Token Specification & Style Guidelines',
      fileUrl: 'https://docs.polotech.internal/design-tokens-v2.pdf',
      fileType: 'pdf',
      fileSize: '4.8 MB',
      ownerId: 'user-polo-pm',
      workspaceId: 'ws-polo-tech',
      visibility: 'learning',
      category: 'Design',
      downloadCount: 15,
      createdAt: yesterday,
    },
    {
      id: 'doc-polo-5',
      title: 'Executive Financial Forecast Q3-Q4',
      fileUrl: 'https://docs.polotech.internal/financial-forecast.pdf',
      fileType: 'pdf',
      fileSize: '1.8 MB',
      ownerId: 'user-polo-admin',
      workspaceId: 'ws-polo-tech',
      visibility: 'private',
      category: 'Policy',
      downloadCount: 4,
      createdAt: yesterday,
    },
  ];

  docs.forEach((d) => inMemoryDb.documents.set(d.id, d));

  // 9. CRM Records
  const crmRecords = [
    {
      id: 'crm-polo-1',
      customerName: 'Marcus Vance',
      company: 'Acme HyperScale Systems',
      email: 'marcus@hyper-scale.io',
      phone: '+1 (555) 342-8901',
      dealValue: 120000,
      status: 'negotiation',
      ownerId: 'user-polo-admin',
      workspaceId: 'ws-polo-tech',
      notes: 'Enterprise contract discussion for 500 workspace seats.',
      createdAt: yesterday,
      lastContacted: now,
    },
    {
      id: 'crm-polo-2',
      customerName: 'Elena Rostova',
      company: 'Apex Cloud Solutions',
      email: 'elena@apexcloud.net',
      phone: '+1 (555) 890-1234',
      dealValue: 85000,
      status: 'proposal_sent',
      ownerId: 'user-polo-pm',
      workspaceId: 'ws-polo-tech',
      notes: 'Demo delivered. Reviewing security and SOC-2 compliance questionnaire.',
      createdAt: yesterday,
      lastContacted: yesterday,
    },
    {
      id: 'crm-polo-3',
      customerName: 'David Chen',
      company: 'Vanguard AI Robotics',
      email: 'david.chen@vanguard-ai.com',
      phone: '+1 (555) 765-4321',
      dealValue: 250000,
      status: 'won',
      ownerId: 'user-polo-admin',
      workspaceId: 'ws-polo-tech',
      notes: 'Signed multi-year contract for internal developer operations.',
      createdAt: yesterday,
      lastContacted: now,
    },
  ];

  crmRecords.forEach((r) => inMemoryDb.crmRecords.set(r.id, r));

  // 10. Workspace Invites
  const invites = [
    {
      id: 'inv-polo-emp-1',
      workspaceId: 'ws-polo-tech',
      email: 'alex.engineer@polotech.com',
      role: 'employee',
      token: 'invite-polo-emp-sample',
      invitedBy: 'user-polo-admin',
      teamId: 'team-polo-eng',
      expiresAt: nextMonth,
      acceptedAt: null,
      createdAt: yesterday,
    },
    {
      id: 'inv-polo-intern-1',
      workspaceId: 'ws-polo-tech',
      email: 'sara.intern@polotech.com',
      role: 'intern',
      token: 'invite-polo-intern-sample',
      invitedBy: 'user-polo-admin',
      teamId: 'team-polo-design',
      expiresAt: nextMonth,
      acceptedAt: null,
      createdAt: yesterday,
    },
  ];

  invites.forEach((inv) => inMemoryDb.workspaceInvites.set(inv.token, inv));
}
