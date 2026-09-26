import React from 'react';
import { Building2, Shield, UserCheck, DollarSign, Key, Bell, Target } from 'lucide-react';

export type SettingsTabType = 'profile' | 'security' | 'rbac' | 'team_billing' | 'api' | 'notifications' | 'labs';

interface SettingsTabBarProps {
  activeTab: SettingsTabType;
  setActiveTab: (tab: SettingsTabType) => void;
}

export const SettingsTabBar: React.FC<SettingsTabBarProps> = ({ activeTab, setActiveTab }) => {
  const tabs: { id: SettingsTabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'profile', label: 'General Profile', icon: Building2 },
    { id: 'security', label: 'Security & 2FA', icon: Shield },
    { id: 'rbac', label: 'RBAC Matrix', icon: UserCheck },
    { id: 'team_billing', label: 'Team Billing & Rates', icon: DollarSign },
    { id: 'api', label: 'Developer API & Secrets', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'labs', label: 'Labs & Enterprise Tools', icon: Target },
  ];

  return (
    <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3 text-xs overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const isLabs = tab.id === 'labs';

        let activeClass = 'bg-[#7C3AED] text-white shadow-md shadow-purple-600/20';
        let inactiveClass = 'bg-[#111827] text-slate-400 hover:text-slate-200 border border-white/[0.06]';

        if (isLabs) {
          activeClass = 'bg-purple-600 text-white shadow-md shadow-purple-600/20';
          inactiveClass = 'bg-[#111827] text-purple-400 hover:text-purple-200 border border-purple-500/20';
        }

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
              isActive ? activeClass : inactiveClass
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
