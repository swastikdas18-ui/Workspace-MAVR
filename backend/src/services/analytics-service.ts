import { AnalyticsRepository, AnalyticsEventName, AnalyticsEvent, EngagementSummary } from '../repositories/analytics-repository';

export class AnalyticsService {
  /**
   * Track an event
   */
  public static async track(
    eventName: AnalyticsEventName,
    workspaceId: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<AnalyticsEvent> {
    return AnalyticsRepository.trackEvent(eventName, workspaceId, userId, metadata);
  }

  /**
   * Get Engagement & Health Metrics Dashboard
   */
  public static async getWorkspaceEngagement(workspaceId: string): Promise<EngagementSummary> {
    return AnalyticsRepository.getEngagementSummary(workspaceId);
  }

  /**
   * Get recent event telemetry
   */
  public static async getRecentEvents(workspaceId: string, limit = 50): Promise<AnalyticsEvent[]> {
    return AnalyticsRepository.getEvents(workspaceId, limit);
  }
}
