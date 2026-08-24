import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { CheckCircle2, Circle, ArrowRight, FolderKanban, Users, CheckSquare, DollarSign, FileUp, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionTab: string;
  actionLabel: string;
}

export const OnboardingChecklist: React.FC = () => {
  const { projects, tasks, teams, crmRecords, documents, users, setActiveTab, currentRole } = useWorkspace();
  const [isDismissed, setIsDismissed] = React.useState(() => {
    return localStorage.getItem('ws_onboarding_dismissed') === 'true';
  });

  if (currentRole !== 'admin' || isDismissed) {
    return null;
  }

  const steps: OnboardingStep[] = [
    {
      id: 'step-project',
      title: 'Launch your first Strategic Initiative',
      description: 'Define milestones, timeline, and allocation for your team.',
      completed: projects.length > 0,
      actionTab: 'projects',
      actionLabel: 'Create Project',
    },
    {
      id: 'step-team',
      title: 'Structure Department Pods',
      description: 'Create functional engineering, product, or go-to-market teams.',
      completed: teams.length > 0,
      actionTab: 'teams',
      actionLabel: 'Setup Teams',
    },
    {
      id: 'step-invite',
      title: 'Invite Team Members & Interns',
      description: 'Issue cryptographic invites with role-scoped access controls.',
      completed: users.length > 1,
      actionTab: 'teams',
      actionLabel: 'Invite Members',
    },
    {
      id: 'step-task',
      title: 'Dispatch Engineering Deliverables',
      description: 'Assign priority tasks, set due dates, and track Kanban velocity.',
      completed: tasks.length > 0,
      actionTab: 'tasks',
      actionLabel: 'Create Task',
    },
    {
      id: 'step-crm',
      title: 'Setup Client Revenue Pipeline',
      description: 'Add sales opportunities and track negotiation stages.',
      completed: crmRecords.length > 0,
      actionTab: 'crm',
      actionLabel: 'Add CRM Deal',
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('ws_onboarding_dismissed', 'true');
  };

  // If all steps completed, optionally collapse
  if (completedCount === steps.length) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-[#111827] via-[#0F172A] to-[#1E1B4B] border border-purple-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1 rounded-lg bg-purple-500/20 text-purple-400">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Workspace Activation Checklist ({completedCount}/{steps.length})
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Complete these 5 initial steps to achieve full organization velocity in under 3 minutes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-purple-400">{progressPercent}%</span>
          <button
            onClick={handleDismiss}
            className="text-slate-500 hover:text-slate-300 p-1 transition-colors cursor-pointer"
            title="Dismiss Checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden mb-4">
        <div
          className="bg-gradient-to-r from-[#7C3AED] to-[#A855F7] h-full rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step List */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
        {steps.map((step) => {
          return (
            <div
              key={step.id}
              onClick={() => !step.completed && setActiveTab(step.actionTab)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                step.completed
                  ? 'bg-emerald-500/[0.04] border-emerald-500/20 text-slate-400'
                  : 'bg-[#0F172A] border-white/[0.08] hover:border-purple-500/40 text-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                {step.completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                )}
                <span className={`text-xs font-semibold truncate ${step.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                  {step.title}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                {step.description}
              </p>
              {!step.completed && (
                <div className="mt-2 text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                  <span>{step.actionLabel}</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
