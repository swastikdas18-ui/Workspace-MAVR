import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  FolderKanban, CheckSquare, Users, DollarSign, 
  Clock, CheckCircle2, ArrowRight, Plus, Sparkles,
  Calendar, Layers, FileText, Play, Pause, Square, Timer,
  Send, CheckCircle, AlertTriangle, Flame, ShieldAlert
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';

export const EmployeeDashboard: React.FC = () => {
  const { 
    currentUser, projects, tasks, crmRecords, setActiveTab, refreshData, addToast 
  } = useWorkspace();

  // Time Tracking State for Employee Widgets
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [recentTimeEntries, setRecentTimeEntries] = useState<any[]>([]);
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [taskFilter, setTaskFilter] = useState<'all' | 'today' | 'overdue' | 'in_progress' | 'review' | 'done'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Phase 4: People OS Employee V2 State
  const [leaveBalances, setLeaveBalances] = useState<any | null>(null);
  const [myGoals, setMyGoals] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const loadTimeData = useCallback(async () => {
    try {
      const [entriesRes, activeRes, leaveRes, goalsRes, attRes] = await Promise.all([
        api.getTimeEntries(),
        api.getActiveTimer(),
        api.getLeaveBalances(currentUser.id),
        api.getGoals({ userId: currentUser.id }),
        api.getTodayAttendance(),
      ]);

      if (leaveRes?.balances) setLeaveBalances(leaveRes.balances);
      if (goalsRes?.goals) setMyGoals(goalsRes.goals);
      if (attRes) {
        setTodayAttendance(attRes.record);
        setIsCheckedIn(attRes.isCheckedIn);
      }

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
      console.error('[EmployeeDashboard] Error loading dashboard data:', err);
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

  // Phase 2 Task Actions
  const handleStartTask = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await api.startTask(taskId);
      addToast({
        type: 'success',
        title: 'Task Started',
        message: 'Task moved to In Progress.',
      });
      await refreshData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to start task',
        message: err.message || 'Error occurred.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitReview = async (taskId: string) => {
    try {
      setActionLoading(taskId);
      await api.submitTaskReview(taskId);
      addToast({
        type: 'success',
        title: 'Submitted for Review',
        message: 'Project leads will be notified.',
      });
      await refreshData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to submit review',
        message: err.message || 'Error occurred.',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const assignedProjects = projects;
  
  // Filter assigned tasks
  const myTasks = tasks.filter(
    (t) =>
      t.assigned_to === currentUser.id ||
      (t as any).assignedTo === currentUser.id ||
      t.assignee?.id === currentUser.id
  );

  const todayStr = new Date().toISOString().substring(0, 10);
  const nowTime = new Date().getTime();

  const myTodoTasks = myTasks.filter((t) => t.status === 'todo' || t.status === 'backlog');
  const myInProgressTasks = myTasks.filter((t) => t.status === 'in_progress');
  const myReviewTasks = myTasks.filter((t) => t.status === 'review');
  const myCompletedTasks = myTasks.filter((t) => t.status === 'done' || t.status === 'completed');
  const myOverdueTasks = myTasks.filter((t) => {
    if (t.status === 'done' || t.status === 'completed') return false;
    const dueTime = new Date(t.due_date || (t as any).dueDate).getTime();
    return dueTime < nowTime;
  });
  const myTodayTasks = myTasks.filter((t) => {
    const dueStr = (t.due_date || (t as any).dueDate || '').substring(0, 10);
    return dueStr === todayStr && t.status !== 'done' && t.status !== 'completed';
  });

  const filteredTasks = myTasks.filter((t) => {
    const isDone = t.status === 'done' || t.status === 'completed';
    if (taskFilter === 'all') return true;
    if (taskFilter === 'today') {
      const dueStr = (t.due_date || (t as any).dueDate || '').substring(0, 10);
      return dueStr === todayStr && !isDone;
    }
    if (taskFilter === 'overdue') {
      const dueTime = new Date(t.due_date || (t as any).dueDate).getTime();
      return dueTime < nowTime && !isDone;
    }
    if (taskFilter === 'in_progress') return t.status === 'in_progress';
    if (taskFilter === 'review') return t.status === 'review';
    if (taskFilter === 'done') return isDone;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Greeting & Action Header */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#111827] via-[#0F172A] to-[#172554] border border-white/[0.08] p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                Execution Engine Hub
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs text-slate-400">Personal Work Queue</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Good day, {currentUser.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
              You have <span className="text-white font-semibold">{myInProgressTasks.length + myTodoTasks.length} active tasks</span> ({myOverdueTasks.length} overdue) across <span className="text-white font-semibold">{assignedProjects.length} initiatives</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('tasks')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Full Task Board</span>
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

      {/* KPI Metrics: Task Execution Engine */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="In Progress"
          value={myInProgressTasks.length}
          icon={Play}
          color="blue"
          trend={{ value: `${myTodayTasks.length} due today`, direction: 'up', label: 'active' }}
          sparklineData={[0, 1, 2, myInProgressTasks.length]}
          onClick={() => { setTaskFilter('in_progress'); }}
        />

        <MetricCard
          label="Overdue Tasks"
          value={myOverdueTasks.length}
          icon={AlertTriangle}
          color="rose"
          trend={{ value: myOverdueTasks.length > 0 ? 'Requires attention' : 'On track', direction: myOverdueTasks.length > 0 ? 'down' : 'up', label: 'deadline' }}
          sparklineData={[3, 2, 1, myOverdueTasks.length]}
          onClick={() => { setTaskFilter('overdue'); }}
        />

        <MetricCard
          label="Awaiting Review"
          value={myReviewTasks.length}
          icon={Send}
          color="amber"
          trend={{ value: 'Under Lead Review', direction: 'up', label: 'review' }}
          sparklineData={[0, 1, myReviewTasks.length]}
          onClick={() => { setTaskFilter('review'); }}
        />

        <MetricCard
          label="Completed"
          value={myCompletedTasks.length}
          icon={CheckCircle2}
          color="emerald"
          trend={{ value: `${myTasks.length > 0 ? Math.round((myCompletedTasks.length / myTasks.length) * 100) : 0}% completion`, direction: 'up', label: 'velocity' }}
          sparklineData={[10, 20, 35, 50, 65, 80, 100]}
          onClick={() => { setTaskFilter('done'); }}
        />
      </div>

      {/* Main Focus Area: Tasks Execution Queue & Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks Queue with Phase 2 Filtering & Execution */}
        <div className="lg:col-span-2 bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-purple-400" />
                <span>My Execution Tasks</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time task lifecycle & action queue</p>
            </div>

            {/* Task Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/[0.06] overflow-x-auto text-xs">
              {(['all', 'today', 'overdue', 'in_progress', 'review', 'done'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTaskFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors capitalize whitespace-nowrap cursor-pointer ${
                    taskFilter === tab
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'in_progress' ? 'In Progress' : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                No tasks match the selected filter.
              </div>
            ) : (
              filteredTasks.slice(0, 8).map((task) => {
                const isUrgent = task.priority === 'urgent' || task.priority === 'critical';
                const isHigh = task.priority === 'high';
                const isOverdue = task.status !== 'done' && task.status !== 'completed' && new Date(task.due_date || (task as any).dueDate).getTime() < nowTime;
                const isBlocked = task.is_blocked || (task as any).isBlocked;

                return (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl bg-[#0F172A] border border-white/[0.04] hover:border-white/[0.08] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isUrgent ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                        />
                        <p className="text-xs font-semibold text-white truncate">{task.title}</p>
                        
                        {/* Status Badge */}
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          task.status === 'done' || task.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : task.status === 'review'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : task.status === 'in_progress'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-slate-700/50 text-slate-400 border-slate-600/30'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>

                        {isBlocked && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Blocked</span>
                          </span>
                        )}

                        {isOverdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Overdue
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 truncate max-w-lg">
                        {task.description || 'No description provided.'}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                        <span>Due: {task.due_date || (task as any).dueDate}</span>
                        {task.story_points && <span>Points: {task.story_points}</span>}
                        {task.estimated_hours && <span>Est: {task.estimated_hours}h</span>}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {task.status === 'todo' || task.status === 'backlog' ? (
                        <button
                          onClick={() => handleStartTask(task.id)}
                          disabled={actionLoading === task.id}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Start Task</span>
                        </button>
                      ) : task.status === 'in_progress' ? (
                        <button
                          onClick={() => handleSubmitReview(task.id)}
                          disabled={actionLoading === task.id}
                          className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Review</span>
                        </button>
                      ) : task.status === 'review' ? (
                        <span className="text-xs font-medium text-amber-400 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          <span>In Review</span>
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
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

        {/* Assigned Initiatives & Progress Cards */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
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
              assignedProjects.map((proj) => {
                const projectTasks = tasks.filter((t) => t.project_id === proj.id || (t as any).projectId === proj.id);
                const completedCount = projectTasks.filter((t) => t.status === 'done' || t.status === 'completed').length;
                const calculatedProgress = projectTasks.length > 0 ? Math.round((completedCount / projectTasks.length) * 100) : (proj.progress || 0);

                return (
                  <div
                    key={proj.id}
                    onClick={() => setActiveTab('projects')}
                    className="p-3.5 rounded-xl bg-[#0F172A] border border-white/[0.04] hover:border-white/[0.1] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {proj.title}
                      </p>
                      <span className="text-xs font-mono font-bold text-blue-400">{calculatedProgress}%</span>
                    </div>

                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden my-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all"
                        style={{ width: `${calculatedProgress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{completedCount}/{projectTasks.length} tasks</span>
                      <span className="capitalize text-slate-400">{proj.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Employee Dashboard V2: People OS Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Widget 1: My Performance */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>My Performance</span>
            </h3>
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Top Tier
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <span className="text-slate-400">Task Completion Rate</span>
              <span className="font-bold text-slate-100">
                {myTasks.length > 0 ? Math.round((myCompletedTasks.length / myTasks.length) * 100) : 100}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <span className="text-slate-400">Weekly Focused Time</span>
              <span className="font-bold text-blue-400">
                {Math.floor(weeklyMinutes / 60)}h {weeklyMinutes % 60}m
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <span className="text-slate-400">Today Clock Status</span>
              <span className={`font-semibold ${isCheckedIn ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isCheckedIn ? 'Checked In' : 'Checked Out'}
              </span>
            </div>
          </div>
        </div>

        {/* Widget 2: My Leave Balances */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>My Leave Quota</span>
            </h3>
            <button
              onClick={() => setActiveTab('teams')}
              className="text-[11px] text-purple-400 hover:text-purple-300 font-medium transition"
            >
              Request &rarr;
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
              <span className="text-slate-400">Annual Leave</span>
              <span className="font-bold text-slate-200">
                {leaveBalances?.annual?.remaining ?? 20} <span className="text-slate-500 font-normal">/ 20d</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
              <span className="text-slate-400">Sick Leave</span>
              <span className="font-bold text-slate-200">
                {leaveBalances?.sick?.remaining ?? 10} <span className="text-slate-500 font-normal">/ 10d</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-white/5">
              <span className="text-slate-400">Pending Requests</span>
              <span className="font-bold text-amber-400">
                {leaveBalances?.pendingCount ?? 0} request(s)
              </span>
            </div>
          </div>
        </div>

        {/* Widget 3: My Goals (OKRs) */}
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>My Goals (OKRs)</span>
            </h3>
            <button
              onClick={() => setActiveTab('teams')}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium transition"
            >
              View All &rarr;
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {myGoals.length === 0 ? (
              <div className="py-6 text-center text-slate-500">
                No active OKRs registered.
              </div>
            ) : (
              myGoals.slice(0, 2).map((g) => (
                <div key={g.id} className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-200 truncate max-w-[180px]">{g.title}</span>
                    <span className="font-bold text-cyan-400">{g.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full rounded-full"
                      style={{ width: `${g.progress}%` }}
                    />
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
