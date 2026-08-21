import React from 'react';

interface UserAvatarProps {
  name: string;
  avatar?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function getUserInitials(name: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatar,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }[size];

  if (avatar && avatar.trim().length > 0) {
    return (
      <img
        src={avatar}
        alt={name}
        className={`${sizeClasses} rounded-full object-cover ring-1 ring-slate-700 ${className}`}
        onError={(e) => {
          // If image fails to load, replace with initials div
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses} rounded-full bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center justify-center select-none uppercase tracking-wider shrink-0 ${className}`}
    >
      {getUserInitials(name)}
    </div>
  );
};
