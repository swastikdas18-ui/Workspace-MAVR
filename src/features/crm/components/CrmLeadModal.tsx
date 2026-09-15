import React from 'react';
import { CrmRecord } from '../../../types';
import { UserAvatar } from '../../../components/common/UserAvatar';
import { Phone, Mail, Building2, Trash2, Edit3, X, User } from 'lucide-react';
import { motion } from 'motion/react';

export interface CrmLeadModalProps {
  lead: CrmRecord;
  users: Array<{ id: string; name: string; avatar?: string }>;
  canDelete: boolean;
  canEditNotes: boolean;
  editingNotesId: string | null;
  notesText: string;
  onClose: () => void;
  onDelete: (leadId: string) => void;
  onStartEditNotes: (leadId: string, currentNotes: string) => void;
  onCancelEditNotes: () => void;
  onSaveNotes: (leadId: string) => void;
  onNotesTextChange: (text: string) => void;
}

export const CrmLeadModal: React.FC<CrmLeadModalProps> = React.memo(({
  lead,
  users,
  canDelete,
  canEditNotes,
  editingNotesId,
  notesText,
  onClose,
  onDelete,
  onStartEditNotes,
  onCancelEditNotes,
  onSaveNotes,
  onNotesTextChange,
}) => {
  const owner = users.find(u => u.id === lead.owner_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-[#0F172A] border border-white/[0.12] rounded-3xl p-6 shadow-2xl z-10 space-y-5"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-bold text-white">{lead.company}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-[#111827] border border-white/[0.06]">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Deal Value</span>
              <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                ₹{lead.deal_value.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-[#111827] border border-white/[0.06]">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Stage</span>
              <p className="text-xs font-semibold text-purple-300 uppercase mt-0.5 font-mono">
                {lead.status.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#111827] border border-white/[0.06] space-y-2">
            <div className="flex items-center gap-2 text-slate-300">
              <User className="w-4 h-4 text-slate-400" />
              <span className="font-semibold">{lead.customer_name}</span>
            </div>
            {lead.email && (
              <div className="flex items-center gap-2 text-slate-400">
                <Mail className="w-3.5 h-3.5" />
                <a href={`mailto:${lead.email}`} className="hover:text-purple-300">{lead.email}</a>
              </div>
            )}
            {lead.phone && (
              <div className="flex items-center gap-2 text-slate-400">
                <Phone className="w-3.5 h-3.5" />
                <span>{lead.phone}</span>
              </div>
            )}
            <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
              <span className="text-slate-500 text-[10px]">Account Executive</span>
              <div className="flex items-center gap-1.5">
                {owner && <UserAvatar name={owner.name} avatar={owner.avatar} size="xs" />}
                <span className="text-slate-300 font-medium">{owner?.name || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          {/* Deal Notes Editor */}
          <div className="p-3 rounded-2xl bg-[#111827] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Deal Context & Intelligence</span>
              {canEditNotes && editingNotesId !== lead.id && (
                <button
                  onClick={() => onStartEditNotes(lead.id, lead.notes || '')}
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-medium text-[11px]"
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
                  className="w-full bg-[#0F172A] border border-purple-500/50 rounded-xl p-2.5 text-white text-xs outline-none"
                  placeholder="Record customer objections, contract specifications..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={onCancelEditNotes}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onSaveNotes(lead.id)}
                    className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px]"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-300 text-xs leading-relaxed bg-[#0F172A] p-2.5 rounded-xl border border-white/[0.04]">
                {lead.notes || 'No contextual notes recorded.'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          {canDelete ? (
            <button
              onClick={() => onDelete(lead.id)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Lead</span>
            </button>
          ) : <div />}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer text-xs"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
});
CrmLeadModal.displayName = 'CrmLeadModal';
