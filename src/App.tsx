import React, { useEffect, useState } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { RealtimeProvider } from './lib/realtime';
import { LandingPage } from './components/landing/LandingPage';
import { AppLayout } from './components/layout/AppLayout';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { EmployeeDashboard } from './components/dashboard/EmployeeDashboard';
import { InternDashboard } from './components/dashboard/InternDashboard';
import { ProjectsView } from './components/projects/ProjectsView';
import { TasksView } from './components/tasks/TasksView';
import { DocumentsView } from './components/documents/DocumentsView';
import { CrmView } from './components/crm/CrmView';
import { TeamsView } from './components/teams/TeamsView';
import { PeopleView } from './components/people/PeopleView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { BillingView } from './components/billing/BillingView';
import { SettingsView } from './components/settings/SettingsView';
import { AdminToolsView } from './components/admin/AdminToolsView';
import { WorkspaceView } from './components/workspace/WorkspaceView';
import { AutomationsView } from './components/automations/AutomationsView';
import { AcceptInviteView } from './components/invites/AcceptInviteView';
import { OnboardingPage } from './components/onboarding/OnboardingPage';
import { WorkspacesSelectionPage } from './components/workspace/WorkspacesSelectionPage';
import { WikiView } from './components/wiki/WikiView';
import { KnowledgeCenterView } from './components/knowledge/KnowledgeCenterView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { TimeTrackingView } from './components/time/TimeTrackingView';
import { ClientPortalView } from './components/portal/ClientPortalView';
import { IntegrationsView } from './components/integrations/IntegrationsView';
import { ChatView } from './components/chat/ChatView';
import { RoleGuard } from './components/common/RoleGuard';
import { RequireRole } from './components/common/RequireRole';
import { ForbiddenPage } from './components/common/ForbiddenPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const pathToTabMap: Record<string, string> = {
  '/workspaces': 'workspaces',
  '/admin': 'admin_tools',
  '/admin/dashboard': 'dashboard',
  '/admin/members': 'workspace',
  '/admin/workspace': 'workspace',
  '/admin/projects': 'projects',
  '/admin/tasks': 'tasks',
  '/admin/automations': 'automations',
  '/admin/documents': 'knowledge',
  '/admin/knowledge': 'knowledge',
  '/admin/crm': 'crm',
  '/admin/teams': 'teams',
  '/admin/analytics': 'analytics',
  '/admin/billing': 'billing',
  '/admin/settings': 'settings',
  '/admin/tools': 'admin_tools',
  '/admin/audit': 'admin_tools',
  '/admin/wiki': 'knowledge',
  '/knowledge': 'knowledge',
  '/automations': 'automations',
  '/employee/dashboard': 'dashboard',
  '/employee/projects': 'projects',
  '/employee/tasks': 'tasks',
  '/employee/documents': 'documents',
  '/employee/crm': 'crm',
  '/employee/teams': 'teams',
  '/employee/wiki': 'wiki',
  '/intern/dashboard': 'dashboard',
  '/intern/tasks': 'tasks',
  '/intern/documents': 'documents',
  '/intern/wiki': 'wiki',
  '/analytics': 'analytics',
  '/billing': 'billing',
  '/settings': 'settings',
  '/projects': 'projects',
  '/tasks': 'tasks',
  '/documents': 'documents',
  '/crm': 'crm',
  '/teams': 'teams',
  '/wiki': 'wiki',
  '/time': 'time',
  '/portal': 'portal',
  '/integrations': 'integrations',
  '/workspace': 'workspace',
  '/dashboard': 'dashboard',
  '/onboarding': 'onboarding',
  '/notifications': 'notifications',
  '/chat': 'chat',
  '/communication': 'chat',
};

const tabToPathMap: Record<string, string> = {
  admin_tools: '/admin/tools',
  automations: '/admin/automations',
  analytics: '/analytics',
  billing: '/billing',
  settings: '/settings',
  projects: '/projects',
  tasks: '/tasks',
  documents: '/documents',
  crm: '/crm',
  teams: '/teams',
  wiki: '/wiki',
  time: '/time',
  portal: '/portal',
  integrations: '/integrations',
  workspace: '/workspace',
  dashboard: '/dashboard',
  onboarding: '/onboarding',
  workspaces: '/workspaces',
  notifications: '/notifications',
  chat: '/chat',
};

const MainAppContent: React.FC = () => {
  const { isLandingPage, isAuthBootstrapping, currentRole, activeTab, setActiveTab, userWorkspaces, currentWorkspace } = useWorkspace();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  
  // Standalone Route ID Parameters
  const [wikiPageIdParam, setWikiPageIdParam] = useState<string | null>(null);
  const [projectIdParam, setProjectIdParam] = useState<string | null>(null);
  const [taskIdParam, setTaskIdParam] = useState<string | null>(null);
  const [crmLeadIdParam, setCrmLeadIdParam] = useState<string | null>(null);
  const [documentIdParam, setDocumentIdParam] = useState<string | null>(null);
  const [openCreateWiki, setOpenCreateWiki] = useState(false);
  const [openUploadDoc, setOpenUploadDoc] = useState(false);
  const [hasSetInitialRoleTab, setHasSetInitialRoleTab] = useState(false);

  // Check URL on initial load and handle invite tokens or deep paths
  useEffect(() => {
    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);

    // Check for invite token in query or pathname
    const queryInvite = urlParams.get('invite');
    if (queryInvite) {
      setInviteToken(queryInvite);
      return;
    }

    if (path.startsWith('/invite/')) {
      const token = path.replace('/invite/', '').trim();
      if (token) {
        setInviteToken(token);
        return;
      }
    }

    // Check for deep entity routes:
    // /projects/:id
    if (path.startsWith('/projects/')) {
      const pId = path.replace('/projects/', '').trim();
      if (pId) setProjectIdParam(pId);
      setActiveTab('projects');
      return;
    }

    // /tasks/:id
    if (path.startsWith('/tasks/')) {
      const tId = path.replace('/tasks/', '').trim();
      if (tId) setTaskIdParam(tId);
      setActiveTab('tasks');
      return;
    }

    // /crm/:id
    if (path.startsWith('/crm/')) {
      const cId = path.replace('/crm/', '').trim();
      if (cId) setCrmLeadIdParam(cId);
      setActiveTab('crm');
      return;
    }

    // /documents/:id
    if (path.startsWith('/documents/')) {
      const dId = path.replace('/documents/', '').trim();
      if (dId) setDocumentIdParam(dId);
      setActiveTab('documents');
      return;
    }

    // /wiki/:pageId
    if (path.startsWith('/wiki/')) {
      const pId = path.replace('/wiki/', '').trim();
      if (pId) setWikiPageIdParam(pId);
      setActiveTab('wiki');
      return;
    }

    // Check for standard top-level routes
    if (pathToTabMap[path]) {
      setActiveTab(pathToTabMap[path]);
    } else if (path === '/' || !path) {
      setActiveTab('dashboard');
    }

    const handlePopState = () => {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/projects/')) {
        const pId = currentPath.replace('/projects/', '').trim();
        setProjectIdParam(pId || null);
        setActiveTab('projects');
      } else if (currentPath.startsWith('/tasks/')) {
        const tId = currentPath.replace('/tasks/', '').trim();
        setTaskIdParam(tId || null);
        setActiveTab('tasks');
      } else if (currentPath.startsWith('/crm/')) {
        const cId = currentPath.replace('/crm/', '').trim();
        setCrmLeadIdParam(cId || null);
        setActiveTab('crm');
      } else if (currentPath.startsWith('/documents/')) {
        const dId = currentPath.replace('/documents/', '').trim();
        setDocumentIdParam(dId || null);
        setActiveTab('documents');
      } else if (currentPath.startsWith('/wiki/')) {
        const pId = currentPath.replace('/wiki/', '').trim();
        setWikiPageIdParam(pId || null);
        setActiveTab('wiki');
      } else if (pathToTabMap[currentPath]) {
        setProjectIdParam(null);
        setTaskIdParam(null);
        setCrmLeadIdParam(null);
        setDocumentIdParam(null);
        setWikiPageIdParam(null);
        setActiveTab(pathToTabMap[currentPath]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveTab, currentRole]);

  // Initial landing default
  useEffect(() => {
    if (!isAuthBootstrapping && !isLandingPage && !hasSetInitialRoleTab) {
      const path = window.location.pathname;
      if (path === '/' || path === '' || path === '/dashboard') {
        setActiveTab('dashboard');
      }
      setHasSetInitialRoleTab(true);
    }
  }, [isAuthBootstrapping, isLandingPage, currentRole, hasSetInitialRoleTab, setActiveTab]);

  // Synchronize browser URL with activeTab & deep entity params
  useEffect(() => {
    if (isLandingPage || isAuthBootstrapping || inviteToken) return;

    let targetPath = tabToPathMap[activeTab];
    if (activeTab === 'projects' && projectIdParam) {
      targetPath = `/projects/${projectIdParam}`;
    } else if (activeTab === 'tasks' && taskIdParam) {
      targetPath = `/tasks/${taskIdParam}`;
    } else if (activeTab === 'crm' && crmLeadIdParam) {
      targetPath = `/crm/${crmLeadIdParam}`;
    } else if (activeTab === 'documents' && documentIdParam) {
      targetPath = `/documents/${documentIdParam}`;
    } else if (activeTab === 'wiki' && wikiPageIdParam) {
      targetPath = `/wiki/${wikiPageIdParam}`;
    } else if (activeTab === 'dashboard') {
      targetPath = `/${currentRole}/dashboard`;
    } else if (activeTab === 'workspaces') {
      targetPath = '/workspaces';
    } else if (activeTab === 'onboarding') {
      targetPath = '/onboarding';
    } else if (!targetPath) {
      targetPath = `/${currentRole}/dashboard`;
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [
    activeTab, 
    projectIdParam, 
    taskIdParam, 
    crmLeadIdParam, 
    documentIdParam, 
    wikiPageIdParam, 
    isLandingPage, 
    isAuthBootstrapping, 
    inviteToken, 
    currentRole
  ]);

  if (isAuthBootstrapping) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#A855F7] p-0.5 shadow-xl shadow-purple-600/30 flex items-center justify-center animate-pulse">
          <div className="w-full h-full bg-[#020617] rounded-2xl flex items-center justify-center font-bold text-lg text-purple-400">
            W
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-sm font-semibold text-slate-200 tracking-wide">WORKSPACE OS</p>
          <p className="text-xs text-slate-500 font-mono">Restoring secure session verification...</p>
        </div>
      </div>
    );
  }

  if (inviteToken) {
    return (
      <AcceptInviteView
        token={inviteToken}
        onSuccess={() => {
          setInviteToken(null);
          window.history.pushState(null, '', '/dashboard');
        }}
      />
    );
  }

  if (isLandingPage) {
    return <LandingPage />;
  }

  // If authenticated user has no workspaces, present onboarding setup
  if (userWorkspaces.length === 0 && (!currentWorkspace || !currentWorkspace.id)) {
    return <OnboardingPage />;
  }

  // If user explicitly navigated to /onboarding
  if (activeTab === 'onboarding') {
    return <OnboardingPage />;
  }

  // If user is selecting workspaces
  if (activeTab === 'workspaces') {
    return <WorkspacesSelectionPage />;
  }

  const renderActiveView = () => {
    // Render Dashboard based on role
    if (activeTab === 'dashboard') {
      if (currentRole === 'admin') return <AdminDashboard />;
      if (currentRole === 'employee') return <EmployeeDashboard />;
      return <InternDashboard />;
    }

    // Role-Guarded Views
    switch (activeTab) {
      case 'workspaces':
        return <WorkspacesSelectionPage />;
      case 'onboarding':
        return <OnboardingPage />;
      case 'notifications':
        return <NotificationsView />;
      case 'workspace':
        return (
          <RequireRole role="admin" fallback={<ForbiddenPage requiredRole="ADMIN" message="Workspace configuration and member management is restricted to Company Administrators." />}>
            <WorkspaceView />
          </RequireRole>
        );

      case 'projects':
        return (
          <RoleGuard allowedRoles={['admin', 'employee']} fallback={<ForbiddenPage requiredRole="ADMIN or EMPLOYEE" message="Intern sandbox accounts do not have access to full project roadmaps. Please focus on your assigned tasks in the Task Stream." onReturn={() => setActiveTab('tasks')} />}>
            <ProjectsView
              routeProjectId={projectIdParam}
              onRouteChange={(newPId) => {
                setProjectIdParam(newPId || null);
                const targetUrl = newPId ? `/projects/${newPId}` : '/projects';
                if (window.location.pathname !== targetUrl) {
                  window.history.pushState(null, '', targetUrl);
                }
              }}
            />
          </RoleGuard>
        );

      case 'tasks':
        return (
          <TasksView
            routeTaskId={taskIdParam}
            onRouteChange={(newTId) => {
              setTaskIdParam(newTId || null);
              const targetUrl = newTId ? `/tasks/${newTId}` : '/tasks';
              if (window.location.pathname !== targetUrl) {
                window.history.pushState(null, '', targetUrl);
              }
            }}
          />
        );

      case 'knowledge':
      case 'wiki':
        return (
          <KnowledgeCenterView
            initialTab="wiki"
            routePageId={wikiPageIdParam}
            routeDocumentId={documentIdParam}
            openCreateWiki={openCreateWiki}
            openUploadDoc={openUploadDoc}
            onHandledAction={() => {
              setOpenCreateWiki(false);
              setOpenUploadDoc(false);
            }}
            onRouteChange={(id) => {
              setWikiPageIdParam(id || null);
            }}
          />
        );

      case 'chat':
      case 'communication':
        return (
          <RoleGuard allowedRoles={['admin', 'employee', 'intern']} fallback={<ForbiddenPage requiredRole="ADMIN, EMPLOYEE, or INTERN" message="Communication Hub is restricted to workspace members." />}>
            <ChatView />
          </RoleGuard>
        );

      case 'time':
        return <TimeTrackingView />;

      case 'portal':
        return <ClientPortalView />;

      case 'integrations':
        return (
          <RoleGuard allowedRoles={['admin', 'employee']} fallback={<ForbiddenPage requiredRole="ADMIN or EMPLOYEE" message="Third-party integrations and Google synchronization are restricted to organization staff." />}>
            <IntegrationsView />
          </RoleGuard>
        );

      case 'documents':
        return (
          <KnowledgeCenterView
            initialTab="documents"
            routePageId={wikiPageIdParam}
            routeDocumentId={documentIdParam}
            openCreateWiki={openCreateWiki}
            openUploadDoc={openUploadDoc}
            onHandledAction={() => {
              setOpenCreateWiki(false);
              setOpenUploadDoc(false);
            }}
            onRouteChange={(id) => {
              setDocumentIdParam(id || null);
            }}
          />
        );

      case 'crm':
        return (
          <RequireRole role="admin" fallback={<ForbiddenPage requiredRole="ADMIN" message="CRM customer pipelines, deal values, and forecasting are restricted to Administrators." />}>
            <CrmView
              routeLeadId={crmLeadIdParam}
              onRouteChange={(newLeadId) => {
                setCrmLeadIdParam(newLeadId || null);
                const targetUrl = newLeadId ? `/crm/${newLeadId}` : '/crm';
                if (window.location.pathname !== targetUrl) {
                  window.history.pushState(null, '', targetUrl);
                }
              }}
            />
          </RequireRole>
        );

      case 'teams':
      case 'people':
        return (
          <RoleGuard allowedRoles={['admin', 'employee', 'intern']} fallback={<ForbiddenPage requiredRole="ADMIN, EMPLOYEE, or INTERN" message="Department directories and people operations are restricted." />}>
            <PeopleView />
          </RoleGuard>
        );

      case 'analytics':
        return (
          <RequireRole role="admin" fallback={<ForbiddenPage requiredRole="ADMIN" message="Organization analytics, velocity charts, and financial KPIs are restricted to Administrators." />}>
            <AnalyticsView />
          </RequireRole>
        );

      case 'billing':
        return (
          <RequireRole role="admin" fallback={<ForbiddenPage requiredRole="ADMIN" message="Financial billing, subscription plans, and invoice management are restricted to Company Administrators." />}>
            <BillingView />
          </RequireRole>
        );

      case 'settings':
        return (
          <RequireRole role="admin" fallback={<ForbiddenPage requiredRole="ADMIN" message="Workspace settings, OAuth tokens, and audit policies are restricted to Administrators." />}>
            <SettingsView />
          </RequireRole>
        );

      case 'automations':
        return (
          <RequireRole role="admin" fallback={<ForbiddenPage requiredRole="ADMIN" message="Workflow automations are restricted to Administrators." />}>
            <AutomationsView />
          </RequireRole>
        );

      case 'admin_tools':
        return (
          <RequireRole role="admin" fallback={<ForbiddenPage requiredRole="ADMIN" message="System RBAC diagnostics and PostgreSQL Drizzle ORM tools are restricted to Administrators." />}>
            <AdminToolsView />
          </RequireRole>
        );

      default:
        return currentRole === 'admin' ? <AdminDashboard /> : currentRole === 'employee' ? <EmployeeDashboard /> : <InternDashboard />;
    }
  };

  return (
    <AppLayout
      onOpenCreateWiki={() => {
        setActiveTab('wiki');
        setOpenCreateWiki(true);
      }}
      onOpenUploadDoc={() => {
        setActiveTab('documents');
        setOpenUploadDoc(true);
      }}
    >
      {renderActiveView()}
    </AppLayout>
  );
};

const AppWithRealtime: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  return (
    <RealtimeProvider workspaceId={currentWorkspace?.id}>
      <MainAppContent />
    </RealtimeProvider>
  );
};

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="Application Error" onReset={() => window.location.reload()}>
      <WorkspaceProvider>
        <AppWithRealtime />
      </WorkspaceProvider>
    </ErrorBoundary>
  );
}

