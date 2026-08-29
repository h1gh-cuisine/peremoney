import { PaymentStatus } from '@prisma/client';
import { TochkaInvoicePollerService } from './tochka-invoice-poller.service';

describe('TochkaInvoicePollerService', () => {
  it('marks an invoice paid when Tochka reports payment_paid', async () => {
    const findMany = jest.fn()
      .mockResolvedValueOnce([{ id: 'payment-1', tochkaDocumentId: 'document-1', invoiceNo: '20260828-1', createdAt: new Date('2026-08-28T10:00:00Z') }])
      .mockResolvedValueOnce([{ id: 'payment-1', invoiceNo: '20260828-1', legalEntity: 'ООО Клиент', payerInn: '6450000000',
        amount: { toString: () => '2500.00' }, quantity: 10, cabinet: { name: 'Проект A' } }]);
    const prisma = { payment: { findMany, updateMany: jest.fn() } };
    const tochka = { getInvoicePaymentStatus: jest.fn().mockResolvedValue('payment_paid') };
    const finance = { setPaymentStatus: jest.fn() };
    const telegram = { notify: jest.fn() };
    const service = new TochkaInvoicePollerService(prisma as never, tochka as never, finance as never, {} as never, telegram as never);

    await service.runOnce();

    expect(finance.setPaymentStatus).toHaveBeenCalledWith(
      'payment-1', PaymentStatus.PAID, undefined, 'TOCHKA_INVOICE:document-1',
      { paymentPurpose: 'Обоснование: оплата по счёту № 20260828-1 от 28.08.2026' },
    );
    expect(telegram.notify).toHaveBeenCalledWith(expect.stringMatching(/Проект A[\s\S]*2500\.00 ₽[\s\S]*20260828-1/));
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'payment-1', telegramNotifiedAt: null },
    }));
  });

  it('leaves a waiting invoice pending', async () => {
    const prisma = { payment: { findMany: jest.fn()
      .mockResolvedValueOnce([{ id: 'payment-1', tochkaDocumentId: 'document-1' }])
      .mockResolvedValueOnce([]) } };
    const tochka = { getInvoicePaymentStatus: jest.fn().mockResolvedValue('payment_waiting') };
    const finance = { setPaymentStatus: jest.fn() };
    const telegram = { notify: jest.fn() };
    const service = new TochkaInvoicePollerService(prisma as never, tochka as never, finance as never, {} as never, telegram as never);

    await service.runOnce();

    expect(finance.setPaymentStatus).not.toHaveBeenCalled();
    expect(telegram.notify).not.toHaveBeenCalled();
  });

  it('keeps a confirmed payment committed when Telegram is unavailable', async () => {
    const updateMany = jest.fn();
    const prisma = { payment: { findMany: jest.fn()
      .mockResolvedValueOnce([{ id: 'payment-1', tochkaDocumentId: 'document-1', invoiceNo: '42', createdAt: new Date('2026-08-20T10:00:00Z') }])
      .mockResolvedValueOnce([{ id: 'payment-1', invoiceNo: '42', legalEntity: null, payerInn: null, amount: 100,
        quantity: 1, cabinet: { name: 'Проект' } }]), updateMany } };
    const finance = { setPaymentStatus: jest.fn() };
    const telegram = { notify: jest.fn().mockRejectedValue(new Error('Telegram unavailable')) };
    const service = new TochkaInvoicePollerService(prisma as never,
      { getInvoicePaymentStatus: jest.fn().mockResolvedValue('payment_paid') } as never,
      finance as never, {} as never, telegram as never);

    await expect(service.runOnce()).resolves.toBeUndefined();
    expect(finance.setPaymentStatus).toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
  });
});
