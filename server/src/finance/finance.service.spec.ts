import { LeadSaleStatus, PaymentStatus, Prisma, ProjectType } from '@prisma/client';
import { FinanceService } from './finance.service';
import { TochkaApiException } from '../tochka/tochka.service';

describe('FinanceService', () => {
  it('creates an invoice using the current tariff price and payer', async () => {
    const create = jest.fn().mockImplementation(({ data }) => ({ id: 'pay', ...data }));
    const update = jest.fn().mockImplementation(({ data }) => ({ id: 'pay', ...data }));
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({
        id: 'cab', price: new Prisma.Decimal(125), type: ProjectType.VDL,
        payerProfile: { data: { organizationName: 'ООО Клиент', inn: '6450000000' } },
      }) },
      payment: { create, update, delete: jest.fn() },
    };
    const tochka = { customerCode: () => 'customer', accountId: () => 'account', createInvoice: jest.fn().mockResolvedValue('doc-1') };
    const result = await new FinanceService(prisma as never, tochka as never).createInvoice('cab', 10, '0eef9960-16f9-4e80-91c9-fb13f44b4361');
    expect(Number(result.payment.amount)).toBe(1250);
    expect(result.payment.legalEntity).toBe('ООО Клиент');
    expect(result.payment.tochkaDocumentId).toBe('doc-1');
    expect(tochka.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ Data: expect.objectContaining({
      customerCode: 'customer', accountId: 'account',
    }) }));
    const bankPayload = tochka.createInvoice.mock.calls[0]![0];
    expect(bankPayload.Data.Content.Invoice.number).toMatch(/^\d+$/);
    expect(typeof bankPayload.Data.Content.Invoice.number).toBe('string');
  });

  it('replays a successful invoice without a second bank POST', async () => {
    const existing = { id: 'pay', invoiceRequestHash: '', invoiceCreationStatus: 'SUCCEEDED', tochkaDocumentId: 'doc-1' };
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({ id: 'cab', price: new Prisma.Decimal(125), type: ProjectType.VDL,
        payerProfile: { data: { organizationName: 'ООО Клиент', inn: '6450000000' } } }) },
      payment: { create: jest.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: '6.19.3' })),
        findUniqueOrThrow: jest.fn().mockImplementation(() => existing) },
    };
    const { createHash } = await import('node:crypto');
    existing.invoiceRequestHash = createHash('sha256').update(JSON.stringify({ cabinetId: 'cab', quantity: 10, unitPrice: '125',
      payer: { organizationName: 'ООО Клиент', inn: '6450000000' } })).digest('hex');
    const tochka = { createInvoice: jest.fn() };
    const result = await new FinanceService(prisma as never, tochka as never).createInvoice('cab', 10, '0eef9960-16f9-4e80-91c9-fb13f44b4361');
    expect(result.replayed).toBe(true);
    expect(tochka.createInvoice).not.toHaveBeenCalled();
  });

  it('marks a deterministic bank validation rejection as FAILED', async () => {
    const update = jest.fn().mockImplementation(({ data }) => ({ id: 'pay', ...data }));
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({
        id: 'cab', price: new Prisma.Decimal(125), type: ProjectType.VDL,
        payerProfile: { data: { organizationName: 'Тест', inn: '0000000000' } },
      }) },
      payment: { create: jest.fn().mockResolvedValue({ id: 'pay' }), update },
    };
    const tochka = { customerCode: () => 'customer', accountId: () => 'account',
      createInvoice: jest.fn().mockRejectedValue(new TochkaApiException(400)) };
    await expect(new FinanceService(prisma as never, tochka as never).createInvoice(
      'cab', 1, '0eef9960-16f9-4e80-91c9-fb13f44b4361',
    )).rejects.toThrow('отклонён (400)');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { invoiceCreationStatus: 'FAILED' } }));
  });

  it('keeps an ambiguous network failure UNCERTAIN', async () => {
    const update = jest.fn().mockImplementation(({ data }) => ({ id: 'pay', ...data }));
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({
        id: 'cab', price: new Prisma.Decimal(125), type: ProjectType.VDL,
        payerProfile: { data: { organizationName: 'Тест', inn: '0000000000' } },
      }) },
      payment: { create: jest.fn().mockResolvedValue({ id: 'pay' }), update },
    };
    const tochka = { customerCode: () => 'customer', accountId: () => 'account',
      createInvoice: jest.fn().mockRejectedValue(new Error('timeout')) };
    await expect(new FinanceService(prisma as never, tochka as never).createInvoice(
      'cab', 1, '0eef9960-16f9-4e80-91c9-fb13f44b4361',
    )).rejects.toThrow('timeout');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { invoiceCreationStatus: 'UNCERTAIN' } }));
  });

  it('replaces the unit limit and resets usage when the paid tariff type changes', async () => {
    const cabinetUpdate = jest.fn();
    const paymentUpdate = jest.fn().mockImplementation(({ data }) => data);
    const tx = {
      $executeRaw: jest.fn(),
      payment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay', cabinetId: 'cab', amount: new Prisma.Decimal(1000), quantity: 20,
          projectType: ProjectType.NUMBERS, status: PaymentStatus.PENDING,
          cabinet: { balanceType: ProjectType.VDL },
        }),
        update: paymentUpdate,
      },
      cabinet: { update: cabinetUpdate }, balanceEntry: { create: jest.fn() }, paymentAudit: { create: jest.fn() },
    };
    const service = new FinanceService({ $transaction: (callback: (value: unknown) => unknown) => callback(tx) } as never);
    await service.setPaymentStatus('pay', PaymentStatus.PAID);
    expect(cabinetUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ balanceType: ProjectType.NUMBERS, totalUnits: 20, usedUnits: 0 }),
    }));
  });

  it('does not allow a bank-confirmed payment to be reverted manually', async () => {
    const tx = { $executeRaw: jest.fn(), payment: { findUnique: jest.fn().mockResolvedValue({
      id: 'pay', status: PaymentStatus.PAID, bankPaymentId: 'bank-1', cabinet: {},
    }) } };
    const service = new FinanceService({ $transaction: (callback: (value: unknown) => unknown) => callback(tx) } as never);
    await expect(service.setPaymentStatus('pay', PaymentStatus.PENDING)).rejects.toThrow('Банковский платёж нельзя отменить вручную');
  });

  it('charges a qualified lead only for the VDL tariff', async () => {
    const update = jest.fn();
    const tx = {
      cabinet: { findUniqueOrThrow: jest.fn().mockResolvedValue({ type: ProjectType.VDL, price: new Prisma.Decimal(300) }), update },
      balanceEntry: { create: jest.fn() },
    };
    const service = new FinanceService({ $transaction: (callback: (value: unknown) => unknown) => callback(tx) } as never);
    expect(await service.chargeUsage('cab', 'lead', 'lead-1')).toBe(true);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      data: { moneyBalance: { decrement: new Prisma.Decimal(300) }, usedUnits: { increment: 1 } },
    }));
  });

  it('calculates client dashboard metrics without division by zero', async () => {
    const prisma = {
      contact: { findMany: jest.fn().mockResolvedValue([{ date: new Date('2026-08-20') }]) },
      lead: { findMany: jest.fn().mockResolvedValue([]) },
      balanceEntry: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const result = await new FinanceService(prisma as never).clientDashboard('cab', {
      dateFrom: '2026-08-01', dateTo: '2026-08-31',
    });
    expect(result.metrics).toMatchObject({ contacts: 1, qualified: 0, conversion: 0, cpl: 0, saleCost: 0 });
  });

  it('calculates daily CPL and sale cost from charges and bought leads', async () => {
    const prisma = {
      contact: { findMany: jest.fn().mockResolvedValue([]) },
      lead: { findMany: jest.fn().mockResolvedValue([{ successDate: new Date('2026-08-20'), saleStatus: LeadSaleStatus.BOUGHT, amount: 1000 }]) },
      balanceEntry: { findMany: jest.fn().mockResolvedValue([{ createdAt: new Date('2026-08-20'), moneyDelta: -200 }]) },
    };
    const result = await new FinanceService(prisma as never).clientDashboard('cab', {});
    expect(result.daily).toEqual([{ date: '2026-08-20', contacts: 0, leads: 1, sold: 1, spent: 200, cpl: 200, saleCost: 200 }]);
  });

  it('excludes failed and uncertain invoice attempts from expected payments', async () => {
    const prisma = {
      cabinet: { findUnique: jest.fn().mockResolvedValue({ moneyBalance: 0, totalUnits: 0, usedUnits: 0, balanceType: null }) },
      payment: { findMany: jest.fn().mockResolvedValue([{ status: PaymentStatus.PENDING, amount: 250 }]) },
    };
    const result = await new FinanceService(prisma as never).summary('cab');
    expect(result.expected).toBe(250);
    expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      OR: expect.arrayContaining([{ invoiceCreationStatus: 'SUCCEEDED' }]),
    }) }));
  });
});
