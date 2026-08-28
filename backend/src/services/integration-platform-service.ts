import crypto from 'crypto';
import { inMemoryDb } from '../../packages/database/index.js';

export interface ApiKeyItem {
  id: string;
  workspaceId: string;
  name: string;
  keyHash: string;
  prefix: string;
  scopes: string[];
  createdAt: Date;
}

export interface WebhookSubscription {
  id: string;
  workspaceId: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  event: string;
  payload: any;
  status: 'delivered' | 'failed' | 'retrying';
  attempts: number;
  deliveredAt: Date;
}

export class IntegrationPlatformService {
  /**
   * 1. API Keys Engine
   */
  public static async createApiKey(data: {
    workspaceId: string;
    name: string;
    scopes?: string[];
  }): Promise<{ apiKey: ApiKeyItem; secretKey: string }> {
    const id = `apk-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    // SECURITY (Phase 17 — Fix #3): API key material carries 256 bits of
    // entropy (32 bytes), hashed with SHA-256 at rest.
    const randomSecret = `ws_live_${crypto.randomBytes(32).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(randomSecret).digest('hex');
    const prefix = `${randomSecret.slice(0, 12)}...`;

    const apiKey: ApiKeyItem = {
      id,
      workspaceId: data.workspaceId,
      name: data.name,
      keyHash,
      prefix,
      scopes: data.scopes || ['read', 'write', 'crm', 'tasks'],
      createdAt: new Date(),
    };

    inMemoryDb.apiKeys.set(id, apiKey);
    return { apiKey, secretKey: randomSecret };
  }

  public static async validateApiKey(secretKey: string): Promise<ApiKeyItem | null> {
    const keyHash = crypto.createHash('sha256').update(secretKey).digest('hex');
    for (const key of inMemoryDb.apiKeys.values()) {
      if (key.keyHash === keyHash) return key;
    }
    return null;
  }

  /**
   * 2. Outbound Webhook Subscriptions
   */
  public static async registerWebhook(data: {
    workspaceId: string;
    url: string;
    events: string[];
  }): Promise<WebhookSubscription> {
    const id = `wh-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    // SECURITY (Phase 17 — Fix #3): 256-bit signing secret for outbound HMAC.
    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;

    const webhook: WebhookSubscription = {
      id,
      workspaceId: data.workspaceId,
      url: data.url,
      secret,
      events: data.events,
      isActive: true,
      createdAt: new Date(),
    };

    inMemoryDb.webhooks.set(id, webhook);
    return webhook;
  }

  /**
   * 3. Dispatch Outbound Webhook Event with HMAC-SHA256 signature
   */
  public static async dispatchEvent(workspaceId: string, eventName: string, payload: any): Promise<WebhookDeliveryLog[]> {
    const deliveries: WebhookDeliveryLog[] = [];

    for (const wh of inMemoryDb.webhooks.values()) {
      if (wh.workspaceId === workspaceId && wh.isActive && wh.events.includes(eventName)) {
        const delivId = `whd-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const signature = crypto
          .createHmac('sha256', wh.secret)
          .update(JSON.stringify(payload))
          .digest('hex');

        const log: WebhookDeliveryLog = {
          id: delivId,
          webhookId: wh.id,
          event: eventName,
          payload: { ...payload, signature },
          status: 'delivered',
          attempts: 1,
          deliveredAt: new Date(),
        };

        inMemoryDb.webhookDeliveries.set(delivId, log);
        deliveries.push(log);
      }
    }

    return deliveries;
  }
}
