import { useState, useEffect, useCallback } from 'react';
import { useRealtimeContext } from './realtime-provider';

export interface ActivityItem {
  id: string;
  workspaceId: string;
  userId: string;
  userName?: string;
  userRole?: string;
  entityType: string;
  entityId: string;
  action: string;
  metadata?: any;
  createdAt: string;
}

export function useActivityFeed(initialActivities: ActivityItem[] = []) {
  const { client } = useRealtimeContext();
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);

  useEffect(() => {
    const unsub = client.on('activity_created', (payload: any) => {
      if (payload) {
        const item: ActivityItem = {
          id: payload.id || `act-${Date.now()}`,
          workspaceId: payload.workspaceId || '',
          userId: payload.userId || '',
          userName: payload.userName,
          userRole: payload.userRole,
          entityType: payload.entityType || 'task',
          entityId: payload.entityId || '',
          action: payload.action || 'created',
          metadata: payload.metadata,
          createdAt: payload.createdAt || new Date().toISOString(),
        };

        setActivities((prev) => [item, ...prev.slice(0, 49)]); // Keep latest 50
      }
    });

    return () => {
      unsub();
    };
  }, [client]);

  const addActivity = useCallback((activity: ActivityItem) => {
    setActivities((prev) => [activity, ...prev]);
  }, []);

  return {
    activities,
    addActivity,
    setActivities,
  };
}
