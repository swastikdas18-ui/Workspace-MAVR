import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { UserRole } from '../../types';
import { 
  Users, Plus, Mail, Shield, Briefcase, GraduationCap, 
  UserPlus, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { getRoleBadgeColor } from '../../lib/auth';
import { UserAvatar } from '../common/UserAvatar';

export const TeamsView: React.FC = () => {
  const { 
    teams, users, currentUser, currentRole, permissions, 
    createTeam, inviteMember, searchQuery 
  } = useWorkspace();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  
  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('employee');
  const [inviteTeamId, setInviteTeamId] = useState<string>(teams[0]?.id || '');

  // Create Team Form State
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [teamColor, setTeamColor] = useState('#3b82f6');
  const [teamLeadId, setTeamLeadId] = useState<string>(currentUser?.id || '');

  // Filter teams for employee (My Team) vs Admin (All Teams)
  const visibleTeams = teams.filter((t) => {
    if (currentRole === 'employee' && currentUser.teamId && t.id !== currentUser.teamId) {
      // In employee mode, can highlight their primary team or show all directories
    }
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase()) && !t.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = inviteMember(inviteEmail, inviteRole, inviteTeamId);
    if (success) {
      setIsInviteModalOpen(false);
      setInviteEmail('');
    }
  };

  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = createTeam({
      name: teamName,
      description: teamDescription,
      lead_id: teamLeadId,
      color: teamColor
    });
    if (success) {
      setIsCreateTeamModalOpen(false);
      setTeamName('');
      setTeamDescription('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {currentRole === 'admin' ? 'Team Directory & Organization Structure' : 'My Team & Collaborators'}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {teams.length} Teams • {users.length} Members
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {currentRole === 'admin'
              ? 'Organize departments, assign team leads, and manage member permissions.'
              : 'Collaborate with your department peers and project teammates.'}
          </p>
        </div>

        {permissions.teams.inviteMembers && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateTeamModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <span>Create Team</span>
            </button>

            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Member</span>
            </button>
          </div>
        )}
      </div>

      {/* Teams Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {visibleTeams.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No Teams Configured</p>
            <p className="text-xs text-slate-500 mt-1">Create a team to organize departments and manage collaborators.</p>
          </div>
        ) : (
          visibleTeams.map((team) => {
            const lead = users.find((u) => u.id === team.lead_id);
            const members = users.filter((u) => u.teamId === team.id);

            return (
              <div
                key={team.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <h3 className="text-sm font-bold text-white">{team.name}</h3>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 font-mono">
                      {team.member_count} Members
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-4 leading-relaxed line-clamp-2">
                    {team.description}
                  </p>

                  {/* Team Lead */}
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 mb-4">
                    <span className="text-[10px] text-slate-500 block mb-1">Team Lead</span>
                    <div className="flex items-center gap-2">
                      <UserAvatar user={lead} size="sm" />
                      <div className="text-left min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">{lead?.name || 'Assigned Lead'}</p>
                        <p className="text-[10px] text-slate-400 truncate">{lead?.title}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Members Avatars preview */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px]">Active Members:</span>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {members.map((m) => (
                      <UserAvatar
                        key={m.id}
                        user={m}
                        size="xs"
                        className="ring-2 ring-slate-900"
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Full Members Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl mt-6">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span>Organization Members Directory</span>
          </h3>
          <span className="text-xs text-slate-400">{users.length} Registered Accounts</span>
        </div>

        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="p-3.5">Member Name</th>
              <th className="p-3.5">Role</th>
              <th className="p-3.5">Job Title</th>
              <th className="p-3.5">Team</th>
              <th className="p-3.5">Email Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-xs text-slate-500">
                  No members registered in organization.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const userTeam = teams.find((t) => t.id === user.teamId);
                return (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar user={user} size="sm" />
                        <span className="font-semibold text-white">{user.name}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border capitalize ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300">{user.title}</td>
                    <td className="p-3.5">
                      {userTeam ? (
                        <span className="text-slate-300 font-medium">{userTeam.name}</span>
                      ) : (
                        <span className="text-slate-500">Executive</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-slate-400 text-[11px]">{user.email}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Invite Team Member</h3>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Role Assignment</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="employee">Employee (Assigned Work)</option>
                  <option value="intern">Intern (Learning Sandbox)</option>
                  <option value="admin">Admin (Full Co-Administrator)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assign to Team</label>
                <select
                  value={inviteTeamId}
                  onChange={(e) => setInviteTeamId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/20"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {isCreateTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Create New Department Team</h3>
              <button onClick={() => setIsCreateTeamModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Infrastructure & DevOps"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Core domain responsibilities..."
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Team Color</label>
                  <input
                    type="color"
                    value={teamColor}
                    onChange={(e) => setTeamColor(e.target.value)}
                    className="w-full h-9 bg-slate-950 border border-slate-800 rounded-lg p-1 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Team Lead</label>
                  <select
                    value={teamLeadId}
                    onChange={(e) => setTeamLeadId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateTeamModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
