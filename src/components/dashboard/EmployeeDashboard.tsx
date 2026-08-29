import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  FolderKanban, CheckSquare, Users, DollarSign, 
  Clock, CheckCircle2, ArrowRight, Plus, Sparkles,
  Calendar, Layers, FileText, Play, Pause, Square, Timer
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { api } from '../../lib/api';
import { motion } from 'motion/react';

export const EmployeeDashboard: React.FC = () => {
  const { 
    currentUser, projects, tasks, crmRecords, teams, setActiveTab, updateTaskStatus, addToast 
  } = useWorkspace();

  // Time Tracking State for Employee Widgets
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [recentTimeEntries, setRecentTimeEntries] = useState<any[]>([]);
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const loadTimeData = useCallback(async () => {
    try {
      const [entriesRes, activeRes] = await Promise.all([
        api.getTimeEntries(),
        api.getActiveTimer(),
      ]);

      if (entriesRes && Array.isArray(entriesRes.entries)) {
        const myEntries = entriesRes.entries.filter((e: any) => e.userId === currentUser.id);
        setRecentTimeEntries(myEntries.slice(0, 4));

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const weekAgo = todayStart - 7 * 24 * 60 * 60 * 1000;

        let todayMins = 0;
        let weekMins = 0;

        for (const e of myEntries) {
          const entryTime = new Date(e.startTime).getTime();
          if (entryTime >= todayStart) {
            todayMins += e.durationMinutes || 0;
          }
          if (entryTime >= weekAgo) {
            weekMins += e.durationMinutes || 0;
          }
        }

        setTodayMinutes(todayMins);
        setWeeklyMinutes(weekMins);
      }

      if (activeRes?.activeTimer) {
        setActiveTimer(activeRes.activeTimer);
        const start = new Date(activeRes.activeTimer.startTime).getTime();
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
      } else {
        setActiveTimer(null);
        setElapsedSeconds(0);
      }
    } catch (err) {
      console.error('[EmployeeDashboard] Error loading time tracking widget data:', err);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadTimeData();
  }, [loadTimeData]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (activeTimer) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTimer]);

  const formatTimer = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStopTimer = async () => {
    try {
      await api.stopTimeTimer();
      setActiveTimer(null);
      setElapsedSeconds(0);
      addToast({
        type: 'success',
        title: 'Timer Stopped',
        message: 'Focused time logged to timesheet.',
      });
      loadTimeData();
    } catch (err: any) {
      console.error('[EmployeeDashboard] Stop timer failed:', err);
    }
  };

  // Filter only assigned projects
  const assignedProjects = projects.filter((p) => p.member_ids.includes(currentUser.id));
  
  // Filter assigned tasks
  const myTasks = tasks.filter(
    (t) =>
      t.assigned_to === currentUser.id ||
      (t as any).assignedTo === currentUser.id ||
      t.assignee?.id === currentUser.id
  );
  const myPendingTasks = myTasks.filter((t) => t.status !== 'completed');
  const myCompletedTasks = myTasks.filter((t) => t.status === 'completed');
  
  // Filter assigned CRM records
  const myCrmRecords = crmRecords.filter((c) => c.owner_id === currentUser.id);

  return (
    <div className="space-y-8">
      {/* Top Greeting & Action Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#111827] via-[#0F172A] to-[#172554] border border-white/[0.08] p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                Employee Productivity Hub
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">Assigned Deliverables</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Good day, {currentUser.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
              You have <span className="text-white font-semibold">{myPendingTasks.length} pending deliverables</span> across <span className="text-white font-semibold">{assignedProjects.length} active initiatives</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('tasks')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Open My Task Board</span>
            </button>
          </div>
        </div>
      </div>
      {/* Active Stopwatch Live Widget */}
      {activeTimer && (
        <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border border-blue-500/40 p-5 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Timer className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Timer Running
                </span>
                <span className="text-xs text-white font-medium truncate max-w-xs sm:max-w-md">
                  {activeTimer.notes || 'Initiative work'}
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-mono font-bold text-white mt-1">
                {formatTimer(elapsedSeconds)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('time')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-white/[0.08] transition-colors cursor-pointer"
            >
              Open Timesheet
            </button>
            <button
              onClick={handleStopTimer}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop & Save</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Metrics & Time Tracking Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Today's Hours"
          value={`${(todayMinutes / 60).toFixed(1)} hrs`}
          icon={Clock}
          color="blue"
          trend={{ value: 'Daily focus', direction: 'up', label: 'today' }}
          sparklineData={[0, todayMinutes]}
          onClick={() => setActiveTab('time')}
        />

        <MetricCard
          label="Weekly Hours"
          value={`${(weeklyMinutes / 60).toFixed(1)} hrs`}
          icon={Calendar}
          color="purple"
          trend={{ value: `${Math.round((weeklyMinutes / (40 * 60)) * 100)}% of target`, direction: 'up', label: 'week' }}
          sparklineData={[0, weeklyMinutes]}
          onClick={() => setActiveTab('time')}
        />

        <MetricCard
          label="Pending Tasks"
          value={myPendingTasks.length}
          icon={CheckSquare}
          color="amber"
          trend={{ value: `${myTasks.filter(t => t.priority === 'urgent' || t.priority === 'critical').length} urgent`, direction: 'down', label: 'action required' }}
          sparklineData={[50, 45, 40, 30, 25, 20, 15]}
          onClick={() => setActiveTab('tasks')}
        />

        <MetricCard
          label="Tasks Completed"
          value={myCompletedTasks.length}
          icon={CheckCircle2}
          color="emerald"
          trend={{ value: `${Math.round((myCompletedTasks.length / (myTasks.length || 1)) * 100)}%`, direction: 'up', label: 'velocity' }}
          sparklineData={[10, 20, 35, 50, 65, 80, 100]}
          onClick={() => setActiveTab('tasks')}
        />
      </div>

      {/* Main Focus Area: Tasks, Projects & Recent Timesheet Entries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent & Active Tasks */}
        <div className="lg:col-span-2 bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-purple-400" />
                  <span>My Active Work Items</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Priority task execution queue</p>
              </div>
              <button
                onClick={() => setActiveTab('tasks')}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View Board</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {myTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  You have no assigned tasks. Enjoy your clean queue!
                </div>
              ) : (
                myTasks.slice(0, 5).map((task) => {
                  const isUrgent = task.priority === 'urgent' || task.priority === 'critical';
                  const isHigh = task.priority === 'high';
                  return (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl bg-[#0F172A] border border-white/[0.04] hover:border-white/[0.08] transition-all flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isUrgent ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-blue-500'
                            }`}
                          />
                          <p className="text-xs font-semibold text-white truncate">{task.title}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-md">
                          {task.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {task.status !== 'completed' ? (
                          <button
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/20 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Completed</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Time Entries Widget */}
          <div className="pt-4 border-t border-white/[0.06]">
            <div className="flex items-center justify-between pb-3 mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Recent Timesheet Logs</span>
              </h4>
              <button
                onClick={() => setActiveTab('time')}
                className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Full Timesheet</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {recentTimeEntries.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">No time logged today yet.</p>
              ) : (
                recentTimeEntries.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="p-2.5 rounded-xl bg-[#0F172A] border border-white/[0.04] flex items-center justify-between text-xs"
                  >
                    <div className="truncate max-w-xs sm:max-w-md">
                      <span className="text-white font-medium">{entry.notes || 'Initiative work'}</span>
                      <span className="text-slate-500 text-[10px] ml-2 font-mono">
                        {new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">
                      {Math.floor((entry.durationMinutes || 0) / 60)}h {(entry.durationMinutes || 0) % 60}m
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Assigned Projects & Milestones */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
            <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-blue-400" />
              <span>Assigned Initiatives</span>
            </h3>
            <span className="text-xs text-slate-400">{assignedProjects.length} projects</span>
          </div>

          <div className="space-y-3.5 flex-1">
            {assignedProjects.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No assigned projects.
              </div>
            ) : (
              assignedProjects.map((proj) => (
                <div
                  key={proj.id}
                  onClick={() => setActiveTab('projects')}
                  className="p-3.5 rounded-xl bg-[#0F172A] border border-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
                      {proj.title}
                    </p>
                    <span className="text-xs font-mono font-bold text-blue-400">{proj.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden my-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all"
                      style={{ width: `${proj.progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Deadline: {proj.due_date}</span>
                    <span className="capitalize">{proj.status.replace('_', ' ')}</span>
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
