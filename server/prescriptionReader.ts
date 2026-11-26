import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
]);

const PRIMARY_PRESCRIPTION_MODEL = 'gemini-4-hydrogen';
const FALLBACK_PRESCRIPTION_MODEL = 'gemini-2.5-flash';
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

function asCleanString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function normalizeEyeData(rawEye: unknown) {
  const eye = (rawEye && typeof rawEye === 'object' ? rawEye : {}) as Record<string, unknown>;
  return {
    spherical: asCleanString(eye.spherical, '0.00').replace(',', '.') || '0.00',
    cylindrical: asCleanString(eye.cylindrical, '0.00').replace(',', '.') || '0.00',
    axis: asCleanString(eye.axis, '0').replace(/\D/g, '').slice(0, 3) || '0',
    dnp: asCleanString(eye.dnp, ''),
    addition: asCleanString(eye.addition, '').replace(',', '.'),
  };
}

function normalizeExtractedPayload(parsed: Record<string, unknown>): Record<string, unknown> {
  return {
    isValidPrescription: Boolean(parsed.isValidPrescription),
    patientName: asCleanString(parsed.patientName, ''),
    doctorName: asCleanString(parsed.doctorName, ''),
    doctorCrm: asCleanString(parsed.doctorCrm, ''),
    date: asCleanString(parsed.date, ''),
    od: normalizeEyeData(parsed.od),
    oe: normalizeEyeData(parsed.oe),
    observation: asCleanString(parsed.observation, ''),
    confidenceNote: asCleanString(parsed.confidenceNote, ''),
  };
}

export async function processPrescriptionRead(rawBody: unknown): Promise<{
  status: number;
  payload: Record<string, unknown>;
}> {
  try {
    const body = (rawBody && typeof rawBody === 'object' ? rawBody : {}) as {
      fileBase64?: unknown;
      mimeType?: unknown;
    };

    const fileBase64 = typeof body.fileBase64 === 'string' ? body.fileBase64 : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';

    if (!fileBase64) {
      return {
        status: 400,
        payload: {
          error: 'Arquivo da receita não enviado. Selecione ou arraste uma foto ou PDF.',
        },
      };
    }

    const normalizedMime = mimeType.toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
      return {
        status: 400,
        payload: {
          error: 'Formato não suportado. Envie uma imagem (JPG, PNG, WEBP) ou arquivo PDF.',
        },
      };
    }

    const cleanBase64 = fileBase64.includes(',')
      ? fileBase64.slice(fileBase64.indexOf(',') + 1).replace(/\s+/g, '')
      : fileBase64.replace(/\s+/g, '');

    if (!cleanBase64 || cleanBase64.length < 16 || !/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
      return {
        status: 400,
        payload: {
          error:
            'O conteúdo do arquivo enviado está vazio ou corrompido. Tente selecionar a imagem ou PDF novamente.',
        },
      };
    }

    if (cleanBase64.length > MAX_BASE64_LENGTH) {
      return {
        status: 413,
        payload: {
          error: 'O arquivo excede o tamanho máximo permitido (10MB). Tente uma foto mais leve.',
        },
      };
    }

    const ai = createGeminiClient();
    if (!ai) {
      return {
        status: 503,
        payload: {
          error:
            'Serviço de leitura automática indisponível no momento (GEMINI_API_KEY não configurada). Você pode preencher os graus manualmente ao lado e salvar normalmente.',
        },
      };
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

    const configuredModel =
      process.env.GEMINI_PRESCRIPTION_MODEL?.trim() || PRIMARY_PRESCRIPTION_MODEL;

    const callModel = (modelName: string, useThinkingConfig: boolean) =>
      ai.models.generateContent({
        model: modelName,
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
          ...(useThinkingConfig
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
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

    const supportsThinking = configuredModel.includes('gemini-4') || configuredModel.includes('gemini-3');

    let response;
    try {
      response = await callModel(configuredModel, supportsThinking);
    } catch (firstErr: unknown) {
      const errObj = firstErr as { status?: number; code?: number; message?: string };
      const status = Number(errObj?.status || errObj?.code);
      const msg = String(errObj?.message || '');

      if (
        (status === 404 || msg.includes('NOT_FOUND')) &&
        configuredModel !== FALLBACK_PRESCRIPTION_MODEL
      ) {
        response = await callModel(FALLBACK_PRESCRIPTION_MODEL, false);
      } else if (status >= 500 || !status) {
        await new Promise((r) => setTimeout(r, 700));
        response = await callModel(configuredModel, supportsThinking);
      } else {
        throw firstErr;
      }
    }

    const rawText = (response.text ?? '').trim();
    const parsed = parseJsonResponseText(rawText);
    if (!parsed) {
      return {
        status: 502,
        payload: {
          error:
            'Não foi possível interpretar o retorno da leitura. Tente enviar uma foto mais nítida ou preencha os campos manualmente.',
        },
      };
    }

    return { status: 200, payload: normalizeExtractedPayload(parsed) };
  } catch (err: unknown) {
    const errObj = err as { message?: string; status?: number; code?: number };
    const msg = String(errObj?.message || '');
    const status = Number(errObj?.status || errObj?.code || 500);

    if (status === 403 || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
      return {
        status: 403,
        payload: {
          error:
            'Chave de API inválida ou sem permissão. Verifique GEMINI_API_KEY nas variáveis de ambiente.',
        },
      };
    }

    if (status === 429 || msg.includes('RESOURCE_EXHAUSTED')) {
      return {
        status: 429,
        payload: {
          error:
            'Limite temporário de leituras atingido. Aguarde alguns instantes e tente novamente.',
        },
      };
    }

    if (status === 404 || msg.includes('NOT_FOUND')) {
      return {
        status: 502,
        payload: {
          error: 'Modelo de leitura óptica temporariamente indisponível. Tente novamente em instantes.',
        },
      };
    }

    console.error('Erro ao ler receita:', err);
    return {
      status: 500,
      payload: {
        error:
          'Erro ao processar a leitura da receita. Verifique se a imagem está nítida ou preencha os dados manualmente ao lado.',
      },
    };
  }
}
