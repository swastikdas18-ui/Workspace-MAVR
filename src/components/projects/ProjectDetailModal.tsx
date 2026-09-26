import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Building2, LayoutGrid, CheckSquare, Calendar, Users, Play,
  TrendingUp, Send, CheckCircle, RotateCcw, X
} from 'lucide-react';
import { Project, Department } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { ProjectActivityTimeline } from './ProjectActivityTimeline';

interface ProjectDetailModalProps {
  selectedProjectModal: Project | null;
  onClose: () => void;
  tasks: any[];
  users: any[];
  departments: Department[];
  getStatusBadge: (status: string) => string;
  isTeamLeadForProject: (project: Project) => boolean;
  isAssignedToProject: (project: Project) => boolean;
  currentRole: string;
  onStartWork: (id: string) => void;
  onOpenProgressModal: (p: Project) => void;
  onOpenSubmitReviewModal: (p: Project) => void;
  onApprove: (id: string) => void;
  onOpenChangesModal: (p: Project) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  selectedProjectModal,
  onClose,
  tasks,
  users,
  departments,
  getStatusBadge,
  isTeamLeadForProject,
  isAssignedToProject,
  currentRole,
  onStartWork,
  onOpenProgressModal,
  onOpenSubmitReviewModal,
  onApprove,
  onOpenChangesModal,
}) => {
  const [projectModalTab, setProjectModalTab] = useState<'overview' | 'tasks' | 'timeline' | 'team'>('overview');

  if (!selectedProjectModal) return null;

  const projTasks = tasks.filter((t) => t.projectId === selectedProjectModal.id);
  const overdueTasksCount = projTasks.filter(
    (t) => t.status !== 'done' && t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()
  ).length;
  const overduePct = projTasks.length > 0 ? (overdueTasksCount / projTasks.length) * 100 : 0;
  const healthStatus: 'Green' | 'Yellow' | 'Red' = overduePct < 10 ? 'Green' : overduePct <= 30 ? 'Yellow' : 'Red';
  const healthBadgeStyle = healthStatus === 'Green'
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : healthStatus === 'Yellow'
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
    : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

  const creatorUser = users.find((u) => u.id === selectedProjectModal.created_by);
  const assignedDept = departments.find((d) => d.id === selectedProjectModal.department_id || d.id === selectedProjectModal.departmentId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-[#0F172A] border border-white/[0.12] rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        >
          {/* Header & Badges */}
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono border ${getStatusBadge(selectedProjectModal.status)}`}>
                  {selectedProjectModal.status.replace('_', ' ')}
                </span>
                {assignedDept && (
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono border bg-purple-500/10 text-purple-300 border-purple-500/20 inline-flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {assignedDept.name}
                  </span>
                )}
                <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono border ${healthBadgeStyle} flex items-center gap-1`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  Health: {healthStatus} ({overdueTasksCount} Overdue)
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-purple-400 font-mono">ID: {selectedProjectModal.id}</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">{selectedProjectModal.title}</h2>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 4-Tab Switcher */}
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2">
            <button
              onClick={() => setProjectModalTab('overview')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                projectModalTab === 'overview'
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setProjectModalTab('tasks')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                projectModalTab === 'tasks'
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tasks ({projTasks.length})</span>
            </button>
            <button
              onClick={() => setProjectModalTab('timeline')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                projectModalTab === 'timeline'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Timeline & Activity</span>
            </button>
            <button
              onClick={() => setProjectModalTab('team')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                projectModalTab === 'team'
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team & Dept ({selectedProjectModal.member_ids?.length || 0})</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {projectModalTab === 'overview' && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-slate-400 font-semibold mb-1 uppercase tracking-wider text-[10px]">Description & Strategic Objectives</h4>
                <p className="text-slate-200 leading-relaxed bg-[#111827] p-3.5 rounded-xl border border-white/[0.04]">
                  {selectedProjectModal.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#111827] p-3 rounded-xl border border-white/[0.04]">
                  <span className="text-slate-500 text-[10px] uppercase font-mono">Execution Progress</span>
                  <p className="text-sm font-mono font-bold text-purple-400 mt-0.5">{selectedProjectModal.progress}%</p>
                </div>
                <div className="bg-[#111827] p-3 rounded-xl border border-white/[0.04]">
                  <span className="text-slate-500 text-[10px] uppercase font-mono">Start Date</span>
                  <p className="text-sm font-mono font-bold text-slate-200 mt-0.5">{selectedProjectModal.start_date}</p>
                </div>
                <div className="bg-[#111827] p-3 rounded-xl border border-white/[0.04]">
                  <span className="text-slate-500 text-[10px] uppercase font-mono">Due Date</span>
                  <p className="text-sm font-mono font-bold text-slate-200 mt-0.5">{selectedProjectModal.due_date}</p>
                </div>
                <div className="bg-[#111827] p-3 rounded-xl border border-white/[0.04]">
                  <span className="text-slate-500 text-[10px] uppercase font-mono">Budget</span>
                  <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5">{selectedProjectModal.budget || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-[#111827] p-3.5 rounded-xl border border-white/[0.04] space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-mono">Department Ownership</span>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold text-slate-200">
                      {assignedDept ? assignedDept.name : 'General Organization'}
                    </span>
                  </div>
                </div>
                <div className="bg-[#111827] p-3.5 rounded-xl border border-white/[0.04] space-y-1">
                  <span className="text-slate-500 text-[10px] uppercase font-mono">Project Owner / Lead</span>
                  <div className="flex items-center gap-2">
                    {creatorUser && <UserAvatar user={creatorUser} size="sm" />}
                    <span className="font-semibold text-slate-200">{creatorUser?.name || 'Administrator'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TASKS */}
          {projectModalTab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>Associated Tasks ({projTasks.length})</span>
                <span className="text-amber-400">{overdueTasksCount} Overdue</span>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {projTasks.map((task) => {
                  const assignee = users.find((u) => u.id === task.assignedTo);
                  const isOverdue = task.status !== 'done' && task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < new Date();
                  return (
                    <div key={task.id} className="bg-[#111827] p-3 rounded-xl border border-white/[0.06] flex items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.2 rounded font-mono font-semibold uppercase ${
                            task.status === 'done' || task.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : task.status === 'in_progress'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-slate-800 text-slate-400 border border-white/10'
                          }`}>
                            {task.status}
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono">
                              OVERDUE
                            </span>
                          )}
                          {task.isBlocked && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                              BLOCKED: {task.blockedReason}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-200">{task.title}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        {assignee && (
                          <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                            <UserAvatar user={assignee} size="sm" />
                            <span className="hidden sm:inline">{assignee.name}</span>
                          </div>
                        )}
                        <span className="text-slate-500 text-[10px] font-mono">{task.dueDate}</span>
                      </div>
                    </div>
                  );
                })}
                {projTasks.length === 0 && (
                  <div className="p-8 text-center bg-[#111827] rounded-xl border border-white/[0.04] text-slate-400 text-xs">
                    No tasks assigned to this project yet. Create tasks in the Tasks Engine to link execution.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TIMELINE & ACTIVITY */}
          {projectModalTab === 'timeline' && (
            <div className="pt-2">
              <ProjectActivityTimeline project={selectedProjectModal} />
            </div>
          )}

          {/* TAB 4: TEAM & DEPT */}
          {projectModalTab === 'team' && (
            <div className="space-y-4 text-xs">
              <div>
                <h4 className="text-slate-400 font-semibold mb-2 uppercase tracking-wider text-[10px]">Assigned Department</h4>
                <div className="flex flex-wrap gap-2">
                  {assignedDept ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
                      <Building2 className="w-4 h-4 text-purple-400" />
                      <span>{assignedDept.name}</span>
                      {(() => {
                        const dHead = users.find((u) => u.id === assignedDept.headId);
                        return dHead?.name ? <span className="text-slate-400 text-[10px] font-normal">(Head: {dHead.name})</span> : null;
                      })()}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic text-[11px]">No department assigned.</span>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-slate-400 font-semibold mb-2 uppercase tracking-wider text-[10px]">Assigned Contributors</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {users
                    .filter((u) => selectedProjectModal.member_ids?.includes(u.id))
                    .map((u) => (
                      <div key={u.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#111827] border border-white/[0.06] text-slate-200">
                        <UserAvatar user={u} size="md" />
                        <div>
                          <p className="font-semibold text-slate-200">{u.name}</p>
                          <p className="text-[10px] text-slate-400">{u.title || u.role}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
            <div className="flex items-center gap-2">
              {selectedProjectModal.status === 'planning' && (isTeamLeadForProject(selectedProjectModal) || currentRole === 'admin') && (
                <button
                  onClick={() => {
                    onStartWork(selectedProjectModal.id);
                    onClose();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Work</span>
                </button>
              )}
              {selectedProjectModal.status === 'in_progress' && (isAssignedToProject(selectedProjectModal) || isTeamLeadForProject(selectedProjectModal) || currentRole === 'admin') && (
                <>
                  <button
                    onClick={() => onOpenProgressModal(selectedProjectModal)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.08] text-xs font-medium cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                    <span>Update Progress</span>
                  </button>
                  <button
                    onClick={() => onOpenSubmitReviewModal(selectedProjectModal)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-semibold cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    <span>Submit for Review</span>
                  </button>
                </>
              )}
              {selectedProjectModal.status === 'review' && (isTeamLeadForProject(selectedProjectModal) || currentRole === 'admin') && (
                <>
                  <button
                    onClick={() => {
                      onApprove(selectedProjectModal.id);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve & Complete</span>
                  </button>
                  <button
                    onClick={() => onOpenChangesModal(selectedProjectModal)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Request Changes</span>
                  </button>
                </>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
