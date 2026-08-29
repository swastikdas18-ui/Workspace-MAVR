import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, Play, Pause, Square, Plus, Calendar, DollarSign, 
  CheckCircle2, TrendingUp, BarChart3, Users, FileText, Check,
  Trash2, Loader2
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TaskTimeEntryItem } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { MetricCard } from '../common/MetricCard';
import { api } from '../../lib/api';

export const TimeTrackingView: React.FC = () => {
  const { currentRole, currentUser, currentWorkspace, tasks, addToast } = useWorkspace();

  // Stopwatch state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeTaskTitle, setActiveTaskTitle] = useState(tasks[0]?.title || 'Product Development');
  const [isBillable, setIsBillable] = useState(true);
  const [hourlyRate, setHourlyRate] = useState(2000); // ₹2,000 / hr
  const [isLoading, setIsLoading] = useState(true);

  // Entries state
  const [entries, setEntries] = useState<TaskTimeEntryItem[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Load entries and analytics from API
  const loadEntries = useCallback(async () => {
    try {
      setIsLoading(true);
      const [entriesRes, analyticsRes] = await Promise.all([
        api.getTimeEntries(),
        currentRole === 'admin' ? api.getTimeUtilization() : Promise.resolve(null),
      ]);

      if (entriesRes && Array.isArray(entriesRes.entries)) {
        setEntries(entriesRes.entries);
      }
      if (analyticsRes?.analytics) {
        setAnalytics(analyticsRes.analytics);
      }
    } catch (err: any) {
      console.error('[TimeTrackingView] Failed to load entries/analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentRole]);

  // Check active timer on mount
  const checkActiveTimer = useCallback(async () => {
    try {
      const res = await api.getActiveTimer();
      if (res?.activeTimer) {
        setIsTimerRunning(true);
        const start = new Date(res.activeTimer.startTime).getTime();
        const diffSecs = Math.max(0, Math.floor((Date.now() - start) / 1000));
        setElapsedSeconds(diffSecs);
        if (res.activeTimer.notes) setActiveTaskTitle(res.activeTimer.notes);
        if (res.activeTimer.hourlyRate) setHourlyRate(res.activeTimer.hourlyRate);
      }
    } catch (err) {
      console.error('[TimeTrackingView] Failed to check active timer:', err);
    }
  }, []);

  useEffect(() => {
    loadEntries();
    checkActiveTimer();
  }, [currentWorkspace?.id, loadEntries, checkActiveTimer]);

  // Stopwatch interval
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatStopwatch = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = async () => {
    try {
      await api.startTimeTimer({
        taskId: tasks[0]?.id,
        billable: isBillable,
        hourlyRate,
        notes: activeTaskTitle || 'Initiative work',
      });
      setIsTimerRunning(true);
      addToast({
        type: 'info',
        title: 'Stopwatch Started',
        message: 'Live time tracking initiated on cloud.',
      });
    } catch (err: any) {
      console.error('[TimeTrackingView] Failed to start timer:', err);
      // Fallback local running if offline
      setIsTimerRunning(true);
    }
  };

  const handleStopTimer = async () => {
    if (!isTimerRunning && elapsedSeconds === 0) return;
    try {
      const res = await api.stopTimeTimer();
      setIsTimerRunning(false);
      setElapsedSeconds(0);
      if (res?.entry) {
        setEntries((prev) => [res.entry, ...prev]);
        addToast({
          type: 'success',
          title: 'Time Logged',
          message: `${res.entry.durationMinutes} minutes recorded to timesheet.`,
        });
      } else {
        loadEntries();
      }
    } catch (err: any) {
      console.error('[TimeTrackingView] Failed to stop timer:', err);
      // Fallback manual entry
      const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      try {
        const res = await api.logManualTime({
          taskId: tasks[0]?.id,
          durationMinutes,
          billable: isBillable,
          hourlyRate,
          notes: activeTaskTitle || 'Initiative work',
        });
        if (res?.entry) {
          setEntries((prev) => [res.entry, ...prev]);
        }
      } catch (logErr) {
        console.error('[TimeTrackingView] Manual fallback failed:', logErr);
      }
      setIsTimerRunning(false);
      setElapsedSeconds(0);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm('Delete this timesheet entry?')) return;
    try {
      await api.deleteTimeEntry(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      addToast({
        type: 'success',
        title: 'Entry Deleted',
        message: 'Timesheet log removed.',
      });
    } catch (err: any) {
      console.error('[TimeTrackingView] Delete failed:', err);
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete entry.',
      });
    }
  };

  // Metrics calculations
  const totalMinutes = entries.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
  const billableMinutes = entries.filter((e) => e.billable).reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
  const totalRevenue = entries.filter((e) => e.billable).reduce((acc, curr) => acc + ((curr.durationMinutes || 0) / 60) * (curr.hourlyRate || 0), 0);
  const utilizationRate = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0;

  const isAdmin = currentRole === 'admin';

  return (
    <div className="space-y-8">
      <PageHeader
        title={isAdmin ? "Time Tracking & Billable Utilization" : "Productivity Timesheet"}
        description={
          isAdmin 
            ? "Live stopwatch timers, weekly timesheets, and client revenue billing for MSMEs and agencies."
            : "Track your focused time on assigned initiatives and review your timesheet logs."
        }
      />

      {/* 1. LIVE STOPWATCH CONTROLLER */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/30 p-6 rounded-2xl shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="text-3xl sm:text-4xl font-mono font-bold text-white bg-slate-950 px-5 py-3 rounded-2xl border border-white/[0.08] shadow-inner tracking-wider">
            {formatStopwatch(elapsedSeconds)}
          </div>
          <div className="w-full sm:w-auto">
            <input
              type="text"
              placeholder="What are you working on?"
              value={activeTaskTitle}
              onChange={(e) => setActiveTaskTitle(e.target.value)}
              className="w-full sm:w-80 px-4 py-2.5 rounded-xl bg-slate-950 border border-white/[0.08] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            {isAdmin && (
              <div className="flex items-center gap-3 mt-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBillable}
                    onChange={(e) => setIsBillable(e.target.checked)}
                    className="rounded text-blue-500 bg-slate-900"
                  />
                  <span>Billable Time</span>
                </label>
                <span className="text-slate-600">•</span>
                <span className="text-xs font-mono text-emerald-400">Rate: ₹{hourlyRate}/hr</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          {isTimerRunning ? (
            <button
              onClick={() => setIsTimerRunning(false)}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-amber-600/20 cursor-pointer"
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={handleStartTimer}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Start Timer</span>
            </button>
          )}

          <button
            onClick={handleStopTimer}
            disabled={elapsedSeconds === 0 && !isTimerRunning}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-rose-400 text-xs font-semibold border border-white/[0.08] flex items-center gap-1.5 cursor-pointer"
          >
            <Square className="w-4 h-4" />
            <span>Stop & Log</span>
          </button>
        </div>
      </div>

      {/* 2. ENTERPRISE UTILIZATION & FINANCIAL KPIS (Admin gets full revenue, Employees see productivity) */}
      {isAdmin ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Tracked Hours"
              value={`${analytics?.totalHours !== undefined ? analytics.totalHours : (totalMinutes / 60).toFixed(1)} hrs`}
              icon={Clock}
              color="blue"
              trend={{ value: `${analytics?.nonBillableHours || 0}h non-billable`, direction: 'neutral', label: 'logged' }}
              sparklineData={[0, analytics?.totalHours || 0]}
            />
            <MetricCard
              label="Billable Hours"
              value={`${analytics?.billableHours !== undefined ? analytics.billableHours : (billableMinutes / 60).toFixed(1)} hrs`}
              icon={DollarSign}
              color="emerald"
              trend={{ value: `${analytics?.teamUtilizationPercent || utilizationRate}% utilization`, direction: 'up', label: 'efficiency' }}
              sparklineData={[0, analytics?.billableHours || 0]}
            />
            <MetricCard
              label="Revenue Generated"
              value={`₹${(analytics?.revenueGenerated || totalRevenue).toLocaleString()}`}
              icon={TrendingUp}
              color="purple"
              trend={{ value: `Billable client focus`, direction: 'up', label: 'realization' }}
              sparklineData={[0, analytics?.revenueGenerated || 0]}
            />
            <MetricCard
              label="Payroll Cost"
              value={`₹${(analytics?.payrollCost || 0).toLocaleString()}`}
              icon={Users}
              color="rose"
              trend={{ value: `Internal team cost`, direction: 'neutral', label: 'expended' }}
              sparklineData={[0, analytics?.payrollCost || 0]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Gross Profit Margin"
              value={`₹${(analytics?.grossMargin || 0).toLocaleString()}`}
              icon={DollarSign}
              color="emerald"
              trend={{ value: `${analytics?.grossMarginPercent || 0}% margin`, direction: 'up', label: 'net profit' }}
              sparklineData={[0, analytics?.grossMargin || 0]}
            />
            <MetricCard
              label="Team Utilization"
              value={`${analytics?.teamUtilizationPercent !== undefined ? analytics.teamUtilizationPercent : utilizationRate}%`}
              icon={BarChart3}
              color="amber"
              trend={{ value: 'Target: >75%', direction: 'up', label: 'fleet target' }}
              sparklineData={[0, analytics?.teamUtilizationPercent || 0]}
            />
            <MetricCard
              label="Total Timesheets"
              value={`${analytics?.entriesCount !== undefined ? analytics.entriesCount : entries.length} logs`}
              icon={FileText}
              color="blue"
              trend={{ value: 'Recorded activities', direction: 'neutral', label: 'audited' }}
              sparklineData={[0, entries.length]}
            />
            <MetricCard
              label="Realized Margin %"
              value={`${analytics?.grossMarginPercent || 0}%`}
              icon={TrendingUp}
              color="purple"
              trend={{ value: 'Revenue - Payroll', direction: 'up', label: 'health' }}
              sparklineData={[0, analytics?.grossMarginPercent || 0]}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Total Hours Tracked"
            value={`${(totalMinutes / 60).toFixed(1)} hrs`}
            icon={Clock}
            color="blue"
            trend={{ value: `${entries.length} logs`, direction: 'neutral', label: 'recorded' }}
            sparklineData={entries.length > 0 ? [0, totalMinutes / 60] : [0]}
          />
          <MetricCard
            label="Focus Score"
            value={`${Math.min(100, Math.round((totalMinutes / 240) * 100))}%`}
            icon={TrendingUp}
            color="emerald"
            trend={{ value: 'Daily goal: 4+ hrs', direction: 'up', label: 'focus' }}
            sparklineData={entries.length > 0 ? [0, totalMinutes] : [0]}
          />
          <MetricCard
            label="Total Logs"
            value={`${entries.length}`}
            icon={FileText}
            color="purple"
            trend={{ value: 'Timesheet records', direction: 'neutral', label: 'submitted' }}
            sparklineData={entries.length > 0 ? [0, entries.length] : [0]}
          />
        </div>
      )}

      {/* 3. ADMIN ONLY: EMPLOYEE UTILIZATION & PROFITABILITY RANKINGS */}
      {isAdmin && analytics?.employeeRankings && analytics.employeeRankings.length > 0 && (
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Employee Utilization & Profitability Leaderboard</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {analytics.employeeRankings.length} team members audited
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.04] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Employee ID</th>
                  <th className="pb-3">Total Hours</th>
                  <th className="pb-3">Billable Hours</th>
                  <th className="pb-3">Utilization (%)</th>
                  <th className="pb-3">Revenue Realized</th>
                  <th className="pb-3">Payroll Cost</th>
                  <th className="pb-3 text-right">Gross Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {analytics.employeeRankings.map((emp: any, idx: number) => (
                  <tr key={emp.userId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3">
                      <div className="font-semibold text-white font-mono text-[11px] flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] text-slate-400 flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <span>{emp.userId.slice(0, 14)}...</span>
                      </div>
                    </td>
                    <td className="py-3 font-mono font-bold text-slate-200">
                      {emp.totalHours}h
                    </td>
                    <td className="py-3 font-mono font-bold text-emerald-400">
                      {emp.billableHours}h
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold ${emp.utilizationPercent >= emp.targetUtilization ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {emp.utilizationPercent}%
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          (target: {emp.targetUtilization}%)
                        </span>
                      </div>
                    </td>
                    <td className="py-3 font-mono font-bold text-purple-400">
                      ₹{emp.revenue.toLocaleString()}
                    </td>
                    <td className="py-3 font-mono text-rose-400">
                      ₹{emp.payrollCost.toLocaleString()}
                    </td>
                    <td className="py-3 font-mono font-bold text-emerald-400 text-right">
                      ₹{emp.grossMargin.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. LOGGED TIMESHEET ENTRIES TABLE */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
          <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Recent Timesheet Logs</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{entries.length} entries</span>
        </div>

        <div className="overflow-x-auto">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No time entries recorded for this workspace yet. Start the stopwatch above to log your hours.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.04] text-slate-400">
                  <th className="pb-3 font-semibold">Date & Time</th>
                  <th className="pb-3 font-semibold">Task / Initiative</th>
                  <th className="pb-3 font-semibold">Duration</th>
                  {isAdmin && <th className="pb-3 font-semibold">Billable</th>}
                  {isAdmin && <th className="pb-3 font-semibold">Revenue</th>}
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 text-slate-400 font-mono text-[11px]">
                      {new Date(entry.startTime).toLocaleDateString()}{' '}
                      {new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 font-medium text-white max-w-xs truncate">
                      {entry.notes || 'Initiative work'}
                    </td>
                    <td className="py-3 font-mono font-bold text-slate-200">
                      {Math.floor(entry.durationMinutes / 60)}h {entry.durationMinutes % 60}m
                    </td>
                    {isAdmin && (
                      <td className="py-3">
                        {entry.billable ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                            Internal
                          </span>
                        )}
                      </td>
                    )}
                    {isAdmin && (
                      <td className="py-3 font-mono font-bold text-emerald-400">
                        {entry.billable ? `₹${Math.round((entry.durationMinutes / 60) * (entry.hourlyRate || 0)).toLocaleString()}` : '—'}
                      </td>
                    )}
                    <td className="py-3 text-right">
                      {(currentRole === 'admin' || entry.userId === currentUser.id) && (
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1 rounded bg-slate-900 hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
