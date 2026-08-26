import React, { useState } from 'react';
import { 
  X, Zap, Plus, Trash2, ArrowRight, Bell, CheckSquare, 
  UserCheck, DollarSign, Activity, Sparkles, AlertCircle
} from 'lucide-react';
import { api } from '../../lib/api';
import { useWorkspace } from '../../context/WorkspaceContext';

interface CreateAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (rule: any) => void;
}

export const TRIGGER_OPTIONS = [
  { id: 'task_created', label: 'Task Created', entity: 'task', icon: CheckSquare, desc: 'Fires when a new task is added to workspace' },
  { id: 'task_completed', label: 'Task Completed', entity: 'task', icon: CheckSquare, desc: 'Fires when a task status moves to completed' },
  { id: 'project_created', label: 'Project Created', entity: 'project', icon: Sparkles, desc: 'Fires when a new initiative or roadmap is created' },
  { id: 'document_added', label: 'Document Added', entity: 'document', icon: Sparkles, desc: 'Fires when a document or handbook is uploaded' },
  { id: 'crm_stage_changed', label: 'CRM Stage Changed', entity: 'crm', icon: DollarSign, desc: 'Fires when a lead moves across deal stages' },
];

export const ACTION_OPTIONS = [
  { id: 'send_notification', label: 'Send Notification', icon: Bell, desc: 'Deliver an in-app alert to team members or admins' },
  { id: 'create_task', label: 'Create Task', icon: CheckSquare, desc: 'Automatically spawn a follow-up task' },
  { id: 'assign_user', label: 'Assign User', icon: UserCheck, desc: 'Assign the entity to an operational team member' },
  { id: 'move_crm_stage', label: 'Move CRM Stage', icon: DollarSign, desc: 'Transition lead stage (e.g. to Negotiation or Won)' },
  { id: 'create_activity_log', label: 'Create Activity Log', icon: Activity, desc: 'Record an immutable activity event in organization feed' },
];

export const CreateAutomationModal: React.FC<CreateAutomationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { users, addToast } = useWorkspace();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState(TRIGGER_OPTIONS[0].id);
  const [isActive, setIsActive] = useState(true);
  const [actions, setActions] = useState<Array<{ actionType: string; actionConfig: Record<string, any> }>>([
    { actionType: 'send_notification', actionConfig: { recipient: 'admin', title: 'Automated Alert: {{title}}', message: 'Triggered by {{name}}' } }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentTriggerDef = TRIGGER_OPTIONS.find(t => t.id === selectedTrigger) || TRIGGER_OPTIONS[0];

  const handleAddAction = () => {
    setActions(prev => [
      ...prev,
      { actionType: 'create_activity_log', actionConfig: { action: 'Automated workflow execution' } }
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
        defaultConfig = { recipient: 'admin', title: 'Workflow Alert', message: 'Automated notification' };
      } else if (type === 'create_task') {
        defaultConfig = { title: 'Follow-up Task', priority: 'medium', assignedTo: 'actor' };
      } else if (type === 'assign_user') {
        defaultConfig = { assignedTo: users[0]?.id || 'actor' };
      } else if (type === 'move_crm_stage') {
        defaultConfig = { stage: 'negotiation' };
      } else if (type === 'create_activity_log') {
        defaultConfig = { action: 'Automated activity logged' };
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
      setError('At least one action is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await api.createAutomation({
        name: name.trim(),
        description: description.trim() || undefined,
        entityType: currentTriggerDef.entity,
        triggerType: selectedTrigger,
        isActive,
        actions,
      });

      addToast({
        type: 'success',
        title: 'Automation Created',
        message: `Rule "${name}" has been deployed and stored in PostgreSQL.`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[#0F172A] border border-white/[0.12] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#111827]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Create Automation Rule</h2>
              <p className="text-xs text-slate-400">Configure trigger-action workflow stored in PostgreSQL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Rule Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Notify Admins on Task Completion"
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Description (Optional)</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what this automated workflow accomplishes..."
                className="w-full bg-[#111827] border border-white/[0.08] rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          {/* Section: Trigger */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider font-mono">1. When this trigger occurs</span>
              <span className="text-[10px] text-slate-500 font-mono">Single event trigger</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TRIGGER_OPTIONS.map(trig => {
                const isSel = selectedTrigger === trig.id;
                const TrigIcon = trig.icon;
                return (
                  <button
                    key={trig.id}
                    type="button"
                    onClick={() => setSelectedTrigger(trig.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSel
                        ? 'bg-purple-950/40 border-purple-500/60 text-white shadow-lg shadow-purple-900/20 ring-1 ring-purple-500/40'
                        : 'bg-[#111827] border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.12]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <TrigIcon className={`w-4 h-4 ${isSel ? 'text-purple-400' : 'text-slate-400'}`} />
                      <span className="font-semibold text-xs text-white">{trig.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">{trig.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section: Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider font-mono">2. Then perform these actions</span>
              <button
                type="button"
                onClick={handleAddAction}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-[11px] font-semibold border border-purple-500/20 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Action</span>
              </button>
            </div>

            <div className="space-y-3">
              {actions.map((act, idx) => {
                const actDef = ACTION_OPTIONS.find(a => a.id === act.actionType) || ACTION_OPTIONS[0];

                return (
                  <div key={idx} className="p-4 bg-[#111827] border border-white/[0.08] rounded-xl space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center text-[10px] font-mono font-bold">
                          {idx + 1}
                        </span>
                        <select
                          value={act.actionType}
                          onChange={e => handleActionTypeChange(idx, e.target.value)}
                          className="bg-[#0F172A] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white font-semibold text-xs focus:outline-none"
                        >
                          {ACTION_OPTIONS.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      {actions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAction(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors"
                          title="Remove action"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Dynamic config inputs based on action type */}
                    {act.actionType === 'send_notification' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1">Recipient</label>
                          <select
                            value={act.actionConfig.recipient || 'admin'}
                            onChange={e => handleActionConfigChange(idx, 'recipient', e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/[0.08] rounded-lg p-2 text-white"
                          >
                            <option value="admin">All Admins</option>
                            <option value="actor">Initiating User</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1">Title Template</label>
                          <input
                            type="text"
                            value={act.actionConfig.title || ''}
                            onChange={e => handleActionConfigChange(idx, 'title', e.target.value)}
                            placeholder="Workflow Alert"
                            className="w-full bg-[#0F172A] border border-white/[0.08] rounded-lg p-2 text-white"
                          />
                        </div>
                      </div>
                    )}

                    {act.actionType === 'create_task' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1">Task Title</label>
                          <input
                            type="text"
                            value={act.actionConfig.title || ''}
                            onChange={e => handleActionConfigChange(idx, 'title', e.target.value)}
                            placeholder="Follow-up task"
                            className="w-full bg-[#0F172A] border border-white/[0.08] rounded-lg p-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[11px] mb-1">Assignee</label>
                          <select
                            value={act.actionConfig.assignedTo || 'actor'}
                            onChange={e => handleActionConfigChange(idx, 'assignedTo', e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/[0.08] rounded-lg p-2 text-white"
                          >
                            <option value="actor">Initiating User</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {act.actionType === 'assign_user' && (
                      <div className="pt-1">
                        <label className="block text-slate-400 text-[11px] mb-1">Assign User</label>
                        <select
                          value={act.actionConfig.assignedTo || ''}
                          onChange={e => handleActionConfigChange(idx, 'assignedTo', e.target.value)}
                          className="w-full bg-[#0F172A] border border-white/[0.08] rounded-lg p-2 text-white"
                        >
                          <option value="actor">Initiating User</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {act.actionType === 'move_crm_stage' && (
                      <div className="pt-1">
                        <label className="block text-slate-400 text-[11px] mb-1">Target CRM Stage</label>
                        <select
                          value={act.actionConfig.stage || 'negotiation'}
                          onChange={e => handleActionConfigChange(idx, 'stage', e.target.value)}
                          className="w-full bg-[#0F172A] border border-white/[0.08] rounded-lg p-2 text-white"
                        >
                          <option value="lead">New Lead</option>
                          <option value="contacted">Contacted</option>
                          <option value="proposal">Proposal Sent</option>
                          <option value="negotiation">In Negotiation</option>
                          <option value="won">Closed / Won</option>
                          <option value="lost">Lost</option>
                        </select>
                      </div>
                    )}

                    {act.actionType === 'create_activity_log' && (
                      <div className="pt-1">
                        <label className="block text-slate-400 text-[11px] mb-1">Activity Log Action</label>
                        <input
                          type="text"
                          value={act.actionConfig.action || ''}
                          onChange={e => handleActionConfigChange(idx, 'action', e.target.value)}
                          placeholder="e.g. Automated task audit recorded"
                          className="w-full bg-[#0F172A] border border-white/[0.08] rounded-lg p-2 text-white"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Toggle */}
          <div className="pt-2">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-[#111827] border border-white/[0.06] cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-purple-600 focus:ring-0"
              />
              <div>
                <span className="font-semibold text-white">Enable Rule Immediately</span>
                <p className="text-[11px] text-slate-400">Rule will begin listening for events across the workspace upon creation.</p>
              </div>
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Zap className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'Deploying Rule...' : 'Deploy Automation Rule'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
