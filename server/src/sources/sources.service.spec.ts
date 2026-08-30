import { LeadSaleStatus, Prisma } from '@prisma/client';
import { SourcesService } from './sources.service';

describe('источники: бизнес-правила 2.6', () => {
  it('включает тег по лимиту именно этого проекта (Cabinet.defaultLimit), а не по единому 50 на все проекты', async () => {
    const update = jest.fn(); const updateTag = jest.fn();
    const prisma = {
      sourceTag: { findFirst: jest.fn().mockResolvedValue({ id: 'tag', providerTagId: 7 }), update },
      cabinet: { findUnique: jest.fn().mockResolvedValue({ defaultLimit: 8 }) },
    };
    const service = new SourcesService(prisma as never, { updateTag } as never, {} as never);
    await service.toggle('cab', '7', true);
    expect(updateTag).toHaveBeenCalledWith(7, true, 8);
    expect(update).toHaveBeenCalledWith({ where: { id: 'tag' }, data: { normWork: true, limit: 8 } });
  });

  it('падает обратно на лимит 50, если у кабинета лимит не настроен', async () => {
    const update = jest.fn(); const updateTag = jest.fn();
    const prisma = {
      sourceTag: { findFirst: jest.fn().mockResolvedValue({ id: 'tag', providerTagId: 7 }), update },
      cabinet: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new SourcesService(prisma as never, { updateTag } as never, {} as never);
    await service.toggle('cab', '7', true);
    expect(updateTag).toHaveBeenCalledWith(7, true, 50);
  });

  it('считает продажи и долю нецелевых по совпавшему site (Contact.site хранит сырой тег провайдера)', async () => {
    const prisma = {
      sourceTag: { findMany: jest.fn().mockResolvedValue([{ id: 'local-uuid', providerTagId: 731, rawName: 'B111_79311094344_22442', name: '79311094344', success: 4 }]), count: jest.fn().mockResolvedValue(1) },
      lead: { findMany: jest.fn().mockResolvedValue([
        { saleStatus: LeadSaleStatus.NOT_TARGET, contact: { site: 'B111_79311094344_22442' } },
        { saleStatus: LeadSaleStatus.NOT_TARGET, contact: { site: 'B111_79311094344_22442' } },
        { saleStatus: LeadSaleStatus.BOUGHT, contact: { site: 'B111_79311094344_22442' } },
        { saleStatus: LeadSaleStatus.BOUGHT, contact: { site: 'B222_74950040278_22442' } },
      ]) },
    };
    const { items: [result], total, hasMore } = await new SourcesService(prisma as never, {} as never, {} as never).list('cab', {});
    expect(result).toMatchObject({ id: '731', providerTagId: 731, sales: 1, notTargetShare: 66.7 });
    expect({ total, hasMore }).toEqual({ total: 1, hasMore: false });
  });

  it('ставит domain-задачу только для сайтов', async () => {
    const enqueue = jest.fn().mockResolvedValue({ id: 'job' });
    const provider = { addSources: jest.fn().mockResolvedValue({ ok: true }) };
    const prisma = { cabinet: { findUnique: jest.fn().mockResolvedValue({ id: 'cab', providerProjectId: 42 }) } };
    const service = new SourcesService(prisma as never, provider as never, { enqueue } as never);
    const result = await service.add('cab', { sources: ['site.ru'], sourceType: 'domain' });
    expect(provider.addSources).toHaveBeenCalledWith(42, expect.objectContaining({
      source: ['site.ru'], source_type: 'domain', source_from: 'web',
    }));
    expect(enqueue).toHaveBeenCalledWith('cab');
    expect(result.domainProcessingJob).toEqual({ id: 'job' });
  });

  it('отдаёт сохранённые пороги автоматизации в терминах API (autoManageEnabled, не autoManagementEnabled)', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      autoCleanupEnabled: true, autoManagementEnabled: false, minContactsPerLead: 6, minConversion: new Prisma.Decimal(15),
      defaultLimit: 5, maxLimit: 50,
    });
    const service = new SourcesService({ cabinet: { findUnique } } as never, {} as never, {} as never);
    await expect(service.getAutomation('cab')).resolves.toEqual({
      autoCleanupEnabled: true, autoManageEnabled: false, minContactsPerLead: 6, minConversion: 15,
      defaultLimit: 5, maxLimit: 50,
    });
  });

  it('при сохранении настроек автоматизации шлёт в Leads Factory только default_limit/max_limit, без minContactsPerLead/minConversion', async () => {
    const update = jest.fn().mockResolvedValue({ providerProjectId: 42, defaultLimit: 10, maxLimit: 80 });
    const updateProjectAutomationLimits = jest.fn().mockResolvedValue(undefined);
    const service = new SourcesService({ cabinet: { update } } as never, { updateProjectAutomationLimits } as never, {} as never);
    await service.updateAutomation('cab', { autoCleanupEnabled: true, minContactsPerLead: 3, minConversion: 12, defaultLimit: 10, maxLimit: 80 });
    expect(updateProjectAutomationLimits).toHaveBeenCalledWith(42, { defaultLimit: 10, maxLimit: 80 });
  });

  it('не дёргает Leads Factory при сохранении автоматизации, если проект ещё не связан', async () => {
    const update = jest.fn().mockResolvedValue({ providerProjectId: null, defaultLimit: 5, maxLimit: 50 });
    const updateProjectAutomationLimits = jest.fn();
    const service = new SourcesService({ cabinet: { update } } as never, { updateProjectAutomationLimits } as never, {} as never);
    await service.updateAutomation('cab', {});
    expect(updateProjectAutomationLimits).not.toHaveBeenCalled();
  });

  it('разделяет автоочистку и автоуправление по порогам', async () => {
    const tags = [
      { id: 'bad', providerTagId: 1, newAnswer: 10, conversion: new Prisma.Decimal(5) },
      { id: 'good', providerTagId: 2, newAnswer: 10, conversion: new Prisma.Decimal(20) },
    ];
    const updateTags = jest.fn(); const updateMany = jest.fn();
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({ providerProjectId: 42, autoCleanupEnabled: true, autoManagementEnabled: true, minContactsPerLead: 5, minConversion: new Prisma.Decimal(10), defaultLimit: 5 }) },
      sourceTag: { findMany: jest.fn().mockResolvedValue(tags), updateMany, upsert: jest.fn() }, $transaction: jest.fn(),
    };
    const getTags = jest.fn().mockResolvedValue({ items: [], total: 0 });
    const result = await new SourcesService(prisma as never, { updateTags, getTags } as never, {} as never).automate('cab');
    expect(updateTags).toHaveBeenNthCalledWith(1, [1], false);
    // Включение идёт по Cabinet.defaultLimit этого проекта, не по единому 50.
    expect(updateTags).toHaveBeenNthCalledWith(2, [2], true, 5);
    expect(result).toEqual(expect.objectContaining({ disabled: 1, enabled: 1 }));
  });

  it('выключает тег по одной только конверсии, даже если он не набрал мин. контактов на 1 лид (продуктовое решение: условия разделены, не "И")', async () => {
    // Регрессия, замеченная на реальном кабинете: все теги были ниже порога
    // конверсии, но ни один не набрал minContactsPerLead — при старой логике
    // "И" чистка не выключала вообще ничего.
    const tags = [
      { id: 'low-traffic-bad-conversion', providerTagId: 1, newAnswer: 2, conversion: new Prisma.Decimal(5) },
    ];
    const updateTags = jest.fn(); const updateMany = jest.fn();
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({ providerProjectId: 42, autoCleanupEnabled: true, autoManagementEnabled: false, minContactsPerLead: 11, minConversion: new Prisma.Decimal(42) }) },
      sourceTag: { findMany: jest.fn().mockResolvedValue(tags), updateMany, upsert: jest.fn() }, $transaction: jest.fn(),
    };
    const getTags = jest.fn().mockResolvedValue({ items: [], total: 0 });
    const result = await new SourcesService(prisma as never, { updateTags, getTags } as never, {} as never).automate('cab');
    expect(updateTags).toHaveBeenCalledWith([1], false);
    expect(result).toEqual(expect.objectContaining({ disabled: 1, enabled: 0 }));
  });

  it('анализирует автоматизацию с 01.04.2026 по сегодня, а не по диапазону из UI (продуктовое решение, расходится с буквальным текстом docs-agent.md 2.6.4)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-23T12:00:00.000Z'));
    try {
      const prisma = {
        cabinet: { findUnique: jest.fn().mockResolvedValue({ providerProjectId: 42, autoCleanupEnabled: false, autoManagementEnabled: false, minContactsPerLead: 5, minConversion: new Prisma.Decimal(10) }) },
        sourceTag: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn(), upsert: jest.fn() }, $transaction: jest.fn(),
      };
      const getTags = jest.fn().mockResolvedValue({ items: [], total: 0 });
      const result = await new SourcesService(prisma as never, { updateTags: jest.fn(), getTags } as never, {} as never).automate('cab');
      expect(result).toEqual(expect.objectContaining({ analysisFrom: '2026-04-01', analysisTo: '2026-08-23' }));
      const range = getTags.mock.calls[0]![1];
      expect(range.startDate).toBe('2026-04-01');
      expect(range.endDate).toBe('2026-08-23');
    } finally {
      jest.useRealTimers();
    }
  });
});
