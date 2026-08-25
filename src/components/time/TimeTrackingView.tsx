import React, { useState, useEffect } from 'react';
import { 
  Clock, Play, Pause, Square, Plus, Calendar, DollarSign, 
  CheckCircle2, TrendingUp, BarChart3, Users, FileText, Check
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TaskTimeEntryItem } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { MetricCard } from '../common/MetricCard';

export const TimeTrackingView: React.FC = () => {
  const { currentRole, currentUser, tasks } = useWorkspace();

  // Stopwatch state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeTaskTitle, setActiveTaskTitle] = useState(tasks[0]?.title || 'Hero Component Refactor');
  const [isBillable, setIsBillable] = useState(true);
  const [hourlyRate, setHourlyRate] = useState(2000); // ₹2,000 / hr

  // Entries state
  const [entries, setEntries] = useState<TaskTimeEntryItem[]>([
    {
      id: 'entry-1',
      workspaceId: 'ws-default',
      taskId: tasks[0]?.id || 'task-1',
      userId: currentUser.id,
      startTime: '2026-08-25T09:00:00Z',
      endTime: '2026-08-25T11:30:00Z',
      durationMinutes: 150,
      billable: true,
      hourlyRate: 2000,
      notes: 'Implemented interactive Wiki view and responsive layout',
      createdAt: '2026-08-25T11:30:00Z'
    },
    {
      id: 'entry-2',
      workspaceId: 'ws-default',
      taskId: tasks[1]?.id || 'task-2',
      userId: currentUser.id,
      startTime: '2026-08-25T13:00:00Z',
      endTime: '2026-08-25T14:15:00Z',
      durationMinutes: 75,
      billable: true,
      hourlyRate: 2000,
      notes: 'Client deliverable review and feedback updates',
      createdAt: '2026-08-25T14:15:00Z'
    },
    {
      id: 'entry-3',
      workspaceId: 'ws-default',
      taskId: 'task-internal-sync',
      userId: currentUser.id,
      startTime: '2026-08-24T16:00:00Z',
      endTime: '2026-08-24T16:45:00Z',
      durationMinutes: 45,
      billable: false,
      hourlyRate: 0,
      notes: 'Weekly engineering standup & retrospective',
      createdAt: '2026-08-24T16:45:00Z'
    }
  ]);

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

  const handleStopTimer = () => {
    if (!isTimerRunning && elapsedSeconds === 0) return;
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const newEntry: TaskTimeEntryItem = {
      id: `entry-${Date.now()}`,
      workspaceId: 'ws-default',
      taskId: 'task-active',
      userId: currentUser.id,
      startTime: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
      endTime: new Date().toISOString(),
      durationMinutes,
      billable: isBillable,
      hourlyRate: isBillable ? hourlyRate : 0,
      notes: activeTaskTitle,
      createdAt: new Date().toISOString()
    };

    setEntries((prev) => [newEntry, ...prev]);
    setIsTimerRunning(false);
    setElapsedSeconds(0);
  };

  // Metrics calculations
  const totalMinutes = entries.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const billableMinutes = entries.filter((e) => e.billable).reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const totalRevenue = entries.filter((e) => e.billable).reduce((acc, curr) => acc + (curr.durationMinutes / 60) * curr.hourlyRate, 0);
  const utilizationRate = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Time Tracking & Billable Utilization"
        description="Live stopwatch timers, weekly timesheets, and client revenue billing for MSMEs and agencies."
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
              onClick={() => setIsTimerRunning(true)}
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

      {/* 2. UTILIZATION & REVENUE KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Hours"
          value={`${(totalMinutes / 60).toFixed(1)} hrs`}
          icon={Clock}
          color="blue"
          trend={{ value: 'This week', direction: 'neutral', label: 'logged' }}
          sparklineData={[10, 20, 30, 45, 60, 75, totalMinutes / 60]}
        />
        <MetricCard
          label="Billable Hours"
          value={`${(billableMinutes / 60).toFixed(1)} hrs`}
          icon={DollarSign}
          color="emerald"
          trend={{ value: `${((totalMinutes - billableMinutes) / 60).toFixed(1)} non-billable`, direction: 'up', label: 'client focus' }}
          sparklineData={[15, 25, 35, 50, 65, 80, billableMinutes / 60]}
        />
        <MetricCard
          label="Billable Revenue"
          value={`₹${Math.round(totalRevenue).toLocaleString()}`}
          icon={TrendingUp}
          color="purple"
          trend={{ value: `₹${hourlyRate}/hr avg`, direction: 'up', label: 'realized' }}
          sparklineData={[2000, 4000, 6000, 8000, 10000, totalRevenue]}
        />
        <MetricCard
          label="Team Utilization"
          value={`${utilizationRate}%`}
          icon={BarChart3}
          color="amber"
          trend={{ value: 'Target: >75%', direction: 'up', label: 'efficiency' }}
          sparklineData={[50, 60, 65, 70, 75, 80, utilizationRate]}
        />
      </div>

      {/* 3. LOGGED TIMESHEET ENTRIES TABLE */}
      <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
          <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Recent Timesheet Logs</span>
          </h3>
          <span className="text-xs text-slate-400 font-mono">{entries.length} entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.04] text-slate-400">
                <th className="pb-3 font-semibold">Date & Time</th>
                <th className="pb-3 font-semibold">Task / Initiative</th>
                <th className="pb-3 font-semibold">Duration</th>
                <th className="pb-3 font-semibold">Billable</th>
                <th className="pb-3 font-semibold">Revenue</th>
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
                  <td className="py-3 font-mono font-bold text-emerald-400">
                    {entry.billable ? `₹${Math.round((entry.durationMinutes / 60) * entry.hourlyRate).toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
