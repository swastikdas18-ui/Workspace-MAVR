import React, { useState } from 'react';
import { 
  X, Zap, Plus, Trash2, ArrowRight, Bell, CheckSquare, 
  UserCheck, DollarSign, Activity, Sparkles, AlertCircle,
  FileText, FolderPlus, Mail, Globe, MessageSquare, Play, Shield
} from 'lucide-react';
import { api } from '../../lib/api';
import { useWorkspace } from '../../context/WorkspaceContext';

interface CreateAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (rule: any) => void;
  initialTemplate?: any;
}

export const TRIGGER_OPTIONS = [
  { id: 'task_created', label: 'Task Created', entity: 'task', icon: CheckSquare, desc: 'Fires when a new task is added to workspace' },
  { id: 'task_assigned', label: 'Task Assigned', entity: 'task', icon: UserCheck, desc: 'Fires when a task is assigned or reassigned' },
  { id: 'task_started', label: 'Task Started', entity: 'task', icon: Play, desc: 'Fires when task transitions from todo to in_progress' },
  { id: 'task_completed', label: 'Task Completed', entity: 'task', icon: CheckSquare, desc: 'Fires when a task is approved or marked done' },
  { id: 'task_overdue', label: 'Task Overdue', entity: 'task', icon: AlertCircle, desc: 'Fires when a task passes its target due date' },
  { id: 'task_blocked', label: 'Task Blocked', entity: 'task', icon: Shield, desc: 'Fires when an impediment blocks execution' },
  { id: 'project_created', label: 'Project Created', entity: 'project', icon: FolderPlus, desc: 'Fires when a new initiative or roadmap is created' },
  { id: 'project_completed', label: 'Project Completed', entity: 'project', icon: Sparkles, desc: 'Fires when all project tasks reach 100% completion' },
  { id: 'member_joined', label: 'Member Joined', entity: 'team', icon: UserCheck, desc: 'Fires when a new staff member accepts invite' },
  { id: 'document_uploaded', label: 'Document Uploaded', entity: 'document', icon: FileText, desc: 'Fires when a document or handbook is uploaded' },
  { id: 'lead_created', label: 'Lead Created', entity: 'crm', icon: DollarSign, desc: 'Fires when a new sales prospect is created' },
  { id: 'deal_won', label: 'Deal Won', entity: 'crm', icon: DollarSign, desc: 'Fires when a deal transitions to Closed Won' },
];

export const CONDITION_FIELDS = [
  { id: 'priority', label: 'Priority', options: ['low', 'medium', 'high', 'urgent', 'critical'] },
  { id: 'status', label: 'Status', options: ['backlog', 'todo', 'in_progress', 'review', 'done', 'public', 'private'] },
  { id: 'team', label: 'Team', options: ['Engineering', 'Design', 'Sales', 'Operations', 'Marketing'] },
  { id: 'department', label: 'Department', options: ['Engineering', 'Product', 'Sales', 'Executive', 'Support'] },
  { id: 'deal_value', label: 'Deal Value ($)', type: 'number' },
  { id: 'task_count', label: 'Task Count', type: 'number' },
];

export const OPERATOR_OPTIONS = [
  { id: 'equals', label: 'Equals' },
  { id: 'not_equals', label: 'Does Not Equal' },
  { id: 'in', label: 'Is In (comma-separated)' },
  { id: 'gt', label: 'Greater Than (>)' },
  { id: 'gte', label: 'Greater Than or Equal (>=)' },
  { id: 'lt', label: 'Less Than (<)' },
  { id: 'lte', label: 'Less Than or Equal (<=)' },
  { id: 'is_not_empty', label: 'Is Not Empty' },
];

export const ACTION_OPTIONS = [
  { id: 'send_notification', label: 'Send Notification', icon: Bell, desc: 'Deliver an in-app alert to team members or leads' },
  { id: 'send_email', label: 'Send Email', icon: Mail, desc: 'Dispatch transactional alert to external email address' },
  { id: 'create_task', label: 'Create Task', icon: CheckSquare, desc: 'Automatically spawn a follow-up execution task' },
  { id: 'assign_task', label: 'Assign Task', icon: UserCheck, desc: 'Assign task to a specific team member' },
  { id: 'update_status', label: 'Update Status', icon: Activity, desc: 'Update execution status of the target entity' },
  { id: 'create_document', label: 'Create Document', icon: FileText, desc: 'Auto-generate a documentation record' },
  { id: 'create_project', label: 'Create Project', icon: FolderPlus, desc: 'Spin up a new initiative workspace container' },
  { id: 'create_crm_activity', label: 'Create CRM Activity', icon: DollarSign, desc: 'Log note or milestone in CRM pipeline' },
  { id: 'add_comment', label: 'Add Comment', icon: MessageSquare, desc: 'Post automated execution note on the task' },
  { id: 'webhook', label: 'Webhook (HTTP POST)', icon: Globe, desc: 'Post real-time event payload to external webhook URL' },
];

export const CreateAutomationModal: React.FC<CreateAutomationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTemplate,
}) => {
  const { users, addToast } = useWorkspace();
  const [name, setName] = useState(initialTemplate?.name || '');
  const [description, setDescription] = useState(initialTemplate?.description || '');
  const [selectedTrigger, setSelectedTrigger] = useState(initialTemplate?.triggerType || TRIGGER_OPTIONS[0].id);
  const [enabled, setEnabled] = useState(true);

  // Multi-Conditions (IF)
  const [conditions, setConditions] = useState<Array<{ field: string; operator: string; value: any }>>(
    initialTemplate?.conditionConfig || []
  );

  // Multi-Actions (THEN)
  const [actions, setActions] = useState<Array<{ actionType: string; actionConfig: Record<string, any> }>>(
    initialTemplate?.actions || [
      { actionType: 'send_notification', actionConfig: { title: 'Workflow Alert', message: 'Triggered by automation' } }
    ]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentTriggerDef = TRIGGER_OPTIONS.find(t => t.id === selectedTrigger) || TRIGGER_OPTIONS[0];

  const handleAddCondition = () => {
    setConditions(prev => [
      ...prev,
      { field: 'priority', operator: 'equals', value: 'high' }
    ]);
  };

  const handleRemoveCondition = (idx: number) => {
    setConditions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleConditionChange = (idx: number, key: string, val: any) => {
    setConditions(prev => prev.map((c, i) => i === idx ? { ...c, [key]: val } : c));
  };

  const handleAddAction = () => {
    setActions(prev => [
      ...prev,
      { actionType: 'send_notification', actionConfig: { title: 'Workflow Alert', message: 'Automated notification' } }
    ]);
  };

  const handleRemoveAction = (idx: number) => {
    setActions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleActionTypeChange = (idx: number, type: string) => {
    setActions(prev => prev.map((act, i) => {
      if (i !== idx) return act;
      let defaultConfig: Record<string, any> = {};
      if (type === 'send_notification') {
        defaultConfig = { title: 'Workflow Alert', message: 'Automated notification' };
      } else if (type === 'send_email') {
        defaultConfig = { to: 'team@company.com', subject: 'Automated Alert', message: 'System alert' };
      } else if (type === 'create_task') {
        defaultConfig = { title: 'Follow-up Task', priority: 'high', due_in_days: 3 };
      } else if (type === 'assign_task') {
        defaultConfig = { assignedTo: users[0]?.id || 'actor' };
      } else if (type === 'update_status') {
        defaultConfig = { status: 'in_progress' };
      } else if (type === 'create_document') {
        defaultConfig = { title: 'Auto-generated Specification', category: 'Compliance' };
      } else if (type === 'create_project') {
        defaultConfig = { title: 'New Strategic Initiative', budget: '$50,000' };
      } else if (type === 'create_crm_activity') {
        defaultConfig = { name: 'Follow-up Call', stage: 'lead' };
      } else if (type === 'add_comment') {
        defaultConfig = { comment: 'Automated verification check passed.' };
      } else if (type === 'webhook') {
        defaultConfig = { url: 'https://api.external-service.com/webhook' };
      }
      return { actionType: type, actionConfig: defaultConfig };
    }));
  };

  const handleActionConfigChange = (idx: number, field: string, value: any) => {
    setActions(prev => prev.map((act, i) => {
      if (i !== idx) return act;
      return {
        ...act,
        actionConfig: {
          ...act.actionConfig,
          [field]: value,
        },
      };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a rule name.');
      return;
    }
    if (actions.length === 0) {
      setError('Please define at least one action for this rule.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const parsedConditions = conditions.map(c => {
        if (c.operator === 'in' && typeof c.value === 'string') {
          return { ...c, value: c.value.split(',').map((s: string) => s.trim()) };
        }
        return c;
      });

      const res = await api.createAutomation({
        name: name.trim(),
        description: description.trim() || undefined,
        entityType: currentTriggerDef.entity,
        triggerType: selectedTrigger,
        triggerConfig: {},
        conditionConfig: parsedConditions,
        actionType: actions[0].actionType,
        actionConfig: actions[0].actionConfig,
        enabled,
        isActive: enabled,
        actions,
      });

      addToast({
        type: 'success',
        title: 'Automation Rule Created',
        message: `Rule "${name}" is active and monitoring events.`,
      });

      onSuccess(res.rule);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create automation rule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Visual Automation Builder</h2>
              <p className="text-xs text-slate-400">Configure WHEN &rarr; IF &rarr; THEN event execution pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Rule Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Rule Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Escalation on Overdue Work Items"
                className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional purpose summary"
                className="w-full bg-[#1E293B] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* SECTION 1: WHEN (Trigger) */}
          <div className="p-4 rounded-xl bg-[#1E293B]/40 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-wider text-[11px]">
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">WHEN</span>
              <span>Trigger Event Fires</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {TRIGGER_OPTIONS.map((trig) => {
                const isSelected = selectedTrigger === trig.id;
                const Icon = trig.icon;
                return (
                  <button
                    key={trig.id}
                    type="button"
                    onClick={() => setSelectedTrigger(trig.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-500/15 border-purple-500 text-white shadow-lg shadow-purple-500/10'
                        : 'bg-[#1E293B]/70 border-white/5 text-slate-400 hover:border-white/20 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-400' : 'text-slate-400'}`} />
                      <span className="font-semibold text-xs">{trig.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">{trig.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: IF (Multi-Conditions) */}
          <div className="p-4 rounded-xl bg-[#1E293B]/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">IF</span>
                <span>Conditions (Optional Filter Criteria)</span>
              </div>
              <button
                type="button"
                onClick={handleAddCondition}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/20 text-[11px] font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Condition</span>
              </button>
            </div>

            {conditions.length === 0 ? (
              <div className="p-3 text-center border border-dashed border-white/10 rounded-xl text-slate-500 text-xs">
                No filter conditions specified. Rule will execute on all <span className="text-purple-300 font-semibold">{currentTriggerDef.label}</span> events.
              </div>
            ) : (
              <div className="space-y-2.5">
                {conditions.map((cond, idx) => (
                  <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2.5 rounded-xl bg-[#0F172A] border border-white/5">
                    <span className="text-[10px] font-mono text-slate-500 px-1">{idx === 0 ? 'WHERE' : 'AND'}</span>
                    
                    <select
                      value={cond.field}
                      onChange={(e) => handleConditionChange(idx, 'field', e.target.value)}
                      className="bg-[#1E293B] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      {CONDITION_FIELDS.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>

                    <select
                      value={cond.operator}
                      onChange={(e) => handleConditionChange(idx, 'operator', e.target.value)}
                      className="bg-[#1E293B] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      {OPERATOR_OPTIONS.map((op) => (
                        <option key={op.id} value={op.id}>{op.label}</option>
                      ))}
                    </select>

                    {cond.operator !== 'is_not_empty' && (
                      <input
                        type="text"
                        value={cond.value || ''}
                        onChange={(e) => handleConditionChange(idx, 'value', e.target.value)}
                        placeholder="Value (e.g. high, urgent)"
                        className="flex-1 bg-[#1E293B] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(idx)}
                      className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: THEN (Multi-Actions) */}
          <div className="p-4 rounded-xl bg-[#1E293B]/40 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">THEN</span>
                <span>Execute Actions</span>
              </div>
              <button
                type="button"
                onClick={handleAddAction}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Action</span>
              </button>
            </div>

            <div className="space-y-3">
              {actions.map((act, idx) => {
                const actionDef = ACTION_OPTIONS.find(a => a.id === act.actionType) || ACTION_OPTIONS[0];
                return (
                  <div key={idx} className="p-3 rounded-xl bg-[#0F172A] border border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          ACTION #{idx + 1}
                        </span>
                        <select
                          value={act.actionType}
                          onChange={(e) => handleActionTypeChange(idx, e.target.value)}
                          className="bg-[#1E293B] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500"
                        >
                          {ACTION_OPTIONS.map((a) => (
                            <option key={a.id} value={a.id}>{a.label}</option>
                          ))}
                        </select>
                      </div>

                      {actions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAction(idx)}
                          className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Action Dynamic Config Fields */}
                    {act.actionType === 'send_notification' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Notification Title"
                          value={act.actionConfig.title || ''}
                          onChange={(e) => handleActionConfigChange(idx, 'title', e.target.value)}
                          className="bg-[#1E293B] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="text"
                          placeholder="Alert Message"
                          value={act.actionConfig.message || ''}
                          onChange={(e) => handleActionConfigChange(idx, 'message', e.target.value)}
                          className="bg-[#1E293B] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

                    {act.actionType === 'send_email' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="email"
                          placeholder="Recipient Email (e.g. lead@org.io)"
                          value={act.actionConfig.to || ''}
                          onChange={(e) => handleActionConfigChange(idx, 'to', e.target.value)}
                          className="bg-[#1E293B] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="text"
                          placeholder="Subject Line"
                          value={act.actionConfig.subject || ''}
                          onChange={(e) => handleActionConfigChange(idx, 'subject', e.target.value)}
                          className="bg-[#1E293B] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

                    {act.actionType === 'create_task' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Task Title"
                          value={act.actionConfig.title || ''}
                          onChange={(e) => handleActionConfigChange(idx, 'title', e.target.value)}
                          className="bg-[#1E293B] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                        <select
                          value={act.actionConfig.priority || 'high'}
                          onChange={(e) => handleActionConfigChange(idx, 'priority', e.target.value)}
                          className="bg-[#1E293B] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                          <option value="urgent">Urgent Priority</option>
                          <option value="critical">Critical</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Due in Days"
                          value={act.actionConfig.due_in_days || 3}
                          onChange={(e) => handleActionConfigChange(idx, 'due_in_days', Number(e.target.value))}
                          className="bg-[#1E293B] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

                    {act.actionType === 'webhook' && (
                      <input
                        type="url"
                        placeholder="Webhook Target URL (https://...)"
                        value={act.actionConfig.url || ''}
                        onChange={(e) => handleActionConfigChange(idx, 'url', e.target.value)}
                        className="w-full bg-[#1E293B] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <span className="font-semibold text-white">Enable Rule Immediately</span>
              <p className="text-[11px] text-slate-400">Activate event listening as soon as the rule is saved.</p>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>{isSubmitting ? 'Deploying Pipeline...' : 'Deploy Automation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
