import { handle } from 'hono/vercel';
import { getRequestListener } from '@hono/node-server';
import app, { app as namedApp } from '../backend/src/app';

const honoApp = app || namedApp;

export const config = {
  api: {
    bodyParser: false,
  },
};

const nodeListener = getRequestListener(honoApp.fetch);
const webHandler = handle(honoApp);

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

