import { getRequestListener } from '@hono/node-server';
import { app } from '../backend/src/app';

const listener = getRequestListener(app.fetch);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: any, res: any) {
  return listener(req, res);
}
