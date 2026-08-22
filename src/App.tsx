import React, { useEffect, useState } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
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
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { BillingView } from './components/billing/BillingView';
import { SettingsView } from './components/settings/SettingsView';
import { AdminToolsView } from './components/admin/AdminToolsView';
import { WorkspaceView } from './components/workspace/WorkspaceView';
import { AcceptInviteView } from './components/invites/AcceptInviteView';
import { RoleGuard } from './components/common/RoleGuard';
import { RequireRole } from './components/common/RequireRole';
import { ForbiddenPage } from './components/common/ForbiddenPage';

const pathToTabMap: Record<string, string> = {
  '/admin': 'admin_tools',
  '/admin/dashboard': 'dashboard',
  '/admin/workspace': 'workspace',
  '/admin/projects': 'projects',
  '/admin/tasks': 'tasks',
  '/admin/documents': 'documents',
  '/admin/crm': 'crm',
  '/admin/teams': 'teams',
  '/admin/analytics': 'analytics',
  '/admin/billing': 'billing',
  '/admin/settings': 'settings',
  '/admin/tools': 'admin_tools',
  '/employee/dashboard': 'dashboard',
  '/employee/projects': 'projects',
  '/employee/tasks': 'tasks',
  '/employee/documents': 'documents',
  '/employee/crm': 'crm',
  '/employee/teams': 'teams',
  '/intern/dashboard': 'dashboard',
  '/intern/tasks': 'tasks',
  '/intern/documents': 'documents',
  '/analytics': 'analytics',
  '/billing': 'billing',
  '/settings': 'settings',
  '/projects': 'projects',
  '/tasks': 'tasks',
  '/documents': 'documents',
  '/crm': 'crm',
  '/teams': 'teams',
  '/workspace': 'workspace',
  '/dashboard': 'dashboard',
};

const tabToPathMap: Record<string, string> = {
  admin_tools: '/admin/tools',
  analytics: '/analytics',
  billing: '/billing',
  settings: '/settings',
  projects: '/projects',
  tasks: '/tasks',
  documents: '/documents',
  crm: '/crm',
  teams: '/teams',
  workspace: '/workspace',
  dashboard: '/dashboard',
};

const MainAppContent: React.FC = () => {
  const { isLandingPage, currentRole, activeTab, setActiveTab } = useWorkspace();
  const [inviteToken, setInviteToken] = useState<string | null>(null);

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

    // Check for deep linking
    if (pathToTabMap[path]) {
      setActiveTab(pathToTabMap[path]);
    }

    const handlePopState = () => {
      const currentPath = window.location.pathname;
      if (pathToTabMap[currentPath]) {
        setActiveTab(pathToTabMap[currentPath]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setActiveTab]);

  // Synchronize browser URL with activeTab & role prefix
  useEffect(() => {
    if (isLandingPage || inviteToken) return;

    let targetPath = tabToPathMap[activeTab] || `/${currentRole}/dashboard`;
    if (activeTab === 'dashboard') {
      targetPath = `/${currentRole}/dashboard`;
    }

    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [activeTab, isLandingPage, inviteToken, currentRole]);

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

  const renderActiveView = () => {
    // Render Dashboard based on role
    if (activeTab === 'dashboard') {
      if (currentRole === 'admin') return <AdminDashboard />;
      if (currentRole === 'employee') return <EmployeeDashboard />;
      return <InternDashboard />;
    }

    // Role-Guarded Views
    switch (activeTab) {
      case 'workspace':
        return (
          <RequireRole role="admin" fallback={<ForbiddenPage requiredRole="ADMIN" message="Workspace configuration and member management is restricted to Company Administrators." />}>
            <WorkspaceView />
          </RequireRole>
        );

      case 'projects':
        return (
          <RoleGuard allowedRoles={['admin', 'employee']} fallback={<ForbiddenPage requiredRole="ADMIN or EMPLOYEE" message="Intern sandbox accounts do not have access to full project roadmaps. Please focus on your assigned tasks in the Task Stream." onReturn={() => setActiveTab('tasks')} />}>
            <ProjectsView />
          </RoleGuard>
        );

      case 'tasks':
        return <TasksView />;

      case 'documents':
        return <DocumentsView />;

      case 'crm':
        return (
          <RoleGuard allowedRoles={['admin', 'employee']} fallback={<ForbiddenPage requiredRole="ADMIN or EMPLOYEE" message="CRM customer pipelines and deal values are restricted to Administrative and Account Executive staff." />}>
            <CrmView />
          </RoleGuard>
        );

      case 'teams':
        return (
          <RoleGuard allowedRoles={['admin', 'employee']} fallback={<ForbiddenPage requiredRole="ADMIN or EMPLOYEE" message="Department directories and team lead management are restricted to organization staff." />}>
            <TeamsView />
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

  return <AppLayout>{renderActiveView()}</AppLayout>;
};

export default function App() {
  return (
    <WorkspaceProvider>
      <MainAppContent />
    </WorkspaceProvider>
  );
}
