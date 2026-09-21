import React from 'react';
import { LucideIcon, Plus, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  secondaryIcon?: LucideIcon;
  className?: string;
  /** Use 'compact' inside widget panels; 'default' for full-page states */
  size?: 'default' | 'compact';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
  secondaryLabel,
  onSecondaryAction,
  secondaryIcon: SecondaryIcon = ArrowRight,
  className = '',
  size = 'default',
}) => {
  const isCompact = size === 'compact';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`relative flex flex-col items-center justify-center text-center overflow-hidden
        ${isCompact ? 'p-6 rounded-[16px]' : 'p-8 sm:p-14 rounded-[24px]'}
        bg-[#0F172A]/50 border border-white/[0.07] border-dashed
        ${className}`}
    >
      {/* Subtle dot-grid decorative background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: 'radial-gradient(circle, #B8FF3B 1px, transparent 1px)',
          backgroundSize: isCompact ? '20px 20px' : '28px 28px',
        }}
      />

      {/* Icon container */}
      <div
        className={`relative z-10 flex items-center justify-center rounded-[18px]
          bg-[#B8FF3B]/[0.08] border border-[#B8FF3B]/[0.18] text-[#B8FF3B]
          shadow-[0_0_24px_-4px_rgba(184,255,59,0.15)]
          ${isCompact ? 'w-10 h-10 rounded-[14px] mb-3' : 'w-14 h-14 mb-5'}`}
      >
        <Icon className={isCompact ? 'w-5 h-5' : 'w-7 h-7'} strokeWidth={1.75} />
      </div>

      {/* Title */}
      <h3
        className={`relative z-10 font-heading font-semibold tracking-tight text-white
          ${isCompact ? 'text-sm' : 'text-[1.125rem]'}`}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className={`relative z-10 mt-1.5 text-slate-400 leading-relaxed max-w-xs
          ${isCompact ? 'text-[11px]' : 'text-sm'}`}
      >
        {description}
      </p>

      {/* CTAs */}
      {(actionLabel || secondaryLabel) && (
        <div
          className={`relative z-10 flex items-center gap-3 flex-wrap justify-center
            ${isCompact ? 'mt-4' : 'mt-7'}`}
        >
          {actionLabel && onAction && (
            <button onClick={onAction} className="ui-btn ui-btn-primary">
              <ActionIcon className="w-4 h-4" />
              <span>{actionLabel}</span>
            </button>
          )}
          {secondaryLabel && onSecondaryAction && (
            <button onClick={onSecondaryAction} className="ui-btn ui-btn-secondary">
              <SecondaryIcon className="w-4 h-4" />
              <span>{secondaryLabel}</span>
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};
