import React from 'react';
import { Building2, Search, X, ChevronDown, UserPlus } from 'lucide-react';

interface DepartmentDetailsHeaderProps {
  department: any;
  membersCount: number;
  onClose: () => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  positionFilter: 'all' | 'lead' | 'member';
  setPositionFilter: (val: 'all' | 'lead' | 'member') => void;
  isAdmin: boolean;
  onOpenAddMember: () => void;
}

export const DepartmentDetailsHeader: React.FC<DepartmentDetailsHeaderProps> = ({
  department,
  membersCount,
  onClose,
  searchQuery,
  setSearchQuery,
  positionFilter,
  setPositionFilter,
  isAdmin,
  onOpenAddMember,
}) => {
  return (
    <>
      <div className="p-6 border-b border-[#2A303D] bg-[#171A21]/60 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
            style={{ backgroundColor: department.color || '#7C3AED' }}
          >
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-white tracking-tight">{department.name}</h2>
              <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-[#B8FF3B]/10 text-[#B8FF3B] border border-[#B8FF3B]/20">
                {membersCount} {membersCount === 1 ? 'member' : 'members'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
              {department.description || 'Organizational business unit.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 border-b border-[#2A303D] bg-[#14171F] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search department members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0F1115] border border-[#2A303D] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#B8FF3B]"
            />
          </div>

          <div className="relative">
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value as any)}
              className="appearance-none bg-[#0F1115] border border-[#2A303D] rounded-xl px-3 py-2 pr-8 text-xs text-slate-300 focus:outline-none focus:border-[#B8FF3B]"
            >
              <option value="all">All Roles</option>
              <option value="lead">Leads Only</option>
              <option value="member">Members Only</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={onOpenAddMember}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#B8FF3B] hover:bg-[#A8EF2B] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#B8FF3B]/10 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Member</span>
          </button>
        )}
      </div>
    </>
  );
};
