import React from 'react';
import { Users, Briefcase, GraduationCap, Mail } from 'lucide-react';
import { MetricCard } from '../common/MetricCard';

interface DirectoryMetricsCardsProps {
  totalUsers: number;
  totalTeams: number;
  employeeCount: number;
  internCount: number;
  pendingInvitesCount: number;
}

export const DirectoryMetricsCards: React.FC<DirectoryMetricsCardsProps> = ({
  totalUsers,
  totalTeams,
  employeeCount,
  internCount,
  pendingInvitesCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Total Workspace Size"
        value={totalUsers}
        icon={Users}
        color="purple"
        trend={{ value: `${totalTeams} departments`, direction: 'neutral', label: 'structured' }}
        sparklineData={[0, 0, 0, 0, 0, 0, totalUsers]}
      />
      <MetricCard
        label="Employees"
        value={employeeCount}
        icon={Briefcase}
        color="blue"
        trend={{ value: 'Full Access', direction: 'neutral', label: 'operational' }}
        sparklineData={[0, 0, 0, 0, 0, 0, employeeCount]}
      />
      <MetricCard
        label="Learning Sandbox"
        value={internCount}
        icon={GraduationCap}
        color="emerald"
        trend={{ value: 'Onboarding', direction: 'neutral', label: 'mentored' }}
        sparklineData={[0, 0, 0, 0, 0, 0, internCount]}
      />
      <MetricCard
        label="Pending Invitations"
        value={pendingInvitesCount}
        icon={Mail}
        color="amber"
        trend={{ value: `${pendingInvitesCount} unaccepted`, direction: 'neutral', label: 'invites' }}
        sparklineData={[0, 0, 0, 0, 0, 0, pendingInvitesCount]}
      />
    </div>
  );
};
