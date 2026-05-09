import { useAuthStore } from './auth-store';

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit & { idempotencyKey?: string }): Promise<T> {
  const { token, workspaceId } = useAuthStore.getState();
  const headers = new Headers(init?.headers);

  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (workspaceId) headers.set('x-workspace-id', workspaceId);
  headers.set('Content-Type', 'application/json');
  if (init?.idempotencyKey) headers.set('Idempotency-Key', init.idempotencyKey);

  const res = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? safeJson(text) : null;

  if (!res.ok) throw new ApiError('API request failed', res.status, body);
  return body as T;
}

function safeJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get<T>(path: string) {
    return request<T>(path, { method: 'GET' });
  },
  post<T>(path: string, body?: unknown, idempotencyKey?: string) {
    return request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}), idempotencyKey });
  },
  patch<T>(path: string, body?: unknown, idempotencyKey?: string) {
    return request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}), idempotencyKey });
  },
};

