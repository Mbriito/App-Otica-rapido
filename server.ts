import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  extractBearerToken,
  getAdminAuthStatus,
  handleAdminLogin,
  handleAdminSetup,
  revokeAdminToken,
  verifyAdminToken,
} from './server/adminAuth.ts';
import { processPrescriptionRead } from './server/prescriptionReader.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Dedicated /api router: ALWAYS returns application/json and never falls through to SPA HTML
  const apiRouter = express.Router();

  apiRouter.use((_req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  apiRouter.use(express.json({ limit: '20mb' }));

  apiRouter.get('/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'otica-rapido-api',
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================================================
  // ADMIN AUTHENTICATION & ACCESS CONTROL ROUTES
  // ============================================================================
  apiRouter.get('/admin/status', (_req: Request, res: Response) => {
    res.status(200).json(getAdminAuthStatus());
  });

  apiRouter.post('/admin/setup', (req: Request, res: Response) => {
    const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    const result = handleAdminSetup(body);
    res.status(result.status).json(result.payload);
  });

  apiRouter.post('/admin/login', (req: Request, res: Response) => {
    const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
    const result = handleAdminLogin(body);
    res.status(result.status).json(result.payload);
  });

  apiRouter.get('/admin/session', (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    const admin = verifyAdminToken(token);
    if (!admin) {
      res.status(401).json({
        authenticated: false,
        error: 'Sessão administrativa ausente ou expirada. Faça login como ADM.',
      });
      return;
    }
    res.status(200).json({
      authenticated: true,
      admin,
    });
  });

  apiRouter.post('/admin/logout', (req: Request, res: Response) => {
    const token = extractBearerToken(req.headers.authorization);
    revokeAdminToken(token);
    res.status(200).json({ ok: true });
  });

  // ============================================================================
  // PRESCRIPTION READER ROUTE
  // ============================================================================
  apiRouter.post('/prescriptions/read', async (req: Request, res: Response) => {
    const result = await processPrescriptionRead(req.body);
    res.status(result.status).json(result.payload);
  });

  // Catch any unmatched /api/* route with JSON 404 so it NEVER falls back to SPA HTML
  apiRouter.use((req: Request, res: Response) => {
    res.status(404).json({
      error: `Rota de API não encontrada: ${req.method} /api${req.path}`,
    });
  });

  // JSON error handler for body-parser errors (413 Payload Too Large, 400 Invalid JSON, etc.)
  apiRouter.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const errObj = err as { type?: string; status?: number; statusCode?: number };
    const statusCode = Number(errObj?.status || errObj?.statusCode || 500);

    if (errObj?.type === 'entity.too.large' || statusCode === 413) {
      res.status(413).json({
        error:
          'O arquivo enviado excede o limite de tamanho aceito pelo servidor. Envie uma imagem mais leve.',
      });
      return;
    }

    if (errObj?.type === 'entity.parse.failed' || statusCode === 400) {
      res.status(400).json({
        error: 'Requisição JSON inválida. Tente novamente.',
      });
      return;
    }

    console.error('Erro inesperado na API:', err);
    res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
      error: 'Erro interno ao processar a solicitação na API.',
    });
  });

  app.use('/api', apiRouter);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        res.status(404).json({ error: `Rota de API não encontrada: ${req.path}` });
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ótica Rapido server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
