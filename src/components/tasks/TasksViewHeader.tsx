import React from 'react';
import { Columns, List, Plus } from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { Project } from '../../types';

interface TasksViewHeaderProps {
  taskCount: number;
  viewMode: 'kanban' | 'list' | 'timeline';
  setViewMode: (mode: 'kanban' | 'list') => void;
  filterProject: string;
  setFilterProject: (val: string) => void;
  filterPriority: string;
  setFilterPriority: (val: string) => void;
  projects: Project[];
  canCreate: boolean;
  onOpenCreateModal: () => void;
}

export const TasksViewHeader: React.FC<TasksViewHeaderProps> = ({
  taskCount,
  viewMode,
  setViewMode,
  filterProject,
  setFilterProject,
  filterPriority,
  setFilterPriority,
  projects,
  canCreate,
  onOpenCreateModal,
}) => {
  return (
    <PageHeader
      title="Tasks Board"
      description="Organize, assign, and prioritize tasks from backlog to completion."
      badge={
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-white/[0.08]">
          {taskCount} Tasks
        </span>
      }
      actions={
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-[#171A21] border border-[#2A303D] rounded-xl text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-[#B8FF3B]/15 text-[#B8FF3B] border border-[#B8FF3B]/30 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#B8FF3B]/15 text-[#B8FF3B] border border-[#B8FF3B]/30 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          {/* Project Filter */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="bg-[#171A21] border border-[#2A303D] text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-[#B8FF3B]/50 transition-colors"
          >
            <option value="all">All Initiatives</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-[#171A21] border border-[#2A303D] text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-[#B8FF3B]/50 transition-colors"
          >
            <option value="all">All Priorities</option>
            <option value="critical">🚨 Critical</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Create Task Button */}
          {canCreate && (
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#B8FF3B] hover:bg-[#CCFF66] text-[#0F1115] text-xs font-bold shadow-md shadow-[#B8FF3B]/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#0F1115] stroke-[2.5]" />
              <span>New Work Item</span>
            </button>
          )}
        </div>
      }
    />
  );
};
