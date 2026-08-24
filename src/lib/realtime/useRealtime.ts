import { useEffect, useCallback } from 'react';
import { useRealtimeContext } from './realtime-provider';
import { RealtimeEventHandler } from './websocket-client';

/**
 * General hook to subscribe to any real-time event
 */
export function useRealtime<T = any>(
  eventType: string,
  handler: RealtimeEventHandler<T>,
  deps: any[] = []
) {
  const { client, isConnected } = useRealtimeContext();

  const savedHandler = useCallback(handler, deps);

  useEffect(() => {
    const unsub = client.on<T>(eventType, savedHandler);
    return unsub;
  }, [client, eventType, savedHandler]);

  const send = useCallback(
    (msg: any) => {
      return client.send(msg);
    },
    [client]
  );

  return { isConnected, send };
}
