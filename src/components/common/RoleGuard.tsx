import React from 'react';
import { UserRole } from '../../types';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ForbiddenPage } from './ForbiddenPage';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  fallback,
  children,
}) => {
  const { currentRole, currentUser } = useWorkspace();

  if (!currentUser) {
    return null;
  }

  if (!allowedRoles.includes(currentRole)) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
    return (
      <ForbiddenPage
        requiredRole={allowedRoles.join(' / ').toUpperCase()}
        message={`This section is restricted to ${allowedRoles.map((r) => r.toUpperCase()).join(' or ')} accounts.`}
      />
    );
  }

  return <>{children}</>;
};
