import crypto from 'crypto';

export interface AdminUserPayload {
  email: string;
  name: string;
  role: 'admin';
  authenticatedAt: string;
  expiresAt: string;
}

interface StoredClaimedAdmin {
  email: string;
  name: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

interface TokenPayload {
  sub: string;
  name: string;
  role: 'admin';
  iat: number;
  exp: number;
  jti: string;
}

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const MIN_PASSWORD_LENGTH = 8;

// In-memory runtime fallback for session signing key (never persisted to local files)
const fallbackSigningSecret = crypto.randomBytes(32).toString('hex');

// One-time claimed admin credential (used only when ADMIN_PASSCODE env var is not configured)
let claimedAdmin: StoredClaimedAdmin | null = null;

// In-memory revoked token IDs for explicit logout
const revokedTokenIds = new Set<string>();

function getSigningSecret(): string {
  const envSecret = process.env.ADMIN_SESSION_SECRET?.trim();
  return envSecret && envSecret.length >= 16 ? envSecret : fallbackSigningSecret;
}

function getEnvPasscode(): string {
  return (process.env.ADMIN_PASSCODE || '').trim();
}

function getEnvAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
}

function normalizeEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function sha256Buffer(value: string): Buffer {
  return crypto.createHash('sha256').update(value, 'utf8').digest();
}

function safeEqualStrings(a: string, b: string): boolean {
  const bufA = sha256Buffer(a);
  const bufB = sha256Buffer(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

function hashPasswordScrypt(password: string, saltHex?: string): { salt: string; hash: string } {
  const salt = saltHex || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derived };
}

function verifyPasswordScrypt(password: string, salt: string, expectedHashHex: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function signAdminToken(email: string, name: string): { token: string; admin: AdminUserPayload } {
  const now = Date.now();
  const exp = now + TOKEN_TTL_MS;
  const payload: TokenPayload = {
    sub: email,
    name,
    role: 'admin',
    iat: now,
    exp,
    jti: crypto.randomBytes(12).toString('hex'),
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');

  return {
    token: `${encodedPayload}.${signature}`,
    admin: {
      email,
      name,
      role: 'admin',
      authenticatedAt: new Date(now).toISOString(),
      expiresAt: new Date(exp).toISOString(),
    },
  };
}

export function extractBearerToken(authorizationHeader?: string | string[]): string | null {
  const raw = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  if (!raw || typeof raw !== 'string') return null;
  const match = raw.match(/^Bearer\s+([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/i);
  return match ? match[1] : null;
}

export function verifyAdminToken(token: string | null): AdminUserPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');

  if (!safeEqualStrings(providedSig, expectedSig)) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as Partial<TokenPayload>;

    if (
      decoded.role !== 'admin' ||
      typeof decoded.sub !== 'string' ||
      typeof decoded.exp !== 'number' ||
      typeof decoded.iat !== 'number' ||
      typeof decoded.jti !== 'string'
    ) {
      return null;
    }

    if (revokedTokenIds.has(decoded.jti)) {
      return null;
    }

    if (Date.now() >= decoded.exp) {
      return null;
    }

    return {
      email: decoded.sub,
      name: typeof decoded.name === 'string' && decoded.name ? decoded.name : 'Administrador Ótica Rapido',
      role: 'admin',
      authenticatedAt: new Date(decoded.iat).toISOString(),
      expiresAt: new Date(decoded.exp).toISOString(),
    };
  } catch {
    return null;
  }
}

export function revokeAdminToken(token: string | null): void {
  if (!token) return;
  const parts = token.split('.');
  if (parts.length !== 2) return;
  try {
    const decoded = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString('utf8')
    ) as Partial<TokenPayload>;
    if (typeof decoded.jti === 'string' && decoded.jti) {
      revokedTokenIds.add(decoded.jti);
    }
  } catch {
    // Ignore malformed token on logout
  }
}

export function getAdminAuthStatus() {
  const envPasscode = getEnvPasscode();
  const envEmail = getEnvAdminEmail();

  if (envPasscode) {
    return {
      configured: true,
      requiresSetup: false,
      source: 'env' as const,
      expectedEmailHint: envEmail || 'admin@oticarapido.com.br',
    };
  }

  if (claimedAdmin) {
    return {
      configured: true,
      requiresSetup: false,
      source: 'claimed' as const,
      expectedEmailHint: claimedAdmin.email,
    };
  }

  return {
    configured: false,
    requiresSetup: true,
    source: 'unconfigured' as const,
    expectedEmailHint: envEmail || 'admin@oticarapido.com.br',
  };
}

export function handleAdminSetup(body: Record<string, unknown>): {
  status: number;
  payload: Record<string, unknown>;
} {
  // Always locked when ADMIN_PASSCODE env var is configured or already claimed
  if (getEnvPasscode() || claimedAdmin) {
    return {
      status: 409,
      payload: {
        error: 'O acesso administrativo já está configurado. Faça login com suas credenciais de ADM.',
      },
    };
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  const name =
    typeof body.name === 'string' && body.name.trim()
      ? body.name.trim().slice(0, 80)
      : 'Administrador Ótica Rapido';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      status: 400,
      payload: { error: 'Informe um e-mail administrativo válido.' },
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      status: 400,
      payload: {
        error: `A senha de administrador deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      },
    };
  }

  const { salt, hash } = hashPasswordScrypt(password);
  claimedAdmin = {
    email,
    name,
    salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  };

  const session = signAdminToken(claimedAdmin.email, claimedAdmin.name);
  return {
    status: 201,
    payload: {
      ok: true,
      token: session.token,
      admin: session.admin,
    },
  };
}

export function handleAdminLogin(body: Record<string, unknown>): {
  status: number;
  payload: Record<string, unknown>;
} {
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return {
      status: 400,
      payload: { error: 'Informe o e-mail e a senha de administrador.' },
    };
  }

  const envPasscode = getEnvPasscode();
  const envEmail = getEnvAdminEmail();

  // Configured process.env passcode always takes precedence over any claimed hash
  if (envPasscode) {
    const emailMatches = envEmail ? safeEqualStrings(email, envEmail) : true;
    const passwordMatches = safeEqualStrings(password, envPasscode);

    if (!emailMatches || !passwordMatches) {
      return {
        status: 401,
        payload: { error: 'Credenciais de administrador inválidas. Verifique e-mail e senha.' },
      };
    }

    const session = signAdminToken(envEmail || email, 'Administrador Ótica Rapido');
    return {
      status: 200,
      payload: {
        ok: true,
        token: session.token,
        admin: session.admin,
      },
    };
  }

  if (!claimedAdmin) {
    return {
      status: 409,
      payload: {
        error: 'Nenhum administrador configurado ainda. Conclua a configuração inicial de ADM.',
        requiresSetup: true,
      },
    };
  }

  const emailMatches = safeEqualStrings(email, claimedAdmin.email);
  const passwordMatches = verifyPasswordScrypt(
    password,
    claimedAdmin.salt,
    claimedAdmin.passwordHash
  );

  if (!emailMatches || !passwordMatches) {
    return {
      status: 401,
      payload: { error: 'Credenciais de administrador inválidas. Verifique e-mail e senha.' },
    };
  }

  const session = signAdminToken(claimedAdmin.email, claimedAdmin.name);
  return {
    status: 200,
    payload: {
      ok: true,
      token: session.token,
      admin: session.admin,
    },
  };
}
