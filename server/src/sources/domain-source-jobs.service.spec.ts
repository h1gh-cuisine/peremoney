import { DomainJobStatus } from '@prisma/client';
import { DomainSourceJobsService } from './domain-source-jobs.service';

describe('DomainSourceJobsService', () => {
  const job = {
    id: 'job-id', cabinetId: 'cabinet-id', status: DomainJobStatus.RUNNING, attempts: 1,
    scheduledAt: new Date(), startedAt: new Date(), finishedAt: null, lastError: null,
    createdAt: new Date(), updatedAt: new Date(),
  };

  it('updates domain parsing, disables tags and completes a claimed job', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValueOnce([job]).mockResolvedValueOnce([]),
      cabinet: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'cabinet-id', providerProjectId: 42 }) },
      domainSourceJob: { updateMany: jest.fn(), update: jest.fn() },
      sourceTag: { updateMany: jest.fn() },
    };
    const provider = {
      getSources: jest.fn().mockResolvedValue({ items: [{ id: 10 }, { id: 11 }], total: 2 }),
      updateSourceSettings: jest.fn(),
      getTags: jest.fn().mockResolvedValue({ items: [{ id: 20 }], total: 1 }),
      updateTags: jest.fn(),
    };
    const service = new DomainSourceJobsService(prisma as never, provider as never, { get: jest.fn() } as never);

    await service.runOnce();

    expect(provider.updateSourceSettings).toHaveBeenCalledWith([10, 11]);
    expect(provider.updateTags).toHaveBeenCalledWith([20], false);
    expect(prisma.domainSourceJob.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: DomainJobStatus.COMPLETED }),
    }));
  });

  it('persists a retry after a provider failure', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValueOnce([job]).mockResolvedValueOnce([]),
      cabinet: { findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'cabinet-id', providerProjectId: 42 }) },
      domainSourceJob: { updateMany: jest.fn(), update: jest.fn() },
    };
    const provider = { getSources: jest.fn().mockRejectedValue(new Error('VDL unavailable')) };
    const service = new DomainSourceJobsService(prisma as never, provider as never, { get: jest.fn() } as never);

    await service.runOnce();

    expect(prisma.domainSourceJob.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: DomainJobStatus.PENDING, lastError: 'VDL unavailable' }),
    }));
  });

  it('schedules new work approximately five minutes ahead', async () => {
    const create = jest.fn().mockImplementation(({ data }) => data);
    const service = new DomainSourceJobsService(
      { domainSourceJob: { create } } as never, {} as never, { get: jest.fn() } as never,
    );
    const before = Date.now();
    const result = await service.enqueue('cabinet-id');
    expect(result.scheduledAt.getTime()).toBeGreaterThanOrEqual(before + 5 * 60_000);
    expect(result.scheduledAt.getTime()).toBeLessThanOrEqual(Date.now() + 5 * 60_000);
  });
});
