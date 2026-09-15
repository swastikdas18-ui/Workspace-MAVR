import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/api';

export interface ExecutiveDashboardData {
  memberCount?: number;
  activeMembersToday?: number;
  departmentsCount?: number;
  completedProjects?: number;
  inProgressProjects?: number;
  planningProjects?: number;
  reviewProjects?: number;
  blockedProjects?: number;
  activeProjects?: number;
  completedTasks?: number;
  openTasks?: number;
  overdueTasks?: number;
  dueTodayTasks?: number;
  completedThisWeekTasks?: number;
  openDeals?: number;
  pipelineValue?: number;
  wonRevenue?: number;
  lostDeals?: number;
  documentCount?: number;
  wikiCount?: number;
  recentUploads?: any[];
  projectsAtRisk?: any[];
  teamWorkload?: any[];
  recentActivity?: any[];
  totalDealsValue?: number;
  wonDealsValue?: number;
  activeDealsCount?: number;
  totalDocuments?: number;
  error?: string;
  [key: string]: any;
}

export interface PeopleAnalyticsData {
  totalUsers?: number;
  activeToday?: number;
  departmentBreakdown?: Record<string, number>;
  roleBreakdown?: Record<string, number>;
  workforce?: any;
  attendance?: any;
  hiring?: any;
  performance?: any;
  error?: string;
  [key: string]: any;
}

export interface AutomationAnalyticsData {
  totalExecutions?: number;
  successRate?: number;
  activeAutomations?: number;
  automationExecutions?: any[];
  failedExecutions?: any[];
  failedCount?: number;
  activeRules?: number;
  totalRules?: number;
  error?: string;
  [key: string]: any;
}

export function useAdminDashboardData(workspaceId?: string) {
  const [execData, setExecData] = useState<ExecutiveDashboardData | null>(null);
  const [peopleAnalytics, setPeopleAnalytics] = useState<PeopleAnalyticsData | null>(null);
  const [automationAnalytics, setAutomationAnalytics] = useState<AutomationAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [res, peopleRes, autoRes] = await Promise.all([
        api.getExecutiveDashboard().catch(() => null),
        api.getPeopleAnalytics().catch(() => null),
        api.getAutomationAnalytics().catch(() => null),
      ]);
      if (res && !('error' in res)) {
        setExecData(res as ExecutiveDashboardData);
      }
      if (peopleRes && !('error' in peopleRes)) {
        setPeopleAnalytics(peopleRes as PeopleAnalyticsData);
      }
      if (autoRes && !('error' in autoRes)) {
        setAutomationAnalytics(autoRes as AutomationAnalyticsData);
      }
    } catch (err) {
      console.warn('[useAdminDashboardData] Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [workspaceId, fetchDashboardData]);

  return {
    execData,
    peopleAnalytics,
    automationAnalytics,
    loading,
    refetch: fetchDashboardData,
  };
}
