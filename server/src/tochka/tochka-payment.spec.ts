import { matchIncomingPayment } from './tochka-payment';

describe('matchIncomingPayment', () => {
  const invoice = { invoiceNo: '42', payerInn: '6450000000', amount: '2500.00' };

  it('matches only exact INN, amount and invoice number in purpose', () => {
    expect(matchIncomingPayment({ paymentId: 'bank-1', purpose: 'Оплата по счету №42',
      SidePayer: { inn: '6450000000', amount: '2500.00', currency: 'RUB' } }, invoice)).toBe(true);
  });

  it.each([
    [{ paymentId: '1', purpose: 'Счет 42', SidePayer: { inn: 'wrong', amount: '2500.00', currency: 'RUB' } }],
    [{ paymentId: '2', purpose: 'Счет 42', SidePayer: { inn: '6450000000', amount: '2499.99', currency: 'RUB' } }],
    [{ paymentId: '3', purpose: 'Другой счет', SidePayer: { inn: '6450000000', amount: '2500.00', currency: 'RUB' } }],
    [{ paymentId: '4', purpose: 'Счет 42', SidePayer: { inn: '6450000000', amount: '2500.00', currency: 'USD' } }],
  ])('rejects a non-exact payment', (event) => expect(matchIncomingPayment(event, invoice)).toBe(false));
});
