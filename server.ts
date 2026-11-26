import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const MAX_BASE64_LENGTH = 14 * 1024 * 1024; // ~10MB decoded file

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseJsonResponseText(rawText: string): Record<string, unknown> | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Try next candidate
    }
  }
  return null;
}

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

  apiRouter.post('/prescriptions/read', async (req: Request, res: Response) => {
    try {
      const body = (req.body && typeof req.body === 'object' ? req.body : {}) as {
        fileBase64?: unknown;
        mimeType?: unknown;
      };

      const fileBase64 = typeof body.fileBase64 === 'string' ? body.fileBase64 : '';
      const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';

      if (!fileBase64) {
        res.status(400).json({
          error: 'Arquivo da receita não enviado. Selecione ou arraste uma foto ou PDF.',
        });
        return;
      }

      const normalizedMime = mimeType.toLowerCase().trim();
      if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
        res.status(400).json({
          error: 'Formato não suportado. Envie uma imagem (JPG, PNG, WEBP) ou arquivo PDF.',
        });
        return;
      }

      const cleanBase64 = fileBase64.includes(',')
        ? fileBase64.slice(fileBase64.indexOf(',') + 1).replace(/\s+/g, '')
        : fileBase64.replace(/\s+/g, '');

      if (!cleanBase64 || !/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
        res.status(400).json({
          error: 'O conteúdo do arquivo enviado está corrompido ou inválido. Tente enviar a imagem novamente.',
        });
        return;
      }

      if (cleanBase64.length > MAX_BASE64_LENGTH) {
        res.status(413).json({
          error: 'O arquivo excede o tamanho máximo permitido (10MB). Tente uma foto mais leve.',
        });
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Serviço de leitura óptica indisponível: configure a chave GEMINI_API_KEY em Settings > Secrets.',
        });
        return;
      }

      const systemInstruction = `Você é um especialista óptico e oftalmológico brasileiro responsável por fazer leitura (OCR clínico) de receitas de óculos (imagens ou PDFs, manuscritas ou impressas).
Regras estritas de extração:
1. Leia APENAS os dados reais presentes na imagem/PDF enviada. NUNCA invente nomes, CRM ou graus que não estejam escritos no documento.
2. Se o arquivo não for uma receita oftalmológica/óptica ou estiver totalmente ilegível, defina "isValidPrescription": false e explique o motivo em "confidenceNote".
3. Formate graus esféricos e cilíndricos com sinal (+ ou -) e 2 casas decimais quando numéricos (ex: "-2.25", "+1.50", "-0.75"). Se estiver escrito "Pl", "Plano", "0" ou vazio, use "0.00".
4. Para Eixo (Axis), extraia apenas o número em graus entre 0 e 180 (ex: "170", "10", "0").
5. Para DNP (Distância Nasopupilar) ou DP, extraia o número em mm (ex: "31.5", "32"). Se houver apenas DP total (ex: 64mm), divida igualmente entre OD e OE e informe isso em "observation". Se não constar na receita, deixe vazio "".
6. Para Adição (ADD / Perto): se houver campo explícito "Adição" ou "ADD", extraia com sinal + (ex: "+2.00"). Se houver tabela de "Longe" e "Perto", coloque os graus de "Longe" nos campos principais (spherical/cylindrical/axis) e calcule a adição (Perto - Longe) se aplicável, explicando em "observation". Se for apenas receita de perto sem longe, coloque os graus nos campos principais e informe "Receita somente para perto" em "observation".
7. Para data da receita, converta para o padrão ISO "YYYY-MM-DD". Se não estiver legível, retorne "".
8. Em "confidenceNote", informe em português de forma curta (1 frase) se algum número manuscrito teve baixa legibilidade e precisa de conferência do cliente, ou deixe vazio se a leitura estiver nítida.`;

      const eyeSchema = {
        type: Type.OBJECT,
        properties: {
          spherical: {
            type: Type.STRING,
            description: 'Grau esférico com sinal e 2 casas decimais, ex: -1.75, +2.00, 0.00',
          },
          cylindrical: {
            type: Type.STRING,
            description: 'Grau cilíndrico com sinal e 2 casas decimais, ex: -0.50, 0.00',
          },
          axis: {
            type: Type.STRING,
            description: 'Eixo em graus (0 a 180), apenas número, ex: 170 ou 0',
          },
          dnp: {
            type: Type.STRING,
            description: 'Distância Nasopupilar em mm (ex: 31.5) ou vazio se não constar',
          },
          addition: {
            type: Type.STRING,
            description: 'Adição para perto/multifocal (ex: +1.50) ou vazio se não constar',
          },
        },
        required: ['spherical', 'cylindrical', 'axis', 'dnp', 'addition'],
      };

      const callModel = () =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: normalizedMime === 'image/jpg' ? 'image/jpeg' : normalizedMime,
                  data: cleanBase64,
                },
              },
              {
                text: 'Extraia fielmente todos os dados desta receita oftalmológica (paciente, médico, CRM, data, OD, OE, adição, DNP e observações). Retorne estritamente no JSON estruturado solicitado.',
              },
            ],
          },
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isValidPrescription: {
                  type: Type.BOOLEAN,
                  description: 'true se o documento for uma receita oftalmológica legível',
                },
                patientName: {
                  type: Type.STRING,
                  description: 'Nome completo do paciente conforme escrito na receita',
                },
                doctorName: {
                  type: Type.STRING,
                  description: 'Nome do médico oftalmologista ou optometrista',
                },
                doctorCrm: {
                  type: Type.STRING,
                  description: 'Número de registro CRM/CROO do profissional',
                },
                date: {
                  type: Type.STRING,
                  description: 'Data da receita no formato YYYY-MM-DD ou vazio',
                },
                od: eyeSchema,
                oe: eyeSchema,
                observation: {
                  type: Type.STRING,
                  description:
                    'Observações clínicas, recomendações de lentes ou tipo de uso (longe/perto/multifocal)',
                },
                confidenceNote: {
                  type: Type.STRING,
                  description:
                    'Aviso curto em português caso algum dado precise ser conferido manualmente',
                },
              },
              required: [
                'isValidPrescription',
                'patientName',
                'doctorName',
                'doctorCrm',
                'date',
                'od',
                'oe',
                'observation',
                'confidenceNote',
              ],
            },
          },
        });

      let response;
      try {
        response = await callModel();
      } catch (firstErr: unknown) {
        const errObj = firstErr as { status?: number; code?: number };
        const status = Number(errObj?.status || errObj?.code);
        if (status >= 500 || !status) {
          await new Promise((r) => setTimeout(r, 800));
          response = await callModel();
        } else {
          throw firstErr;
        }
      }

      const rawText = (response.text ?? '').trim();
      const parsed = parseJsonResponseText(rawText);
      if (!parsed) {
        res.status(502).json({
          error:
            'Não foi possível interpretar o retorno da leitura. Tente enviar uma foto mais nítida.',
        });
        return;
      }

      res.status(200).json(parsed);
    } catch (err: unknown) {
      const errObj = err as { message?: string; status?: number; code?: number };
      const msg = String(errObj?.message || '');
      const status = Number(errObj?.status || errObj?.code || 500);

      if (status === 403 || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
        res.status(403).json({
          error:
            'Chave de API inválida ou sem permissão. Verifique GEMINI_API_KEY em Settings > Secrets.',
        });
        return;
      }

      if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error:
            'Limite temporário de leituras atingido. Aguarde alguns instantes e tente novamente.',
        });
        return;
      }

      if (status === 404 || msg.includes('NOT_FOUND')) {
        res.status(502).json({
          error: 'Modelo de leitura óptica temporariamente indisponível. Tente novamente em instantes.',
        });
        return;
      }

      console.error('Erro ao ler receita:', err);
      res.status(500).json({
        error:
          'Erro ao processar a leitura da receita. Verifique se a imagem está nítida e tente novamente.',
      });
    }
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
        error: 'Requisição JSON inválida ao enviar a receita. Tente novamente.',
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
