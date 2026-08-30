import { buildTochkaClosingAct } from './tochka-closing-document';

describe('buildTochkaClosingAct', () => {
  it('builds an Act payload supported by Tochka closing documents API', () => {
    const result = buildTochkaClosingAct({
      customerCode: 'customer', accountId: 'account', documentNo: '42', basedOn: 'Договор № 1',
      payer: { organizationName: 'ООО Клиент', inn: '6450000001', kpp: '645001001' },
      positions: [{ positionName: 'Информационные услуги', unitCode: 'услуга.', ndsKind: 'without_nds', price: 125, quantity: 10, totalAmount: 1250 }],
    });
    expect(result).toEqual({ Data: expect.objectContaining({
      customerCode: 'customer', accountId: 'account',
      SecondSide: expect.objectContaining({ type: 'company', taxCode: '6450000001', kpp: '645001001' }),
      Content: { Act: expect.objectContaining({ number: '42', basedOn: 'Договор № 1', totalAmount: 1250 }) },
    }) });
  });
});
