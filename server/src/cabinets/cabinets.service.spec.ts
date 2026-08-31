import { Prisma, UserRole } from '@prisma/client';
import { CabinetsService } from './cabinets.service';

describe('CabinetsService', () => {
  const config = { get: () => 'test-secret-at-least-32-characters-long' };
  const cabinet = {
    id: 'cabinet-id', name: 'Test', providerProjectId: 1, type: 'VDL', price: 100,
    isActive: true, contactsVisible: false, sourcesVisible: true,
    scriptVisible: false, financeVisible: true, settingsVisible: false,
    createdAt: new Date(), updatedAt: new Date(),
  };

  it('persists master employees and returns stable name-based IDs', async () => {
    const prisma = { masterManager: {
      create: jest.fn().mockResolvedValue({ name: 'Анна Иванова' }),
      findMany: jest.fn().mockResolvedValue([{ name: 'Анна Иванова', createdAt: new Date() }]),
    } };
    const service = new CabinetsService(prisma as never, {} as never, config as never);

    await expect(service.createManager('  Анна   Иванова  ')).resolves.toEqual({ id: 'Анна Иванова', name: 'Анна Иванова' });
    await expect(service.listManagers()).resolves.toEqual([{ id: 'Анна Иванова', name: 'Анна Иванова' }]);
    expect(prisma.masterManager.create).toHaveBeenCalledWith({ data: { name: 'Анна Иванова' } });
  });

  it('does not delete an employee assigned to a project', async () => {
    const prisma = {
      cabinet: { count: jest.fn().mockResolvedValue(1) },
      masterManager: { deleteMany: jest.fn() },
    };
    const service = new CabinetsService(prisma as never, {} as never, config as never);

    await expect(service.removeManager('Анна')).rejects.toThrow('закреплены проекты');
    expect(prisma.masterManager.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes a project only when the configured secret code matches', async () => {
    const prisma = { cabinet: {
      findUnique: jest.fn().mockResolvedValue({ id: 'cabinet-id' }),
      delete: jest.fn().mockResolvedValue({ id: 'cabinet-id' }),
    } };
    const service = new CabinetsService(prisma as never, {} as never, config as never);

    await expect(service.remove('cabinet-id', 'wrong-code')).rejects.toThrow('Неверный секретный код');
    expect(prisma.cabinet.findUnique).not.toHaveBeenCalled();

    await expect(service.remove('cabinet-id', 'test-secret-at-least-32-characters-long')).resolves.toEqual({ deleted: true });
    expect(prisma.cabinet.delete).toHaveBeenCalledWith({ where: { id: 'cabinet-id' } });
  });

  it('fails closed when project deletion secret is not configured', async () => {
    const prisma = { cabinet: { findUnique: jest.fn(), delete: jest.fn() } };
    const service = new CabinetsService(prisma as never, {} as never, { get: () => undefined } as never);
    await expect(service.remove('cabinet-id', 'anything')).rejects.toThrow('Удаление проектов не настроено');
    expect(prisma.cabinet.findUnique).not.toHaveBeenCalled();
  });

  it('filters project analytics by an inclusive calendar period', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new CabinetsService({ cabinet: { findMany } } as never, {} as never, config as never);

    await service.list({ dateFrom: '2026-08-01', dateTo: '2026-08-25' });

    const select = findMany.mock.calls[0][0].select;
    const range = { gte: new Date('2026-08-01T00:00:00.000Z'), lte: new Date('2026-08-25T23:59:59.999Z') };
    expect(select._count.select.contacts.where.date).toEqual(range);
    expect(select._count.select.leads.where.successDate).toEqual(range);
    expect(select.leads.where.successDate).toEqual(range);
    expect(select.payments.where.paidAt).toEqual(range);
  });

  it('loads provider expenses for the period and calculates lead costs', async () => {
    const prisma = { cabinet: { findMany: jest.fn().mockResolvedValue([{
      id: 'cab', providerProjectId: 22931, users: [], payments: [],
      leads: [{ saleStatus: 'NOT_TARGET' }, { saleStatus: 'BOUGHT' }],
      _count: { contacts: 20, leads: 4 },
    }]) } };
    const provider = { getProjectFinance: jest.fn().mockResolvedValue({
      project_id: 22931, totals: { trati: 1200, success_count: 4 },
    }) };
    const service = new CabinetsService(prisma as never, provider as never, config as never);

    const [result] = await service.list({ dateFrom: '2026-08-01', dateTo: '2026-08-25' });

    expect(provider.getProjectFinance).toHaveBeenCalledWith(22931, { dateFrom: '2026-08-01', dateTo: '2026-08-25' });
    expect(result).toMatchObject({ expenses: 1200, leadCost: 300, targetLeadCost: 400, leadsExported: 4, sales: 1 });
  });

  it('maps and sorts the live region dictionary', async () => {
    const provider = { getAvailableRegions: jest.fn().mockResolvedValue({ regions: [
      { region_id: 78, region_name: ' Санкт-Петербург ' }, { region_id: 77, region_name: 'Москва' },
    ] }) };
    const service = new CabinetsService({} as never, provider as never, config as never);
    await expect(service.providerRegions()).resolves.toEqual([
      { id: 77, name: 'Москва' }, { id: 78, name: 'Санкт-Петербург' },
    ]);
  });

  it('stores direct Telegram credentials encrypted and never returns the token', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = { directIntegration: { findUnique: jest.fn().mockResolvedValue(null), upsert } };
    const service = new CabinetsService(prisma as never, {} as never, config as never);

    const result = await service.updateDirectIntegration(cabinet.id, 'telegram', {
      botToken: '123456789:telegram-secret-token', chatId: '-1001234567890', enabled: true,
    });

    const encrypted = upsert.mock.calls[0][0].create.botTokenEncrypted as string;
    expect(encrypted).not.toContain('telegram-secret-token');
    expect(encrypted.split('.')).toHaveLength(3);
    expect(result).toEqual({ channel: 'telegram', configured: true, enabled: true, chatId: '-1001234567890', hasToken: true });
    expect(JSON.stringify(result)).not.toContain('telegram-secret-token');
  });

  it('supports only direct Telegram and MAX integrations', async () => {
    const service = new CabinetsService({ directIntegration: {} } as never, {} as never, config as never);
    await expect(service.directIntegration(cabinet.id, 'email')).rejects.toThrow('не поддерживается');
  });

  it('never hides dashboard and leads from a limited user', async () => {
    const prisma = { cabinet: { findUnique: jest.fn().mockResolvedValue(cabinet) } };
    const service = new CabinetsService(prisma as never, {} as never, config as never);
    const result = await service.getForUser({
      id: 'user-id', login: 'client', role: UserRole.LIMITED, cabinetId: cabinet.id,
    });
    expect(result.visibleSections).toEqual(['dashboard', 'leads', 'payer', 'sources', 'finance']);
    expect(result.sectionVisibility).toEqual({ contacts: false, sources: true, script: false, finance: true, settings: false });
  });

  it('returns every client section to a full user', async () => {
    const prisma = { cabinet: { findUnique: jest.fn().mockResolvedValue(cabinet) } };
    const service = new CabinetsService(prisma as never, {} as never, config as never);
    const result = await service.getForUser({
      id: 'user-id', login: 'employee', role: UserRole.FULL, cabinetId: cabinet.id,
    });
    expect(result.visibleSections).toContain('settings');
    expect(result.visibleSections).toContain('contacts');
    expect(result.sectionVisibility).toEqual({ contacts: false, sources: true, script: false, finance: true, settings: false });
  });

  it('saves the complete settings form in one cabinet update', async () => {
    const update = jest.fn().mockResolvedValue(cabinet);
    const updateProjectSettings = jest.fn();
    const service = new CabinetsService({ cabinet: { update, findUnique: jest.fn().mockResolvedValue({
      providerProjectId: 42, moneyBalance: 1000, price: 100, totalUnits: 20, usedUnits: 1,
      isActive: true, timezoneOffset: 3, uploadsEnabled: true, callsEnabled: true,
      scheduleDays: [1, 2, 3, 4, 5, 6, 7],
    }) } } as never,
      { updateProjectSettings } as never, config as never);
    await service.updateSettings(cabinet.id, {
      isActive: false, timezoneOffset: 4, uploadsEnabled: false, callsEnabled: true,
      schedulePreset: 'WEEKENDS' as never, scheduleDays: [5, 6], crmIntegration: 'bitrix',
      messengerIntegrations: ['telegram', 'max'], contacts: true, sources: false,
      script: true, finance: false, settings: true,
    });
    expect(update.mock.calls[0][0].data).toEqual(expect.objectContaining({
      isActive: false, timezoneOffset: 4, uploadsEnabled: false, callsEnabled: true,
      schedulePreset: 'WEEKENDS', scheduleDays: [5, 6], crmIntegration: 'bitrix', messengerIntegrations: ['telegram', 'max'],
      contactsVisible: true, sourcesVisible: false, financeVisible: false,
    }));
    expect(updateProjectSettings).toHaveBeenCalledWith(42, expect.objectContaining({
      isActive: false, timezoneOffset: 4, uploadsEnabled: false, callsEnabled: true,
    }));
  });

  it('changes only calls at Leads Factory when only the calls checkbox changes', async () => {
    const update = jest.fn().mockResolvedValue(cabinet);
    const updateProjectProcesses = jest.fn();
    const service = new CabinetsService({ cabinet: { update, findUnique: jest.fn().mockResolvedValue({
      providerProjectId: 42, moneyBalance: 1000, price: 100, totalUnits: 20, usedUnits: 1,
      isActive: true, timezoneOffset: 3, uploadsEnabled: true, callsEnabled: true,
      scheduleDays: [1, 2, 3, 4, 5, 6, 7],
    }) } } as never, { updateProjectProcesses } as never, config as never);

    await service.updateSettings(cabinet.id, {
      isActive: true, timezoneOffset: 3, uploadsEnabled: true, callsEnabled: false,
      schedulePreset: 'EVERYDAY' as never, scheduleDays: [1, 2, 3, 4, 5, 6, 7],
      crmIntegration: '', messengerIntegrations: [], contacts: true, sources: true,
      script: true, finance: true, settings: true,
    });

    expect(updateProjectProcesses).toHaveBeenCalledWith(42, { uploadsEnabled: undefined, callsEnabled: false });
  });

  it('keeps a zero-balance project paused but still saves the rest of the form', async () => {
    const update = jest.fn().mockResolvedValue(cabinet);
    const updateProjectSettings = jest.fn();
    const service = new CabinetsService({ cabinet: { update, findUnique: jest.fn().mockResolvedValue({
      providerProjectId: 42, moneyBalance: 0, price: 100, totalUnits: 10, usedUnits: 10,
      isActive: false, timezoneOffset: 3, uploadsEnabled: true, callsEnabled: true,
      scheduleDays: [1, 2, 3, 4, 5, 6, 7],
    }) } } as never, { updateProjectSettings } as never, config as never);

    const result = await service.updateSettings(cabinet.id, {
      // Draft still asks for "active" (stale/optimistic UI state) while turning uploads off —
      // insufficient balance must not block the uploads change from being saved.
      isActive: true, timezoneOffset: 3, uploadsEnabled: false, callsEnabled: true,
      schedulePreset: 'EVERYDAY' as never, scheduleDays: [1, 2, 3, 4, 5, 6, 7],
      crmIntegration: '', messengerIntegrations: [], contacts: true, sources: true,
      script: true, finance: true, settings: true,
    });

    expect(result).toEqual(expect.objectContaining({
      balanceWarning: expect.stringContaining('недостаточно средств'),
    }));
    expect(update.mock.calls[0][0].data).toEqual(expect.objectContaining({ isActive: false, uploadsEnabled: false }));
    expect(updateProjectSettings).toHaveBeenCalledWith(42, expect.objectContaining({ isActive: false, uploadsEnabled: false }));
  });

  it('allows an empty work-week and pauses the provider project', async () => {
    const update = jest.fn().mockResolvedValue(cabinet);
    const updateProjectSettings = jest.fn();
    const service = new CabinetsService({ cabinet: { update, findUnique: jest.fn().mockResolvedValue({
      providerProjectId: 42, moneyBalance: 1000, price: 100, totalUnits: 20, usedUnits: 1,
      isActive: true, timezoneOffset: 3, uploadsEnabled: true, callsEnabled: true,
      scheduleDays: [1, 2, 3, 4, 5, 6, 7],
    }) } } as never,
      { updateProjectSettings } as never, config as never);
    await service.updateSettings(cabinet.id, {
      isActive: true, timezoneOffset: 3, uploadsEnabled: true, callsEnabled: true,
      schedulePreset: 'WEEKDAYS' as never, scheduleDays: [], crmIntegration: '', messengerIntegrations: [],
      contacts: true, sources: true, script: true, finance: true, settings: true,
    });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ scheduleDays: [] }) }));
    expect(updateProjectSettings).toHaveBeenCalledWith(42, expect.objectContaining({ activeToday: false }));
  });

  it('updates master project fields and hashes a changed client password', async () => {
    const cabinetUpdate = jest.fn().mockResolvedValue({ ...cabinet, isActive: false, timezoneOffset: 3,
      uploadsEnabled: true, callsEnabled: true, scheduleDays: [1, 2, 3, 4, 5, 6, 7],
      moneyBalance: 1000, totalUnits: 10, usedUnits: 0 });
    const userUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const transaction = jest.fn().mockImplementation(async (operations) => Promise.all(operations));
    const updateProjectSettings = jest.fn();
    const service = new CabinetsService({ cabinet: { update: cabinetUpdate }, user: { updateMany: userUpdateMany }, $transaction: transaction } as never,
      { updateProjectSettings } as never, config as never);
    await service.updateMasterProject(cabinet.id, { price: 250, renewalStatus: 'RENEWED' as never, isActive: false, hidden: true, clientPassword: 'NewSecret123!' });
    expect(cabinetUpdate.mock.calls[0][0].data).toEqual(expect.objectContaining({ price: expect.anything(), renewalStatus: 'RENEWED', isActive: false, hidden: true }));
    expect(userUpdateMany.mock.calls[0][0].where).toEqual({ cabinetId: cabinet.id, role: UserRole.LIMITED });
    expect(userUpdateMany.mock.calls[0][0].data.passwordHash).not.toBe('NewSecret123!');
    expect(updateProjectSettings).toHaveBeenCalledWith(1, expect.objectContaining({ isActive: false }));
  });

  it('deduplicates linked Leads Factory project ids when saving "Связанные проекты"', async () => {
    const cabinetUpdate = jest.fn().mockResolvedValue({ ...cabinet, linkedProviderProjectIds: [26416, 22931] });
    const transaction = jest.fn().mockImplementation(async (operations) => Promise.all(operations));
    const service = new CabinetsService({ cabinet: { update: cabinetUpdate }, $transaction: transaction } as never, {} as never, config as never);

    await service.updateMasterProject(cabinet.id, { linkedProviderProjectIds: [26416, 22931, 26416] });

    expect(cabinetUpdate.mock.calls[0][0].data.linkedProviderProjectIds).toEqual([26416, 22931]);
  });

  it('clones internally with fresh users and no copied business metrics', async () => {
    const create = jest.fn().mockResolvedValue({ ...cabinet, id: 'clone', name: 'Clone' });
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = { cabinet: { findUnique: jest.fn().mockResolvedValue({ ...cabinet, sphere: 'Медицина' }) },
      $transaction: (callback: (tx: unknown) => unknown) => callback({ cabinet: { create }, user: { createMany } }) };
    const result = await new CabinetsService(prisma as never, {} as never, config as never).clone(cabinet.id, { name: 'Clone', type: 'VDL' as never, price: 100, managerName: 'Анна' });
    expect(create.mock.calls[0][0].data).toEqual(expect.objectContaining({ name: 'Clone', providerProjectId: 1 }));
    expect(create.mock.calls[0][0].data).not.toHaveProperty('moneyBalance');
    expect(createMany.mock.calls[0][0].data).toHaveLength(2);
    expect(result.credentials.client.password).toBeTruthy();
  });

  it('links a local cabinet to an existing Leads Factory project by provider ID', async () => {
    const create = jest.fn().mockImplementation(({ data }) => ({ ...cabinet, ...data, id: 'linked' }));
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const prisma = { cabinet: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: (callback: (tx: unknown) => unknown) => callback({ cabinet: { create }, user: { createMany } }) };
    const provider = { getProject: jest.fn().mockResolvedValue({ id: 22931, name: 'РФ/Peremoney ЛКП VDL/Медицина/Живой проект', sphere: 'Медицина',
      status: 'active', timezone: 4, numbers: false, vdl: true, prozvon_base: false }) };
    const answers = { sync: jest.fn().mockResolvedValue({ contactCount: 12, leadCount: 3 }) };
    const sources = { sync: jest.fn().mockResolvedValue({ items: [] }) };
    const result = await new CabinetsService(prisma as never, provider as never, config as never, undefined, answers as never, sources as never)
      .linkProviderProject({ providerProjectId: 22931, price: 250, managerName: 'Анна' });
    expect(provider.getProject).toHaveBeenCalledWith(22931);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      name: 'РФ/Peremoney ЛКП VDL/Медицина/Живой проект', providerProjectId: 22931, type: 'VDL', sphere: 'Медицина', timezoneOffset: 4,
    }) }));
    expect(createMany.mock.calls[0][0].data).toEqual(expect.arrayContaining([
      expect.objectContaining({ login: 'Живой проект', role: UserRole.LIMITED }),
    ]));
    expect(answers.sync).toHaveBeenCalledWith('linked');
    expect(sources.sync).toHaveBeenCalledWith('linked', {});
    expect(result.initialSync).toEqual({ answers: 'COMPLETED', sources: 'COMPLETED' });
    expect(result.credentials.client.password).toBeTruthy();
  }, 20_000);

  it('does not link the same Leads Factory project twice', async () => {
    const provider = { getProject: jest.fn() };
    const prisma = { cabinet: { findFirst: jest.fn().mockResolvedValue({ id: 'existing', name: 'Уже подключён' }) } };
    await expect(new CabinetsService(prisma as never, provider as never, config as never)
      .linkProviderProject({ providerProjectId: 22931, price: 250 })).rejects.toThrow('уже связан');
    expect(provider.getProject).not.toHaveBeenCalled();
  });

  it('creates one Leads Factory project and records the idempotent operation', async () => {
    const operationUpdate = jest.fn().mockResolvedValue({});
    const createCabinet = jest.fn().mockResolvedValue({ ...cabinet, id: 'created-cabinet', providerProjectId: 77,
      uploadsEnabled: true, callsEnabled: true, timezoneOffset: 3, scheduleDays: [1, 2, 3, 4, 5, 6, 7],
      moneyBalance: 0, totalUnits: 0, usedUnits: 0 });
    const prisma = {
      providerProjectCreation: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'operation', providerProjectId: null, status: 'PENDING' })),
        update: operationUpdate,
      },
      $transaction: (callback: (tx: unknown) => unknown) => callback({
        cabinet: { create: createCabinet }, user: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
        providerProjectCreation: { update: operationUpdate },
      }),
    };
    const provider = {
      getProjectTypes: jest.fn().mockResolvedValue({ items: [{ id: 9, name: 'VDL' }] }),
      createProject: jest.fn().mockResolvedValue({ id: 77 }),
      updateProjectInfo: jest.fn().mockResolvedValue('ok'),
      updateProjectSettings: jest.fn().mockResolvedValue({}),
    };
    const result = await new CabinetsService(prisma as never, provider as never, config as never).create({
      name: 'Клиент', type: 'VDL' as never, price: 100, region: 'Москва', regionId: 77, sphere: 'Медицина',
      managerName: 'Анна', employeeLogin: 'staff-new', clientLogin: 'client-new',
      idempotencyKey: '7d3920e4-32ca-4c92-a8d4-218fe4ecbc35',
    });
    expect(provider.createProject).toHaveBeenCalledWith({
      name: 'Москва/Peremoney ЛКП VDL/Медицина/Клиент', type: 9, regions: [77], status: 'pause', default_limit: 5,
    });
    expect(provider.updateProjectInfo).toHaveBeenCalledWith(77, {
      check_domains_in_v_kazakh: false, parse_domains: false, parse_phones: false, parse_ishod: true,
      parse_ceo: false, parse_google: false, parse_manual: false, parse_maps: false,
      limit_autochange: false, max_limit: 100, default_limit: 5, ishod_phones_count: 1,
      vdl_autonorms: true,
    });
    expect(createCabinet.mock.calls[0][0].data).toEqual(expect.objectContaining({
      name: 'Москва/Peremoney ЛКП VDL/Медицина/Клиент', providerProjectId: 77, isActive: false,
    }));
    expect(operationUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SUCCEEDED', cabinetId: 'created-cabinet' }),
    }));
    expect(result.cabinet.id).toBe('created-cabinet');
    // Баланс нового кабинета всегда нулевой — провайдеру сразу сообщаем, что проект приостановлен
    expect(provider.updateProjectSettings).toHaveBeenCalledWith(77, expect.objectContaining({ isActive: false }));
  });

  it('schedules a retry when the provider pause call fails right after creation', async () => {
    const operationUpdate = jest.fn().mockResolvedValue({});
    const scheduledRunCreate = jest.fn().mockResolvedValue({});
    const prisma = {
      providerProjectCreation: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'operation', providerProjectId: null, status: 'PENDING' })),
        update: operationUpdate,
      },
      scheduledRun: { create: scheduledRunCreate },
      $transaction: (callback: (tx: unknown) => unknown) => callback({
        cabinet: { create: jest.fn().mockResolvedValue({ ...cabinet, id: 'created-cabinet', providerProjectId: 77,
          uploadsEnabled: true, callsEnabled: true, timezoneOffset: 3, scheduleDays: [1, 2, 3, 4, 5, 6, 7],
          moneyBalance: 0, totalUnits: 0, usedUnits: 0 }) },
        user: { createMany: jest.fn().mockResolvedValue({ count: 2 }) }, providerProjectCreation: { update: operationUpdate },
      }),
    };
    const provider = {
      getProjectTypes: jest.fn().mockResolvedValue({ items: [{ id: 9, name: 'VDL' }] }),
      createProject: jest.fn().mockResolvedValue({ id: 77 }),
      updateProjectInfo: jest.fn().mockResolvedValue('ok'),
      updateProjectSettings: jest.fn().mockRejectedValue(new Error('Leads Factory недоступен')),
    };

    await new CabinetsService(prisma as never, provider as never, config as never).create({
      name: 'Клиент', type: 'VDL' as never, price: 100, region: 'Москва', regionId: 77, sphere: 'Медицина',
      managerName: 'Анна', employeeLogin: 'staff-new', clientLogin: 'client-new',
      idempotencyKey: '7d3920e4-32ca-4c92-a8d4-218fe4ecbc35',
    });

    expect(scheduledRunCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ cabinetId: 'created-cabinet', task: 'APPLY_SCHEDULE' }),
    }));
  });

  it('passes every selected region to Leads Factory for a nationwide project', async () => {
    const operationUpdate = jest.fn().mockResolvedValue({});
    const prisma = {
      providerProjectCreation: {
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'operation', providerProjectId: null, status: 'PENDING' })),
        update: operationUpdate,
      },
      $transaction: (callback: (tx: unknown) => unknown) => callback({
        cabinet: { create: jest.fn().mockResolvedValue({ ...cabinet, id: 'all-russia', providerProjectId: 88,
          uploadsEnabled: true, callsEnabled: true, timezoneOffset: 3, scheduleDays: [1, 2, 3, 4, 5, 6, 7],
          moneyBalance: 0, totalUnits: 0, usedUnits: 0 }) },
        user: { createMany: jest.fn().mockResolvedValue({ count: 2 }) }, providerProjectCreation: { update: operationUpdate },
      }),
    };
    const provider = {
      getProjectTypes: jest.fn().mockResolvedValue({ items: [{ id: 9, name: 'VDL' }] }),
      createProject: jest.fn().mockResolvedValue({ id: 88 }),
      updateProjectInfo: jest.fn().mockResolvedValue('ok'),
      updateProjectSettings: jest.fn().mockResolvedValue({}),
    };

    await new CabinetsService(prisma as never, provider as never, config as never).create({
      name: 'Клиент', type: 'VDL' as never, price: 100, region: 'Вся Россия', regionId: 1, regionIds: [1, 2, 3],
      sphere: 'Медицина', managerName: 'Анна', employeeLogin: 'staff-new', clientLogin: 'client-new',
      idempotencyKey: '7d3920e4-32ca-4c92-a8d4-218fe4ecbc35',
    });

    expect(provider.createProject).toHaveBeenCalledWith({
      name: 'Вся Россия/Peremoney ЛКП VDL/Медицина/Клиент', type: 9, regions: [1, 2, 3], status: 'pause', default_limit: 5,
    });
  });

  it('returns the existing cabinet without a second provider POST for the same successful key', async () => {
    const prisma = {
      providerProjectCreation: {
        create: jest.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: '6.19.3' })),
        findUniqueOrThrow: jest.fn(),
      },
      cabinet: { findUniqueOrThrow: jest.fn().mockResolvedValue(cabinet) },
    };
    const provider = { createProject: jest.fn() };
    const service = new CabinetsService(prisma as never, provider as never, config as never);
    const dto = { name: 'Test', type: 'VDL' as never, price: 100, region: 'РФ', regionId: 1, sphere: '',
      employeeLogin: 'staff', clientLogin: 'client', idempotencyKey: '13c12e1c-a586-47d8-8504-bc9ead08f798' };
    const { createHash } = await import('node:crypto');
    prisma.providerProjectCreation.findUniqueOrThrow.mockResolvedValue({
      requestHash: createHash('sha256').update(JSON.stringify({ name: dto.name, type: dto.type, region: dto.region, regionId: dto.regionId,
        sphere: dto.sphere, managerName: undefined, price: dto.price, employeeLogin: dto.employeeLogin, clientLogin: dto.clientLogin })).digest('hex'),
      status: 'SUCCEEDED', cabinetId: cabinet.id,
    });
    const result = await service.create(dto);
    const { createHmac } = await import('node:crypto');
    const expectedEmployeePassword = `A!${createHmac('sha256', config.get()).update(`${dto.idempotencyKey}:employee`).digest('base64url').slice(0, 24)}9a`;
    expect(result).toEqual(expect.objectContaining({ cabinet, replayed: true,
      credentials: { employee: { login: 'staff', password: expectedEmployeePassword }, client: { login: 'client', password: expect.any(String) } } }));
    expect(provider.createProject).not.toHaveBeenCalled();
  });

  it('blocks a concurrent request while the same operation is PENDING', async () => {
    const dto = { name: 'Test', type: 'VDL' as never, price: 100, region: 'РФ', regionId: 1, sphere: '',
      employeeLogin: 'staff', clientLogin: 'client', idempotencyKey: 'd073c06c-8342-4b0a-a2b6-08cd8472e308' };
    const { createHash } = await import('node:crypto');
    const requestHash = createHash('sha256').update(JSON.stringify({ name: dto.name, type: dto.type, region: dto.region, regionId: dto.regionId,
      sphere: dto.sphere, managerName: undefined, price: dto.price, employeeLogin: dto.employeeLogin, clientLogin: dto.clientLogin })).digest('hex');
    const prisma = { providerProjectCreation: {
      create: jest.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: '6.19.3' })),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'operation', requestHash, status: 'PENDING', cabinetId: null, providerProjectId: null }),
    } };
    const provider = { createProject: jest.fn(), getProjectTypes: jest.fn() };
    await expect(new CabinetsService(prisma as never, provider as never, config as never).create(dto)).rejects.toThrow('уже выполняется');
    expect(provider.createProject).not.toHaveBeenCalled();
  });

  it('returns only allowlisted integration status fields', async () => {
    const prisma = { cabinet: { findUnique: jest.fn().mockResolvedValue({ providerProjectId: 44 }) } };
    const provider = { getIntegration: jest.fn().mockResolvedValue({
      id: 1, connected: true, status: 'ready', token: 'secret', webhook_url: 'https://secret.example', password: 'hidden',
    }) };
    const result = await new CabinetsService(prisma as never, provider as never, config as never).providerIntegration(cabinet.id, 'telegram');
    expect(result).toEqual({ configured: true, details: { id: 1, connected: true, status: 'ready' } });
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain('webhook');
  });

  it('recognizes the live is_active integration field without exposing credentials', async () => {
    const prisma = { cabinet: { findUnique: jest.fn().mockResolvedValue({ providerProjectId: 44 }) } };
    const provider = { getIntegration: jest.fn().mockResolvedValue({ is_active: true, domain: 'example.test', token: 'secret', webhook: 'hidden' }) };
    const result = await new CabinetsService(prisma as never, provider as never, config as never).providerIntegration(cabinet.id, 'telegram');
    expect(result).toEqual({ configured: true, details: { is_active: true, domain: 'example.test' } });
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(JSON.stringify(result)).not.toContain('webhook');
  });

  it('summarizes email integration accounts without exposing secrets', async () => {
    const prisma = { cabinet: { findUnique: jest.fn().mockResolvedValue({ providerProjectId: 44 }) } };
    const provider = { getIntegration: jest.fn().mockResolvedValue([
      { id: 1, is_active: true, reciever: 'sales@example.test', site: 'example.test', password: 'hidden' },
      { id: 2, is_active: false, reciever: 'backup@example.test', token: 'secret' },
    ]) };
    const result = await new CabinetsService(prisma as never, provider as never, config as never).providerIntegration(cabinet.id, 'email');
    expect(result).toEqual({ configured: true, details: { accounts: 2, items: [
      { id: 1, is_active: true, reciever: 'sales@example.test', site: 'example.test' },
      { id: 2, is_active: false, reciever: 'backup@example.test' },
    ] } });
    expect(JSON.stringify(result)).not.toContain('hidden');
    expect(JSON.stringify(result)).not.toContain('secret');
  });
});
