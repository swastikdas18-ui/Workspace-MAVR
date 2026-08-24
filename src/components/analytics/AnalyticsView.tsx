import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  BarChart3, TrendingUp, CheckCircle2, DollarSign, FolderKanban, 
  Users, ArrowUpRight, ShieldCheck, Activity, Zap, Layers, PieChart,
  Calendar, Clock, CheckCircle
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { MetricCard } from '../common/MetricCard';
import { motion } from 'motion/react';

export const AnalyticsView: React.FC = () => {
  const { projects, tasks, crmRecords, users, teams } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'overview' | 'velocity' | 'revenue' | 'teams'>('overview');

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const reviewTasks = tasks.filter((t) => t.status === 'review').length;
  const todoTasks = tasks.filter((t) => t.status === 'todo').length;

  const totalRevenue = crmRecords.filter((r) => r.status === 'won').reduce((a, b) => a + b.deal_value, 0);
  const inPipelineRevenue = crmRecords.filter((r) => r.status !== 'won' && r.status !== 'lost').reduce((a, b) => a + b.deal_value, 0);
  const velocityRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  // Monthly throughput mock data for Stripe/PostHog chart
  const weeklyData = [
    { week: 'W1', completed: 18, created: 22, revenue: 45000 },
    { week: 'W2', completed: 25, created: 19, revenue: 60000 },
    { week: 'W3', completed: 32, created: 28, revenue: 82000 },
    { week: 'W4', completed: 29, created: 24, revenue: 75000 },
    { week: 'W5', completed: 38, created: 30, revenue: 110000 },
    { week: 'W6', completed: 42, created: 35, revenue: 135000 },
  ];

  const maxCompleted = Math.max(...weeklyData.map(d => d.completed));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Telemetry & Organization Intelligence"
        description="Executive metrics across engineering velocity, revenue conversion, roadmap health, and department load."
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-bold">
            Real-Time Engine
          </span>
        }
        actions={
          <div className="flex items-center p-1 bg-[#111827] border border-white/[0.08] rounded-xl text-xs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'overview' ? 'bg-[#7C3AED] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('velocity')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'velocity' ? 'bg-[#7C3AED] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Velocity & Flow
            </button>
            <button
              onClick={() => setActiveTab('revenue')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'revenue' ? 'bg-[#7C3AED] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pipeline Funnel
            </button>
          </div>
        }
      />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Closed Won Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="emerald"
          trend={{ value: '+28.4%', direction: 'up', label: 'vs last quarter' }}
          sparklineData={[30, 45, 60, 70, 85, 100, 125]}
        />
        <MetricCard
          label="In-Flight Pipeline"
          value={`$${inPipelineRevenue.toLocaleString()}`}
          icon={TrendingUp}
          color="purple"
          trend={{ value: `${crmRecords.length} deals active`, direction: 'neutral', label: 'funnel' }}
          sparklineData={[40, 50, 45, 65, 75, 80, 95]}
        />
        <MetricCard
          label="Task Velocity SLA"
          value={`${velocityRate}%`}
          icon={Zap}
          color="blue"
          trend={{ value: `${completedTasks}/${tasks.length} resolved`, direction: 'up', label: 'throughput' }}
          sparklineData={[45, 55, 65, 60, 75, 80, 92]}
        />
        <MetricCard
          label="Workforce Allocation"
          value={`${users.length} FTEs`}
          icon={Users}
          color="amber"
          trend={{ value: `${teams.length} teams`, direction: 'neutral', label: 'capacity' }}
          sparklineData={[10, 12, 14, 15, 18, 20, 24]}
        />
      </div>

      {/* Stripe / PostHog Style Throughput Bar Chart */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span>Sprint Task Velocity & Throughput</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Weekly comparison of created vs completed engineering milestones.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#7C3AED]" />
              <span className="text-slate-300">Resolved Tasks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-700" />
              <span className="text-slate-400">Created Tasks</span>
            </div>
          </div>
        </div>

        {/* Chart Bars */}
        <div className="grid grid-cols-6 gap-3 sm:gap-6 pt-4 h-56 items-end">
          {weeklyData.map((d) => {
            const completedHeight = Math.round((d.completed / maxCompleted) * 100);
            const createdHeight = Math.round((d.created / maxCompleted) * 100);

            return (
              <div key={d.week} className="flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                  {d.completed} done
                </div>
                <div className="w-full flex items-end justify-center gap-1.5 h-40">
                  {/* Created Bar */}
                  <div
                    style={{ height: `${createdHeight}%` }}
                    className="w-full max-w-[16px] bg-slate-800 rounded-t group-hover:bg-slate-700 transition-all"
                  />
                  {/* Completed Bar */}
                  <div
                    style={{ height: `${completedHeight}%` }}
                    className="w-full max-w-[16px] bg-[#7C3AED] rounded-t group-hover:bg-[#A855F7] transition-all shadow-lg shadow-purple-600/20"
                  />
                </div>
                <span className="text-xs font-mono text-slate-400 group-hover:text-white transition-colors">
                  {d.week}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid of Analytical Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Pipeline Health */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>Workflow State Distribution</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">{tasks.length} total</span>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs mb-1.5 text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Completed & Deployed</span>
                </span>
                <span className="font-mono font-bold text-emerald-400">{completedTasks}</span>
              </div>
              <div className="w-full bg-[#0F172A] h-2 rounded-full overflow-hidden border border-white/[0.04]">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(completedTasks / (tasks.length || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>In Pull Request / Code Review</span>
                </span>
                <span className="font-mono font-bold text-purple-400">{reviewTasks}</span>
              </div>
              <div className="w-full bg-[#0F172A] h-2 rounded-full overflow-hidden border border-white/[0.04]">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(reviewTasks / (tasks.length || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>Active Development</span>
                </span>
                <span className="font-mono font-bold text-blue-400">{inProgressTasks}</span>
              </div>
              <div className="w-full bg-[#0F172A] h-2 rounded-full overflow-hidden border border-white/[0.04]">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(inProgressTasks / (tasks.length || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 text-slate-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span>Product Backlog & To Do</span>
                </span>
                <span className="font-mono font-bold text-slate-400">{todoTasks}</span>
              </div>
              <div className="w-full bg-[#0F172A] h-2 rounded-full overflow-hidden border border-white/[0.04]">
                <div
                  className="bg-slate-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(todoTasks / (tasks.length || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Project Milestone Health */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-purple-400" />
              <span>Active Roadmap Delivery Progress</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">{projects.length} roadmaps</span>
          </div>

          <div className="space-y-3.5 max-h-56 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No active projects to report.
              </div>
            ) : (
              projects.map((proj) => (
                <div key={proj.id} className="p-3.5 rounded-xl bg-[#0F172A] border border-white/[0.04] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white truncate max-w-[200px]">{proj.title}</span>
                    <span className="text-purple-400 font-mono font-bold">{proj.progress}%</span>
                  </div>
                  <div className="w-full bg-[#111827] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Target: {proj.due_date}</span>
                    <span className="text-emerald-400">{proj.budget}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
