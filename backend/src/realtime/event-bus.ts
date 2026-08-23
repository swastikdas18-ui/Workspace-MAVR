import { EventEmitter } from 'events';

export interface RealtimeEvent<T = any> {
  id?: string;
  type: string;
  workspaceId: string;
  targetUserId?: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  timestamp: string;
  payload: T;
  meta?: Record<string, any>;
}

export type EventHandler<T = any> = (event: RealtimeEvent<T>) => void | Promise<void>;

export class EventBusEngine {
  private emitter = new EventEmitter();
  private dailyEventsCount = 0;
  private totalBroadcastCount = 0;
  private eventHistory: RealtimeEvent[] = [];
  private readonly maxHistorySize = 1000;
  private lastResetDate: string = new Date().toISOString().split('T')[0];

  constructor() {
    this.emitter.setMaxListeners(500);
  }

  /**
   * Reset daily counter if day changed
   */
  private checkDayReset() {
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.lastResetDate) {
      this.dailyEventsCount = 0;
      this.lastResetDate = today;
    }
  }

  /**
   * Publish a real-time event to the bus
   */
  public publish<T = any>(eventType: string, event: RealtimeEvent<T>): void {
    this.checkDayReset();
    this.dailyEventsCount++;
    this.totalBroadcastCount++;

    if (!event.id) {
      event.id = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString();
    }

    // Keep history ring buffer
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Emit typed event
    this.emitter.emit(eventType, event);
    // Emit workspace channel event
    if (event.workspaceId) {
      this.emitter.emit(`workspace:${event.workspaceId}`, event);
    }
    // Emit wildcard event
    this.emitter.emit('*', event);
  }

  /**
   * Convenience helper to publish a workspace event
   */
  public publishWorkspaceEvent<T = any>(
    workspaceId: string,
    eventType: string,
    payload: T,
    options?: {
      targetUserId?: string;
      actorId?: string;
      entityType?: string;
      entityId?: string;
      meta?: Record<string, any>;
    }
  ): RealtimeEvent<T> {
    const event: RealtimeEvent<T> = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: eventType,
      workspaceId,
      targetUserId: options?.targetUserId,
      actorId: options?.actorId,
      entityType: options?.entityType,
      entityId: options?.entityId,
      timestamp: new Date().toISOString(),
      payload,
      meta: options?.meta,
    };

    this.publish(eventType, event);
    return event;
  }

  /**
   * Subscribe to specific event type
   */
  public subscribe<T = any>(eventType: string, handler: EventHandler<T>): () => void {
    this.emitter.on(eventType, handler);
    return () => {
      this.emitter.off(eventType, handler);
    };
  }

  /**
   * Subscribe to workspace events
   */
  public subscribeWorkspace<T = any>(workspaceId: string, handler: EventHandler<T>): () => void {
    const channel = `workspace:${workspaceId}`;
    this.emitter.on(channel, handler);
    return () => {
      this.emitter.off(channel, handler);
    };
  }

  /**
   * Subscribe to all events
   */
  public subscribeAll(handler: EventHandler): () => void {
    this.emitter.on('*', handler);
    return () => {
      this.emitter.off('*', handler);
    };
  }

  /**
   * Metric getters
   */
  public getDailyEvents(): number {
    this.checkDayReset();
    return this.dailyEventsCount;
  }

  public getBroadcastCount(): number {
    return this.totalBroadcastCount;
  }

  public getHistory(limit = 50, workspaceId?: string): RealtimeEvent[] {
    if (workspaceId) {
      return this.eventHistory.filter((e) => e.workspaceId === workspaceId).slice(-limit);
    }
    return this.eventHistory.slice(-limit);
  }

  public incrementBroadcastCount(count = 1) {
    this.totalBroadcastCount += count;
  }

  public resetMetrics() {
    this.dailyEventsCount = 0;
    this.totalBroadcastCount = 0;
  }

  public clearHistory() {
    this.eventHistory = [];
  }

  public clear() {
    this.clearHistory();
    this.resetMetrics();
  }
}

export const EventBus = new EventBusEngine();
