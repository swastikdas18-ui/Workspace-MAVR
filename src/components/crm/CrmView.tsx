import React, { useState } from 'react';
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

export const CrmView: React.FC = () => {
  const { 
    crmRecords, currentUser, currentRole, permissions, createCrmRecord, 
    updateCrmRecord, deleteCrmRecord, users, searchQuery 
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState<'pipeline' | 'founding_partners' | 'table'>('pipeline');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');

  // New Lead Form State
  const [customerName, setCustomerName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dealValue, setDealValue] = useState(17988);
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

  // Founding Partner Funnel Metrics (100% database-derived)
  const partnerLeads = visibleRecords.filter(r => r.notes?.includes('[Founding Partner Application]') || r.company.toLowerCase().includes('partner') || r.customer_name.toLowerCase().includes('partner'));
  const appliedCount = partnerLeads.length;
  const qualifiedCount = partnerLeads.filter(r => r.status !== 'new_lead').length;
  const discoveryCount = partnerLeads.filter(r => r.status === 'contacted' || r.status === 'proposal_sent' || r.status === 'negotiation' || r.status === 'won').length;
  const pilotCount = partnerLeads.filter(r => r.status === 'negotiation' || r.status === 'won').length;
  const activeCustomerCount = partnerLeads.filter(r => r.status === 'won').length;
  const testimonialCount = partnerLeads.filter(r => r.status === 'won' && r.notes?.toLowerCase().includes('testimonial')).length;
  const passRate = appliedCount > 0 ? Math.round((qualifiedCount / appliedCount) * 100) : 0;
  const activationRate = appliedCount > 0 ? Math.round((activeCustomerCount / appliedCount) * 100) : 0;
  const slotsRemaining = Math.max(0, 3 - activeCustomerCount);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={currentRole === 'admin' ? 'MSME Revenue CRM & Funnels' : 'Assigned Client Deals'}
        description={
          currentRole === 'admin'
            ? 'Account lifecycle tracking, deal pipeline stages, revenue forecasting, and Founding Partner campaign analytics.'
            : 'Track conversations, update negotiation notes, and advance client opportunities.'
        }
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono font-bold">
            ₹{totalValue.toLocaleString()} Pipeline
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
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pipeline</span>
              </button>
              <button
                onClick={() => setActiveTab('founding_partners')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'founding_partners'
                    ? 'bg-amber-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Founding Partners (3 Slots)</span>
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'table'
                    ? 'bg-blue-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
            </div>

            {permissions.crm.createRecord && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
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
          value={`₹${totalValue.toLocaleString()}`}
          icon={IndianRupee}
          color="blue"
          trend={{ value: '+24.5%', direction: 'up', label: 'vs last month' }}
          sparklineData={[40, 55, 65, 75, 80, 95, 110]}
        />
        <MetricCard
          label="Closed Won Revenue"
          value={`₹${wonValue.toLocaleString()}`}
          icon={CheckCircle2}
          color="emerald"
          trend={{ value: `${visibleRecords.filter(r => r.status === 'won').length} deals`, direction: 'up', label: 'converted' }}
          sparklineData={[10, 25, 45, 60, 75, 90, 100]}
        />
        <MetricCard
          label="Active Opportunities"
          value={activeOpportunities}
          icon={TrendingUp}
          color="purple"
          trend={{ value: 'In motion', direction: 'neutral', label: 'active funnel' }}
          sparklineData={[12, 14, 15, 18, 16, 19, 21]}
        />
        <MetricCard
          label="Average Deal Size"
          value={`₹${avgDeal.toLocaleString()}`}
          icon={Building2}
          color="amber"
          trend={{ value: 'Target ₹20k', direction: 'neutral', label: 'ticket benchmark' }}
          sparklineData={[20, 22, 21, 24, 25, 27, 29]}
        />
      </div>

      {/* FOUNDING PARTNER ANALYTICS VIEW */}
      {activeTab === 'founding_partners' && (
        <div className="bg-[#111827] border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 font-mono">
                  Campaign Dashboard
                </span>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  Scarcity: 3 Slots Max
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1">
                Founding Partner Acquisition Funnel
              </h3>
              <p className="text-xs text-slate-400">
                Track conversion flow from inbound application to qualified discovery call, pilot activation, and verified customer testimonials.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono">12-Month Business Pro (₹17,988 Waived)</span>
            </div>
          </div>

          {/* 6 Stage Funnel Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[11px] font-medium text-slate-400 mb-1">1. Applications</div>
              <div className="text-2xl font-extrabold text-blue-400">{appliedCount}</div>
              <div className="text-[10px] text-slate-500 mt-1">100% Inbound</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[11px] font-medium text-slate-400 mb-1">2. Qualified</div>
              <div className="text-2xl font-extrabold text-cyan-400">{qualifiedCount}</div>
              <div className="text-[10px] text-emerald-400 mt-1">{passRate}% Pass</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[11px] font-medium text-slate-400 mb-1">3. Discovery Calls</div>
              <div className="text-2xl font-extrabold text-purple-400">{discoveryCount}</div>
              <div className="text-[10px] text-slate-400 mt-1">Scheduled</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[11px] font-medium text-slate-400 mb-1">4. Pilot Started</div>
              <div className="text-2xl font-extrabold text-amber-400">{pilotCount}</div>
              <div className="text-[10px] text-slate-400 mt-1">In Progress</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[11px] font-medium text-slate-400 mb-1">5. Active Customers</div>
              <div className="text-2xl font-extrabold text-emerald-400">{activeCustomerCount} / 3</div>
              <div className="text-[10px] text-amber-300 mt-1">{slotsRemaining} Slots Open</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[11px] font-medium text-slate-400 mb-1">6. Testimonials</div>
              <div className="text-2xl font-extrabold text-rose-400">{testimonialCount}</div>
              <div className="text-[10px] text-emerald-400 mt-1">Verified</div>
            </div>
          </div>

          {/* Pipeline Conversion Flow Bar */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Founding Partner Funnel Conversion Rate</span>
              <span className="text-emerald-400 font-bold">Overall Activation: {activationRate}%</span>
            </div>
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden flex">
              <div style={{ width: `${Math.min(100, appliedCount * 25)}%` }} className="bg-blue-500 h-full" title="Applied" />
              <div style={{ width: `${Math.min(100, qualifiedCount * 25)}%` }} className="bg-cyan-500 h-full" title="Qualified" />
              <div style={{ width: `${Math.min(100, discoveryCount * 25)}%` }} className="bg-purple-500 h-full" title="Discovery" />
              <div style={{ width: `${Math.min(100, pilotCount * 25)}%` }} className="bg-amber-500 h-full" title="Pilot" />
              <div style={{ width: `${Math.min(100, activeCustomerCount * 33)}%` }} className="bg-emerald-500 h-full" title="Active" />
            </div>
          </div>
        </div>
      )}

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
            const stageValue = stageRecords.reduce((acc, curr) => acc + curr.deal_value, 0);

            return (
              <div key={stage.id} className="flex flex-col rounded-2xl bg-[#111827] border border-white/[0.08] p-3 shadow-lg min-w-[240px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stage.dotClass}`} />
                    <h3 className="text-xs font-bold text-white tracking-tight">{stage.label}</h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                      {stageRecords.length}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-400">
                    ₹{stageValue > 1000 ? `${(stageValue / 1000).toFixed(0)}k` : stageValue}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-2.5 flex-1 min-h-[300px]">
                  {stageRecords.map((rec) => {
                    const owner = users.find(u => u.id === rec.owner_id);
                    return (
                      <div
                        key={rec.id}
                        className="bg-[#0F172A] border border-white/[0.06] rounded-xl p-3 shadow-md hover:border-blue-500/40 transition-all space-y-2.5 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                              {rec.company}
                            </h4>
                            <p className="text-[11px] text-slate-400 font-medium">{rec.customer_name}</p>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                            ₹{rec.deal_value.toLocaleString()}
                          </span>
                        </div>

                        {rec.notes && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 bg-slate-950/40 p-1.5 rounded-lg border border-white/[0.04]">
                            {rec.notes}
                          </p>
                        )}

                        <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-slate-400">
                          <div className="flex items-center gap-1.5">
                            {owner && <UserAvatar name={owner.name} avatar={owner.avatar} size="xs" />}
                            <span>{owner ? owner.name.split(' ')[0] : 'Unassigned'}</span>
                          </div>

                          {/* Quick Advance Stage Dropdown */}
                          <select
                            value={rec.status}
                            onChange={(e) => handleStageShift(rec.id, e.target.value as CrmStatus)}
                            className="bg-slate-900 border border-white/[0.08] text-slate-300 text-[10px] rounded px-1.5 py-0.5 outline-none focus:border-blue-500"
                          >
                            {pipelineStages.map((s) => (
                              <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
      </AnimatePresence>
    </div>
  );
};
