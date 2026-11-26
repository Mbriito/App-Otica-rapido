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

export async function readJsonBody(req: VercelLikeRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body) as Record<string, unknown>;
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}
