import type { IncomingMessage, ServerResponse } from 'http';

export interface VercelLikeRequest extends IncomingMessage {
  body?: unknown;
}

export interface VercelLikeResponse extends ServerResponse {
  status?: (code: number) => VercelLikeResponse;
  json?: (body: unknown) => void;
}

export function sendJson(res: VercelLikeResponse, statusCode: number, payload: unknown): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

const MAX_BODY_BYTES = 16 * 1024 * 1024; // 16MB

export class HttpBodyError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function readJsonBody(req: VercelLikeRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      throw new HttpBodyError(400, 'Requisição JSON inválida.');
    }
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        reject(
          new HttpBodyError(
            413,
            'O arquivo enviado excede o limite de tamanho aceito pelo servidor. Tente uma foto mais leve.'
          )
        );
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {});
      } catch {
        reject(new HttpBodyError(400, 'Requisição JSON inválida ao enviar os dados.'));
      }
    });

    req.on('error', () => {
      reject(new HttpBodyError(400, 'Falha na leitura do corpo da requisição.'));
    });
  });
}
