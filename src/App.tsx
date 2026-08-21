import React from 'react';
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
import { ShieldAlert } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { isLandingPage, currentRole, activeTab, setActiveTab } = useWorkspace();

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

    // Role-Filtered Module Views
    switch (activeTab) {
      case 'workspace':
        return <WorkspaceView />;

      case 'projects':
        if (currentRole === 'intern') {
          return (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">Restricted Access (Intern Role)</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Intern accounts do not have access to full project roadmaps. Please focus on your assigned tasks in the Task Stream.
              </p>
              <button
                onClick={() => setActiveTab('tasks')}
                className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold"
              >
                Go to Assigned Tasks
              </button>
            </div>
          );
        }
        return <ProjectsView />;

      case 'tasks':
        return <TasksView />;

      case 'documents':
        return <DocumentsView />;

      case 'crm':
        if (currentRole === 'intern') {
          return (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">Restricted Access (Intern Role)</h3>
              <p className="text-xs text-slate-400 mt-1">CRM pipelines are restricted to Administrative and Account Executive staff.</p>
            </div>
          );
        }
        return <CrmView />;

      case 'teams':
        if (currentRole === 'intern') {
          return (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">Team Management Restricted</h3>
              <p className="text-xs text-slate-400 mt-1">Please refer to your mentor or assigned team lead for department inquiries.</p>
            </div>
          );
        }
        return <TeamsView />;

      case 'analytics':
        if (currentRole !== 'admin') {
          return (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">Admin Privileges Required</h3>
              <p className="text-xs text-slate-400 mt-1">Organization analytics and revenue performance reports are restricted to Administrators.</p>
            </div>
          );
        }
        return <AnalyticsView />;

      case 'billing':
        if (currentRole !== 'admin') {
          return (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">Admin Privileges Required</h3>
              <p className="text-xs text-slate-400 mt-1">Financial subscriptions and invoice management are restricted to Workspace Administrators.</p>
            </div>
          );
        }
        return <BillingView />;

      case 'settings':
        if (currentRole !== 'admin') {
          return (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">Admin Privileges Required</h3>
              <p className="text-xs text-slate-400 mt-1">Workspace configuration and security policies are restricted to Administrators.</p>
            </div>
          );
        }
        return <SettingsView />;

      case 'admin_tools':
        if (currentRole !== 'admin') {
          return (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl">
              <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-2" />
              <h3 className="text-base font-bold text-white">Admin Privileges Required</h3>
              <p className="text-xs text-slate-400 mt-1">System architecture diagnostics and Drizzle ORM schema tools are restricted to Administrators.</p>
            </div>
          );
        }
        return <AdminToolsView />;

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
