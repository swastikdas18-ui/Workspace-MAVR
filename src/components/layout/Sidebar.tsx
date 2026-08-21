import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  LayoutDashboard, Building2, FolderKanban, CheckSquare, FileText, 
  DollarSign, Users, BarChart3, CreditCard, Settings, ShieldAlert,
  ChevronRight, Sparkles, BookOpen, GraduationCap, Shield, Briefcase
} from 'lucide-react';
import { getRoleBadgeColor } from '../../lib/auth';
import { UserAvatar } from '../common/UserAvatar';

export const Sidebar: React.FC = () => {
  const { currentRole, activeTab, setActiveTab, currentWorkspace, currentUser } = useWorkspace();

  // Navigation Items per role according to strict specification
  const getNavItems = () => {
    if (currentRole === 'admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'workspace', label: 'Workspace', icon: Building2, badge: null },
        { id: 'projects', label: 'Projects', icon: FolderKanban, badge: 'All' },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: 'Board' },
        { id: 'documents', label: 'Documents', icon: FileText, badge: 'All' },
        { id: 'crm', label: 'CRM Pipeline', icon: DollarSign, badge: 'Leads' },
        { id: 'teams', label: 'Teams', icon: Users, badge: 'Directory' },
        { id: 'analytics', label: 'Analytics', icon: BarChart3, badge: null },
        { id: 'billing', label: 'Billing & Plan', icon: CreditCard, badge: 'Pro' },
        { id: 'settings', label: 'Settings', icon: Settings, badge: null },
        { id: 'admin_tools', label: 'Admin Tools', icon: ShieldAlert, badge: 'RBAC' },
      ];
    }

    if (currentRole === 'employee') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'projects', label: 'Assigned Projects', icon: FolderKanban, badge: 'Assigned' },
        { id: 'tasks', label: 'My Tasks & Board', icon: CheckSquare, badge: 'Active' },
        { id: 'documents', label: 'Shared & My Docs', icon: FileText, badge: null },
        { id: 'crm', label: 'My CRM Leads', icon: DollarSign, badge: 'Assigned' },
        { id: 'teams', label: 'My Team', icon: Users, badge: null },
      ];
    }

    // Intern Role: strictly Dashboard, Tasks, Documents
    return [
      { id: 'dashboard', label: 'Learning Dashboard', icon: LayoutDashboard, badge: 'Overview' },
      { id: 'tasks', label: 'Assigned Tasks', icon: CheckSquare, badge: 'Learning' },
      { id: 'documents', label: 'Learning & Docs', icon: BookOpen, badge: 'Resources' },
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-screen sticky top-0 text-slate-300">
      {/* Workspace Brand Box */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white shadow-md">
          {currentWorkspace.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white truncate tracking-tight">
            {currentWorkspace.name}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getRoleBadgeColor(currentRole)}`}>
              {currentRole.toUpperCase()} APP
            </span>
          </div>
        </div>
      </div>

      {/* Role Notice Pill */}
      <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-400">
          {currentRole === 'admin' && <Shield className="w-3.5 h-3.5 text-purple-400" />}
          {currentRole === 'employee' && <Briefcase className="w-3.5 h-3.5 text-blue-400" />}
          {currentRole === 'intern' && <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />}
          <span className="font-medium text-slate-300">
            {currentRole === 'admin' ? 'Full Organization Access' : currentRole === 'employee' ? 'Assigned Work Mode' : 'Restricted Learning Mode'}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          {currentRole.toUpperCase()} PORTAL
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/90 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isActive ? 'bg-blue-700/80 text-blue-100' : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Current Active User Profile Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-slate-950/70">
        <div className="flex items-center gap-2.5">
          <UserAvatar
            name={currentUser.name}
            avatar={currentUser.avatar}
            size="md"
          />
          <div className="min-w-0 flex-1 text-left">
            <p className="text-xs font-semibold text-slate-200 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentUser.title}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
