import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { UserRole } from '../../types';
import { 
  Search, Bell, Shield, Briefcase, GraduationCap, ChevronDown, 
  Layers, ExternalLink, LogOut, Check
} from 'lucide-react';
import { getRoleBadgeColor } from '../../lib/auth';

export const Header: React.FC = () => {
  const { 
    currentUser, currentRole, switchRole, searchQuery, setSearchQuery, 
    setIsLandingPage, activeTab, systemLogs, addToast 
  } = useWorkspace();
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    switchRole(role);
    setShowRoleDropdown(false);
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-7 z-30 text-slate-200">
      {/* Search Input */}
      <div className="flex items-center gap-2 max-w-md w-full">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={`Search ${activeTab.replace('_', ' ')} or records (Ctrl + K)...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Role Switcher Menu */}
        <div className="relative">
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${getRoleBadgeColor(currentRole)}`}
          >
            {currentRole === 'admin' && <Shield className="w-3.5 h-3.5" />}
            {currentRole === 'employee' && <Briefcase className="w-3.5 h-3.5" />}
            {currentRole === 'intern' && <GraduationCap className="w-3.5 h-3.5" />}
            <span className="capitalize">{currentRole} App</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {showRoleDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                Switch Portal Perspective
              </div>
              <button
                onClick={() => handleRoleSelect('admin')}
                className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-800/80 transition-colors text-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="font-semibold">Admin</p>
                    <p className="text-[10px] text-slate-400">Full Access & Oversight</p>
                  </div>
                </div>
                {currentRole === 'admin' && <Check className="w-3.5 h-3.5 text-purple-400" />}
              </button>

              <button
                onClick={() => handleRoleSelect('employee')}
                className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-800/80 transition-colors text-slate-200"
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="font-semibold">Employee</p>
                    <p className="text-[10px] text-slate-400">Assigned Deliverables Scope</p>
                  </div>
                </div>
                {currentRole === 'employee' && <Check className="w-3.5 h-3.5 text-blue-400" />}
              </button>

              <button
                onClick={() => handleRoleSelect('intern')}
                className="w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-800/80 transition-colors text-slate-200"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="font-semibold">Intern</p>
                    <p className="text-[10px] text-slate-400">Restricted Learning Sandbox</p>
                  </div>
                </div>
                {currentRole === 'intern' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {systemLogs.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-white">Activity Notifications</span>
                <span className="text-[10px] text-slate-400">Live feed</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {systemLogs.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No new notifications.
                  </div>
                ) : (
                  systemLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="p-2 rounded bg-slate-950/60 border border-slate-800/60 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span className="font-medium text-slate-300">{log.user_name}</span>
                        <span>{log.timestamp.includes(' ') ? log.timestamp.split(' ')[1] : log.timestamp}</span>
                      </div>
                      <p className="text-slate-200 mt-1">{log.action}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Exit to Landing Website */}
        <button
          onClick={() => {
            setIsLandingPage(true);
            addToast({ type: 'info', title: 'Navigation', message: 'Switched to Public Landing Page.' });
          }}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          title="Return to Public Landing Page"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Landing</span>
        </button>
      </div>
    </header>
  );
};
