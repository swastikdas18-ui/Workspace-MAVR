import React from 'react';
import { Users, FolderKanban, CheckSquare, DollarSign } from 'lucide-react';
import { KPIWidget } from '../../../components/ui/KPIWidget';

export interface AdminMetricsGridProps {
  memberCount: number;
  activeMembersToday: number;
  activeProjects: number;
  completedProjects: number;
  openTasks: number;
  completedTasks: number;
  pipelineVolumeFormatted: string;
  activeDealsCount: number;
  onNavigate: (tab: string) => void;
}

export const AdminMetricsGrid: React.FC<AdminMetricsGridProps> = React.memo(({
  memberCount,
  activeMembersToday,
  activeProjects,
  completedProjects,
  openTasks,
  completedTasks,
  pipelineVolumeFormatted,
  activeDealsCount,
  onNavigate,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPIWidget
        label="Workspace Members"
        value={memberCount}
        icon={Users}
        color="purple"
        trend={{ value: `${activeMembersToday} active`, direction: 'up', label: 'today' }}
        sparklineData={[1, 2, 2, 3, memberCount]}
        onClick={() => onNavigate('teams')}
      />

      <KPIWidget
        label="Active Initiatives"
        value={activeProjects}
        icon={FolderKanban}
        color="blue"
        trend={{ value: `${completedProjects} done`, direction: 'neutral', label: 'completed' }}
        sparklineData={[0, 1, 2, activeProjects]}
        onClick={() => onNavigate('projects')}
      />

      <KPIWidget
        label="Open Task Execution"
        value={openTasks}
        icon={CheckSquare}
        color="emerald"
        trend={{ value: `${completedTasks} closed`, direction: 'up', label: 'this week' }}
        sparklineData={[1, 3, 2, openTasks]}
        onClick={() => onNavigate('tasks')}
      />

      <KPIWidget
        label="Pipeline Valuation"
        value={pipelineVolumeFormatted}
        icon={DollarSign}
        color="amber"
        trend={{ value: `${activeDealsCount} deals`, direction: 'neutral', label: 'in funnel' }}
        sparklineData={[0, 10000, 25000, 50000]}
        onClick={() => onNavigate('crm')}
      />
    </div>
  );
});
AdminMetricsGrid.displayName = 'AdminMetricsGrid';
