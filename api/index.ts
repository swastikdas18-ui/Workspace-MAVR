import { handle } from 'hono/vercel';
import { getRequestListener } from '@hono/node-server';
import { app } from '../backend/src/app';

export const config = {
  api: {
    bodyParser: false,
  },
};

const nodeListener = getRequestListener(app.fetch);
const webHandler = handle(app);

function universalDispatch(req: any, res?: any) {
  if (req && res && typeof res.setHeader === 'function') {
    if (req.originalUrl && req.url !== req.originalUrl) {
      req.url = req.originalUrl;
    }
    return nodeListener(req, res);
  }
  return webHandler(req);
}

// Named HTTP method exports for Vercel Serverless & Edge dispatch
export const GET = universalDispatch;
export const POST = universalDispatch;
export const PUT = universalDispatch;
export const DELETE = universalDispatch;
export const PATCH = universalDispatch;
export const OPTIONS = universalDispatch;
export const HEAD = universalDispatch;

export default universalDispatch;

