import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  Search, Bell, Shield, Briefcase, GraduationCap, LogOut 
} from 'lucide-react';
import { getRoleBadgeColor } from '../../lib/auth';

export const Header: React.FC = () => {
  const { 
    currentUser, currentRole, searchQuery, setSearchQuery, 
    activeTab, systemLogs, logout 
  } = useWorkspace();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 text-slate-200">
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
        {/* Read-Only Role Badge Indicator (No Switcher Controls) */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold select-none ${getRoleBadgeColor(currentRole)}`}>
          {currentRole === 'admin' && <Shield className="w-3.5 h-3.5" />}
          {currentRole === 'employee' && <Briefcase className="w-3.5 h-3.5" />}
          {currentRole === 'intern' && <GraduationCap className="w-3.5 h-3.5" />}
          <span className="capitalize">{currentRole} App</span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Notifications"
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

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition-colors"
          title="Sign out of current session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-medium">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
