import React from 'react';
import { PageHeader } from '../common/PageHeader';
import { LayoutGrid, List, Calendar, Plus } from 'lucide-react';

type ViewMode = 'board' | 'list' | 'timeline';

interface ProjectsViewHeaderProps {
  currentRole: string;
  visibleProjectsCount: number;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;
  permissions: any;
  onOpenCreateModal: () => void;
}

export const ProjectsViewHeader: React.FC<ProjectsViewHeaderProps> = ({
  currentRole,
  visibleProjectsCount,
  viewMode,
  setViewMode,
  selectedStatus,
  setSelectedStatus,
  permissions,
  onOpenCreateModal,
}) => {
  return (
    <PageHeader
      title={currentRole === 'admin' ? 'Projects & Roadmaps' : 'My Projects'}
      description={
        currentRole === 'admin'
          ? 'Plan, organize, and track team projects and milestone progress across your workspace.'
          : 'Track project milestones, update status, and collaborate with your teammates.'
      }
      badge={
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-900/90 text-emerald-400 font-mono border border-emerald-500/20 font-semibold shadow-xs">
          {visibleProjectsCount} Projects
        </span>
      }
      actions={
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-[#171A21] border border-[#2A303D] rounded-xl text-xs">
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'board'
                  ? 'bg-[#B8FF3B]/15 text-[#B8FF3B] border border-[#B8FF3B]/30 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#B8FF3B]/15 text-[#B8FF3B] border border-[#B8FF3B]/30 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-[#B8FF3B]/15 text-[#B8FF3B] border border-[#B8FF3B]/30 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Timeline</span>
            </button>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#171A21] border border-[#2A303D] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-[#B8FF3B]/50 font-medium transition-colors cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="planning">Planning</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
          </select>

          {permissions?.projects?.create && (
            <button
              onClick={onOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#B8FF3B] hover:bg-[#CCFF66] text-[#0F1115] text-xs font-bold shadow-md shadow-[#B8FF3B]/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#0F1115] stroke-[2.5]" />
              <span>New Initiative</span>
            </button>
          )}
        </div>
      }
    />
  );
};
