import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CrmRecord, CrmStatus } from '../../types';
import { 
  DollarSign, Plus, Phone, Mail, Building2, Trash2, Edit3, 
  Calendar, CheckCircle2, ChevronRight, X, User, TrendingUp,
  LayoutGrid, List, Sparkles, MessageSquare, ArrowUpRight,
  IndianRupee, Award, Users, Target, Rocket, CheckCheck
} from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { MetricCard } from '../common/MetricCard';
import { EmptyState } from '../common/EmptyState';
import { UserAvatar } from '../common/UserAvatar';
import { motion, AnimatePresence } from 'motion/react';
import { CrmKanbanColumn, CrmLeadModal } from '../../features/crm';

interface CrmViewProps {
  routeLeadId?: string | null;
  onRouteChange?: (leadId: string | null) => void;
}

export const CrmView: React.FC<CrmViewProps> = ({ routeLeadId, onRouteChange }) => {
  const { 
    crmRecords, currentUser, currentRole, permissions, createCrmRecord, 
    updateCrmRecord, deleteCrmRecord, users, searchQuery 
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState<'pipeline' | 'table'>('pipeline');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [selectedLeadModal, setSelectedLeadModal] = useState<CrmRecord | null>(null);

  // Sync routeLeadId with selectedLeadModal
  useEffect(() => {
    if (routeLeadId) {
      const found = crmRecords.find((r) => r.id === routeLeadId);
      if (found) {
        setSelectedLeadModal(found);
      }
    } else {
      setSelectedLeadModal(null);
    }
  }, [routeLeadId, crmRecords]);

  const handleSelectLead = (lead: CrmRecord | null) => {
    setSelectedLeadModal(lead);
    if (onRouteChange) {
      onRouteChange(lead ? lead.id : null);
    }
  };

  // New Lead Form State
  const [customerName, setCustomerName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dealValue, setDealValue] = useState(50000);
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
    { id: 'new_lead', label: 'Lead / Inbound', badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/20', dotClass: 'bg-blue-400' },
    { id: 'contacted', label: 'Discovery / Contacted', badgeClass: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20', dotClass: 'bg-cyan-400' },
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
        title={currentRole === 'admin' ? 'Sales Pipeline & CRM' : 'My Deals & Leads'}
        description={
          currentRole === 'admin'
            ? 'Track deals through pipeline stages, monitor revenue forecasts, and manage customer contacts.'
            : 'Track conversations, update negotiation notes, and close client deals.'
        }
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono font-bold">
            ₹{totalValue.toLocaleString()} Total Pipeline
          </span>
        }
        actions={
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-[#111827] border border-white/[0.08] rounded-xl text-xs">
              <button
                onClick={() => setActiveTab('pipeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'pipeline'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kanban Board</span>
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'table'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table View</span>
              </button>
            </div>

            {permissions.crm.createRecord && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Deal</span>
              </button>
            )}
          </div>
        }
      />

      {/* CRM Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Pipeline Volume"
          value={`₹${totalValue.toLocaleString()}`}
          icon={IndianRupee}
          color="blue"
          trend={{ value: `${visibleRecords.length} deals`, direction: 'neutral', label: 'in pipeline' }}
          sparklineData={[0, 0, 0, 0, 0, 0, totalValue]}
        />
        <MetricCard
          label="Closed Won Revenue"
          value={`₹${wonValue.toLocaleString()}`}
          icon={CheckCircle2}
          color="emerald"
          trend={{ value: `${visibleRecords.filter(r => r.status === 'won').length} won`, direction: 'up', label: 'converted' }}
          sparklineData={[0, 0, 0, 0, 0, 0, wonValue]}
        />
        <MetricCard
          label="Active Opportunities"
          value={activeOpportunities}
          icon={TrendingUp}
          color="purple"
          trend={{ value: 'In motion', direction: 'neutral', label: 'active funnel' }}
          sparklineData={[0, 0, 0, 0, 0, 0, activeOpportunities]}
        />
        <MetricCard
          label="Average Deal Size"
          value={`₹${avgDeal.toLocaleString()}`}
          icon={Building2}
          color="amber"
          trend={{ value: 'Benchmark', direction: 'neutral', label: 'avg ticket' }}
          sparklineData={[0, 0, 0, 0, 0, 0, avgDeal]}
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
      ) : activeTab === 'pipeline' ? (
        /* PIPELINE KANBAN */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4">
          {pipelineStages.map((stage) => {
            const stageRecords = visibleRecords.filter((r) => r.status === stage.id);
            return (
              <CrmKanbanColumn
                key={stage.id}
                stage={stage}
                stages={pipelineStages}
                records={stageRecords}
                users={users}
                onSelectLead={handleSelectLead}
                onStageShift={handleStageShift}
              />
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-[#111827] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0F172A]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>Customer & Deal Repository</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">{visibleRecords.length} Total Leads</span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#0F172A]/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Company</th>
                <th className="py-3.5 px-4">Customer Contact</th>
                <th className="py-3.5 px-4">Deal Value</th>
                <th className="py-3.5 px-4">Status Stage</th>
                <th className="py-3.5 px-4">Owner</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300">
              {visibleRecords.map((rec) => {
                const owner = users.find(u => u.id === rec.owner_id);
                return (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">{rec.company}</td>
                    <td className="py-3.5 px-4">
                      <div>{rec.customer_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{rec.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">₹{rec.deal_value.toLocaleString()}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] uppercase font-bold font-mono">
                        {rec.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{owner ? owner.name : 'Unassigned'}</td>
                    <td className="py-3.5 px-4 text-right">
                      {permissions.crm.deleteRecord && (
                        <button
                          onClick={() => deleteCrmRecord(rec.id)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-600/20 hover:text-rose-400 text-slate-400 text-xs transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Lead Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0F172A] border border-white/[0.1] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="text-base font-bold text-white">Add New Opportunity</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Company / Organization *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Tech"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Contact Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jane Doe"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="jane@acme.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Deal Value (₹)</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      step="1000"
                      value={dealValue}
                      onChange={(e) => setDealValue(Number(e.target.value))}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Initial Stage</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as CrmStatus)}
                      className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                    >
                      {pipelineStages.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Notes & Requirements</label>
                  <textarea
                    rows={2}
                    placeholder="Key pain points, current tools, budget timeline..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-600/25 cursor-pointer"
                  >
                    Save Opportunity
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* LEAD DETAIL DEEP-LINK MODAL */}
        {selectedLeadModal && (
          <CrmLeadModal
            lead={selectedLeadModal}
            users={users}
            canDelete={Boolean(permissions.crm.deleteRecord)}
            canEditNotes={Boolean(permissions.crm.editNotes)}
            editingNotesId={editingNotesId}
            notesText={notesText}
            onClose={() => handleSelectLead(null)}
            onDelete={(id) => {
              deleteCrmRecord(id);
              handleSelectLead(null);
            }}
            onStartEditNotes={(id, currentNotes) => {
              setEditingNotesId(id);
              setNotesText(currentNotes);
            }}
            onCancelEditNotes={() => setEditingNotesId(null)}
            onSaveNotes={handleSaveNotes}
            onNotesTextChange={setNotesText}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
