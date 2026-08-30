import { buildTochkaInvoice } from './tochka-invoice';

describe('buildTochkaInvoice', () => {
  it('builds the documented B2B service invoice without VAT', () => {
    expect(buildTochkaInvoice({
      customerCode: '305541696', accountId: 'account-1', invoiceNo: '42',
      quantity: 2, unitPrice: 1250, payer: {
        organizationName: 'ООО Клиент', inn: '6450000000', legalAddress: 'Саратов',
        bankName: 'ПАО Сбербанк', kpp: '645001001',
      }, positionName: 'Неисключительная лицензия на использование ПО', unitCode: 'лицензия',
      basedOn: 'Договор № 451 от 2026-08-21',
    })).toEqual({ Data: {
      customerCode: '305541696', accountId: 'account-1',
      SecondSide: { type: 'company', taxCode: '6450000000', kpp: '645001001',
        secondSideName: 'ООО Клиент', legalAddress: 'Саратов', bankName: 'ПАО Сбербанк' },
      Content: { Invoice: {
        number: '42', basedOn: 'Договор № 451 от 2026-08-21',
        totalAmount: 2500, totalNds: 0,
        Positions: [{ positionName: 'Неисключительная лицензия на использование ПО', unitCode: 'лицензия', ndsKind: 'without_nds',
          price: 1250, quantity: 2, totalAmount: 2500, totalNds: 0 }],
      } },
    } });
  });

  it('detects an individual entrepreneur by a 12-digit INN', () => {
    expect(buildTochkaInvoice({ customerCode: 'c', accountId: 'a', invoiceNo: '7', quantity: 1,
      unitPrice: 100, payer: { organizationName: 'ИП Иванов', inn: '645000000000' },
      positionName: 'Услуги', unitCode: 'лицензия', basedOn: 'Публичная оферта' }).Data.SecondSide.type).toBe('ip');
  });
});
