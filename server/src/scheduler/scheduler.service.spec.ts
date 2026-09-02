import { ScheduledRunStatus, ScheduledTask } from '@prisma/client';
import { SchedulerService } from './scheduler.service';
import { ProviderException } from '../leads-factory/provider.exception';

describe('SchedulerService', () => {
  function service(
    prisma: Record<string, unknown>, provider: Record<string, unknown> = {},
    acquisitionSync: Record<string, unknown> = { reconcile: jest.fn() },
  ) {
    return new SchedulerService(
      prisma as never, { sync: jest.fn() } as never, { sync: jest.fn(), automate: jest.fn() } as never,
      provider as never, { get: jest.fn() } as never, acquisitionSync as never,
    );
  }

  it('enqueues every due Moscow slot once per active cabinet', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 6 });
    const scheduler = service({
      cabinet: { findMany: jest.fn().mockResolvedValue([{ id: 'cabinet-id', isActive: true }]) },
      scheduledRun: { createMany },
    });

    const count = await scheduler.enqueueDueRuns(new Date('2026-08-19T17:05:00.000Z'));

    expect(count).toBe(6);
    expect(createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
    const data = createMany.mock.calls[0][0].data;
    expect(data).toEqual(expect.arrayContaining([
      expect.objectContaining({ task: ScheduledTask.SOURCES_SYNC, scheduledFor: new Date('2026-08-19T06:00:00.000Z') }),
      expect.objectContaining({ task: ScheduledTask.SCRIPT_SYNC, scheduledFor: new Date('2026-08-19T17:00:00.000Z') }),
      expect.objectContaining({ task: ScheduledTask.CONTACTS_SYNC, scheduledFor: new Date('2026-08-19T17:04:00.000Z') }),
    ]));
  });

  it('enqueues script sync for inactive cabinets without scheduling their operational tasks', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const scheduler = service({
      cabinet: { findMany: jest.fn().mockResolvedValue([{ id: 'paused-cabinet', isActive: false }]) },
      scheduledRun: { createMany },
    });

    await scheduler.enqueueDueRuns(new Date('2026-08-19T17:05:00.000Z'));

    expect(createMany.mock.calls[0][0].data).toEqual([
      expect.objectContaining({ cabinetId: 'paused-cabinet', task: ScheduledTask.SCRIPT_SYNC }),
    ]);
  });

  it('applies the documented Friday/Saturday weekend preset', async () => {
    const updateProjectSchedule = jest.fn();
    const prisma = { cabinet: { findUniqueOrThrow: jest.fn().mockResolvedValue({
      id: 'cabinet-id', providerProjectId: 42, scheduleDays: [1, 2, 3, 4, 7], isActive: true,
    }) } };
    const scheduler = service(prisma, { updateProjectSchedule });
    const dispatch = (scheduler as unknown as { dispatch(run: unknown): Promise<unknown> }).dispatch.bind(scheduler);

    await dispatch({ task: ScheduledTask.APPLY_SCHEDULE, cabinetId: 'cabinet-id', scheduledFor: new Date('2026-08-21T17:00:00Z') });
    expect(updateProjectSchedule).toHaveBeenCalledWith(42, false, { callsEnabled: undefined });
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
    expect(updateProjectSchedule).toHaveBeenCalledWith(42, true, { callsEnabled: true });
  });

  it('APPLY_SETTINGS re-applies today\'s schedule, not tomorrow\'s (unlike the nightly APPLY_SCHEDULE rollover)', async () => {
    const updateProjectSettings = jest.fn();
    const reconcile = jest.fn();
    // 21 августа 2026 — пятница (ISO 5); суббота (ISO 6) недоступна в scheduleDays.
    // Ретрай сохранения настроек должен применить статус на СЕГОДНЯ, а не на завтра.
    const prisma = { cabinet: { findUniqueOrThrow: jest.fn().mockResolvedValue({
      id: 'cabinet-id', providerProjectId: 42, scheduleDays: [5], isActive: true,
      moneyBalance: 1000, price: 250, totalUnits: 10, usedUnits: 0,
      timezoneOffset: 3, uploadsEnabled: false, callsEnabled: true,
    }) } };
    const scheduler = service(prisma, { updateProjectSettings }, { reconcile });
    const dispatch = (scheduler as unknown as { dispatch(run: unknown): Promise<unknown> }).dispatch.bind(scheduler);

    await dispatch({ task: ScheduledTask.APPLY_SETTINGS, cabinetId: 'cabinet-id', scheduledFor: new Date('2026-08-21T17:00:00Z') });

    expect(updateProjectSettings).toHaveBeenCalledWith(42, expect.objectContaining({
      isActive: true, timezoneOffset: 3, callsEnabled: true, activeToday: true,
    }));
    // "Выгрузки" — отдельный блок закупки/парсинга (parse_*), реконсилится независимо
    // от work_client_status/call_center_status.
    expect(reconcile).toHaveBeenCalledWith('cabinet-id', 42, false);
  });

  it('never reactivates a project that is locally paused', async () => {
    const updateProjectSchedule = jest.fn();
    const prisma = { cabinet: { findUniqueOrThrow: jest.fn().mockResolvedValue({
      id: 'cabinet-id', providerProjectId: 42, scheduleDays: [1, 2, 3, 4, 5, 6, 7], isActive: false,
    }) } };
    const scheduler = service(prisma, { updateProjectSchedule });
    const dispatch = (scheduler as unknown as { dispatch(run: unknown): Promise<unknown> }).dispatch.bind(scheduler);
    await dispatch({ task: ScheduledTask.APPLY_SCHEDULE, cabinetId: 'cabinet-id', scheduledFor: new Date('2026-08-20T17:00:00Z') });
    expect(updateProjectSchedule).toHaveBeenCalledWith(42, false, { callsEnabled: undefined });
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
    expect(updateProjectSchedule).toHaveBeenCalledWith(42, false, { callsEnabled: undefined });
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
      {} as never, {} as never, { get: jest.fn() } as never, { reconcile: jest.fn() } as never,
    );

    await scheduler.runOnce();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: ScheduledRunStatus.PENDING, lastError: 'CRM unavailable' }),
    }));
  });

  it('stores provider status and safe response details for schedule diagnostics', async () => {
    const run = {
      id: 'run-provider', cabinetId: 'cabinet-id', task: ScheduledTask.APPLY_SCHEDULE,
      status: ScheduledRunStatus.RUNNING, scheduledFor: new Date(), nextAttemptAt: new Date(),
      attempts: 1, startedAt: new Date(), finishedAt: null, lastError: null, result: null,
      createdAt: new Date(), updatedAt: new Date(),
    };
    const update = jest.fn();
    const prisma = {
      cabinet: { findMany: jest.fn().mockResolvedValue([]), findUniqueOrThrow: jest.fn().mockResolvedValue({
        id: 'cabinet-id', providerProjectId: 42, isActive: true, moneyBalance: 1000, price: 100,
        totalUnits: 10, usedUnits: 0, scheduleDays: [1, 2, 3, 4, 5, 6, 7],
      }) },
      scheduledRun: { updateMany: jest.fn(), update },
      $queryRaw: jest.fn().mockResolvedValueOnce([run]).mockResolvedValueOnce([]),
    };
    const provider = { updateProjectSchedule: jest.fn().mockRejectedValue(new ProviderException(502,
      'Ошибка CRM Leads Factory', { request_id: 'lf-123', token: 'must-not-leak' })) };
    await service(prisma, provider).runOnce();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      lastError: '[Leads Factory 502] Ошибка CRM Leads Factory: {"request_id":"lf-123","token":"[REDACTED]"}',
    }) }));
  });
});
