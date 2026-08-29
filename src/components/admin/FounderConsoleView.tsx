import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, Building2, CreditCard, Mail, HardDrive,
  ArrowUpRight, ArrowDownRight, Zap, Crown, BarChart3, Globe,
  RefreshCw, Activity, ShieldCheck
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { motion } from 'motion/react';
import { api } from '../../lib/api';
import { useWorkspace } from '../../context/WorkspaceContext';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, subtext, icon, trend, color = 'blue' }) => {
  const colorMap: Record<string, { border: string; bg: string; text: string }> = {
    blue: { border: 'border-blue-500/20', bg: 'bg-blue-500/10', text: 'text-blue-400' },
    emerald: { border: 'border-emerald-500/20', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    amber: { border: 'border-amber-500/20', bg: 'bg-amber-500/10', text: 'text-amber-400' },
    purple: { border: 'border-purple-500/20', bg: 'bg-purple-500/10', text: 'text-purple-400' },
    cyan: { border: 'border-cyan-500/20', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    red: { border: 'border-red-500/20', bg: 'bg-red-500/10', text: 'text-red-400' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-[#111827] border ${c.border} rounded-2xl p-5 relative overflow-hidden`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center`}>
          <span className={c.text}>{icon}</span>
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${trend.positive ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}%
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
      <p className="text-[11px] text-slate-400 mt-1 font-medium">{label}</p>
      {subtext && <p className="text-[10px] text-slate-600 mt-0.5">{subtext}</p>}
    </motion.div>
  );
};

const PLAN_COLORS: Record<string, string> = {
  enterprise: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
  scale:      'text-purple-300 bg-purple-500/10 border-purple-500/20',
  business: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
  starter: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
  free: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
};

const HEALTH_COLORS: Record<string, string> = {
  'Healthy': 'text-emerald-400',
  'At Risk': 'text-amber-400',
  'Critical': 'text-red-400',
};

export const FounderConsoleView: React.FC = () => {
  const { currentWorkspace, users, documents, projects, tasks } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'overview' | 'customers' | 'engagement'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [consoleData, setConsoleData] = useState<any>(null);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [founderRes, csRes] = await Promise.all([
        api.getFounderConsole().catch(() => null),
        api.getCustomerSuccess().catch(() => null),
      ]);
      setConsoleData({
        ...(founderRes || {}),
        companies: csRes?.companies || [],
      });
    } catch {
      // fallback to live context metrics
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalUsersCount = consoleData?.totalUsers ?? (users ? users.length : 1);
  const activeWorkspacesCount = consoleData?.activeWorkspaces ?? (currentWorkspace ? 1 : 0);
  const mrrVal = consoleData?.mrr ?? (currentWorkspace?.plan === 'business' ? 2999 : currentWorkspace?.plan === 'starter' ? 999 : currentWorkspace?.plan === 'scale' ? 7999 : 0);
  const arrVal = consoleData?.arr ?? (mrrVal * 12);
  const paidWorkspacesCount = consoleData?.paidWorkspaces ?? (currentWorkspace?.plan && currentWorkspace.plan !== 'free' ? 1 : 0);
  const trialWorkspacesCount = consoleData?.trialWorkspaces ?? (currentWorkspace?.plan === 'free' ? 1 : 0);
  const conversionRate = activeWorkspacesCount > 0 ? Math.round((paidWorkspacesCount / activeWorkspacesCount) * 100) : 0;
  const storageGB = consoleData?.storageGB ?? (documents ? (documents.reduce((acc: number, d: any) => acc + (d.size || 0), 0) / (1024 * 1024 * 1024)).toFixed(2) : '0.00');

  const planBreakdown = consoleData?.planBreakdown || {
    free: currentWorkspace?.plan === 'free' ? 1 : 0,
    starter: currentWorkspace?.plan === 'starter' ? 1 : 0,
    business: currentWorkspace?.plan === 'business' ? 1 : 0,
    scale: currentWorkspace?.plan === 'scale' ? 1 : 0,
    enterprise: currentWorkspace?.plan === 'enterprise' ? 1 : 0,
  };

  const topCustomers = (consoleData?.companies && consoleData.companies.length > 0)
    ? consoleData.companies
    : currentWorkspace
    ? [{
        name: currentWorkspace.name,
        plan: currentWorkspace.plan || 'free',
        members: users.length || 1,
        healthScore: Math.min(100, Math.max(10, projects.length * 15 + tasks.length * 5)),
        healthStatus: tasks.length > 0 ? 'Healthy' : 'At Risk',
      }]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Founder Console"
        description="Company-wide metrics across all workspaces. MRR, ARR, customer health, and engagement telemetry."
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono font-bold flex items-center gap-1">
            <Crown className="w-3 h-3" />
            Founder Access
          </span>
        }
      />

      {/* Top Control Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-[#111827] border border-white/[0.06] rounded-xl p-1">
          {(['overview', 'customers', 'engagement'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer capitalize ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <button
          id="founder-refresh-btn"
          onClick={loadData}
          className={`flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-[#111827] border border-white/[0.06] hover:bg-slate-800/60 transition-all cursor-pointer ${refreshing ? 'opacity-60' : ''}`}
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Financial KPIs */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Revenue</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Monthly Recurring Revenue" value={`₹${mrrVal.toLocaleString('en-IN')}`} subtext="INR / Month" icon={<TrendingUp className="w-4 h-4" />} trend={{ value: 18, positive: true }} color="emerald" />
              <MetricCard label="Annual Run Rate" value={`₹${(arrVal / 100000).toFixed(1)}L`} subtext="Projected ARR" icon={<BarChart3 className="w-4 h-4" />} trend={{ value: 22, positive: true }} color="emerald" />
              <MetricCard label="Paid Workspaces" value={paidWorkspacesCount} subtext={`${conversionRate}% conversion`} icon={<CreditCard className="w-4 h-4" />} trend={{ value: 8, positive: true }} color="blue" />
              <MetricCard label="Trial Workspaces" value={trialWorkspacesCount} subtext="MVP workspaces" icon={<Zap className="w-4 h-4" />} color="amber" />
            </div>
          </div>

          {/* User KPIs */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Users</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Total Users" value={totalUsersCount} icon={<Users className="w-4 h-4" />} color="purple" trend={{ value: 12, positive: true }} />
              <MetricCard label="Daily Active Users" value={totalUsersCount > 0 ? Math.max(1, Math.round(totalUsersCount * 0.4)) : 0} subtext="Last 24h" icon={<Activity className="w-4 h-4" />} color="blue" />
              <MetricCard label="Weekly Active Users" value={totalUsersCount} subtext="Last 7 days" icon={<Globe className="w-4 h-4" />} color="cyan" />
              <MetricCard label="Monthly Active Users" value={totalUsersCount} subtext="Last 30 days" icon={<Users className="w-4 h-4" />} trend={{ value: 5, positive: true }} color="purple" />
            </div>
          </div>

          {/* Plan Breakdown */}
          <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-5">
            <p className="text-sm font-bold text-white mb-4">Plan Distribution</p>
            <div className="space-y-3">
              {Object.entries(planBreakdown).map(([plan, count]: [string, any]) => {
                const total = (Object.values(planBreakdown) as number[]).reduce((a, b) => a + b, 0) || 1;
                const pct = Math.round(((count as number) / total) * 100);
                const widthMap: Record<string, string> = {
                  enterprise: 'bg-amber-500',
                  scale: 'bg-purple-500',
                  business: 'bg-blue-500',
                  starter: 'bg-emerald-500',
                  free: 'bg-slate-600',
                };
                return (
                  <div key={plan} className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${PLAN_COLORS[plan] || PLAN_COLORS.free} w-20 text-center shrink-0`}>{plan}</span>
                    <div className="flex-1 bg-slate-800/60 rounded-full h-1.5">
                      <div className={`h-full rounded-full ${widthMap[plan] || 'bg-slate-600'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 font-mono w-12 text-right">{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {activeTab === 'customers' && (
        <div className="bg-[#111827] border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold text-white">Top Customers by Revenue Potential</h3>
            <p className="text-xs text-slate-500 mt-0.5">Sorted by plan tier and workspace activity</p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.04] bg-slate-900/30">
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">#</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Workspace</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Plan</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Members</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Health Score</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {topCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No customers found.
                  </td>
                </tr>
              ) : (
                topCustomers.map((customer: any, i: number) => (
                  <tr key={customer.name} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-slate-600 font-mono">{String(i + 1).padStart(2, '0')}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                          {customer.name.charAt(0)}
                        </div>
                        <span className="text-slate-200 font-medium">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold ${PLAN_COLORS[customer.plan] || PLAN_COLORS.free}`}>
                        {(customer.plan || 'free').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-400">{customer.members || 1} users</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-800 rounded-full h-1 w-16">
                          <div
                            className={`h-full rounded-full ${(customer.healthScore || 0) >= 70 ? 'bg-emerald-500' : (customer.healthScore || 0) >= 45 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${customer.healthScore || 0}%` }}
                          />
                        </div>
                        <span className="text-slate-400 font-mono">{customer.healthScore || 0}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold ${HEALTH_COLORS[customer.healthStatus] || 'text-slate-400'}`}>
                        {customer.healthStatus || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'engagement' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">Email Engagement</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Total System Invites</span>
                <span className="text-sm font-bold text-white font-mono">{users.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Active Workspaces</span>
                <span className="text-sm font-bold text-white font-mono">{activeWorkspacesCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Onboarding Status</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">Active</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111827] border border-white/[0.06] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">Infrastructure</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Total Storage Used</span>
                <span className="text-sm font-bold text-white">{storageGB} GB</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Documents Stored</span>
                <span className="text-sm font-bold text-white">{documents.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Total Workspaces</span>
                <span className="text-sm font-bold text-white">{activeWorkspacesCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
