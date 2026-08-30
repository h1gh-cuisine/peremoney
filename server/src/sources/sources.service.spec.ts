import { LeadSaleStatus, Prisma } from '@prisma/client';
import { SourcesService } from './sources.service';

describe('источники: бизнес-правила 2.6', () => {
  it('включает тег как norm_work=true, limit=50', async () => {
    const update = jest.fn(); const updateTag = jest.fn();
    const service = new SourcesService({ sourceTag: { findFirst: jest.fn().mockResolvedValue({ id: 'tag', providerTagId: 7 }), update } } as never, { updateTag } as never, {} as never);
    await service.toggle('cab', '7', true);
    expect(updateTag).toHaveBeenCalledWith(7, true);
    expect(update).toHaveBeenCalledWith({ where: { id: 'tag' }, data: { normWork: true, limit: 50 } });
  });

  it('считает продажи и долю нецелевых по совпавшему site', async () => {
    const prisma = {
      sourceTag: { findMany: jest.fn().mockResolvedValue([{ id: 'local-uuid', providerTagId: 731, name: 'site', success: 4 }]), count: jest.fn().mockResolvedValue(1) },
      lead: { findMany: jest.fn().mockResolvedValue([
        { saleStatus: LeadSaleStatus.NOT_TARGET, contact: { site: 'site' } },
        { saleStatus: LeadSaleStatus.NOT_TARGET, contact: { site: 'site' } },
        { saleStatus: LeadSaleStatus.BOUGHT, contact: { site: 'site' } },
        { saleStatus: LeadSaleStatus.BOUGHT, contact: { site: 'other' } },
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
    });
    const service = new SourcesService({ cabinet: { findUnique } } as never, {} as never, {} as never);
    await expect(service.getAutomation('cab')).resolves.toEqual({
      autoCleanupEnabled: true, autoManageEnabled: false, minContactsPerLead: 6, minConversion: 15,
    });
  });

  it('разделяет автоочистку и автоуправление по порогам', async () => {
    const tags = [
      { id: 'bad', providerTagId: 1, newAnswer: 10, conversion: new Prisma.Decimal(5) },
      { id: 'good', providerTagId: 2, newAnswer: 10, conversion: new Prisma.Decimal(20) },
    ];
    const updateTags = jest.fn(); const updateMany = jest.fn();
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({ providerProjectId: 42, autoCleanupEnabled: true, autoManagementEnabled: true, minContactsPerLead: 5, minConversion: new Prisma.Decimal(10) }) },
      sourceTag: { findMany: jest.fn().mockResolvedValue(tags), updateMany, upsert: jest.fn() }, $transaction: jest.fn(),
    };
    const getTags = jest.fn().mockResolvedValue({ items: [], total: 0 });
    const result = await new SourcesService(prisma as never, { updateTags, getTags } as never, {} as never).automate('cab');
    expect(updateTags).toHaveBeenNthCalledWith(1, [1], false);
    expect(updateTags).toHaveBeenNthCalledWith(2, [2], true);
    expect(result).toEqual(expect.objectContaining({ disabled: 1, enabled: 1 }));
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
