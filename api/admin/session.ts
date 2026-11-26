import { extractBearerToken, verifyAdminToken } from '../../server/adminAuth.ts';
import { sendJson, type VercelLikeRequest, type VercelLikeResponse } from '../../server/vercelHttp.ts';

export default function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Método não permitido.' });
    return;
  }

  const token = extractBearerToken(req.headers.authorization);
  const admin = verifyAdminToken(token);
  if (!admin) {
    sendJson(res, 401, {
      authenticated: false,
      error: 'Sessão administrativa ausente ou expirada. Faça login como ADM.',
    });
    return;
  }

  sendJson(res, 200, {
    authenticated: true,
    admin,
  });
}
