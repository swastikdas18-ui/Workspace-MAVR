import React from 'react';
import { motion } from 'motion/react';
import { Building2, Search, Plus, Users, ArrowRight } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface DepartmentsSubTabProps {
  departments: any[];
  profiles: any[];
  projects: any[];
  tasks: any[];
  deptSearchQuery: string;
  setDeptSearchQuery: (query: string) => void;
  permissions: any;
  onOpenCreateTeam: () => void;
  onEditDepartment: (dept: any) => void;
  onAssignMember: (dept: any) => void;
  onManageMembers: (dept: any) => void;
  onViewDirectory: () => void;
}

export const DepartmentsSubTab: React.FC<DepartmentsSubTabProps> = ({
  departments,
  profiles,
  projects,
  tasks,
  deptSearchQuery,
  setDeptSearchQuery,
  permissions,
  onOpenCreateTeam,
  onEditDepartment,
  onAssignMember,
  onManageMembers,
  onViewDirectory,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search departments, missions..."
            value={deptSearchQuery}
            onChange={(e) => setDeptSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
          />
        </div>

        {permissions?.teams?.manageTeams && (
          <button
            onClick={onOpenCreateTeam}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Department</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments
          .filter(
            (d) =>
              !deptSearchQuery ||
              d.name?.toLowerCase().includes(deptSearchQuery.toLowerCase()) ||
              d.description?.toLowerCase().includes(deptSearchQuery.toLowerCase())
          )
          .map((dept) => {
            const assignedCount = profiles.filter(
              (p) =>
                p.departmentId === dept.id ||
                p.department?.id === dept.id ||
                (p.department?.name && p.department.name.toLowerCase() === dept.name?.toLowerCase()) ||
                dept.headId === p.userId ||
                dept.head?.id === p.userId ||
                dept.head?.id === p.user?.id ||
                dept.headId === p.user?.id
            ).length;
            const memberCount = Math.max(assignedCount, dept.memberCount || 0);

            return (
              <motion.div
                key={dept.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-xl bg-slate-900/40 border border-white/10 hover:border-purple-500/40 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md"
                        style={{ backgroundColor: dept.color || '#7C3AED' }}
                      >
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-100 text-sm">{dept.name}</h4>
                        <p className="text-xs text-slate-400">
                          {dept.head?.name ? `Lead: ${dept.head.name}` : 'No Lead Assigned'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>

                  {dept.description && (
                    <p className="mt-3 text-xs text-slate-300 line-clamp-2 leading-relaxed">{dept.description}</p>
                  )}

                  {(() => {
                    const deptProjects = projects.filter((p) => p.department_id === dept.id || p.departmentId === dept.id);
                    const deptTasks = tasks.filter((t) => deptProjects.some((p) => p.id === t.projectId));
                    const overdueDeptTasks = deptTasks.filter(
                      (t) =>
                        t.status !== 'done' &&
                        t.status !== 'completed' &&
                        t.dueDate &&
                        new Date(t.dueDate) < new Date()
                    );
                    return (
                      <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-white/[0.04]">
                          <span className="text-slate-500 block uppercase">Projects</span>
                          <span className="font-bold text-purple-400 text-xs">{deptProjects.length}</span>
                        </div>
                        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-white/[0.04]">
                          <span className="text-slate-500 block uppercase">Tasks</span>
                          <span className="font-bold text-blue-400 text-xs">{deptTasks.length}</span>
                        </div>
                        <div className="bg-slate-900/60 p-1.5 rounded-lg border border-white/[0.04]">
                          <span className="text-slate-500 block uppercase">Overdue</span>
                          <span className={`font-bold text-xs ${overdueDeptTasks.length > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                            {overdueDeptTasks.length}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                    <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>{memberCount} Workforce Assigned</span>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    {permissions?.teams?.manageTeams && (
                      <>
                        <button
                          onClick={() => onEditDepartment(dept)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium transition cursor-pointer flex items-center gap-1"
                          title="Edit Department"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onAssignMember(dept)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 border border-purple-500/30 font-medium transition cursor-pointer flex items-center gap-1"
                          title="Add / Assign Member to this Department"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Member</span>
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => onManageMembers(dept)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-[#B8FF3B]/10 hover:bg-[#B8FF3B]/20 text-[#B8FF3B] border border-[#B8FF3B]/20 hover:border-[#B8FF3B]/40 font-medium flex items-center gap-1 transition cursor-pointer"
                      title="View Department Details & Members"
                    >
                      <span>Manage Members</span> <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
      </div>

      {departments.length === 0 && (
        <EmptyState
          icon={Building2}
          title="No Departments Yet"
          description="Create organizational units to group employees by function. Assign leads, track workload, and manage headcount per department."
          actionLabel={permissions?.teams?.manageTeams ? 'Create Department' : undefined}
          onAction={onOpenCreateTeam}
          secondaryLabel="View Directory"
          onSecondaryAction={onViewDirectory}
          secondaryIcon={Users}
          size="compact"
        />
      )}
    </div>
  );
};
