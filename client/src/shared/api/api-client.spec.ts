import { ApiError, createApiClient } from './api-client';

describe('frontend API client: auth contract', () => {
  it('добавляет Bearer token и JSON headers', async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));
    const api = createApiClient({ baseUrl: 'http://api.test/api', getToken: () => 'jwt', fetcher });
    await api.get('/auth/me');
    expect(fetcher).toHaveBeenCalledWith('http://api.test/api/auth/me', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer jwt', Accept: 'application/json' }),
    }));
  });

  it('на 401 очищает сессию и возвращает typed error', async () => {
    const onUnauthorized = jest.fn();
    const fetcher = jest.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Сессия истекла' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    }));
    const api = createApiClient({ baseUrl: '/api', getToken: () => 'jwt', onUnauthorized, fetcher });
    await expect(api.get('/auth/me')).rejects.toMatchObject<ApiError>({ status: 401, message: 'Сессия истекла' });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('не ставит Content-Type без body', async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const api = createApiClient({ baseUrl: '/api', getToken: () => null, fetcher });
    await api.get('/health');
    expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty('Content-Type');
  });

  it('скачивает бинарный документ с авторизацией', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    const fetcher = jest.fn().mockResolvedValue(new Response(blob, { status: 200 }));
    const api = createApiClient({ baseUrl: '/api', getToken: () => 'jwt', fetcher });
    await expect(api.download('/invoice.pdf')).resolves.toEqual(blob);
    expect(fetcher).toHaveBeenCalledWith('/api/invoice.pdf', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer jwt' }),
    }));
  });
});
