import { computeExpected, computeLtv, computeTotalPayments } from './financeMetrics';
import type { Payment } from '../model/types';

describe('финансы UI: бизнес-правила 1.9', () => {
  const payments: Payment[] = [
    { id: '1', amount: 100, quantity: 1, status: 'paid', createdAt: '2026-08-01' },
    { id: '2', amount: 250, quantity: 2, status: 'pending', createdAt: '2026-08-02' },
    { id: '3', amount: -20, quantity: 0, status: 'paid', createdAt: '2026-08-03' },
  ];
  it('LTV суммирует только фактические оплаты', () => expect(computeLtv(payments)).toBe(80));
  it('ожидаемое суммирует только pending', () => expect(computeExpected(payments)).toBe(250));
  it('всего оплат считает весь список', () => expect(computeTotalPayments(payments)).toBe(3));
  it('не считает несозданный счёт ожидаемой оплатой', () => {
    const failed: Payment = { id: '4', amount: 500, quantity: 2, status: 'pending', invoiceCreationStatus: 'failed', createdAt: '2026-08-04' };
    expect(computeExpected([...payments, failed])).toBe(250);
    expect(computeTotalPayments([...payments, failed])).toBe(3);
  });
});
