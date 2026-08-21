import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CrmRecord, CrmStatus } from '../../types';
import { 
  DollarSign, Plus, Phone, Mail, Building, Trash2, Edit3, 
  Calendar, CheckCircle2, ChevronRight, X, User
} from 'lucide-react';

export const CrmView: React.FC = () => {
  const { 
    crmRecords, currentUser, currentRole, permissions, createCrmRecord, 
    updateCrmRecord, deleteCrmRecord, users, searchQuery 
  } = useWorkspace();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  // New Lead Form State
  const [customerName, setCustomerName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dealValue, setDealValue] = useState(0);
  const [status, setStatus] = useState<CrmStatus>('new_lead');
  const [notes, setNotes] = useState('');

  // Role filter: Employee only sees assigned CRM records
  const visibleRecords = crmRecords.filter((rec) => {
    if (currentRole === 'employee' && rec.owner_id !== currentUser.id) {
      return false;
    }
    if (searchQuery) {
      const match = rec.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    rec.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    rec.email.toLowerCase().includes(searchQuery.toLowerCase());
      if (!match) return false;
    }
    return true;
  });

  const pipelineStages: { id: CrmStatus; label: string; color: string }[] = [
    { id: 'new_lead', label: 'New Leads', color: 'border-blue-500/40 text-blue-300' },
    { id: 'contacted', label: 'Contacted', color: 'border-cyan-500/40 text-cyan-300' },
    { id: 'proposal_sent', label: 'Proposal Sent', color: 'border-amber-500/40 text-amber-300' },
    { id: 'negotiation', label: 'Negotiation', color: 'border-purple-500/40 text-purple-300' },
    { id: 'won', label: 'Closed Won', color: 'border-emerald-500/40 text-emerald-300' },
    { id: 'lost', label: 'Closed Lost', color: 'border-rose-500/40 text-rose-300' },
  ];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = createCrmRecord({
      customer_name: customerName,
      company,
      email,
      phone,
      deal_value: Number(dealValue),
      status,
      notes
    });
    if (success) {
      setIsAddModalOpen(false);
      setCustomerName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setNotes('');
    }
  };

  const handleSaveNotes = (id: string) => {
    updateCrmRecord(id, { notes: notesText });
    setEditingNotesId(null);
  };

  const handleStageShift = (id: string, newStage: CrmStatus) => {
    updateCrmRecord(id, { status: newStage });
  };

  const totalValue = visibleRecords.reduce((acc, curr) => acc + curr.deal_value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {currentRole === 'admin' ? 'Enterprise CRM & Deal Pipeline' : 'My Assigned Client Deals'}
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-semibold">
              ${totalValue.toLocaleString()} Pipeline
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {currentRole === 'admin'
              ? 'Complete executive CRM suite: track deal values, stages, account owners, and customer notes.'
              : 'Manage and update notes for your assigned customer leads.'}
          </p>
        </div>

        {permissions.crm.createRecord && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/20 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lead</span>
          </button>
        )}
      </div>

      {/* CRM Pipeline Horizontal Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
        {pipelineStages.map((stage) => {
          const stageRecords = visibleRecords.filter((r) => r.status === stage.id);
          const stageValue = stageRecords.reduce((acc, curr) => acc + curr.deal_value, 0);

          return (
            <div
              key={stage.id}
              className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3 flex flex-col min-h-[480px] min-w-[200px]"
            >
              {/* Stage Header */}
              <div className="pb-2.5 mb-2.5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className={`text-xs font-bold ${stage.color}`}>{stage.label}</span>
                  <div className="text-[10px] text-slate-400 font-mono">${stageValue.toLocaleString()}</div>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                  {stageRecords.length}
                </span>
              </div>

              {/* Records in stage */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {stageRecords.length === 0 ? (
                  <div className="h-32 border border-dashed border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-600">
                    No leads in stage
                  </div>
                ) : (
                  stageRecords.map((record) => {
                    const owner = users.find((u) => u.id === record.owner_id);

                    return (
                      <div
                        key={record.id}
                        className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 shadow-sm hover:border-slate-700 transition-all group"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <span className="font-bold text-xs text-white truncate max-w-[120px]">
                            {record.company}
                          </span>
                          {permissions.crm.deleteRecord && (
                            <button
                              onClick={() => deleteCrmRecord(record.id)}
                              className="text-slate-500 hover:text-rose-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-300 font-medium">{record.customer_name}</p>
                        <p className="text-xs font-bold text-purple-400 my-1.5">
                          ${record.deal_value.toLocaleString()}
                        </p>

                        <div className="space-y-1 text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                          <div className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{record.email}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate">
                            <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{record.phone}</span>
                          </div>

                          {/* Notes snippet or edit button */}
                          {record.notes && (
                            <div className="p-1.5 rounded bg-slate-900 text-slate-300 text-[10px] mt-1.5 border border-slate-800">
                              💬 "{record.notes}"
                            </div>
                          )}

                          {permissions.crm.editNotes && (
                            <button
                              onClick={() => {
                                setEditingNotesId(record.id);
                                setNotesText(record.notes || '');
                              }}
                              className="text-[10px] text-blue-400 hover:underline pt-1 block"
                            >
                              Edit Notes
                            </button>
                          )}

                          {/* Advance Pipeline Button */}
                          <div className="pt-2 mt-1 border-t border-slate-800/40 flex items-center justify-between">
                            <span className="text-[9px] text-slate-500">
                              Owner: {owner?.name ? owner.name.split(' ')[0] : 'Workspace'}
                            </span>
                            <select
                              value={record.status}
                              onChange={(e) => handleStageShift(record.id, e.target.value as CrmStatus)}
                              className="bg-slate-900 border border-slate-800 text-[9px] text-slate-300 rounded px-1.5 py-0.5"
                            >
                              {pipelineStages.map((s) => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Notes Modal */}
      {editingNotesId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">Update Client Notes</h3>
            <textarea
              rows={4}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Add deal context, follow-up timeline, client requests..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 mb-3"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setEditingNotesId(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveNotes(editingNotesId)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add New CRM Record</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Company / Organization</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Primary Contact Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Smith"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="contact@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Estimated Deal Value ($)</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    step="1000"
                    value={dealValue}
                    onChange={(e) => setDealValue(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Initial Stage</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as CrmStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    {pipelineStages.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Deal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Key opportunity details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-md shadow-purple-600/20"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
