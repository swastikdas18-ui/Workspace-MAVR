import React, { useState, useEffect } from 'react';
import { 
  Zap, Plus, Filter, Search, CheckCircle2, XCircle, 
  Clock, Play, Edit3, Trash2, ShieldAlert, ArrowRight, 
  Activity, Bell, CheckSquare, Sparkles, DollarSign, UserCheck,
  RefreshCw, Power, Copy, LayoutTemplate, Layers, AlertTriangle,
  FolderPlus, FileText, Check, ChevronRight
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api } from '../../lib/api';
import { PageHeader } from '../common/PageHeader';
import { CreateAutomationModal, TRIGGER_OPTIONS, ACTION_OPTIONS } from './CreateAutomationModal';
import { EditAutomationModal } from './EditAutomationModal';
import { motion } from 'motion/react';

export const AutomationsView: React.FC = () => {
  const { currentRole, addToast } = useWorkspace();

  // Active View Tab: 'rules' | 'executions' | 'templates'
  const [activeTab, setActiveTab] = useState<'rules' | 'executions' | 'templates'>('rules');

  const [rules, setRules] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [installingTemplateId, setInstallingTemplateId] = useState<string | null>(null);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [rulesRes, execsRes, tempsRes, analyticsRes] = await Promise.allSettled([
        api.getAutomations(),
        api.getAutomationExecutions(),
        api.getAutomationTemplates(),
        api.getAutomationAnalytics(),
      ]);

      if (rulesRes.status === 'fulfilled' && rulesRes.value?.rules) {
        setRules(rulesRes.value.rules);
      }
      if (execsRes.status === 'fulfilled' && execsRes.value?.executions) {
        setExecutions(execsRes.value.executions);
      }
      if (tempsRes.status === 'fulfilled' && tempsRes.value?.templates) {
        setTemplates(tempsRes.value.templates);
      }
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
        setAnalytics(analyticsRes.value);
      }
    } catch (err: any) {
      console.warn('Failed to load automation engine state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleToggle = async (ruleId: string) => {
    try {
      setTogglingId(ruleId);
      const updated = await api.toggleAutomation(ruleId).catch(() => null);

      setRules(prev => prev.map(r => {
        if (r.id === ruleId) {
          const newActive = updated?.rule ? (updated.rule.enabled ?? updated.rule.isActive) : !r.enabled;
          addToast({
            type: 'info',
            title: newActive ? 'Rule Activated' : 'Rule Paused',
            message: `"${r.name}" is now ${newActive ? 'active' : 'paused'}.`,
          });
          return { ...r, enabled: newActive, isActive: newActive };
        }
        return r;
      }));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDuplicate = async (ruleId: string, ruleName: string) => {
    try {
      setDuplicatingId(ruleId);
      const res = await api.duplicateAutomation(ruleId);
      if (res && res.rule) {
        setRules(prev => [res.rule, ...prev]);
        addToast({
          type: 'success',
          title: 'Rule Duplicated',
          message: `Created copy of "${ruleName}".`,
        });
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Duplication Failed',
        message: err.message || 'Could not duplicate automation rule.',
      });
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDelete = async (ruleId: string, ruleName: string) => {
    if (!window.confirm(`Are you sure you want to delete automation rule "${ruleName}"?`)) {
      return;
    }
    try {
      setDeletingId(ruleId);
      await api.deleteAutomation(ruleId).catch(() => null);
      setRules(prev => prev.filter(r => r.id !== ruleId));
      addToast({
        type: 'success',
        title: 'Rule Deleted',
        message: `Automation rule "${ruleName}" was permanently removed.`,
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleInstallTemplate = async (templateId: string, templateName: string) => {
    try {
      setInstallingTemplateId(templateId);
      const res = await api.installAutomationTemplate(templateId);
      if (res && res.rule) {
        setRules(prev => [res.rule, ...prev]);
        addToast({
          type: 'success',
          title: 'Template Installed',
          message: `Rule "${templateName}" is now active in your workspace.`,
        });
        setActiveTab('rules');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Template Installation Failed',
        message: err.message || 'Could not install automation template.',
      });
    } finally {
      setInstallingTemplateId(null);
    }
  };

  const handleCreateSuccess = (newRule: any) => {
    setRules(prev => [newRule, ...prev]);
  };

  const handleEditSuccess = (updatedRule: any) => {
    setRules(prev => prev.map(r => r.id === updatedRule.id ? updatedRule : r));
  };

  // Filter rules
  const filteredRules = rules.filter(r => {
    const isRuleActive = r.enabled !== undefined ? r.enabled : r.isActive;
    if (filterStatus === 'active' && !isRuleActive) return false;
    if (filterStatus === 'inactive' && isRuleActive) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name?.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      const matchTrigger = r.triggerType?.toLowerCase().includes(q);
      if (!matchName && !matchDesc && !matchTrigger) return false;
    }
    return true;
  });

  const activeCount = rules.filter(r => (r.enabled !== undefined ? r.enabled : r.isActive)).length;
  const totalExecs = analytics?.totalExecutions ?? executions.length;
  const successRate = analytics?.successRate ?? (executions.length > 0 ? 100 : 100);

  // Access Control check
  if (currentRole !== 'admin' && currentRole !== 'employee') {
    return (
      <div className="p-8 text-center bg-[#111827] border border-white/[0.08] rounded-2xl max-w-xl mx-auto mt-12 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Restricted Access</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          The Automation Platform requires verified Administrator or Employee permissions to inspect and configure workflows.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="No-Code Automation Engine"
        description="Event-driven WHEN &rarr; IF &rarr; THEN rule pipelines. Trigger automated tasks, notifications, and status transitions."
        badge={
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono font-bold">
            Zapier + Monday + ClickUp Standard
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAllData()}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors cursor-pointer"
              title="Refresh Pipeline Status"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {currentRole === 'admin' && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Visual Rule Builder</span>
              </button>
            )}
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#111827] border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Total Rules</div>
            <div className="text-xl font-bold text-white mt-1">{rules.length}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
            <Zap className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111827] border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Active Pipelines</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{activeCount}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111827] border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Executions</div>
            <div className="text-xl font-bold text-white mt-1">{totalExecs}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#111827] border border-white/[0.08] flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Success Rate</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{successRate}%</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Rules ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('executions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'executions'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Execution Logs ({executions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'templates'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutTemplate className="w-4 h-4" />
          <span>Templates Gallery ({templates.length || 6})</span>
        </button>
      </div>

      {/* TAB 1: RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#111827] border border-white/[0.08]">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rule name, trigger, action..."
                className="w-full pl-9 pr-3.5 py-1.5 bg-[#1E293B] border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#1E293B] p-1 rounded-lg border border-white/10 text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterStatus === 'all' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({rules.length})
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterStatus === 'active' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterStatus === 'inactive' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Paused ({rules.length - activeCount})
              </button>
            </div>
          </div>

          {/* Rules List */}
          {filteredRules.length === 0 ? (
            <div className="p-12 text-center bg-[#111827] border border-white/[0.08] rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/20">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No Automation Rules Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No rules matched your filter criteria. Build a custom trigger pipeline or install a pre-configured template.
              </p>
              {currentRole === 'admin' && (
                <button
                  onClick={() => setIsCreateOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-colors cursor-pointer mt-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Build First Automation</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredRules.map((rule) => {
                const isEnabled = rule.enabled !== undefined ? rule.enabled : rule.isActive;
                const triggerDef = TRIGGER_OPTIONS.find(t => t.id === rule.triggerType) || { label: rule.triggerType, icon: Zap };
                const TriggerIcon = triggerDef.icon;
                const conditionCount = Array.isArray(rule.conditionConfig) ? rule.conditionConfig.length : (rule.conditionConfig ? 1 : 0);
                const actionCount = rule.actions?.length || 1;

                return (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isEnabled
                        ? 'bg-[#111827] border-white/[0.08] hover:border-purple-500/40'
                        : 'bg-[#111827]/50 border-white/5 opacity-75'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2 flex-1 min-w-[260px]">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isEnabled ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-500'
                            }`}
                          />
                          <h4 className="text-sm font-bold text-white">{rule.name}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10">
                            {rule.entityType || 'system'}
                          </span>
                        </div>

                        {rule.description && (
                          <p className="text-xs text-slate-400">{rule.description}</p>
                        )}

                        {/* Pipeline Badge Flow */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {/* WHEN */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-medium">
                            <span className="font-mono text-[9px] font-bold text-purple-400 uppercase">WHEN</span>
                            <TriggerIcon className="w-3.5 h-3.5" />
                            <span>{triggerDef.label}</span>
                          </div>

                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />

                          {/* IF */}
                          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium">
                            <span className="font-mono text-[9px] font-bold text-amber-400 uppercase">IF</span>
                            <span>{conditionCount > 0 ? `${conditionCount} Condition(s)` : 'Always Match'}</span>
                          </div>

                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />

                          {/* THEN */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium">
                            <span className="font-mono text-[9px] font-bold text-emerald-400 uppercase">THEN</span>
                            <span>{actionCount} Action(s)</span>
                          </div>
                        </div>
                      </div>

                      {/* Rule Actions */}
                      {currentRole === 'admin' && (
                        <div className="flex items-center gap-1.5 bg-[#1E293B] p-1 rounded-lg border border-white/10">
                          {/* Enable/Disable Toggle */}
                          <button
                            onClick={() => handleToggle(rule.id)}
                            disabled={togglingId === rule.id}
                            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                              isEnabled
                                ? 'text-emerald-400 hover:bg-emerald-500/10'
                                : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                            }`}
                            title={isEnabled ? 'Pause Automation' : 'Activate Automation'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Duplicate */}
                          <button
                            onClick={() => handleDuplicate(rule.id, rule.name)}
                            disabled={duplicatingId === rule.id}
                            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            title="Duplicate Rule"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => setEditingRule(rule)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                            title="Edit Rule Configuration"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(rule.id, rule.name)}
                            disabled={deletingId === rule.id}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXECUTION AUDIT LOGS */}
      {activeTab === 'executions' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#111827] border border-white/[0.08] overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Rule Name</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Triggered By</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Executed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No executions recorded yet. Triggers will log real-time audit records as events occur.
                    </td>
                  </tr>
                ) : (
                  executions.map((exec) => {
                    const isSuccess = exec.status === 'success';
                    const isSkipped = exec.status === 'skipped';
                    return (
                      <tr key={exec.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-3 font-semibold text-white">
                          {exec.ruleName || 'Automation Pipeline'}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isSuccess
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : isSkipped
                                ? 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : isSkipped ? <Clock className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span className="capitalize">{exec.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                          {exec.triggeredBy || 'system_event'}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                          {exec.executionTime || 12} ms
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {new Date(exec.executedAt || exec.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATES GALLERY */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <span className="font-bold text-white">Pre-Built Automation Blueprints</span>
                <p className="text-[11px] text-purple-300/80">Instantly deploy battle-tested workflow automations with a single click.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="p-5 rounded-2xl bg-[#111827] border border-white/[0.08] hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4 shadow-lg"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20 font-mono">
                      {tpl.category}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">1-Click Ready</span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{tpl.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{tpl.description}</p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 font-mono">
                    WHEN <span className="text-purple-400 font-semibold">{tpl.triggerType}</span>
                  </div>

                  {currentRole === 'admin' && (
                    <button
                      onClick={() => handleInstallTemplate(tpl.id, tpl.name)}
                      disabled={installingTemplateId === tpl.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{installingTemplateId === tpl.id ? 'Deploying...' : 'Install Blueprint'}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Modals */}
      <CreateAutomationModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {editingRule && (
        <EditAutomationModal
          isOpen={true}
          rule={editingRule}
          onClose={() => setEditingRule(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};
