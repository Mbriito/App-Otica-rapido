import { extractBearerToken, revokeAdminToken } from '../../server/adminAuth.ts';
import { sendJson, type VercelLikeRequest, type VercelLikeResponse } from '../../server/vercelHttp.ts';

export default function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Método não permitido.' });
    return;
  }

  const token = extractBearerToken(req.headers.authorization);
  revokeAdminToken(token);
  sendJson(res, 200, { ok: true });
}
