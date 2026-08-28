import { ScheduledRunStatus, ScheduledTask } from '@prisma/client';
import { SchedulerService } from './scheduler.service';

describe('SchedulerService', () => {
  function service(prisma: Record<string, unknown>, provider: Record<string, unknown> = {}) {
    return new SchedulerService(
      prisma as never, { sync: jest.fn() } as never, { sync: jest.fn(), automate: jest.fn() } as never,
      provider as never, { get: jest.fn() } as never,
    );
  }

  it('enqueues every due Moscow slot once per active cabinet', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 6 });
    const scheduler = service({
      cabinet: { findMany: jest.fn().mockResolvedValue([{ id: 'cabinet-id' }]) },
      scheduledRun: { createMany },
    });

    const count = await scheduler.enqueueDueRuns(new Date('2026-08-19T17:05:00.000Z'));

    expect(count).toBe(6);
    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
    const data = createMany.mock.calls[0][0].data;
    expect(data).toEqual(expect.arrayContaining([
      expect.objectContaining({ task: ScheduledTask.SOURCES_SYNC, scheduledFor: new Date('2026-08-19T06:00:00.000Z') }),
      expect.objectContaining({ task: ScheduledTask.SCRIPT_SYNC, scheduledFor: new Date('2026-08-19T17:00:00.000Z') }),
    ]));
  });

  it('applies the documented Friday/Saturday weekend preset', async () => {
    const updateProjectSchedule = jest.fn();
    const prisma = { cabinet: { findUniqueOrThrow: jest.fn().mockResolvedValue({
      id: 'cabinet-id', providerProjectId: 42, scheduleDays: [1, 2, 3, 4, 7], isActive: true,
    }) } };
    const scheduler = service(prisma, { updateProjectSchedule });
    const dispatch = (scheduler as unknown as { dispatch(run: unknown): Promise<unknown> }).dispatch.bind(scheduler);

    await dispatch({ task: ScheduledTask.APPLY_SCHEDULE, cabinetId: 'cabinet-id', scheduledFor: new Date('2026-08-21T17:00:00Z') });
    expect(updateProjectSchedule).toHaveBeenCalledWith(42, false, { uploadsEnabled: undefined, callsEnabled: undefined });
  });

  it('at 20:00 checks the next Moscow calendar day', async () => {
    const updateProjectSchedule = jest.fn();
    const prisma = { cabinet: { findUniqueOrThrow: jest.fn().mockResolvedValue({
      id: 'cabinet-id', providerProjectId: 42, scheduleDays: [6], isActive: true,
      moneyBalance: 1000, price: 250, totalUnits: 10, usedUnits: 0,
      uploadsEnabled: true, callsEnabled: true,
    }) } };
    const scheduler = service(prisma, { updateProjectSchedule });
    const dispatch = (scheduler as unknown as { dispatch(run: unknown): Promise<unknown> }).dispatch.bind(scheduler);

    // 21 августа — пятница. В 20:00 МСК применяется расписание субботы (ISO 6).
    await dispatch({ task: ScheduledTask.APPLY_SCHEDULE, cabinetId: 'cabinet-id', scheduledFor: new Date('2026-08-21T17:00:00Z') });
    expect(updateProjectSchedule).toHaveBeenCalledWith(42, true, { uploadsEnabled: true, callsEnabled: true });
  });

  it('never reactivates a project that is locally paused', async () => {
    const updateProjectSchedule = jest.fn();
    const prisma = { cabinet: { findUniqueOrThrow: jest.fn().mockResolvedValue({
      id: 'cabinet-id', providerProjectId: 42, scheduleDays: [1, 2, 3, 4, 5, 6, 7], isActive: false,
    }) } };
    const scheduler = service(prisma, { updateProjectSchedule });
    const dispatch = (scheduler as unknown as { dispatch(run: unknown): Promise<unknown> }).dispatch.bind(scheduler);
    await dispatch({ task: ScheduledTask.APPLY_SCHEDULE, cabinetId: 'cabinet-id', scheduledFor: new Date('2026-08-20T17:00:00Z') });
    expect(updateProjectSchedule).toHaveBeenCalledWith(42, false, { uploadsEnabled: undefined, callsEnabled: undefined });
  });

  it('pauses an active project when its balance is exhausted', async () => {
    const updateProjectSchedule = jest.fn();
    const prisma = { cabinet: { findUniqueOrThrow: jest.fn().mockResolvedValue({
      id: 'cabinet-id', providerProjectId: 42, scheduleDays: [1, 2, 3, 4, 5, 6, 7], isActive: true,
      moneyBalance: 0, price: 250, totalUnits: 10, usedUnits: 10,
    }) } };
    const scheduler = service(prisma, { updateProjectSchedule });
    const dispatch = (scheduler as unknown as { dispatch(run: unknown): Promise<unknown> }).dispatch.bind(scheduler);
    await dispatch({ task: ScheduledTask.APPLY_SCHEDULE, cabinetId: 'cabinet-id', scheduledFor: new Date('2026-08-20T17:00:00Z') });
    expect(updateProjectSchedule).toHaveBeenCalledWith(42, false, { uploadsEnabled: undefined, callsEnabled: undefined });
  });

  it('stores readable provider script text instead of HTML presentation', async () => {
    const update = jest.fn();
    const scheduler = service({ cabinet: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'cabinet-id', providerProjectId: 42 }), update,
    } }, { getProjectScript: jest.fn().mockResolvedValue({ name: 'Main', script: '<style>p{color:red}</style><h1>Hello</h1><p>Call&nbsp;me</p>', script_lvl: 2 }) });
    const dispatch = (scheduler as unknown as { dispatch(run: unknown): Promise<unknown> }).dispatch.bind(scheduler);

    await dispatch({ task: ScheduledTask.SCRIPT_SYNC, cabinetId: 'cabinet-id', scheduledFor: new Date() });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ operatorScript: 'Hello\nCall me', operatorScriptLevel: 2 }),
    }));
  });

  it('stores an empty state instead of the literal string null', async () => {
    const update = jest.fn();
    const scheduler = service({ cabinet: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'cabinet-id', providerProjectId: 42 }), update,
    } }, { getProjectScript: jest.fn().mockResolvedValue({ name: 'Empty', script: null, script_lvl: 0 }) });
    const dispatch = (scheduler as unknown as { dispatch(run: unknown): Promise<unknown> }).dispatch.bind(scheduler);

    await dispatch({ task: ScheduledTask.SCRIPT_SYNC, cabinetId: 'cabinet-id', scheduledFor: new Date() });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ operatorScript: null, operatorScriptName: 'Empty' }),
    }));
  });

  it('persists a retry when a claimed task fails', async () => {
    const run = {
      id: 'run-id', cabinetId: 'cabinet-id', task: ScheduledTask.CONTACTS_SYNC,
      status: ScheduledRunStatus.RUNNING, scheduledFor: new Date(), nextAttemptAt: new Date(),
      attempts: 1, startedAt: new Date(), finishedAt: null, lastError: null, result: null,
      createdAt: new Date(), updatedAt: new Date(),
    };
    const update = jest.fn();
    const prisma = {
      cabinet: { findMany: jest.fn().mockResolvedValue([]) },
      scheduledRun: { updateMany: jest.fn(), update },
      $queryRaw: jest.fn().mockResolvedValueOnce([run]).mockResolvedValueOnce([]),
    };
    const scheduler = new SchedulerService(
      prisma as never, { sync: jest.fn().mockRejectedValue(new Error('CRM unavailable')) } as never,
      {} as never, {} as never, { get: jest.fn() } as never,
    );

    await scheduler.runOnce();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: ScheduledRunStatus.PENDING, lastError: 'CRM unavailable' }),
    }));
  });
});
