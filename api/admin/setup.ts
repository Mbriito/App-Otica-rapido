import { handleAdminSetup } from '../../server/adminAuth.ts';
import {
  readJsonBody,
  sendJson,
  type VercelLikeRequest,
  type VercelLikeResponse,
} from '../../server/vercelHttp.ts';

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Método não permitido.' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const result = handleAdminSetup(body);
    sendJson(res, result.status, result.payload);
  } catch {
    sendJson(res, 400, { error: 'Requisição JSON inválida.' });
  }
}
