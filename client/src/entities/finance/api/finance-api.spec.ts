import { mapPaymentFromApi, mapSummaryFromApi } from './finance-api';

describe('finance API contract', () => {
  it('maps Decimal, uppercase status and ISO datetime', () => {
    expect(mapPaymentFromApi({ id: 'p1', amount: '1250.50', quantity: 5, status: 'PENDING', createdAt: '2026-08-20T10:00:00Z', tochkaDocumentId: 'doc-1' }))
      .toEqual({ id: 'p1', amount: 1250.5, quantity: 5, status: 'pending', createdAt: '2026-08-20', documentId: 'doc-1' });
  });

  it('uses backend balance counters as spent/total units', () => {
    expect(mapSummaryFromApi({ totalUnits: 200, usedUnits: 35, moneyBalance: '-500.25' }))
      .toEqual({ unitBalance: { totalUnits: 200, usedUnits: 35 }, moneyBalance: -500.25 });
  });
});
