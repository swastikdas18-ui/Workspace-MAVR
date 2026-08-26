import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { SearchService } from '../services/search-service';
import { SearchV2Service } from '../services/search-v2-service';

export const searchRouter = new Hono();

// All search endpoints require authentication and active workspace
searchRouter.use('*', authMiddleware);

/**
 * GET /v2 - Search v2 with tokenized filters (type:, assignee:, status:, priority:)
 */
searchRouter.get('/v2', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'No active workspace.' } }, 404);
    }

    const q = c.req.query('q') || '';
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!, 10) : 50;

    const result = await SearchV2Service.search({
      workspaceId: workspace.id,
      userId: user.id,
      query: q,
      limit,
    });

    return c.json(result, 200);
  } catch (err: any) {
    return c.json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message || 'Search failed' } }, 500);
  }
});

/**
 * GET / - Unified Global Search across Projects, Tasks, Teams, Documents, CRM, Users
 */
searchRouter.get('/', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'No active workspace associated with session.',
          },
        },
        404
      );
    }

    const q = c.req.query('q') || '';
    const page = c.req.query('page');
    const pageSize = c.req.query('pageSize');

    const result = await SearchService.globalSearch(user, workspace.id, q, page as any, pageSize as any);

    return c.json(result, 200);
  } catch (err: any) {
    console.error('[Search API Error]:', err);
    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Failed to perform global search.',
        },
      },
      500
    );
  }
});

/**
 * GET /projects - Search Projects
 */
searchRouter.get('/projects', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'No active workspace associated with session.',
          },
        },
        404
      );
    }

    const q = c.req.query('q') || '';
    const page = c.req.query('page');
    const pageSize = c.req.query('pageSize');

    const result = await SearchService.searchProjects(user, workspace.id, q, page as any, pageSize as any);

    return c.json(result, 200);
  } catch (err: any) {
    console.error('[Search Projects API Error]:', err);
    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Failed to search projects.',
        },
      },
      500
    );
  }
});

/**
 * GET /tasks - Search Tasks
 */
searchRouter.get('/tasks', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'No active workspace associated with session.',
          },
        },
        404
      );
    }

    const q = c.req.query('q') || '';
    const page = c.req.query('page');
    const pageSize = c.req.query('pageSize');

    const result = await SearchService.searchTasks(user, workspace.id, q, page as any, pageSize as any);

    return c.json(result, 200);
  } catch (err: any) {
    console.error('[Search Tasks API Error]:', err);
    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Failed to search tasks.',
        },
      },
      500
    );
  }
});

/**
 * GET /teams - Search Teams
 */
searchRouter.get('/teams', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'No active workspace associated with session.',
          },
        },
        404
      );
    }

    const q = c.req.query('q') || '';
    const page = c.req.query('page');
    const pageSize = c.req.query('pageSize');

    const result = await SearchService.searchTeams(user, workspace.id, q, page as any, pageSize as any);

    return c.json(result, 200);
  } catch (err: any) {
    console.error('[Search Teams API Error]:', err);
    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Failed to search teams.',
        },
      },
      500
    );
  }
});

/**
 * GET /documents - Search Documents
 */
searchRouter.get('/documents', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'No active workspace associated with session.',
          },
        },
        404
      );
    }

    const q = c.req.query('q') || '';
    const page = c.req.query('page');
    const pageSize = c.req.query('pageSize');

    const result = await SearchService.searchDocuments(user, workspace.id, q, page as any, pageSize as any);

    return c.json(result, 200);
  } catch (err: any) {
    console.error('[Search Documents API Error]:', err);
    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Failed to search documents.',
        },
      },
      500
    );
  }
});

/**
 * GET /crm - Search CRM Records
 */
searchRouter.get('/crm', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'No active workspace associated with session.',
          },
        },
        404
      );
    }

    const q = c.req.query('q') || '';
    const page = c.req.query('page');
    const pageSize = c.req.query('pageSize');

    const result = await SearchService.searchCrm(user, workspace.id, q, page as any, pageSize as any);

    return c.json(result, 200);
  } catch (err: any) {
    console.error('[Search CRM API Error]:', err);
    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Failed to search CRM records.',
        },
      },
      500
    );
  }
});

/**
 * GET /users - Search Workspace Users
 */
searchRouter.get('/users', async (c) => {
  try {
    const user = c.get('user');
    const workspace = c.get('workspace');

    if (!workspace) {
      return c.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'No active workspace associated with session.',
          },
        },
        404
      );
    }

    const q = c.req.query('q') || '';
    const page = c.req.query('page');
    const pageSize = c.req.query('pageSize');

    const result = await SearchService.searchUsers(user, workspace.id, q, page as any, pageSize as any);

    return c.json(result, 200);
  } catch (err: any) {
    console.error('[Search Users API Error]:', err);
    return c.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: err.message || 'Failed to search users.',
        },
      },
      500
    );
  }
});
