import { SyncStatus } from '@prisma/client';
import { AnswerSyncService } from './answer-sync.service';

const answer = (id: number, status: string) => ({
  id, status, date: '2026-08-16 12:00:00', success_date: status === 'success' ? '2026-08-16 12:01:00' : null,
  date_updated: '2026-08-16 12:02:00', mobile_tel: '79990000000', name: 'comment', site: 'site', mobile_operator: 'МТС',
});

describe('AnswerSyncService', () => {
  it('skips repeats, creates leads only for success and records the run', async () => {
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({ id: 'cab', providerProjectId: 10, createdAt: new Date() }) },
      answerSyncRun: {
        create: jest.fn().mockResolvedValue({ id: 'run' }),
        update: jest.fn().mockImplementation(({ data }) => data),
      },
      contact: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockImplementation(({ create }) => ({ id: `contact-${create.providerAnswerId}` })),
      },
      lead: { findUnique: jest.fn().mockResolvedValue(null), upsert: jest.fn() },
    };
    const provider = { getAnswers: jest.fn().mockResolvedValue({
      items: [answer(1, 'new'), answer(2, 'repeat'), answer(3, 'success')], total: 3,
    }) };
    const finance = { chargeUsage: jest.fn() };
    const service = new AnswerSyncService(prisma as never, provider as never, finance as never);

    const result = await service.sync('cab');

    expect(prisma.contact.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.lead.upsert).toHaveBeenCalledTimes(1);
    expect(finance.chargeUsage).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ status: SyncStatus.SUCCEEDED, receivedCount: 3, contactCount: 2, leadCount: 1 });
  });

  it('records provider failures before rethrowing', async () => {
    const failure = new Error('provider unavailable');
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({ id: 'cab', providerProjectId: 10, createdAt: new Date() }) },
      answerSyncRun: { create: jest.fn().mockResolvedValue({ id: 'run' }), update: jest.fn() },
    };
    const provider = { getAnswers: jest.fn().mockRejectedValue(failure) };
    const service = new AnswerSyncService(prisma as never, provider as never, {} as never);

    await expect(service.sync('cab')).rejects.toThrow('provider unavailable');
    expect(prisma.answerSyncRun.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: SyncStatus.FAILED, error: 'provider unavailable' }),
    }));
  });
});
