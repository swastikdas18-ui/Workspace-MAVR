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
          styles: 'bg-purple-500/10 text-purple-300 border-purple-500/20 shadow-[0_0_12px_-3px_rgba(168,85,247,0.25)]',
        };
      case 'employee':
        return {
          label: 'Employee',
          icon: Briefcase,
          styles: 'bg-blue-500/10 text-blue-300 border-blue-500/20 shadow-[0_0_12px_-3px_rgba(59,130,246,0.25)]',
        };
      case 'intern':
        return {
          label: 'Intern',
          icon: GraduationCap,
          styles: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 shadow-[0_0_12px_-3px_rgba(16,185,129,0.25)]',
        };
      case 'guest':
        return {
          label: 'Guest',
          icon: UserRound,
          styles: 'bg-slate-500/10 text-slate-300 border-slate-500/20 shadow-[0_0_12px_-3px_rgba(148,163,184,0.25)]',
        };
      default:
        return {
          label: 'Guest',
          icon: UserRound,
          styles: 'bg-slate-500/10 text-slate-300 border-slate-500/20 shadow-[0_0_12px_-3px_rgba(148,163,184,0.25)]',
        };
    }
  };

  const { label, icon: Icon, styles } = getRoleConfig();

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border tracking-tight uppercase ${sizeClasses[size]} ${styles} ${className}`}
    >
      {showIcon && <Icon className={size === 'sm' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />}
      <span>{label}</span>
    </span>
  );
};
