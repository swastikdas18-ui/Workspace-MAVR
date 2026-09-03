/**
 * Phase 21D: Global Unified Search v2 Service
 * 
 * Tokenized multi-entity query parser, filter evaluator, and multi-factor ranking engine.
 */

import { TaskRepository } from '../repositories/task-repository.js';
import { ProjectRepository } from '../repositories/project-repository.js';
import { DocumentRepository } from '../repositories/document-repository.js';
import { CRMRepository } from '../repositories/crm-repository.js';
import { WorkspaceRepository } from '../repositories/workspace-repository.js';

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

    // 1. Search Tasks via TaskRepository
    if (!tokens.type || tokens.type === 'task') {
      const taskList = await TaskRepository.listTasks(options.workspaceId);
      for (const t of taskList) {
        if (tokens.status && t.status !== tokens.status) continue;
        if (tokens.priority && t.priority !== tokens.priority) continue;
        if (tokens.assignee) {
          const aId = (t.assignedTo || (t as any).assigneeId || (t as any).assignee?.name || (t as any).assignee?.id || '').toLowerCase();
          if (!aId.includes(tokens.assignee)) continue;
        }

        const tMatch = matchesText(t.title);
        const dMatch = matchesText(t.description);

        if (tMatch.matched || dMatch.matched || !cleanQ) {
          let score = Math.max(tMatch.boost, dMatch.boost);
          if (t.assignedTo === options.userId || (t as any).assigneeId === options.userId) score += 10;
          results.push({
            id: t.id,
            type: 'task',
            title: t.title,
            subtitle: `Task • ${t.status || 'todo'} • Priority: ${t.priority || 'medium'}`,
            description: t.description,
            score,
            metadata: { status: t.status, priority: t.priority, assignedTo: t.assignedTo || (t as any).assigneeId },
            createdAt: t.createdAt ? new Date(t.createdAt) : undefined,
          });
        }
      }
    }

    // 2. Search Projects via ProjectRepository
    if (!tokens.type || tokens.type === 'project') {
      const projectList = await ProjectRepository.listProjects(options.workspaceId);
      for (const p of projectList) {
        if (tokens.status && p.status !== tokens.status) continue;

        const pMatch = matchesText(p.title);
        const dMatch = matchesText(p.description || undefined);

        if (pMatch.matched || dMatch.matched || !cleanQ) {
          results.push({
            id: p.id,
            type: 'project',
            title: p.title,
            subtitle: `Project • ${(p as any).category || 'General'} • ${p.status || 'active'}`,
            description: p.description || undefined,
            score: Math.max(pMatch.boost, dMatch.boost) + 5,
            metadata: { category: (p as any).category, status: p.status },
            createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
          });
        }
      }
    }

    // 3. Search Documents via DocumentRepository
    if (!tokens.type || tokens.type === 'document') {
      const docList = await DocumentRepository.listDocuments(options.workspaceId);
      for (const d of docList) {
        const nameMatch = matchesText(d.title);
        const descMatch = matchesText((d as any).description);

        if (nameMatch.matched || descMatch.matched || !cleanQ) {
          results.push({
            id: d.id,
            type: 'document',
            title: d.title,
            subtitle: `Document • ${d.fileType || 'file'} • ${d.fileSize || '120 KB'}`,
            description: (d as any).description,
            score: Math.max(nameMatch.boost, descMatch.boost),
            metadata: { fileType: d.fileType, url: d.fileUrl },
            createdAt: d.createdAt ? new Date(d.createdAt) : undefined,
          });
        }
      }
    }

    // 4. Search CRM Records via CRMRepository
    if (!tokens.type || tokens.type === 'crm') {
      const crmList = await CRMRepository.listRecords(options.workspaceId);
      for (const c of crmList) {
        if (tokens.status && (c as any).stage && (c as any).stage !== tokens.status) continue;
        if (tokens.status && c.status && c.status !== tokens.status) continue;

        const nameMatch = matchesText(c.customerName || (c as any).name);
        const compMatch = matchesText(c.company);

        if (nameMatch.matched || compMatch.matched || !cleanQ) {
          results.push({
            id: c.id,
            type: 'crm',
            title: c.customerName || (c as any).name || 'CRM Lead',
            subtitle: `CRM Lead • ${c.company || 'Enterprise'} • Stage: ${(c as any).stage || c.status} • $${c.dealValue || (c as any).value || 0}`,
            score: Math.max(nameMatch.boost, compMatch.boost),
            metadata: { stage: (c as any).stage || c.status, value: c.dealValue || (c as any).value, company: c.company },
            createdAt: c.createdAt ? new Date(c.createdAt) : undefined,
          });
        }
      }
    }

    // 5. Search Users / Members via WorkspaceRepository
    if (!tokens.type || tokens.type === 'user') {
      const memberList = await WorkspaceRepository.getWorkspaceMembers(options.workspaceId);
      for (const m of memberList) {
        const u = m.user;
        if (!u) continue;
        const nameMatch = matchesText(u.name);
        const emailMatch = matchesText(u.email);

        if (nameMatch.matched || emailMatch.matched || !cleanQ) {
          results.push({
            id: u.id,
            type: 'user',
            title: u.name,
            subtitle: `User • ${u.role || m.role} • ${u.email}`,
            score: Math.max(nameMatch.boost, emailMatch.boost),
            metadata: { role: u.role || m.role, email: u.email },
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
