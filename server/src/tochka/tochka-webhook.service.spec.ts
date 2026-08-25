import { PaymentStatus, Prisma, ProjectType } from '@prisma/client';
import { TochkaWebhookService } from './tochka-webhook.service';

describe('TochkaWebhookService', () => {
  const event = { paymentId: 'bank-1', webhookType: 'incomingPayment', purpose: 'Оплата счета №42', date: '2026-08-21',
    SidePayer: { inn: '6450000000', amount: '2500.00', currency: 'RUB', name: 'ООО Клиент' } };

  function setup(options: { duplicate?: boolean; match?: boolean } = { match: true }) {
    const tx = {
      tochkaWebhookEvent: { findUnique: jest.fn().mockResolvedValue(options.duplicate ? { id: 'old' } : null), create: jest.fn() },
      payment: {
        findMany: jest.fn().mockResolvedValue(options.match === false ? [] : [{ id: 'pay', cabinetId: 'cab', invoiceNo: '42', payerInn: '6450000000',
          amount: new Prisma.Decimal(2500), quantity: 10, projectType: ProjectType.VDL, status: PaymentStatus.PENDING }]),
        update: jest.fn().mockResolvedValue({ id: 'pay', status: PaymentStatus.PAID }),
      },
      cabinet: { findUniqueOrThrow: jest.fn().mockResolvedValue({ balanceType: ProjectType.VDL }), update: jest.fn() },
      balanceEntry: { create: jest.fn() },
    };
    const prisma = { $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) };
    const telegram = { notify: jest.fn().mockResolvedValue(undefined) };
    return { service: new TochkaWebhookService(prisma as never, {} as never, telegram as never), tx, telegram };
  }

  it('atomically marks an exact payment paid and credits balance', async () => {
    const { service, tx, telegram } = setup();
    await expect(service.processVerified(event)).resolves.toEqual({ ok: true, status: 'matched' });
    expect(tx.balanceEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ externalKey: 'TOCHKA:bank-1' }) });
    expect(tx.payment.update).toHaveBeenCalledWith({ where: { id: 'pay' }, data: expect.objectContaining({ status: PaymentStatus.PAID, bankPaymentId: 'bank-1' }) });
    expect(tx.tochkaWebhookEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'MATCHED', paymentId: 'pay' }) });
    expect(telegram.notify).toHaveBeenCalledWith(expect.stringContaining('2500.00'));
  });

  it('acknowledges a duplicate without balance changes or another notification', async () => {
    const { service, tx, telegram } = setup({ duplicate: true });
    await expect(service.processVerified(event)).resolves.toEqual({ ok: true, status: 'duplicate' });
    expect(tx.cabinet.update).not.toHaveBeenCalled();
    expect(telegram.notify).not.toHaveBeenCalled();
  });

  it('audits and notifies an unmatched payment without crediting balance', async () => {
    const { service, tx, telegram } = setup({ match: false });
    await expect(service.processVerified(event)).resolves.toEqual({ ok: true, status: 'unmatched' });
    expect(tx.tochkaWebhookEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'UNMATCHED' }) });
    expect(tx.cabinet.update).not.toHaveBeenCalled();
    expect(telegram.notify).toHaveBeenCalledWith(expect.stringContaining('Не удалось сопоставить'));
  });

  it('acknowledges the committed payment when Telegram is unavailable', async () => {
    const { service, telegram } = setup();
    telegram.notify.mockRejectedValueOnce(new Error('telegram unavailable'));
    await expect(service.processVerified(event)).resolves.toEqual({ ok: true, status: 'matched' });
  });
});
