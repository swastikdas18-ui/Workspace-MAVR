/**
 * Phase 21D: Global Unified Search v2 Service
 * 
 * Tokenized multi-entity query parser, filter evaluator, and multi-factor ranking engine.
 */

import { inMemoryDb } from '../../packages/database/index.js';

export interface SearchFilterTokens {
  query: string;
  type?: 'task' | 'project' | 'document' | 'crm' | 'user' | 'team' | 'activity';
  assignee?: string;
  status?: string;
  priority?: string;
}

export interface SearchResultItem {
  id: string;
  type: 'task' | 'project' | 'document' | 'crm' | 'user' | 'team' | 'activity';
  title: string;
  subtitle?: string;
  description?: string;
  url?: string;
  score: number;
  metadata?: Record<string, any>;
  createdAt?: Date;
}

export class SearchV2Service {
  /**
   * Parse structured search queries e.g. "type:task status:open migration"
   */
  public static parseQuery(rawQuery: string): SearchFilterTokens {
    let q = rawQuery.trim();
    const result: SearchFilterTokens = { query: '' };

    const typeMatch = q.match(/\btype:([a-z_]+)\b/i);
    if (typeMatch) {
      const t = typeMatch[1].toLowerCase();
      if (['task', 'project', 'document', 'doc', 'crm', 'user', 'team', 'activity', 'log'].includes(t)) {
        result.type = (t === 'doc' ? 'document' : t === 'log' ? 'activity' : t) as any;
      }
      q = q.replace(typeMatch[0], '').trim();
    }

    const assigneeMatch = q.match(/\bassignee:([a-z0-9_\-@\.]+)\b/i);
    if (assigneeMatch) {
      result.assignee = assigneeMatch[1].toLowerCase();
      q = q.replace(assigneeMatch[0], '').trim();
    }

    const statusMatch = q.match(/\bstatus:([a-z0-9_\-]+)\b/i);
    if (statusMatch) {
      result.status = statusMatch[1].toLowerCase();
      q = q.replace(statusMatch[0], '').trim();
    }

    const priorityMatch = q.match(/\bpriority:([a-z]+)\b/i);
    if (priorityMatch) {
      result.priority = priorityMatch[1].toLowerCase();
      q = q.replace(priorityMatch[0], '').trim();
    }

    result.query = q;
    return result;
  }

  /**
   * Execute multi-entity search with scoring and ranking.
   */
  public static async search(options: {
    workspaceId: string;
    userId: string;
    query: string;
    limit?: number;
  }): Promise<{ results: SearchResultItem[]; tokens: SearchFilterTokens; totalCount: number }> {
    const tokens = this.parseQuery(options.query || '');
    const cleanQ = tokens.query.toLowerCase().trim();
    const results: SearchResultItem[] = [];

    const matchesText = (text?: string): { matched: boolean; boost: number } => {
      if (!cleanQ) return { matched: true, boost: 0 };
      if (!text) return { matched: false, boost: 0 };
      const lower = text.toLowerCase();
      if (lower === cleanQ) return { matched: true, boost: 50 };
      if (lower.startsWith(cleanQ)) return { matched: true, boost: 30 };
      if (lower.includes(cleanQ)) return { matched: true, boost: 15 };
      return { matched: false, boost: 0 };
    };

    // 1. Search Tasks
    if (!tokens.type || tokens.type === 'task') {
      for (const t of inMemoryDb.tasks.values()) {
        if (t.workspaceId !== options.workspaceId && t.workspace_id !== options.workspaceId) continue;
        if (tokens.status && t.status !== tokens.status) continue;
        if (tokens.priority && t.priority !== tokens.priority) continue;
        if (tokens.assignee) {
          const aId = (t.assignedTo || t.assigned_to || t.assignee?.name || t.assignee?.id || '').toLowerCase();
          if (!aId.includes(tokens.assignee)) continue;
        }

        const tMatch = matchesText(t.title);
        const dMatch = matchesText(t.description);

        if (tMatch.matched || dMatch.matched || !cleanQ) {
          let score = Math.max(tMatch.boost, dMatch.boost);
          if (t.assignedTo === options.userId || t.assigned_to === options.userId) score += 10;
          results.push({
            id: t.id,
            type: 'task',
            title: t.title,
            subtitle: `Task • ${t.status || 'todo'} • Priority: ${t.priority || 'medium'}`,
            description: t.description,
            score,
            metadata: { status: t.status, priority: t.priority, assignedTo: t.assignedTo || t.assigned_to },
            createdAt: t.createdAt ? new Date(t.createdAt) : undefined,
          });
        }
      }
    }

    // 2. Search Projects
    if (!tokens.type || tokens.type === 'project') {
      for (const p of inMemoryDb.projects.values()) {
        if (p.workspaceId !== options.workspaceId && p.workspace_id !== options.workspaceId) continue;
        if (tokens.status && p.status !== tokens.status) continue;

        const pMatch = matchesText(p.title);
        const dMatch = matchesText(p.description);

        if (pMatch.matched || dMatch.matched || !cleanQ) {
          results.push({
            id: p.id,
            type: 'project',
            title: p.title,
            subtitle: `Project • ${p.category || 'General'} • ${p.status || 'active'}`,
            description: p.description,
            score: Math.max(pMatch.boost, dMatch.boost) + 5,
            metadata: { category: p.category, status: p.status },
            createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
          });
        }
      }
    }

    // 3. Search Documents
    if (!tokens.type || tokens.type === 'document') {
      for (const d of inMemoryDb.documents.values()) {
        if (d.workspaceId !== options.workspaceId && d.workspace_id !== options.workspaceId) continue;

        const nameMatch = matchesText(d.name || d.title);
        const descMatch = matchesText(d.description);

        if (nameMatch.matched || descMatch.matched || !cleanQ) {
          results.push({
            id: d.id,
            type: 'document',
            title: d.name || d.title,
            subtitle: `Document • ${d.fileType || d.type || 'file'} • ${d.size || '120 KB'}`,
            description: d.description,
            score: Math.max(nameMatch.boost, descMatch.boost),
            metadata: { fileType: d.fileType, url: d.url },
            createdAt: d.createdAt ? new Date(d.createdAt) : undefined,
          });
        }
      }
    }

    // 4. Search CRM Records
    if (!tokens.type || tokens.type === 'crm') {
      for (const c of inMemoryDb.crmRecords.values()) {
        if (c.workspaceId !== options.workspaceId && c.workspace_id !== options.workspaceId) continue;
        if (tokens.status && c.stage !== tokens.status) continue;

        const nameMatch = matchesText(c.customerName || c.name);
        const compMatch = matchesText(c.company);

        if (nameMatch.matched || compMatch.matched || !cleanQ) {
          results.push({
            id: c.id,
            type: 'crm',
            title: c.customerName || c.name || 'CRM Lead',
            subtitle: `CRM Lead • ${c.company || 'Enterprise'} • Stage: ${c.stage} • $${c.value || 0}`,
            score: Math.max(nameMatch.boost, compMatch.boost),
            metadata: { stage: c.stage, value: c.value, company: c.company },
            createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
          });
        }
      }
    }

    // 5. Search Users / Members
    if (!tokens.type || tokens.type === 'user') {
      for (const u of inMemoryDb.users.values()) {
        const nameMatch = matchesText(u.name);
        const emailMatch = matchesText(u.email);

        if (nameMatch.matched || emailMatch.matched || !cleanQ) {
          results.push({
            id: u.id,
            type: 'user',
            title: u.name,
            subtitle: `User • ${u.role} • ${u.email}`,
            score: Math.max(nameMatch.boost, emailMatch.boost),
            metadata: { role: u.role, email: u.email },
          });
        }
      }
    }

    // Sort by descending score
    results.sort((a, b) => b.score - a.score);

    const limit = options.limit || 50;
    return {
      results: results.slice(0, limit),
      tokens,
      totalCount: results.length,
    };
  }
}
