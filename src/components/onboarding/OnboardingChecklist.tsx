import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { 
  CheckCircle2, Circle, ArrowRight, FolderKanban, Users, 
  CheckSquare, DollarSign, FileUp, Sparkles, X, Trophy, BookOpen, Clock, Calendar, ShieldCheck
} from 'lucide-react';
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

  // Extended Onboarding v2 Steps
  const steps: OnboardingStep[] = [
    {
      id: 'step-project',
      title: '1. Create First Project',
      description: 'Define your business roadmap, status, and department milestones.',
      completed: projects.length > 0,
      actionTab: 'projects',
      actionLabel: 'Create Project',
    },
    {
      id: 'step-task',
      title: '2. Create First Task',
      description: 'Add Kanban cards with priority tags, assignees, and deadlines.',
      completed: tasks.length > 0,
      actionTab: 'tasks',
      actionLabel: 'Create Task',
    },
    {
      id: 'step-wiki',
      title: '3. Create Wiki Page',
      description: 'Draft interactive company SOPs, specs, or handbooks.',
      completed: false,
      actionTab: 'wiki',
      actionLabel: 'Open Wiki',
    },
    {
      id: 'step-time',
      title: '4. Log First Time Entry',
      description: 'Start live stopwatch or log billable hours for client tasks.',
      completed: false,
      actionTab: 'time',
      actionLabel: 'Time Tracker',
    },
    {
      id: 'step-doc',
      title: '5. Upload Document',
      description: 'Store policies or contracts in the encrypted storage vault.',
      completed: documents.length > 0,
      actionTab: 'documents',
      actionLabel: 'Upload Doc',
    },
    {
      id: 'step-invite',
      title: '6. Invite Team Member',
      description: 'Add employee or intern collaborators with role-scoped security.',
      completed: users.length > 1,
      actionTab: 'teams',
      actionLabel: 'Invite Staff',
    },
    {
      id: 'step-crm',
      title: '7. Create CRM Lead',
      description: 'Track deals, sync Gmail threads, and schedule Google Meet calls.',
      completed: crmRecords.length > 0,
      actionTab: 'crm',
      actionLabel: 'Add Lead',
    },
    {
      id: 'step-portal',
      title: '8. Invite First Client',
      description: 'Grant secure external magic link access for deliverable sign-offs.',
      completed: false,
      actionTab: 'portal',
      actionLabel: 'Client Portal',
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('ws_onboarding_dismissed', 'true');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-2xl p-5 shadow-xl relative overflow-hidden transition-all ${
        progressPercent === 100
          ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/40'
          : 'bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border-blue-500/30'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`p-1 rounded-lg ${progressPercent === 100 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {progressPercent === 100 ? <Trophy className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            </span>
            <h3 className="text-sm font-bold text-white tracking-tight">
              {progressPercent === 100 ? 'Workspace Fully Activated! 🎉' : `New Workspace Activation Checklist (${completedCount}/${steps.length} Complete)`}
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            {progressPercent === 100
              ? 'All 8 core operational milestones completed! Your workspace is ready for high-velocity MSME execution.'
              : 'Complete these core milestones to reach full operational velocity in under 15 minutes.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs font-mono font-bold ${progressPercent === 100 ? 'text-emerald-400' : 'text-blue-400'}`}>
            {progressPercent}%
          </span>
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
      <div className="w-full bg-slate-800/80 h-2 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            progressPercent === 100
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
              : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {steps.map((step) => {
          return (
            <div
              key={step.id}
              onClick={() => !step.completed && setActiveTab(step.actionTab)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                step.completed
                  ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-slate-400'
                  : 'bg-[#0F172A] border-white/[0.08] hover:border-blue-500/50 text-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                {step.completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                )}
                <span className={`text-xs font-semibold truncate ${step.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                  {step.title}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                {step.description}
              </p>
              {!step.completed && (
                <div className="mt-2 text-[10px] text-blue-400 font-semibold flex items-center gap-1">
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
