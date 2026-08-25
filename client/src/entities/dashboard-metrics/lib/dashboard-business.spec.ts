import { aggregateDashboardMetrics, buildContactsLeadsSeries } from './aggregateMetrics';
import type { Contact } from '@/entities/contacts';
import type { Lead } from '@/entities/leads';

const contacts = [{ id: 'c1', date: '2026-08-01' }, { id: 'c2', date: '2026-08-02' }, { id: 'c3', date: '2026-09-01' }]
  .map((c) => ({ ...c, status: 'new', mobileTel: '', site: '', mobileOperator: '' })) as Contact[];
const leads = [
  { id: 'l1', successDate: '2026-08-01', status: 'purchased', amount: 1000 },
  { id: 'l2', successDate: '2026-08-02', status: 'not_relevant', amount: 5000 },
  { id: 'l3', successDate: '2026-09-01', status: 'purchased', amount: 9000 },
].map((l) => ({ ...l, mobileTel: '', name: '', site: '', recordings: [], feedback: '' })) as Lead[];

describe('дашборд: формулы 2.4', () => {
  it('считает все восемь метрик за период', () => {
    expect(aggregateDashboardMetrics(contacts, leads, { from: '2026-08-01', to: '2026-08-31' }, 400)).toEqual({
      contactsReceived: 2, leadsQualified: 2, sold: 1, crToSale: 50, revenue: 1000,
      cpl: 200, avgCheck: 1000, saleCost: 400,
    });
  });

  it('не делит на ноль', () => {
    const result = aggregateDashboardMetrics([], [], { from: '2026-08-01', to: '2026-08-01' }, 100);
    expect(result).toMatchObject({ crToSale: 0, cpl: 0, avgCheck: 0, saleCost: 0 });
  });

  it('строит нулевые точки для дней без данных', () => {
    expect(buildContactsLeadsSeries(contacts, leads, { from: '2026-08-01', to: '2026-08-03' })).toEqual([
      { date: '2026-08-01', contacts: 1, leads: 1 }, { date: '2026-08-02', contacts: 1, leads: 1 },
      { date: '2026-08-03', contacts: 0, leads: 0 },
    ]);
  });
});
