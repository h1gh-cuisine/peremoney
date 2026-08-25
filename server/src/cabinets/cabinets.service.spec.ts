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

  it('never hides dashboard and leads from a limited user', async () => {
    const prisma = { cabinet: { findUnique: jest.fn().mockResolvedValue(cabinet) } };
    const service = new CabinetsService(prisma as never, {} as never, config as never);
    const result = await service.getForUser({
      id: 'user-id', login: 'client', role: UserRole.LIMITED, cabinetId: cabinet.id,
    });
    expect(result.visibleSections).toEqual(['dashboard', 'leads', 'payer', 'sources', 'finance']);
  });

  it('returns every client section to a full user', async () => {
    const prisma = { cabinet: { findUnique: jest.fn().mockResolvedValue(cabinet) } };
    const service = new CabinetsService(prisma as never, {} as never, config as never);
    const result = await service.getForUser({
      id: 'user-id', login: 'employee', role: UserRole.FULL, cabinetId: cabinet.id,
    });
    expect(result.visibleSections).toContain('settings');
    expect(result.visibleSections).toContain('contacts');
  });

  it('saves the complete settings form in one cabinet update', async () => {
    const update = jest.fn().mockResolvedValue(cabinet);
    const updateProjectSchedule = jest.fn();
    const service = new CabinetsService({ cabinet: { update, findUnique: jest.fn().mockResolvedValue({ providerProjectId: 42 }) } } as never,
      { updateProjectSchedule } as never, config as never);
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
    expect(updateProjectSchedule).toHaveBeenCalledWith(42, false);
  });

  it('updates master project fields and hashes a changed client password', async () => {
    const cabinetUpdate = jest.fn().mockResolvedValue(cabinet);
    const userUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const transaction = jest.fn().mockImplementation(async (operations) => Promise.all(operations));
    const service = new CabinetsService({ cabinet: { update: cabinetUpdate }, user: { updateMany: userUpdateMany }, $transaction: transaction } as never, {} as never, config as never);
    await service.updateMasterProject(cabinet.id, { price: 250, renewalStatus: 'RENEWED' as never, isActive: false, hidden: true, clientPassword: 'NewSecret123!' });
    expect(cabinetUpdate.mock.calls[0][0].data).toEqual(expect.objectContaining({ price: expect.anything(), renewalStatus: 'RENEWED', isActive: false, hidden: true }));
    expect(userUpdateMany.mock.calls[0][0].where).toEqual({ cabinetId: cabinet.id, role: UserRole.LIMITED });
    expect(userUpdateMany.mock.calls[0][0].data.passwordHash).not.toBe('NewSecret123!');
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

  it('creates one Leads Factory project and records the idempotent operation', async () => {
    const operationUpdate = jest.fn().mockResolvedValue({});
    const createCabinet = jest.fn().mockResolvedValue({ ...cabinet, id: 'created-cabinet', providerProjectId: 77 });
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
    };
    const result = await new CabinetsService(prisma as never, provider as never, config as never).create({
      name: 'Клиент', type: 'VDL' as never, price: 100, region: 'Москва', regionId: 77, sphere: 'Медицина',
      managerName: 'Анна', employeeLogin: 'staff-new', clientLogin: 'client-new',
      idempotencyKey: '7d3920e4-32ca-4c92-a8d4-218fe4ecbc35',
    });
    expect(provider.createProject).toHaveBeenCalledWith({
      name: 'Москва/Peremoney ЛКП VDL/Медицина/Клиент', type: 9, regions: [77], status: 'active',
    });
    expect(createCabinet.mock.calls[0][0].data).toEqual(expect.objectContaining({
      name: 'Москва/Peremoney ЛКП VDL/Медицина/Клиент', providerProjectId: 77,
    }));
    expect(operationUpdate).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'SUCCEEDED', cabinetId: 'created-cabinet' }),
    }));
    expect(result.cabinet.id).toBe('created-cabinet');
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
