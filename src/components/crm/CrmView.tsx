import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CrmRecord, CrmStatus } from '../../types';
import { 
  DollarSign, Plus, Phone, Mail, Building2, Trash2, Edit3, 
  Calendar, CheckCircle2, ChevronRight, X, User, TrendingUp,
  LayoutGrid, List, Sparkles, MessageSquare, ArrowUpRight
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { MetricCard } from '../common/MetricCard';
import { EmptyState } from '../common/EmptyState';
import { UserAvatar } from '../common/UserAvatar';
import { motion, AnimatePresence } from 'motion/react';

export const CrmView: React.FC = () => {
  const { 
    crmRecords, currentUser, currentRole, permissions, createCrmRecord, 
    updateCrmRecord, deleteCrmRecord, users, searchQuery 
  } = useWorkspace();

  const [viewMode, setViewMode] = useState<'pipeline' | 'table'>('pipeline');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  // New Lead Form State
  const [customerName, setCustomerName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dealValue, setDealValue] = useState(15000);
  const [status, setStatus] = useState<CrmStatus>('new_lead');
  const [notes, setNotes] = useState('');

  // Role filter: Employee only sees assigned CRM records
  const visibleRecords = crmRecords.filter((rec) => {
    if (currentRole === 'employee' && rec.owner_id !== currentUser.id) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = rec.customer_name.toLowerCase().includes(q) ||
                    rec.company.toLowerCase().includes(q) ||
                    rec.email.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const pipelineStages: { id: CrmStatus; label: string; badgeClass: string; dotClass: string }[] = [
    { id: 'new_lead', label: 'New Inbound', badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/20', dotClass: 'bg-blue-400' },
    { id: 'contacted', label: 'Qualified Discovery', badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20', dotClass: 'bg-cyan-400' },
    { id: 'proposal_sent', label: 'Proposal Sent', badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/20', dotClass: 'bg-amber-400' },
    { id: 'negotiation', label: 'In Negotiation', badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/20', dotClass: 'bg-purple-400' },
    { id: 'won', label: 'Closed Won', badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20', dotClass: 'bg-emerald-400' },
    { id: 'lost', label: 'Closed Lost', badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/20', dotClass: 'bg-rose-400' },
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
  const wonValue = visibleRecords.filter(r => r.status === 'won').reduce((acc, curr) => acc + curr.deal_value, 0);
  const activeOpportunities = visibleRecords.filter(r => r.status !== 'won' && r.status !== 'lost').length;
  const avgDeal = visibleRecords.length > 0 ? Math.round(totalValue / visibleRecords.length) : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={currentRole === 'admin' ? 'Attio-Grade CRM Pipeline' : 'Assigned Enterprise Deals'}
        description={
          currentRole === 'admin'
            ? 'Real-time account lifecycle tracking, pipeline stage conversion, and deal forecasting.'
            : 'Track conversations, update negotiation notes, and advance client opportunities.'
        }
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-bold">
            ${totalValue.toLocaleString()} Pipeline
          </span>
        }
        actions={
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-[#111827] border border-white/[0.08] rounded-xl text-xs">
              <button
                onClick={() => setViewMode('pipeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'pipeline'
                    ? 'bg-[#7C3AED] text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pipeline</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#7C3AED] text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Attio Grid</span>
              </button>
            </div>

            {permissions.crm.createRecord && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Opportunity</span>
              </button>
            )}
          </div>
        }
      />

      {/* CRM Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Pipeline Volume"
          value={`$${totalValue.toLocaleString()}`}
          icon={DollarSign}
          color="purple"
          trend={{ value: '+14.8%', direction: 'up', label: 'vs last quarter' }}
          sparklineData={[40, 55, 65, 75, 80, 95, 110]}
        />
        <MetricCard
          label="Closed Won Revenue"
          value={`$${wonValue.toLocaleString()}`}
          icon={CheckCircle2}
          color="emerald"
          trend={{ value: `${visibleRecords.filter(r => r.status === 'won').length} deals`, direction: 'up', label: 'converted' }}
          sparklineData={[10, 25, 45, 60, 75, 90, 100]}
        />
        <MetricCard
          label="Active Opportunities"
          value={activeOpportunities}
          icon={TrendingUp}
          color="blue"
          trend={{ value: 'In motion', direction: 'neutral', label: 'active funnel' }}
          sparklineData={[12, 14, 15, 18, 16, 19, 21]}
        />
        <MetricCard
          label="Average Deal Size"
          value={`$${avgDeal.toLocaleString()}`}
          icon={Building2}
          color="amber"
          trend={{ value: 'Target $25k', direction: 'neutral', label: 'ticket benchmark' }}
          sparklineData={[20, 22, 21, 24, 25, 27, 29]}
        />
      </div>

      {/* Main CRM Canvas */}
      {visibleRecords.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="No Deals Found"
          description="Create your first client record to populate the revenue pipeline."
          actionLabel={permissions.crm.createRecord ? 'Add Deal' : undefined}
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : viewMode === 'pipeline' ? (
        /* PIPELINE KANBAN */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {pipelineStages.map((stage) => {
            const stageRecords = visibleRecords.filter((r) => r.status === stage.id);
            const stageValue = stageRecords.reduce((acc, curr) => acc + curr.deal_value, 0);

            return (
              <div
                key={stage.id}
                className="bg-[#0F172A]/60 border border-white/[0.06] rounded-2xl p-3 flex flex-col min-h-[500px] min-w-[210px]"
              >
                {/* Stage Header */}
                <div className="pb-2.5 mb-2.5 border-b border-white/[0.06] flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${stage.dotClass}`} />
                      <span className="text-xs font-semibold text-white tracking-tight">{stage.label}</span>
                    </div>
                    <div className="text-[10px] text-purple-400 font-mono font-medium mt-0.5">
                      ${stageValue.toLocaleString()}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {stageRecords.length}
                  </span>
                </div>

                {/* Records in Stage */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {stageRecords.length === 0 ? (
                    <div className="h-32 border border-dashed border-white/[0.06] rounded-xl flex items-center justify-center text-[11px] text-slate-500">
                      Empty stage
                    </div>
                  ) : (
                    stageRecords.map((record) => {
                      const owner = users.find((u) => u.id === record.owner_id);

                      return (
                        <motion.div
                          key={record.id}
                          whileHover={{ y: -2 }}
                          transition={{ duration: 0.15 }}
                          className="bg-[#111827] border border-white/[0.08] hover:border-purple-500/40 rounded-xl p-3.5 shadow-md transition-all group"
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span className="font-semibold text-xs text-white truncate max-w-[130px] group-hover:text-purple-300 transition-colors">
                              {record.company}
                            </span>
                            {permissions.crm.deleteRecord && (
                              <button
                                onClick={() => deleteCrmRecord(record.id)}
                                className="text-slate-500 hover:text-rose-400 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-300">{record.customer_name}</p>
                          <p className="text-xs font-mono font-bold text-purple-400 my-1.5">
                            ${record.deal_value.toLocaleString()}
                          </p>

                          <div className="space-y-1.5 text-[10px] text-slate-400 pt-2 border-t border-white/[0.04]">
                            <div className="flex items-center gap-1 truncate text-slate-300">
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{record.email}</span>
                            </div>

                            {/* Notes Display */}
                            {record.notes && (
                              <div className="p-2 rounded-lg bg-[#0F172A] text-slate-300 text-[10px] border border-white/[0.04] leading-relaxed">
                                "{record.notes}"
                              </div>
                            )}

                            {permissions.crm.editNotes && (
                              <button
                                onClick={() => {
                                  setEditingNotesId(record.id);
                                  setNotesText(record.notes || '');
                                }}
                                className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 pt-0.5 cursor-pointer"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                                <span>Edit Activity Notes</span>
                              </button>
                            )}

                            {/* Owner & Advance */}
                            <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <UserAvatar name={owner?.name} avatar={owner?.avatar} size="xs" />
                                <span className="text-[9px] text-slate-400 truncate max-w-[60px]">
                                  {owner?.name ? owner.name.split(' ')[0] : 'Open'}
                                </span>
                              </div>
                              <select
                                value={record.status}
                                onChange={(e) => handleStageShift(record.id, e.target.value as CrmStatus)}
                                className="bg-[#0F172A] border border-white/[0.08] text-[9px] text-slate-300 rounded-lg px-1.5 py-0.5 cursor-pointer focus:outline-none focus:border-purple-500"
                              >
                                {pipelineStages.map((s) => (
                                  <option key={s.id} value={s.id}>{s.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ATTIO TABLE GRID VIEW */
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#0F172A] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Company & Account</th>
                <th className="py-3.5 px-4">Primary Contact</th>
                <th className="py-3.5 px-4">Stage</th>
                <th className="py-3.5 px-4">Deal Value</th>
                <th className="py-3.5 px-4">Account Owner</th>
                <th className="py-3.5 px-4">Direct Contact</th>
                {permissions.crm.deleteRecord && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              {visibleRecords.map((record) => {
                const owner = users.find((u) => u.id === record.owner_id);
                const stageObj = pipelineStages.find(s => s.id === record.status);

                return (
                  <tr key={record.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#7C3AED]/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-xs">
                          {record.company.substring(0, 1)}
                        </div>
                        <div>
                          <p className="font-semibold text-white group-hover:text-purple-300 transition-colors">{record.company}</p>
                          {record.notes && <p className="text-[10px] text-slate-400 truncate max-w-xs">{record.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">{record.customer_name}</td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider border font-mono ${stageObj?.badgeClass}`}>
                        {stageObj?.label || record.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-purple-400 text-sm">
                      ${record.deal_value.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={owner?.name} avatar={owner?.avatar} size="xs" />
                        <span>{owner?.name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      <div>{record.email}</div>
                      <div className="text-slate-500">{record.phone}</div>
                    </td>
                    {permissions.crm.deleteRecord && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => deleteCrmRecord(record.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Notes Modal */}
      <AnimatePresence>
        {editingNotesId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingNotesId(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-[#0F172A] border border-white/[0.12] rounded-2xl w-full max-w-sm p-6 shadow-2xl z-10"
            >
              <h3 className="text-sm font-bold text-white mb-2">Update Deal Notes</h3>
              <textarea
                rows={4}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Log call updates, follow-up timeline, client objections..."
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 mb-4 transition-colors"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setEditingNotesId(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveNotes(editingNotesId)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold cursor-pointer"
                >
                  Save Notes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-[#0F172A] border border-white/[0.12] rounded-2xl w-full max-w-md p-6 shadow-2xl z-10 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <h3 className="text-base font-semibold text-white">Create Enterprise Opportunity</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Company / Organization</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Stripe Inc."
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Primary Executive Contact</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Business Email</label>
                    <input
                      type="email"
                      required
                      placeholder="sjenkins@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Direct Phone</label>
                    <input
                      type="tel"
                      required
                      placeholder="+1 (415) 000-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Deal Value ($)</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      step="1000"
                      value={dealValue}
                      onChange={(e) => setDealValue(Number(e.target.value))}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Initial Stage</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as CrmStatus)}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      {pipelineStages.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Deal Strategy & Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Key pain points, current vendor, budget approval status..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold shadow-lg shadow-purple-600/25 cursor-pointer"
                  >
                    Save Opportunity
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
