import { inMemoryDb } from '../../packages/database';

export interface CalendarEventItem {
  id: string;
  workspaceId: string;
  crmRecordId?: string | null;
  projectId?: string | null;
  title: string;
  description?: string;
  meetingUrl?: string;
  startTime: Date;
  endTime: Date;
  attendees: Array<{ email: string; name?: string; status?: string }>;
  status: 'confirmed' | 'cancelled';
  createdAt: Date;
}

export interface EmailLogItem {
  id: string;
  workspaceId: string;
  crmRecordId?: string | null;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  direction: 'inbound' | 'outbound';
  timestamp: Date;
}

export class IntegrationRepository {
  private static emailLogs: Map<string, EmailLogItem> = new Map();

  /**
   * Schedule or Sync Calendar Event
   */
  public static async createCalendarEvent(data: {
    workspaceId: string;
    crmRecordId?: string | null;
    projectId?: string | null;
    title: string;
    description?: string;
    meetingUrl?: string;
    startTime: Date;
    endTime: Date;
    attendees?: Array<{ email: string; name?: string; status?: string }>;
  }): Promise<CalendarEventItem> {
    const id = `cal-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const event: CalendarEventItem = {
      id,
      workspaceId: data.workspaceId,
      crmRecordId: data.crmRecordId || null,
      projectId: data.projectId || null,
      title: data.title,
      description: data.description || '',
      meetingUrl: data.meetingUrl || `https://meet.google.com/${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`,
      startTime: data.startTime,
      endTime: data.endTime,
      attendees: data.attendees || [],
      status: 'confirmed',
      createdAt: new Date(),
    };

    inMemoryDb.calendarEvents.set(id, event);
    return event;
  }

  /**
   * Get calendar events for CRM lead or workspace
   */
  public static async getEvents(workspaceId: string, crmRecordId?: string): Promise<CalendarEventItem[]> {
    const list: CalendarEventItem[] = [];
    for (const ev of inMemoryDb.calendarEvents.values()) {
      if (ev.workspaceId === workspaceId) {
        if (crmRecordId && ev.crmRecordId !== crmRecordId) continue;
        list.push(ev);
      }
    }
    return list.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Log Inbound or Outbound Email
   */
  public static async logEmail(data: {
    workspaceId: string;
    crmRecordId?: string | null;
    from: string;
    to: string;
    subject: string;
    snippet: string;
    direction: 'inbound' | 'outbound';
  }): Promise<EmailLogItem> {
    const id = `eml-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const email: EmailLogItem = {
      id,
      workspaceId: data.workspaceId,
      crmRecordId: data.crmRecordId || null,
      from: data.from,
      to: data.to,
      subject: data.subject,
      snippet: data.snippet,
      direction: data.direction,
      timestamp: new Date(),
    };

    this.emailLogs.set(id, email);
    return email;
  }

  /**
   * Get email activity thread for CRM lead
   */
  public static async getLeadEmails(workspaceId: string, crmRecordId: string): Promise<EmailLogItem[]> {
    const list: EmailLogItem[] = [];
    for (const e of this.emailLogs.values()) {
      if (e.workspaceId === workspaceId && e.crmRecordId === crmRecordId) {
        list.push(e);
      }
    }
    return list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
