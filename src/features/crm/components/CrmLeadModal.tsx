import React from 'react';
import { motion } from 'motion/react';
import { Building2, X, User, Mail, Phone, Edit3, Trash2 } from 'lucide-react';
import { CrmRecord } from '../../../types';
import { UserAvatar } from '../../../components/common/UserAvatar';

export interface CrmLeadModalProps {
  lead: CrmRecord | null;
  onClose: () => void;
  users: Array<{ id: string; name: string; avatar?: string }>;
  canEditNotes: boolean;
  canDelete: boolean;
  editingNotesId: string | null;
  notesText: string;
  onNotesTextChange: (text: string) => void;
  onStartEditNotes: (id: string, notes: string) => void;
  onCancelEditNotes: () => void;
  onSaveNotes: (id: string) => void;
  onDelete: (id: string) => void;
}

export const CrmLeadModal: React.FC<CrmLeadModalProps> = React.memo(({
  lead,
  onClose,
  users,
  canEditNotes,
  canDelete,
  editingNotesId,
  notesText,
  onNotesTextChange,
  onStartEditNotes,
  onCancelEditNotes,
  onSaveNotes,
  onDelete,
}) => {
  if (!lead) return null;

  const owner = users.find(u => u.id === lead.owner_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-[#0F172A] border border-[#1E293B] rounded-3xl p-6 sm:p-7 shadow-2xl z-10 space-y-5 text-slate-100 overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500" />

        <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white font-heading">{lead.company}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#111827] border border-[#1E293B]">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Deal Value</span>
              <p className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                ₹{lead.deal_value.toLocaleString()}
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#111827] border border-[#1E293B]">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Stage</span>
              <p className="text-xs font-bold text-sky-400 uppercase mt-1 font-mono">
                {lead.status.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-2">
            <div className="flex items-center gap-2 text-slate-200">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-white">{lead.customer_name}</span>
            </div>
            {lead.email && (
              <div className="flex items-center gap-2 text-slate-300">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <a href={`mailto:${lead.email}`} className="hover:text-emerald-400">{lead.email}</a>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2 text-slate-300">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>{lead.phone}</span>
              </div>
            )}
            <div className="pt-2 border-t border-[#1E293B] flex items-center justify-between">
              <span className="text-slate-400 text-[10px] font-medium">Account Executive</span>
              <div className="flex items-center gap-1.5">
                {owner && <UserAvatar name={owner.name} avatar={owner.avatar} size="xs" />}
                <span className="text-slate-200 font-semibold">{owner?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          {/* Deal Notes Editor */}
          <div className="p-3.5 rounded-2xl bg-[#111827] border border-[#1E293B] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Deal Context & Intelligence</span>
              {canEditNotes && editingNotesId !== lead.id && (
                <button
                  onClick={() => onStartEditNotes(lead.id, lead.notes || '')}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer font-semibold text-[11px]"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Notes</span>
                </button>
              )}
            </div>
            {editingNotesId === lead.id ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={notesText}
                  onChange={(e) => onNotesTextChange(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-[#1E293B] rounded-xl p-2.5 text-white text-xs outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                  placeholder="Record customer objections, contract specifications..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={onCancelEditNotes}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onSaveNotes(lead.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] cursor-pointer shadow-xs"
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-300 text-xs leading-relaxed bg-[#0B0F17] p-3 rounded-xl border border-[#1E293B]">
                {lead.notes || 'No contextual notes recorded.'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#1E293B]">
          {canDelete ? (
            <button
              onClick={() => onDelete(lead.id)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 transition-colors cursor-pointer text-xs font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Lead</span>
            </button>
          ) : <div />}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
});
CrmLeadModal.displayName = 'CrmLeadModal';
