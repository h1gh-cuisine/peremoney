import { LeadsFactoryService } from './leads-factory.service';
import { ProviderException } from './provider.exception';

const config = { get: (key: string, fallback?: string) => key === 'LEADS_FACTORY_TOKEN' ? 'test-token' : fallback };

describe('LeadsFactoryService contract', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates a project with the documented body and does not retry POST', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 42 }), { status: 200 }));
    const service = new LeadsFactoryService(config as never);
    await expect(service.createProject({ name: 'Москва/Project', type: 7, regions: [77], status: 'active' })).resolves.toEqual({ id: 42 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls.at(0)!;
    expect(call[0].toString()).toContain('/crm/open-api/projects');
    expect(JSON.parse(String(call[1]?.body))).toEqual({ name: 'Москва/Project', type: 7, regions: [77], status: 'active' });
  });

  it('never blindly retries project creation after a 504', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 504 }));
    const service = new LeadsFactoryService(config as never);
    await expect(service.createProject({ name: 'X', type: 1, regions: [1], status: 'active' })).rejects.toBeInstanceOf(ProviderException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries safe GET requests and strips provider input from 422 details', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('{}', { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: 1, name: 'VDL' }] }), { status: 200 }));
    const service = new LeadsFactoryService(config as never);
    await expect(service.getProjectTypes()).resolves.toEqual({ items: [{ id: 1, name: 'VDL' }] });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ detail: [{ loc: ['body'], msg: 'bad', input: 'secret' }] }), { status: 422 }));
    try { await service.getProjectTypes(); } catch (error) {
      expect((error as ProviderException).providerBody).toEqual({ detail: [{ loc: ['body'], msg: 'bad' }] });
      expect((error as ProviderException).getResponse()).toEqual({
        message: 'Leads Factory отклонил параметры запроса', providerStatus: 422,
        providerDetails: { detail: [{ loc: ['body'], msg: 'bad' }] },
      });
    }
  });

  it.each([
    [[{ id: 1 }]],
    [{ items: [{ id: 1 }], total: 7 }],
    [{ data: [{ id: 1 }], count: 7 }],
    [{ data: { items: [{ id: 1 }], total: 7 } }],
    [{ tags: [{ id: 1 }], total_count: 7 }],
  ])('normalizes provider tag page envelope %#', async (body) => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status: 200 }));
    const result = await new LeadsFactoryService(config as never).getTags(42, { page: 1, startDate: '2026-06-01', endDate: '2026-08-23' });
    expect(result.items).toEqual([{ id: 1 }]);
    expect(result.total).toBe(body && typeof body === 'object' && !Array.isArray(body) ? 7 : 1);
  });

  it('normalizes the live sources/total_count envelope', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ sources: [{ id: 7 }], total_count: 9 }), { status: 200 }));
    await expect(new LeadsFactoryService(config as never).getSources(42, 1)).resolves.toEqual({ items: [{ id: 7 }], total: 9 });
  });

  it.each(['telegram', 'bitrix', 'amocrm', 'email'] as const)('loads %s integration', async (name) => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await new LeadsFactoryService(config as never).getIntegration(55, name);
    expect(fetchMock.mock.calls.at(0)![0].toString()).toContain(`/projects/55/integrations/${name}`);
  });
});
