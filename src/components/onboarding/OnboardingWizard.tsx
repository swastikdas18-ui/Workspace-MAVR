import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Circle, ArrowRight, Sparkles, Building2, UserPlus, 
  FolderPlus, CheckSquare, FileUp, Zap, X, ChevronRight, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api } from '../../lib/api';

interface OnboardingStep {
  id: string;
  label: string;
  order: number;
  completed: boolean;
  description: string;
  icon: any;
  targetTab: string;
}

const STEPS_CONFIG: Array<Omit<OnboardingStep, 'completed'>> = [
  {
    id: 'company_info',
    label: 'Company Profile & Info',
    order: 1,
    description: 'Set your organization name, workspace URL slug, and brand identity.',
    icon: Building2,
    targetTab: 'settings',
  },
  {
    id: 'invite_team',
    label: 'Invite Teammates',
    order: 2,
    description: 'Add admins, employees, and interns to collaborate seamlessly.',
    icon: UserPlus,
    targetTab: 'team',
  },
  {
    id: 'create_project',
    label: 'Create First Project',
    order: 3,
    description: 'Structure your work into deliverables, milestones, and roadmaps.',
    icon: FolderPlus,
    targetTab: 'projects',
  },
  {
    id: 'create_task',
    label: 'Create & Assign Task',
    order: 4,
    description: 'Distribute actionable items with due dates, assignees, and priorities.',
    icon: CheckSquare,
    targetTab: 'tasks',
  },
  {
    id: 'upload_document',
    label: 'Upload First Document',
    order: 5,
    description: 'Centralize specifications, brand assets, and team resources.',
    icon: FileUp,
    targetTab: 'documents',
  },
  {
    id: 'enable_automation',
    label: 'Enable Automation Rule',
    order: 6,
    description: 'Streamline workflows with event-driven triggers and actions.',
    icon: Zap,
    targetTab: 'automations',
  },
];

export const OnboardingWizard: React.FC = () => {
  const { setActiveTab, projects, tasks, documents, teams } = useWorkspace();
  const [dismissed, setDismissed] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>(['company_info']);

  // Auto-detect completed steps based on active workspace state
  useEffect(() => {
    let isMounted = true;
    const checkSteps = async () => {
      const completed = ['company_info'];
      if (teams && teams.length > 0) completed.push('invite_team');
      if (projects && projects.length > 0) completed.push('create_project');
      if (tasks && tasks.length > 0) completed.push('create_task');
      if (documents && documents.length > 0) completed.push('upload_document');

      try {
        const autoRes = await api.getAutomations();
        if (autoRes?.rules && autoRes.rules.length > 0) {
          completed.push('enable_automation');
        }
      } catch {
        // Fallback gracefully
      }

      if (isMounted) {
        setCompletedSteps(completed);
      }
    };

    checkSteps();
    return () => {
      isMounted = false;
    };
  }, [projects, tasks, documents, teams]);

  const totalSteps = STEPS_CONFIG.length;
  const completedCount = completedSteps.length;
  const progressPercent = Math.min(100, Math.round((completedCount / totalSteps) * 100));

  // ASCII Progress bar representation
  const totalBlocks = 10;
  const filledBlocks = Math.round((progressPercent / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  const progressBarText = `${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)} ${progressPercent}%`;

  if (dismissed || progressPercent >= 100) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="bg-gradient-to-r from-[#111827] via-[#161F37] to-[#111827] border border-purple-500/30 rounded-2xl p-5 shadow-2xl shadow-purple-950/20 relative overflow-hidden"
    >
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Workspace Activation Wizard
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
              {progressBarText}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Complete the setup milestones below to unlock the full power of Workspace OS for your team.
          </p>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-500 hover:text-slate-300 p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
          title="Dismiss wizard"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar Graphic */}
      <div className="mt-4 space-y-1.5 relative z-10">
        <div className="flex justify-between text-[11px] text-slate-400 font-mono">
          <span>Setup Progress ({completedCount}/{totalSteps} Milestones)</span>
          <span className="font-semibold text-purple-400">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/[0.08]">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 relative z-10">
        {STEPS_CONFIG.map((step) => {
          const isDone = completedSteps.includes(step.id);
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              onClick={() => setActiveTab(step.targetTab)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 text-left group ${
                isDone
                  ? 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50'
                  : 'bg-[#0F172A]/80 border-white/[0.08] hover:border-purple-500/40 hover:bg-[#131E36]'
              }`}
            >
              <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs mt-0.5 ${
                isDone 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 group-hover:text-purple-300 group-hover:bg-purple-500/20 transition-colors'
              }`}>
                {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className={`text-xs font-semibold truncate ${
                    isDone ? 'text-emerald-300 line-through opacity-80' : 'text-slate-200 group-hover:text-white'
                  }`}>
                    {step.order}. {step.label}
                  </h4>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
