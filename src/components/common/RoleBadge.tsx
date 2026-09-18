import React from 'react';
import { Shield, Briefcase, GraduationCap, UserRound } from 'lucide-react';
import { UserRole } from '../../types';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({
  role,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const getRoleConfig = () => {
    switch (role) {
      case 'admin':
        return {
          label: 'Admin',
          icon: Shield,
          styles: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-[0_1px_3px_rgba(16,185,129,0.2)]',
        };
      case 'employee':
        return {
          label: 'Employee',
          icon: Briefcase,
          styles: 'bg-sky-500/15 text-sky-300 border-sky-500/30 shadow-[0_1px_3px_rgba(14,165,233,0.2)]',
        };
      case 'intern':
        return {
          label: 'Intern',
          icon: GraduationCap,
          styles: 'bg-teal-500/15 text-teal-300 border-teal-500/30 shadow-[0_1px_3px_rgba(20,184,166,0.2)]',
        };
      case 'guest':
        return {
          label: 'Guest',
          icon: UserRound,
          styles: 'bg-slate-800 text-slate-300 border-slate-700',
        };
      default:
        return {
          label: 'Guest',
          icon: UserRound,
          styles: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  const { label, icon: Icon, styles } = getRoleConfig();

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium ui-mono rounded-[14px] border uppercase ${sizeClasses[size]} ${styles} ${className}`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />}
      <span>{label}</span>
    </span>
  );
};
