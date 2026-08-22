import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { RolePermissions } from '../../lib/auth';

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type PermissionPath = NestedKeyOf<RolePermissions>;

interface CanProps {
  permission: PermissionPath;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({ permission, fallback = null, children }) => {
  const { permissions } = useWorkspace();

  const hasPermission = (): boolean => {
    if (!permissions) return false;
    const parts = (permission as string).split('.');
    let current: any = permissions;
    for (const part of parts) {
      if (current === undefined || current === null) return false;
      current = current[part];
    }
    return Boolean(current);
  };

  if (!hasPermission()) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
