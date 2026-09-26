import React from 'react';
import { motion } from 'motion/react';
import { Building2, Search, X, MoreVertical, UserMinus, MapPin, Shield, ArrowRight, UserCheck, Filter, UserPlus } from 'lucide-react';
import { UserAvatar as AvatarComponent } from '../common/UserAvatar';
import { EmptyState } from '../common/EmptyState';

interface DirectorySubTabProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedDepartmentFilter: string;
  setSelectedDepartmentFilter: (val: string) => void;
  selectedEmploymentTypeFilter: string;
  setSelectedEmploymentTypeFilter: (val: string) => void;
  departments: any[];
  filteredProfiles: any[];
  currentRole: string;
  currentUser: any;
  activeActionMenuUserId: string | null;
  setActiveActionMenuUserId: (id: string | null) => void;
  onOpenRemoveMember: (prof: any) => void;
  onViewProfile: (prof: any) => void;
  permissions: any;
  onOpenInviteModal: () => void;
}

export const DirectorySubTab: React.FC<DirectorySubTabProps> = ({
  searchQuery,
  setSearchQuery,
  selectedDepartmentFilter,
  setSelectedDepartmentFilter,
  selectedEmploymentTypeFilter,
  setSelectedEmploymentTypeFilter,
  departments,
  filteredProfiles,
  currentRole,
  currentUser,
  activeActionMenuUserId,
  setActiveActionMenuUserId,
  onOpenRemoveMember,
  onViewProfile,
  permissions,
  onOpenInviteModal,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, designation, skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedDepartmentFilter}
            onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
            className="bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedEmploymentTypeFilter}
            onChange={(e) => setSelectedEmploymentTypeFilter(e.target.value)}
            className="bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-purple-500"
          >
            <option value="">All Types</option>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contractor">Contractor</option>
            <option value="intern">Intern</option>
          </select>
        </div>
      </div>

      {selectedDepartmentFilter && (
        <div className="flex items-center justify-between p-3 px-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>
              Showing members in department:{' '}
              <strong className="text-white">
                {departments.find((d) => d.id === selectedDepartmentFilter)?.name || 'Selected Department'}
              </strong>
            </span>
          </div>
          <button
            onClick={() => setSelectedDepartmentFilter('')}
            className="text-emerald-400 hover:text-white font-medium flex items-center gap-1 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Clear Filter (View All)
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProfiles.map((prof) => (
          <motion.div
            key={prof.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-[#111827] border border-[#1E293B] hover:border-emerald-500/40 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <AvatarComponent
                    name={prof.user?.name || prof.name || (prof.user?.email ? prof.user.email.split('@')[0] : 'Staff')}
                    avatar={prof.user?.avatar}
                    size="lg"
                  />
                  <div>
                    <h4 className="font-semibold text-slate-100 text-sm">
                      {prof.user?.name || prof.name || (prof.user?.email ? prof.user.email.split('@')[0] : 'Staff')}
                    </h4>
                    <p className="text-xs text-emerald-400 font-medium">{prof.designation}</p>
                    <p className="text-xs text-slate-400">{prof.user?.email || prof.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                      prof.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {prof.status}
                  </span>

                  {currentRole === 'admin' && prof.userId !== currentUser?.id && prof.user?.id !== currentUser?.id && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetId = prof.userId || prof.user?.id || prof.id;
                          setActiveActionMenuUserId(activeActionMenuUserId === targetId ? null : targetId);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        title="Member Actions"
                        aria-label="Member Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeActionMenuUserId === (prof.userId || prof.user?.id || prof.id) && (
                        <div
                          className="absolute right-0 mt-1 w-48 bg-[#171A21] border border-[#2A303D] rounded-xl shadow-xl z-20 py-1 overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => onOpenRemoveMember(prof)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition cursor-pointer text-left font-medium"
                          >
                            <UserMinus className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                            <span>Remove From Workspace</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{prof.department?.name || 'General Operations'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{prof.location || 'Remote'}</span>
                </div>
                {prof.manager && (
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Reports to: <strong className="text-slate-200">{prof.manager.name}</strong>
                    </span>
                  </div>
                )}
              </div>

              {prof.skills && prof.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {prof.skills.slice(0, 4).map((s: string, idx: number) => (
                    <span key={idx} className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-white/5">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Joined {new Date(prof.joiningDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </span>
              <button
                onClick={() => onViewProfile(prof)}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 transition cursor-pointer"
              >
                View Profile <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredProfiles.length === 0 && (
        <div className="col-span-full">
          <EmptyState
            icon={UserCheck}
            title={selectedDepartmentFilter ? 'No Employees in This Department' : 'No Employees Found'}
            description={
              selectedDepartmentFilter
                ? 'No employees are assigned to this department yet. Assign them from the Departments tab or change the filter.'
                : 'No employees match your current search or filter. Try broadening your criteria or invite new members.'
            }
            actionLabel={selectedDepartmentFilter ? 'View All Employees' : undefined}
            onAction={() => setSelectedDepartmentFilter('')}
            actionIcon={Filter}
            secondaryLabel={permissions?.teams?.manageTeams ? 'Invite Employee' : undefined}
            onSecondaryAction={onOpenInviteModal}
            secondaryIcon={UserPlus}
          />
        </div>
      )}
    </div>
  );
};
