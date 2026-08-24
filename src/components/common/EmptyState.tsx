import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col items-center justify-center text-center p-12 rounded-2xl bg-[#0F172A]/50 border border-white/[0.08] border-dashed ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 shadow-[0_0_20px_-5px_rgba(124,58,237,0.25)]">
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-400 max-w-sm leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <ActionIcon className="w-4 h-4" />
          <span>{actionLabel}</span>
        </button>
      )}
    </motion.div>
  );
};
