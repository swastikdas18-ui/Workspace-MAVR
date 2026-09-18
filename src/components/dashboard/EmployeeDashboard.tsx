import React, { useState, useEffect, useCallback } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  CheckSquare, 
  CheckCircle2, Plus, Sparkles,
  Calendar, Layers, Play, Square, Timer,
  Send, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { MetricCard } from '../common/MetricCard';
import { api } from '../../lib/api';

export const EmployeeDashboard: React.FC = () => {
  const { 
    currentUser, projects, tasks, setActiveTab, refreshData, addToast 
  } = useWorkspace();

  // Time Tracking State for Employee Widgets
  const [weeklyMinutes, setWeeklyMinutes] = useState(0);
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [taskFilter, setTaskFilter] = useState<'all' | 'today' | 'overdue' | 'in_progress' | 'review' | 'done'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Phase 4: People OS Employee V2 State
  const [leaveBalances, setLeaveBalances] = useState<any | null>(null);
  const [myGoals, setMyGoals] = useState<any[]>([]);
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
        setIsCheckedIn(attRes.isCheckedIn);
      }

      if (entriesRes && Array.isArray(entriesRes.entries)) {
        const myEntries = entriesRes.entries.filter((e: any) => e.userId === currentUser.id);

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const weekAgo = todayStart - 7 * 24 * 60 * 60 * 1000;

        let weekMins = 0;

        for (const e of myEntries) {
          const entryTime = new Date(e.startTime).getTime();
          if (entryTime >= weekAgo) {
            weekMins += e.durationMinutes || 0;
          }
        }

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
      <div className="ui-card p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="ui-caption font-bold text-amber-800 uppercase tracking-wider">
                My Workspace
              </span>
              <span className="text-stone-400">•</span>
              <span className="ui-mono text-stone-500 font-medium">My Assigned Tasks</span>
            </div>

            <h1 className="ui-h1 text-stone-900 font-heading">
              Good day, {currentUser.name}
            </h1>
            <p className="ui-body text-stone-600 mt-1.5 max-w-2xl leading-relaxed font-normal">
              You have <span className="text-stone-900 font-semibold">{myInProgressTasks.length + myTodoTasks.length} active tasks</span> ({myOverdueTasks.length} overdue) across <span className="text-stone-900 font-semibold">{assignedProjects.length} projects</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('tasks')}
              className="ui-btn ui-btn-primary"
            >
              <CheckSquare className="w-4 h-4 text-amber-300" />
              <span>Full Task Board</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Stopwatch Live Widget */}
      {activeTimer && (
        <div className="bg-amber-50/80 border border-amber-200/80 p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300/60 flex items-center justify-center text-amber-800">
              <Timer className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Timer Running
                </span>
                <span className="text-xs text-stone-900 font-semibold truncate max-w-xs sm:max-w-md">
                  {activeTimer.notes || 'Initiative work'}
                </span>
              </div>
              <p className="text-xl sm:text-2xl font-mono font-bold text-stone-900 mt-1">
                {formatTimer(elapsedSeconds)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('time')}
              className="ui-btn ui-btn-secondary"
            >
              Open Timesheet
            </button>
            <button
              onClick={handleStopTimer}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
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
        {/* My Tasks Queue with Filtering & Execution */}
        <div className="lg:col-span-2 ui-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E3DA]">
            <div>
              <h3 className="text-base font-semibold text-stone-900 tracking-tight flex items-center gap-2 font-heading">
                <CheckSquare className="w-4 h-4 text-amber-700" />
                <span>My Execution Tasks</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5 font-normal">Real-time task lifecycle & action queue</p>
            </div>

            {/* Task Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#FAF8F5] p-1 rounded-xl border border-[#E8E3DA] overflow-x-auto text-xs">
              {(['all', 'today', 'overdue', 'in_progress', 'review', 'done'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setTaskFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all capitalize whitespace-nowrap cursor-pointer ${
                    taskFilter === tab
                      ? 'bg-[#1C1917] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {tab === 'in_progress' ? 'In Progress' : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
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
                    className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E8E3DA] hover:border-[#D5CFC3] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isUrgent ? 'bg-rose-500' : isHigh ? 'bg-amber-500' : 'bg-sky-500'
                          }`}
                        />
                        <p className="text-xs font-semibold text-stone-900 truncate">{task.title}</p>
                        
                        {/* Status Badge */}
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          task.status === 'done' || task.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : task.status === 'review'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : task.status === 'in_progress'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-stone-100 text-stone-600 border-stone-200'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </span>

                        {isBlocked && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Blocked</span>
                          </span>
                        )}

                        {isOverdue && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            Overdue
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-stone-600 truncate max-w-lg">
                        {task.description || 'No description provided.'}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-stone-400 font-mono">
                        <span>Due: {task.due_date || (task as any).dueDate}</span>
                        {task.project_id && (
                          <span>Initiative: {projects.find((p) => p.id === task.project_id)?.title || 'Assigned'}</span>
                        )}
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {task.status === 'todo' && (
                        <button
                          onClick={() => handleStartTask(task.id)}
                          disabled={actionLoading === task.id}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-[#E8E3DA] text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3 h-3 text-emerald-700" />
                          <span>Start</span>
                        </button>
                      )}

                      {task.status === 'in_progress' && (
                        <button
                          onClick={() => handleSubmitReview(task.id)}
                          disabled={actionLoading === task.id}
                          className="px-3 py-1.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Send className="w-3 h-3 text-amber-300" />
                          <span>Submit Review</span>
                        </button>
                      )}

                      {task.status === 'review' && (
                        <span className="text-[11px] text-amber-800 font-semibold px-2 py-1 bg-amber-50 rounded-lg border border-amber-200">
                          In Review
                        </span>
                      )}

                      {(task.status === 'done' || task.status === 'completed') && (
                        <span className="text-[11px] text-emerald-800 font-semibold px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Assigned Projects Column */}
        <div className="ui-card p-6 space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA]">
            <h3 className="text-base font-semibold text-stone-900 tracking-tight flex items-center gap-2 font-heading">
              <Layers className="w-4 h-4 text-stone-700" />
              <span>Assigned Initiatives</span>
            </h3>
            <span className="text-xs text-stone-500 font-medium">{assignedProjects.length} projects</span>
          </div>

          <div className="space-y-3.5 flex-1">
            {assignedProjects.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
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
                    className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E8E3DA] hover:border-amber-400/60 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-stone-900 group-hover:text-amber-800 transition-colors">
                        {proj.title}
                      </p>
                      <span className="text-xs font-mono font-bold text-stone-800">{calculatedProgress}%</span>
                    </div>

                    <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden my-2">
                      <div
                        className="bg-amber-700 h-full rounded-full transition-all"
                        style={{ width: `${calculatedProgress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500">
                      <span>{completedCount}/{projectTasks.length} tasks</span>
                      <span className="capitalize text-stone-600 font-medium">{proj.status.replace('_', ' ')}</span>
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
        <div className="ui-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA]">
            <h3 className="text-sm font-semibold text-stone-900 tracking-tight flex items-center gap-2 font-heading">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>My Performance</span>
            </h3>
            <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Top Tier
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E3DA]">
              <span className="text-stone-600 font-medium">Task Completion Rate</span>
              <span className="font-bold text-stone-900">
                {myTasks.length > 0 ? Math.round((myCompletedTasks.length / myTasks.length) * 100) : 100}%
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E3DA]">
              <span className="text-stone-600 font-medium">Weekly Focused Time</span>
              <span className="font-bold text-stone-900">
                {Math.floor(weeklyMinutes / 60)}h {weeklyMinutes % 60}m
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E3DA]">
              <span className="text-stone-600 font-medium">Today Clock Status</span>
              <span className={`font-semibold ${isCheckedIn ? 'text-emerald-700' : 'text-stone-500'}`}>
                {isCheckedIn ? 'Checked In' : 'Checked Out'}
              </span>
            </div>
          </div>
        </div>

        {/* Widget 2: My Leave Balances */}
        <div className="ui-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA]">
            <h3 className="text-sm font-semibold text-stone-900 tracking-tight flex items-center gap-2 font-heading">
              <Calendar className="w-4 h-4 text-amber-700" />
              <span>My Leave Quota</span>
            </h3>
            <button
              onClick={() => setActiveTab('teams')}
              className="text-[11px] text-amber-800 hover:text-amber-900 font-semibold transition cursor-pointer"
            >
              Request &rarr;
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8E3DA]">
              <span className="text-stone-600 font-medium">Annual Leave</span>
              <span className="font-bold text-stone-900">
                {leaveBalances?.annual?.remaining ?? 20} <span className="text-stone-400 font-normal">/ 20d</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8E3DA]">
              <span className="text-stone-600 font-medium">Sick Leave</span>
              <span className="font-bold text-stone-900">
                {leaveBalances?.sick?.remaining ?? 10} <span className="text-stone-400 font-normal">/ 10d</span>
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8E3DA]">
              <span className="text-stone-600 font-medium">Pending Requests</span>
              <span className="font-bold text-amber-800">
                {leaveBalances?.pendingCount ?? 0} request(s)
              </span>
            </div>
          </div>
        </div>

        {/* Widget 3: My Goals (OKRs) */}
        <div className="ui-card p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E3DA]">
            <h3 className="text-sm font-semibold text-stone-900 tracking-tight flex items-center gap-2 font-heading">
              <Layers className="w-4 h-4 text-stone-700" />
              <span>My Goals (OKRs)</span>
            </h3>
            <button
              onClick={() => setActiveTab('teams')}
              className="text-[11px] text-amber-800 hover:text-amber-900 font-semibold transition cursor-pointer"
            >
              View All &rarr;
            </button>
          </div>

          <div className="space-y-3 text-xs">
            {myGoals.length === 0 ? (
              <div className="py-6 text-center text-stone-400">
                No active OKRs registered.
              </div>
            ) : (
              myGoals.slice(0, 2).map((g) => (
                <div key={g.id} className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E3DA] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="font-semibold text-stone-900 truncate max-w-[180px]">{g.title}</span>
                    <span className="font-bold text-amber-800">{g.progress}%</span>
                  </div>
                  <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-700 h-full rounded-full"
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
