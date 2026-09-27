import React from 'react';
import { UserRole } from '../../types';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ForbiddenPage } from './ForbiddenPage';

interface RequireRoleProps {
  role: UserRole | UserRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ role, fallback, children }) => {
  const { currentRole, currentUser } = useWorkspace();
  const requiredRoles = Array.isArray(role) ? role : [role];

  if (!currentUser) {
    return null;
  }

  if (!requiredRoles.includes(currentRole)) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
    return (
      <ForbiddenPage
        requiredRole={requiredRoles.map((r) => r.toUpperCase()).join(' / ')}
        message={`Access denied. Your current role is ${currentRole.toUpperCase()}, but this resource requires ${requiredRoles.map((r) => r.toUpperCase()).join(' or ')}.`}
      />
    );
  }

  return <>{children}</>;
};
