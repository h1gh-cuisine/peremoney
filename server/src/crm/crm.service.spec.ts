import { LeadSaleStatus } from '@prisma/client';
import { CrmService } from './crm.service';

describe('CRM: бизнес-правила 1.5–1.6', () => {
  it('добавляет перевод статуса и скрывает неизвестный', async () => {
    const prisma = { contact: { findMany: jest.fn().mockResolvedValue([{ status: 'new' }, { status: 'repeat' }]) } };
    const result = await new CrmService(prisma as never, {} as never).listContacts('cab', {});
    expect(result.map((item) => item.displayStatus)).toEqual(['НОВЫЙ', '']);
  });

  it('делает dateTo включительным до конца дня', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    await new CrmService({ contact: { findMany } } as never, {} as never).listContacts('cab', { dateTo: '2026-08-20' });
    expect(findMany.mock.calls[0][0].where.date.lte.toISOString()).toBe('2026-08-20T23:59:59.999Z');
  });

  it('ищет цифровой запрос и по телефону, и по provider ID', async () => {
    const findMany = jest.fn();
    new CrmService({ lead: { findMany } } as never, {} as never).listLeads('cab', { search: '123' });
    expect(findMany.mock.calls[0][0].where.OR).toEqual([
      { contact: { mobileTel: { contains: '123' } } }, { contact: { providerAnswerId: 123 } },
    ]);
  });

  it('обновляет только клиентские поля лида', async () => {
    const update = jest.fn();
    const prisma = { lead: { findFirst: jest.fn().mockResolvedValue({ id: 'lead' }), update } };
    await new CrmService(prisma as never, {} as never).updateLead('cab', 'lead', { feedback: 'ok', saleStatus: LeadSaleStatus.BOUGHT, amount: 500 });
    expect(update.mock.calls[0][0].data).toEqual(expect.objectContaining({ feedback: 'ok', saleStatus: LeadSaleStatus.BOUGHT }));
    expect(update.mock.calls[0][0].data).not.toHaveProperty('successDate');
  });
});
