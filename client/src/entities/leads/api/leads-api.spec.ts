import { leadPatchToApi, mapLeadFromApi, mapRecordingsFromApi } from './leads-api';

const apiLead = {
  id: 'lead-1', successDate: '2026-08-20T08:30:00.000Z', comment: null,
  feedback: 'перезвонить', saleStatus: 'BOUGHT' as const, amount: '1250.50',
  contact: { providerAnswerId: 42, mobileTel: '79991234567', site: null },
};

describe('leads API contract', () => {
  it('maps backend lead, nested contact and Prisma decimal to the UI model', () => {
    expect(mapLeadFromApi(apiLead)).toEqual({
      id: 'lead-1', displayId: '42', successDate: '2026-08-20', mobileTel: '79991234567', name: '', site: '',
      recordings: [], feedback: 'перезвонить', status: 'purchased', amount: 1250.5,
    });
  });

  it('maps all editable UI fields back to backend enum names', () => {
    expect(leadPatchToApi({ feedback: 'готов', status: 'not_relevant', amount: null }))
      .toEqual({ feedback: 'готов', saleStatus: 'NOT_TARGET', amount: 0 });
  });

  it('accepts provider recording shapes without coupling the table to provider API', () => {
    expect(mapRecordingsFromApi([{ id: 7, link: 'https://audio/7', date: '2026-08-20T09:00:00Z' }]))
      .toEqual([{ id: '7', link: 'https://audio/7', date: '2026-08-20T09:00:00Z' }]);
  });
});
