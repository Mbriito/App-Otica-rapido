import { sendJson, type VercelLikeRequest, type VercelLikeResponse } from '../server/vercelHttp.ts';

export default function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Método não permitido.' });
    return;
  }

  sendJson(res, 200, {
    ok: true,
    service: 'otica-rapido-api',
    runtime: 'vercel',
    timestamp: new Date().toISOString(),
  });
}
