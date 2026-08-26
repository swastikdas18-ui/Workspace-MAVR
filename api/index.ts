import { handle } from 'hono/vercel';
import { getRequestListener } from '@hono/node-server';
import { app } from '../backend/src/app';

export const config = {
  api: {
    bodyParser: false,
  },
};

const webHandler = handle(app);
const nodeListener = getRequestListener(app.fetch);

// Named HTTP method exports for Vercel Serverless / Edge Function dispatch
export const GET = webHandler;
export const POST = webHandler;
export const PUT = webHandler;
export const DELETE = webHandler;
export const PATCH = webHandler;
export const OPTIONS = webHandler;
export const HEAD = webHandler;

export default function handler(req: any, res: any) {
  if (req && res && typeof res.setHeader === 'function') {
    return nodeListener(req, res);
  }
  return webHandler(req);
}
