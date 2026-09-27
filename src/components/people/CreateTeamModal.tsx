import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api } from '../../lib/api';

export const CreateTeamModal: React.FC<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  loadData: () => void;
  addToast: any;
  users: any[];
}> = ({ isOpen, setIsOpen, loadData, addToast, users }) => {
  const { createTeam } = useWorkspace();
  const [teamName, setTeamName] = React.useState('');
  const [teamDescription, setTeamDescription] = React.useState('');
  const [teamColor, setTeamColor] = React.useState('#7C3AED');
  const [teamLeadId, setTeamLeadId] = React.useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create Department in People System
      await api.createDepartment({
        name: teamName,
        description: teamDescription,
        headId: teamLeadId || undefined,
        color: teamColor,
      });

      // Also register in workspace teams
      await createTeam({
        name: teamName,
        description: teamDescription,
        lead_id: teamLeadId || '',
        color: teamColor,
      });

      setIsOpen(false);
      setTeamName('');
      setTeamDescription('');
      addToast({
        type: 'success',
        title: 'Department Created',
        message: `Department "${teamName}" created successfully.`,
      });
      loadData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Create Department',
        message: err.message || 'An error occurred while creating the department.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative bg-[#0F172A] border border-white/[0.12] rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <h3 className="text-base font-semibold text-white">Create Department Team</h3>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M6 18l12-12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Department Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Infrastructure & Platform Engineering"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Mission & Domain</label>
            <textarea
              rows={2}
              required
              placeholder="Core scope and team deliverables..."
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
              className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Color Marker</label>
              <input
                type="color"
                value={teamColor}
                onChange={(e) => setTeamColor(e.target.value)}
                className="w-full h-10 bg-[#111827] border border-white/[0.08] rounded-xl p-1 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Team Lead</label>
              <select
                value={teamLeadId}
                onChange={(e) => setTeamLeadId(e.target.value)}
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 cursor-pointer"
            >
              Create Department
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};