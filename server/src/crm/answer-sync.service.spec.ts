import { SyncStatus } from '@prisma/client';
import { AnswerSyncService } from './answer-sync.service';

const answer = (id: number, status: string) => ({
  id, status, date: '2026-08-16 12:00:00', success_date: status === 'success' ? '2026-08-16 12:01:00' : null,
  date_updated: '2026-08-16 12:02:00', mobile_tel: '79990000000', name: 'comment', site: 'site', mobile_operator: 'МТС',
});

describe('AnswerSyncService', () => {
  it('skips repeats, creates leads only for success and records the run', async () => {
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({ id: 'cab', providerProjectId: 10, linkedProviderProjectIds: [], createdAt: new Date(), providerCreation: { id: 'creation' } }) },
      answerSyncRun: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'run' }),
        update: jest.fn().mockImplementation(({ data }) => data),
      },
      contact: {
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockImplementation(({ create }) => ({ id: `contact-${create.providerAnswerId}` })),
      },
      lead: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    };
    const provider = { getAnswers: jest.fn().mockResolvedValue({
      items: [answer(1, 'new'), answer(2, 'repeat'), answer(3, 'success')], total: 3,
    }) };
    const finance = { chargeUsage: jest.fn() };
    const messenger = { notifyLead: jest.fn() };
    const service = new AnswerSyncService(prisma as never, provider as never, finance as never, messenger as never);

    const [result] = await service.sync('cab');

    expect(prisma.contact.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.contact.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ providerProjectId: 10 }),
    }));
    expect(prisma.lead.upsert).toHaveBeenCalledTimes(1);
    expect(finance.chargeUsage).toHaveBeenCalledTimes(3);
    expect(messenger.notifyLead).toHaveBeenCalledTimes(1);
    expect(messenger.notifyLead).toHaveBeenCalledWith('cab', expect.objectContaining({ providerAnswerId: 3, phone: '79990000000' }));
    expect(provider.getAnswers).toHaveBeenCalledWith(10, expect.objectContaining({ dateFrom: expect.any(Date) }));
    expect(result).toMatchObject({ status: SyncStatus.SUCCEEDED, receivedCount: 3, contactCount: 2, leadCount: 1 });
  });

  it('loads provider history when a linked project has no imported contacts yet', async () => {
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({ id: 'cab', providerProjectId: 26416, linkedProviderProjectIds: [], createdAt: new Date(), providerCreation: null }) },
      answerSyncRun: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'run' }),
        update: jest.fn().mockImplementation(({ data }) => data),
      },
      contact: { count: jest.fn().mockResolvedValue(0) },
    };
    const provider = { getAnswers: jest.fn().mockResolvedValue({ items: [], total: 0 }) };
    const service = new AnswerSyncService(prisma as never, provider as never, {} as never);

    await service.sync('cab');

    expect(provider.getAnswers).toHaveBeenCalledWith(26416, {
      page: 1, limit: 200, dateFrom: undefined, dateTo: expect.any(Date),
      dateUpdatedFrom: undefined, dateUpdatedTo: undefined,
    });
  });

  it('polls only answers changed since the previous successful window', async () => {
    const previousStartedAt = new Date('2026-08-30T10:00:00.000Z');
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({ id: 'cab', providerProjectId: 10, linkedProviderProjectIds: [], createdAt: new Date('2026-01-01'), providerCreation: null }) },
      answerSyncRun: {
        findFirst: jest.fn().mockResolvedValue({ startedAt: previousStartedAt }),
        create: jest.fn().mockResolvedValue({ id: 'run' }),
        update: jest.fn().mockImplementation(({ data }) => data),
      },
      contact: { count: jest.fn().mockResolvedValue(100) },
    };
    const provider = { getAnswers: jest.fn().mockResolvedValue({ items: [], total: 0 }) };
    await new AnswerSyncService(prisma as never, provider as never, {} as never).sync('cab');

    expect(provider.getAnswers).toHaveBeenCalledWith(10, expect.objectContaining({
      page: 1,
      limit: 200,
      dateFrom: undefined,
      dateTo: undefined,
      dateUpdatedFrom: new Date('2026-08-30T09:58:00.000Z'),
      dateUpdatedTo: expect.any(Date),
    }));
  });

  it('survives null date/status/mobile_tel from the provider instead of crashing the whole run (Crm_AnswerOut is nullable there)', async () => {
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({ id: 'cab', providerProjectId: 10, linkedProviderProjectIds: [], createdAt: new Date(), providerCreation: { id: 'creation' } }) },
      answerSyncRun: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'run' }),
        update: jest.fn().mockImplementation(({ data }) => data),
      },
      contact: {
        count: jest.fn().mockResolvedValue(1),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockImplementation(({ create }) => ({ id: `contact-${create.providerAnswerId}` })),
      },
      lead: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    };
    const provider = { getAnswers: jest.fn().mockResolvedValue({
      items: [
        // No date at all — cannot be filed as a Contact (date is NOT NULL); must be
        // skipped, not crash the loop and stall every later sync for this cabinet.
        { id: 1, status: 'new', date: null, success_date: null, date_updated: null, mobile_tel: '79990000001', name: null, site: null, mobile_operator: null },
        // Has a date but no status/phone yet — must still be filed (coerced to '').
        { id: 2, status: null, date: '2026-08-16 12:00:00', success_date: null, date_updated: null, mobile_tel: null, name: null, site: null, mobile_operator: null },
      ], total: 2,
    }) };
    const finance = { chargeUsage: jest.fn() };
    const service = new AnswerSyncService(prisma as never, provider as never, finance as never);

    const [result] = await service.sync('cab');

    expect(prisma.contact.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.contact.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ providerAnswerId: 2, status: '', mobileTel: '' }),
    }));
    expect(result).toMatchObject({ status: SyncStatus.SUCCEEDED, receivedCount: 2, contactCount: 1, leadCount: 0 });
  });

  it('records provider failures before rethrowing', async () => {
    const failure = new Error('provider unavailable');
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({ id: 'cab', providerProjectId: 10, linkedProviderProjectIds: [], createdAt: new Date(), providerCreation: null }) },
      answerSyncRun: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'run' }), update: jest.fn() },
      contact: { count: jest.fn().mockResolvedValue(0) },
    };
    const provider = { getAnswers: jest.fn().mockRejectedValue(failure) };
    const service = new AnswerSyncService(prisma as never, provider as never, {} as never);

    await expect(service.sync('cab')).rejects.toThrow('provider unavailable');
    expect(prisma.answerSyncRun.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: SyncStatus.FAILED, error: 'provider unavailable' }),
    }));
  });

  it('also pulls leads/contacts from every linked project into the same cabinet, scoping providerAnswerId collisions by project', async () => {
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({
        id: 'cab', providerProjectId: 10, linkedProviderProjectIds: [20], createdAt: new Date(), providerCreation: { id: 'creation' },
      }) },
      answerSyncRun: {
        // Neither project has synced successfully before — both get a full historical import.
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'run' }),
        update: jest.fn().mockImplementation(({ data }) => data),
      },
      contact: {
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockImplementation(({ create }) => ({ id: `contact-${create.providerProjectId}-${create.providerAnswerId}` })),
      },
      lead: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    };
    // Both projects independently number their answers starting from 1 — a real
    // collision risk the composite (cabinetId, providerProjectId, providerAnswerId)
    // key exists to prevent.
    const getAnswers = jest.fn()
      .mockResolvedValueOnce({ items: [answer(1, 'new')], total: 1 })
      .mockResolvedValueOnce({ items: [answer(1, 'new')], total: 1 });
    const finance = { chargeUsage: jest.fn() };
    const service = new AnswerSyncService(prisma as never, { getAnswers } as never, finance as never);

    const results = await service.sync('cab');

    expect(getAnswers).toHaveBeenNthCalledWith(1, 10, expect.anything());
    expect(getAnswers).toHaveBeenNthCalledWith(2, 20, expect.anything());
    expect(prisma.contact.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.contact.upsert).toHaveBeenNthCalledWith(1, expect.objectContaining({
      where: { cabinetId_providerProjectId_providerAnswerId: { cabinetId: 'cab', providerProjectId: 10, providerAnswerId: 1 } },
    }));
    expect(prisma.contact.upsert).toHaveBeenNthCalledWith(2, expect.objectContaining({
      where: { cabinetId_providerProjectId_providerAnswerId: { cabinetId: 'cab', providerProjectId: 20, providerAnswerId: 1 } },
    }));
    expect(results).toHaveLength(2);
    expect(prisma.answerSyncRun.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ data: expect.objectContaining({ providerProjectId: 10 }) }));
    expect(prisma.answerSyncRun.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ data: expect.objectContaining({ providerProjectId: 20 }) }));
  });
});
