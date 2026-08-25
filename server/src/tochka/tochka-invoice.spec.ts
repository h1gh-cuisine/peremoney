import { buildTochkaInvoice } from './tochka-invoice';

describe('buildTochkaInvoice', () => {
  it('builds the documented B2B service invoice without VAT', () => {
    expect(buildTochkaInvoice({
      customerCode: '305541696', accountId: 'account-1', invoiceNo: '42',
      quantity: 2, unitPrice: 1250, payer: {
        organizationName: 'ООО Клиент', inn: '6450000000', legalAddress: 'Саратов',
        checkingAccount: '40702810000000000000', kpp: '645001001',
      }, expiryDate: '2026-08-26', positionName: 'Информационные услуги',
    })).toEqual({ Data: {
      customerCode: '305541696', accountId: 'account-1',
      SecondSide: { type: 'company', taxCode: '6450000000', kpp: '645001001',
        secondSideName: 'ООО Клиент', legalAddress: 'Саратов', accountId: '40702810000000000000' },
      Content: { Invoice: {
        number: '42', paymentExpiryDate: '2026-08-26', totalAmount: 2500, totalNds: 0,
        Positions: [{ positionName: 'Информационные услуги', unitCode: 'услуга.', ndsKind: 'without_nds',
          price: 1250, quantity: 2, totalAmount: 2500, totalNds: 0 }],
      } },
    } });
  });

  it('detects an individual entrepreneur by a 12-digit INN', () => {
    expect(buildTochkaInvoice({ customerCode: 'c', accountId: 'a', invoiceNo: '7', quantity: 1,
      unitPrice: 100, payer: { organizationName: 'ИП Иванов', inn: '645000000000' },
      expiryDate: '2026-08-26', positionName: 'Услуги' }).Data.SecondSide.type).toBe('ip');
  });
});
