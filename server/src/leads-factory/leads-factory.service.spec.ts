import { LeadsFactoryService } from './leads-factory.service';
import { ProviderException } from './provider.exception';

const config = { get: (key: string, fallback?: string) => key === 'LEADS_FACTORY_TOKEN' ? 'test-token' : fallback };

describe('LeadsFactoryService contract', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates a project with the documented body and does not retry POST', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 42 }), { status: 200 }));
    const service = new LeadsFactoryService(config as never);
    await expect(service.createProject({ name: 'Москва/Project', type: 7, regions: [77], status: 'pause', default_limit: 5 })).resolves.toEqual({ id: 42 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls.at(0)!;
    expect(call[0].toString()).toContain('/crm/open-api/projects');
    expect(JSON.parse(String(call[1]?.body))).toEqual({ name: 'Москва/Project', type: 7, regions: [77], status: 'pause', default_limit: 5 });
  });

  it('never blindly retries project creation after a 504', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 504 }));
    const service = new LeadsFactoryService(config as never);
    await expect(service.createProject({ name: 'X', type: 1, regions: [1], status: 'pause', default_limit: 5 })).rejects.toBeInstanceOf(ProviderException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('applies the documented default source-cabinet settings', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify('ok'), { status: 200 }));
    const service = new LeadsFactoryService(config as never);
    await service.updateProjectInfo(42, {
      check_domains_in_v_kazakh: false, parse_domains: false, parse_phones: false, parse_ishod: true,
      parse_ceo: false, parse_google: false, parse_manual: false, parse_maps: false,
      limit_autochange: false, max_limit: 100, default_limit: 5, ishod_phones_count: 1,
      vdl_autonorms: true,
    });
    expect(fetchMock.mock.calls.at(0)![0].toString()).toContain('/vdl/api/projects/info/42');
    expect(fetchMock.mock.calls.at(0)![1]?.method).toBe('PATCH');
    expect(JSON.parse(String(fetchMock.mock.calls.at(0)![1]?.body))).toEqual({
      check_domains_in_v_kazakh: false, parse_domains: false, parse_phones: false, parse_ishod: true,
      parse_ceo: false, parse_google: false, parse_manual: false, parse_maps: false,
      limit_autochange: false, max_limit: 100, default_limit: 5, ishod_phones_count: 1,
      vdl_autonorms: true,
    });
  });

  it('bulk tag update chunks tag_ids into batches of 1000 (provider rejects больше 1000 за раз)', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const service = new LeadsFactoryService(config as never);
    const tagIds = Array.from({ length: 1500 }, (_, i) => i + 1);
    await service.updateTags(tagIds, true, 5);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]![1]?.body));
    expect(firstBody.tag_ids).toHaveLength(1000);
    expect(secondBody.tag_ids).toHaveLength(500);
    expect(firstBody.update_tag_schema).toEqual({ norm_work: true, limit: 5 });
  });

  it('does not call the provider for an empty tag list', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const service = new LeadsFactoryService(config as never);
    await service.updateTags([], false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads an existing project by its internal provider ID', async () => {
    const project = { id: 22931, name: 'Проект LF', sphere: 'Медицина', status: 'active', timezone: 3,
      numbers: false, vdl: true, prozvon_base: false };
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(project), { status: 200 }));
    await expect(new LeadsFactoryService(config as never).getProject(22931)).resolves.toEqual(project);
    expect(fetchMock.mock.calls.at(0)![0].toString()).toContain('/crm/open-api/projects/22931');
    expect(fetchMock.mock.calls.at(0)![1]?.method).toBe('GET');
  });

  it('updates every provider-backed project setting with documented fields', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await new LeadsFactoryService(config as never).updateProjectSettings(42, {
      isActive: true, timezoneOffset: 4, uploadsEnabled: false, callsEnabled: true, activeToday: true,
    });
    expect(fetchMock.mock.calls.at(0)![0].toString()).toContain('/crm/open-api/projects/42');
    expect(JSON.parse(String(fetchMock.mock.calls.at(0)![1]?.body))).toEqual({
      status: 'active', timezone: 4, work_client_status: 'stop', call_center_status: 'active',
    });
  });

  it('globally pauses both procurement and calls when the project cannot operate', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await new LeadsFactoryService(config as never).updateProjectSettings(42, {
      isActive: true, timezoneOffset: 3, uploadsEnabled: true, callsEnabled: true, activeToday: false,
    });
    expect(JSON.parse(String(fetchMock.mock.calls.at(0)![1]?.body))).toEqual({
      status: 'pause', timezone: 3, work_client_status: 'stop', call_center_status: 'pause_daily',
    });
  });

  it('changes only the explicitly toggled provider process', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await new LeadsFactoryService(config as never).updateProjectProcesses(42, { callsEnabled: false });
    expect(JSON.parse(String(fetchMock.mock.calls.at(0)![1]?.body))).toEqual({ call_center_status: 'pause_daily' });
  });

  it('includes the global provider status in a scheduled shutdown', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await new LeadsFactoryService(config as never).updateProjectSchedule(42, false, { uploadsEnabled: true, callsEnabled: true });
    expect(JSON.parse(String(fetchMock.mock.calls.at(0)![1]?.body))).toEqual({
      status: 'pause', work_client_status: 'stop', call_center_status: 'pause_daily',
    });
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

  it('loads the complete provider region dictionary', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      regions: [{ region_id: 77, region_name: 'Москва' }],
    }), { status: 200 }));
    await expect(new LeadsFactoryService(config as never).getAvailableRegions())
      .resolves.toEqual({ regions: [{ region_id: 77, region_name: 'Москва' }] });
    expect(fetchMock.mock.calls.at(0)![0].toString()).toContain('/vdl/api/regions/avaliable_regions');
  });
});
