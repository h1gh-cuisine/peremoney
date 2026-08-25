import { mapDashboardFromApi } from './dashboard-api';
describe('dashboard API contract', () => {
  it('maps backend metrics and real daily CPL/sale cost', () => {
    expect(mapDashboardFromApi({ metrics: { contacts: 2, qualified: 1, sold: 1, conversion: 100, revenue: 500, cpl: 200, averageCheck: 500, saleCost: 200 }, daily: [{ date: '2026-08-20', contacts: 2, leads: 1, sold: 1, spent: 200, cpl: 200, saleCost: 200 }] })).toEqual(expect.objectContaining({
      metrics: { contactsReceived: 2, leadsQualified: 1, sold: 1, crToSale: 100, revenue: 500, cpl: 200, avgCheck: 500, saleCost: 200 },
      cplSaleCostSeries: [{ date: '2026-08-20', cpl: 200, saleCost: 200 }],
    }));
  });
});
