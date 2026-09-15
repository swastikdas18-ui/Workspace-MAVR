import React from 'react';
import { motion } from 'motion/react';

export interface SectionCardProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  interactive?: boolean;
  onClick?: () => void;
}

export const SectionCard: React.FC<SectionCardProps> = React.memo(({
  header,
  footer,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  interactive = false,
  onClick,
}) => {
  const baseClasses = interactive
    ? 'ui-card-interactive p-5 flex flex-col justify-between group'
    : 'ui-card p-5 flex flex-col justify-between';

  return (
    <motion.div
      whileHover={interactive ? { y: -2 } : undefined}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`${baseClasses} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {header && (
        <div className={`flex items-center justify-between gap-3 pb-3 border-b border-white/[0.04] ${headerClassName}`}>
          {header}
        </div>
      )}

      <div className={`py-3 flex-1 ${bodyClassName}`}>
        {children}
      </div>

      {footer && (
        <div className={`pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs text-slate-400 ${footerClassName}`}>
          {footer}
        </div>
      )}
    </motion.div>
  );
});
SectionCard.displayName = 'SectionCard';
