import { PaymentStatus, Prisma, ProjectType } from '@prisma/client';
import { TochkaWebhookService } from './tochka-webhook.service';

describe('TochkaWebhookService', () => {
  const event = { paymentId: 'bank-1', webhookType: 'incomingPayment', purpose: 'Оплата счета №42', date: '2026-08-21',
    SidePayer: { inn: '6450000000', amount: '2500.00', currency: 'RUB', name: 'ООО Клиент' } };

  function setup(options: { duplicate?: boolean; match?: boolean } = { match: true }) {
    const prisma = {
      tochkaWebhookEvent: { findUnique: jest.fn().mockResolvedValue(options.duplicate ? { id: 'old' } : null), create: jest.fn() },
      payment: {
        findMany: jest.fn().mockResolvedValue(options.match === false ? [] : [{ id: 'pay', cabinetId: 'cab', invoiceNo: '42', payerInn: '6450000000',
          amount: new Prisma.Decimal(2500), quantity: 10, projectType: ProjectType.VDL, status: PaymentStatus.PENDING }]),
      },
    };
    const telegram = { notify: jest.fn().mockResolvedValue(undefined) };
    const finance = { setPaymentStatus: jest.fn().mockResolvedValue({ id: 'pay', status: PaymentStatus.PAID }) };
    return {
      service: new TochkaWebhookService(prisma as never, {} as never, telegram as never, finance as never),
      prisma, telegram, finance,
    };
  }

  it('credits the matched payment through the same guarded path as the invoice poller', async () => {
    const { service, prisma, telegram, finance } = setup();
    await expect(service.processVerified(event)).resolves.toEqual({ ok: true, status: 'matched' });
    expect(finance.setPaymentStatus).toHaveBeenCalledWith('pay', PaymentStatus.PAID, undefined, 'bank-1', {
      paidAt: new Date('2026-08-21'), paymentPurpose: 'Оплата счета №42',
    });
    expect(prisma.tochkaWebhookEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'MATCHED', paymentId: 'pay' }) });
    expect(telegram.notify).toHaveBeenCalledWith(expect.stringContaining('2500.00'));
  });

  it('acknowledges a duplicate without touching the payment or notifying again', async () => {
    const { service, finance, telegram } = setup({ duplicate: true });
    await expect(service.processVerified(event)).resolves.toEqual({ ok: true, status: 'duplicate' });
    expect(finance.setPaymentStatus).not.toHaveBeenCalled();
    expect(telegram.notify).not.toHaveBeenCalled();
  });

  it('audits and notifies an unmatched payment without crediting balance', async () => {
    const { service, prisma, finance, telegram } = setup({ match: false });
    await expect(service.processVerified(event)).resolves.toEqual({ ok: true, status: 'unmatched' });
    expect(prisma.tochkaWebhookEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ status: 'UNMATCHED' }) });
    expect(finance.setPaymentStatus).not.toHaveBeenCalled();
    expect(telegram.notify).toHaveBeenCalledWith(expect.stringContaining('Не удалось сопоставить'));
  });

  it('acknowledges the committed payment when Telegram is unavailable', async () => {
    const { service, telegram } = setup();
    telegram.notify.mockRejectedValueOnce(new Error('telegram unavailable'));
    await expect(service.processVerified(event)).resolves.toEqual({ ok: true, status: 'matched' });
  });
});
