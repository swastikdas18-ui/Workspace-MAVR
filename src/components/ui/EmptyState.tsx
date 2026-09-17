import React from 'react';
import { LucideIcon, Plus } from 'lucide-react';
import { motion } from 'motion/react';

export interface EmptyStateProps {
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
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-[24px] bg-[#F5F2EB]/60 border border-[#E8E3DA] border-dashed ${className}`}
    >
      <div className="w-14 h-14 rounded-[20px] bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-800 mb-4 shadow-xs">
        <Icon className="w-7 h-7" />
      </div>

      <h3 className="ui-h3 text-stone-900">{title}</h3>
      <p className="mt-2 ui-body text-stone-500 max-w-sm">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 ui-btn ui-btn-primary cursor-pointer"
        >
          <ActionIcon className="w-4 h-4" />
          <span>{actionLabel}</span>
        </button>
      )}
    </motion.div>
  );
};
