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
          styles: 'bg-amber-100 text-amber-900 border-amber-300/80 shadow-[0_1px_2px_rgba(28,25,23,0.04)]',
        };
      case 'employee':
        return {
          label: 'Employee',
          icon: Briefcase,
          styles: 'bg-blue-50 text-blue-900 border-blue-200 shadow-[0_1px_2px_rgba(28,25,23,0.04)]',
        };
      case 'intern':
        return {
          label: 'Intern',
          icon: GraduationCap,
          styles: 'bg-emerald-50 text-emerald-900 border-emerald-200 shadow-[0_1px_2px_rgba(28,25,23,0.04)]',
        };
      case 'guest':
        return {
          label: 'Guest',
          icon: UserRound,
          styles: 'bg-stone-100 text-stone-700 border-stone-300 shadow-[0_1px_2px_rgba(28,25,23,0.04)]',
        };
      default:
        return {
          label: 'Guest',
          icon: UserRound,
          styles: 'bg-stone-100 text-stone-700 border-stone-300 shadow-[0_1px_2px_rgba(28,25,23,0.04)]',
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
