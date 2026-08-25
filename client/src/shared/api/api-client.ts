export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly body?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiClientOptions {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized?: () => void;
  fetcher?: typeof fetch;
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const fetcher = options.fetcher ?? fetch;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = options.getToken();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetcher(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
      ...init, headers: { ...headers, ...(init.headers as Record<string, string> | undefined) },
    });
    const body = response.status === 204 ? undefined : await response.json().catch(() => undefined) as unknown;
    if (!response.ok) {
      if (response.status === 401) options.onUnauthorized?.();
      const record = body && typeof body === 'object' ? body as Record<string, unknown> : undefined;
      const rawMessage = record?.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join('; ') : typeof rawMessage === 'string' ? rawMessage : `HTTP ${response.status}`;
      throw new ApiError(response.status, message, body);
    }
    return body as T;
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
    put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
    download: async (path: string) => {
      const token = options.getToken();
      const headers: Record<string, string> = { Accept: 'application/pdf' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetcher(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, { headers });
      if (!response.ok) {
        if (response.status === 401) options.onUnauthorized?.();
        throw new ApiError(response.status, `HTTP ${response.status}`);
      }
      return response.blob();
    },
  };
}
