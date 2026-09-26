import React from 'react';
import { motion } from 'motion/react';
import { Trash2, Building2, Play, TrendingUp, Send, CheckCircle, RotateCcw, AlertCircle, Calendar } from 'lucide-react';
import { Project, Department } from '../../types';
import { UserAvatar } from '../common/UserAvatar';

interface ProjectBoardViewProps {
  statusColumns: { id: string; label: string; desc: string }[];
  projectsByStatus: Record<string, Project[]>;
  users: any[];
  departments: Department[];
  isTeamLeadForProject: (project: Project) => boolean;
  isAssignedToProject: (project: Project) => boolean;
  currentRole: string;
  permissions: any;
  getStatusBadge: (status: string) => string;
  onSelectProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
  onStartWork: (id: string, e: React.MouseEvent) => void;
  onOpenProgressModal: (p: Project, e: React.MouseEvent) => void;
  onOpenSubmitReviewModal: (p: Project, e: React.MouseEvent) => void;
  onApprove: (id: string, e: React.MouseEvent) => void;
  onOpenChangesModal: (p: Project, e: React.MouseEvent) => void;
}

export const ProjectBoardView: React.FC<ProjectBoardViewProps> = ({
  statusColumns,
  projectsByStatus,
  users,
  departments,
  isTeamLeadForProject,
  isAssignedToProject,
  currentRole,
  permissions,
  getStatusBadge,
  onSelectProject,
  onDeleteProject,
  onStartWork,
  onOpenProgressModal,
  onOpenSubmitReviewModal,
  onApprove,
  onOpenChangesModal,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
      {statusColumns.map((status) => {
        const columnProjects = projectsByStatus[status.id] || [];
        return (
          <div key={status.id} className="ui-column min-h-[600px] flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2A303D] px-1">
              <div className="flex items-center gap-2">
                <span className="ui-caption font-bold text-slate-200 tracking-tight">{status.label}</span>
                <span className="ui-mono px-2 py-0.5 rounded-full bg-[#242936] text-[#B8FF3B] border border-[#B8FF3B]/20 font-semibold text-[10px]">
                  {columnProjects.length}
                </span>
              </div>
              <span className="ui-caption text-slate-400 hidden sm:inline font-medium">{status.desc}</span>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {columnProjects.map((project) => {
                const projectMembers = users.filter((u) => project.member_ids?.includes(u.id));
                const assignedDept = departments.find(
                  (d) => d.id === project.department_id || d.id === project.departmentId
                );
                const isLead = isTeamLeadForProject(project);
                const isAssigned = isAssignedToProject(project);

                return (
                  <motion.div
                    key={project.id}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.15 }}
                    className="ui-card-interactive p-5 group relative flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.04]">
                      <span className={`ui-mono text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider border ${getStatusBadge(project.status)}`}>
                        {project.status.replace('_', ' ')}
                      </span>

                      {permissions.projects.delete && (
                        <button
                          onClick={() => onDeleteProject(project.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="py-3 flex-1 space-y-2.5">
                      <h4
                        onClick={() => onSelectProject(project)}
                        className="text-sm font-semibold text-white group-hover:text-[#B8FF3B] transition-colors cursor-pointer leading-snug"
                      >
                        {project.title}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>

                      {assignedDept && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#B8FF3B]/10 text-[#B8FF3B] border border-[#B8FF3B]/20 text-[10px] font-medium">
                            <Building2 className="w-2.5 h-2.5" />
                            {assignedDept.name}
                          </span>
                        </div>
                      )}

                      <div className="pt-1">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-400 font-medium">Progress</span>
                          <span className="font-mono font-bold text-[#B8FF3B]">{project.progress}%</span>
                        </div>
                        <div className="w-full bg-[#242936] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#B8FF3B] to-[#CCFF66] h-full rounded-full transition-all duration-300"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>

                      {project.review_feedback && project.status === 'in_progress' && (
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                          <span className="line-clamp-2">Changes requested: "{project.review_feedback}"</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-white/[0.04] space-y-3">
                      {project.status === 'planning' && (isLead || currentRole === 'admin') && (
                        <button
                          onClick={(e) => onStartWork(project.id, e)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Start Work</span>
                        </button>
                      )}

                      {project.status === 'in_progress' && (isAssigned || isLead || currentRole === 'admin') && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={(e) => onOpenProgressModal(project, e)}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/[0.08] text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                            <span>Progress</span>
                          </button>
                          <button
                            onClick={(e) => onOpenSubmitReviewModal(project, e)}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <Send className="w-3 h-3 text-amber-400" />
                            <span>Submit Review</span>
                          </button>
                        </div>
                      )}

                      {project.status === 'review' && (
                        <>
                          {isLead || currentRole === 'admin' ? (
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                onClick={(e) => onApprove(project.id, e)}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-sm"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={(e) => onOpenChangesModal(project, e)}
                                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] font-medium transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Changes</span>
                              </button>
                            </div>
                          ) : (
                            <div className="text-center py-1 text-[11px] text-amber-300/80 bg-amber-500/10 rounded border border-amber-500/20 font-mono">
                              Pending Lead Review
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {projectMembers.slice(0, 3).map((m) => (
                            <UserAvatar key={m.id} user={m} size="sm" />
                          ))}
                          {projectMembers.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-[10px] flex items-center justify-center text-slate-300 font-mono">
                              +{projectMembers.length - 3}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{project.due_date}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
