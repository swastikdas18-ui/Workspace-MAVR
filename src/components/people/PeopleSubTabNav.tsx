import React from 'react';
import { Users, Building2, Calendar, Clock, Send } from 'lucide-react';
import { WorkspaceInvite } from '../../types';

interface PeopleSubTabNavProps {
  activeSubTab: 'directory' | 'departments' | 'invitations' | 'leaves' | 'attendance';
  setActiveSubTab: (tab: 'directory' | 'departments' | 'invitations' | 'leaves' | 'attendance') => void;
  currentRole: string;
  invites: WorkspaceInvite[];
  loadInvites: () => Promise<void>;
}

export const PeopleSubTabNav: React.FC<PeopleSubTabNavProps> = ({
  activeSubTab,
  setActiveSubTab,
  currentRole,
  invites,
  loadInvites,
}) => {
  const tabs = currentRole === 'admin'
    ? [
        { id: 'directory', label: 'Employee Directory', icon: Users },
        { id: 'departments', label: 'Departments', icon: Building2 },
        { id: 'invitations', label: 'Invitations', icon: Send },
        { id: 'leaves', label: 'Leave Management', icon: Calendar },
        { id: 'attendance', label: 'Attendance & Clock', icon: Clock },
      ]
    : [
        { id: 'directory', label: 'Team Directory', icon: Users },
        { id: 'leaves', label: 'Leave Requests', icon: Calendar },
        { id: 'attendance', label: 'Attendance & Clock', icon: Clock },
      ];

  return (
    <div className="flex border-b border-[#2A303D] gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeSubTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => {
              setActiveSubTab(tab.id as any);
              if (tab.id === 'invitations') loadInvites();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition whitespace-nowrap border-b-2 cursor-pointer ${
              isActive
                ? 'border-[#B8FF3B] text-[#B8FF3B] bg-[#B8FF3B]/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'invitations' && invites.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#B8FF3B]/20 text-[#B8FF3B] font-mono">
                {invites.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
