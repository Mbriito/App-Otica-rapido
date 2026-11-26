import { processPrescriptionRead } from '../../server/prescriptionReader.ts';
import {
  HttpBodyError,
  readJsonBody,
  sendJson,
  type VercelLikeRequest,
  type VercelLikeResponse,
} from '../../server/vercelHttp.ts';

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Método não permitido. Use POST.' });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const result = await processPrescriptionRead(body);
    sendJson(res, result.status, result.payload);
  } catch (err: unknown) {
    if (err instanceof HttpBodyError) {
      sendJson(res, err.status, { error: err.message });
      return;
    }
    sendJson(res, 400, {
      error: 'Requisição JSON inválida ao enviar a receita. Tente novamente.',
    });
  }
}
