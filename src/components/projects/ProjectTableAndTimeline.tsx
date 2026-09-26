import React from 'react';
import { motion } from 'motion/react';
import { Building2, Trash2 } from 'lucide-react';
import { Project, Department } from '../../types';
import { UserAvatar } from '../common/UserAvatar';

interface ProjectListViewProps {
  visibleProjects: Project[];
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
  onApprove: (id: string, e: React.MouseEvent) => void;
}

export const ProjectListView: React.FC<ProjectListViewProps> = ({
  visibleProjects,
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
  onApprove,
}) => {
  return (
    <div className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0F172A] border-b border-white/[0.08] text-slate-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3.5 px-4">Initiative</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Progress</th>
              <th className="py-3.5 px-4">Department</th>
              <th className="py-3.5 px-4">Members</th>
              <th className="py-3.5 px-4">Target Date</th>
              <th className="py-3.5 px-4">Budget</th>
              <th className="py-3.5 px-4 text-right">Workflow Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-slate-300">
            {visibleProjects.map((project) => {
              const projectMembers = users.filter((u) => project.member_ids?.includes(u.id));
              const assignedDept = departments.find(
                (d) => d.id === project.department_id || d.id === project.departmentId
              );
              const isLead = isTeamLeadForProject(project);
              const isAssigned = isAssignedToProject(project);

              return (
                <tr
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                >
                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                      {project.title}
                    </p>
                    <p className="text-slate-400 truncate text-[11px] mt-0.5">{project.description}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border ${getStatusBadge(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 w-40">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-400 h-full rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="font-mono text-emerald-400 text-[11px] font-bold">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {assignedDept ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-medium">
                        <Building2 className="w-2.5 h-2.5" />
                        {assignedDept.name}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {projectMembers.map((m) => (
                        <UserAvatar key={m.id} user={m} size="sm" />
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{project.due_date}</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">{project.budget || '—'}</td>
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {project.status === 'planning' && (isLead || currentRole === 'admin') && (
                        <button
                          onClick={(e) => onStartWork(project.id, e)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 text-xs font-medium transition-colors"
                        >
                          Start Work
                        </button>
                      )}
                      {project.status === 'in_progress' && (isAssigned || isLead || currentRole === 'admin') && (
                        <button
                          onClick={(e) => onOpenProgressModal(project, e)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                        >
                          Update
                        </button>
                      )}
                      {project.status === 'review' && (isLead || currentRole === 'admin') && (
                        <button
                          onClick={(e) => onApprove(project.id, e)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
                        >
                          Approve
                        </button>
                      )}
                      {permissions.projects.delete && (
                        <button
                          onClick={() => onDeleteProject(project.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface ProjectTimelineViewProps {
  visibleProjects: Project[];
  departments: Department[];
}

export const ProjectTimelineView: React.FC<ProjectTimelineViewProps> = ({
  visibleProjects,
  departments,
}) => {
  return (
    <div className="bg-[#111827] border border-white/[0.08] rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white">Roadmap Timeline & Deadlines</h3>
        <span className="text-xs text-slate-400 font-mono">Q1–Q4 Horizon</span>
      </div>

      <div className="space-y-4">
        {visibleProjects.map((project, index) => {
          const startOffset = (index * 15) % 50;
          const durationWidth = Math.max(30, project.progress);
          return (
            <div key={project.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{project.title}</span>
                  {(() => {
                    const assignedDept = departments.find(
                      (d) => d.id === project.department_id || d.id === project.departmentId
                    );
                    return assignedDept ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                        <Building2 className="w-2.5 h-2.5" />
                        {assignedDept.name}
                      </span>
                    ) : null;
                  })()}
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span>{project.start_date}</span>
                  <span>→</span>
                  <span className="text-emerald-400">{project.due_date}</span>
                </div>
              </div>
              <div className="w-full bg-[#0F172A] h-7 rounded-xl p-1 relative border border-white/[0.04]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${durationWidth}%` }}
                  style={{ marginLeft: `${startOffset}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-lg flex items-center px-2 text-[10px] font-semibold text-slate-950 shadow-md"
                >
                  <span className="truncate">{project.progress}% Complete</span>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
