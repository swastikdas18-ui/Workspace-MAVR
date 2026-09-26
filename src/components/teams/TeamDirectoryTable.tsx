import React from 'react';
import { Users } from 'lucide-react';
import { UserAvatar } from '../common/UserAvatar';
import { RoleBadge } from '../common/RoleBadge';
import { User, Team } from '../../types';

interface TeamDirectoryTableProps {
  users: User[];
  teams: Team[];
}

export const TeamDirectoryTable: React.FC<TeamDirectoryTableProps> = ({ users, teams }) => {
  return (
    <div className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0F172A]">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-400" />
          <span>Organization Member Roster</span>
        </h3>
        <span className="text-xs text-slate-400 font-mono">{users.length} Accounts</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-white/[0.08] bg-[#0F172A]/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3.5 px-4">Member Name</th>
              <th className="py-3.5 px-4">Role Matrix</th>
              <th className="py-3.5 px-4">Role Title</th>
              <th className="py-3.5 px-4">Department Team</th>
              <th className="py-3.5 px-4">Enterprise Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-slate-300">
            {users.map((user) => {
              const userTeam = teams.find((t) => t.id === user.teamId || t.id === (user as any).team_id);
              return (
                <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} avatar={user.avatar} size="sm" />
                      <span className="font-semibold text-white">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-medium">{user.title || 'Team Member'}</td>
                  <td className="py-3.5 px-4">
                    {userTeam ? (
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: userTeam.color }} />
                        {userTeam.name}
                      </span>
                    ) : (
                      <span className="text-slate-500">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{user.email}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
