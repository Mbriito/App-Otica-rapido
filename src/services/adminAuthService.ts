import { AdminAuthStatus, AdminSession } from '../types';

let inMemoryAdminToken: string | null = null;

export function getInMemoryAdminToken(): string | null {
  return inMemoryAdminToken;
}

export function setInMemoryAdminToken(token: string | null): void {
  inMemoryAdminToken = token;
}

async function parseApiJson<T>(response: Response): Promise<T & { error?: string }> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `Resposta inesperada do servidor de autenticação (HTTP ${response.status}).`
    );
  }
  return (await response.json()) as T & { error?: string };
}

export async function fetchAdminAuthStatus(): Promise<AdminAuthStatus> {
  const response = await fetch('/api/admin/status', {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  const data = await parseApiJson<AdminAuthStatus>(response);
  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível consultar o status de acesso ADM.');
  }
  return data;
}

export async function setupInitialAdmin(params: {
  email: string;
  name: string;
  password: string;
}): Promise<{ token: string; admin: AdminSession }> {
  const response = await fetch('/api/admin/setup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await parseApiJson<{ ok?: boolean; token?: string; admin?: AdminSession }>(response);
  if (!response.ok || !data.token || !data.admin) {
    throw new Error(data.error || 'Não foi possível concluir a configuração inicial do ADM.');
  }

  setInMemoryAdminToken(data.token);
  return { token: data.token, admin: data.admin };
}

export async function loginAdmin(params: {
  email: string;
  password: string;
}): Promise<{ token: string; admin: AdminSession }> {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await parseApiJson<{ ok?: boolean; token?: string; admin?: AdminSession }>(response);
  if (!response.ok || !data.token || !data.admin) {
    throw new Error(data.error || 'Credenciais de administrador inválidas.');
  }

  setInMemoryAdminToken(data.token);
  return { token: data.token, admin: data.admin };
}

export async function verifyCurrentAdminSession(
  tokenOverride?: string | null
): Promise<AdminSession | null> {
  const token = tokenOverride ?? inMemoryAdminToken;
  if (!token) return null;

  try {
    const response = await fetch('/api/admin/session', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      if (!tokenOverride) {
        setInMemoryAdminToken(null);
      }
      return null;
    }
    const data = await parseApiJson<{ authenticated?: boolean; admin?: AdminSession }>(response);
    if (!data.authenticated || !data.admin || data.admin.role !== 'admin') {
      if (!tokenOverride) {
        setInMemoryAdminToken(null);
      }
      return null;
    }
    return data.admin;
  } catch {
    return null;
  }
}

export async function logoutAdmin(): Promise<void> {
  const token = inMemoryAdminToken;
  setInMemoryAdminToken(null);

  if (!token) return;
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    // Ignore network error on logout; local memory token is already cleared
  }
}
