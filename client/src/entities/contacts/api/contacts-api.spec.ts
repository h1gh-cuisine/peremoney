import { mapContactFromApi } from './contacts-api';

describe('contacts API contract', () => {
  it('maps backend contact fields to the readonly UI model', () => {
    expect(mapContactFromApi({
      id: 'contact-1', date: '2026-08-20T08:30:00.000Z', status: 'success',
      mobileTel: '79991234567', site: null, mobileOperator: null,
    })).toEqual({
      id: 'contact-1', date: '2026-08-20', status: 'success',
      mobileTel: '79991234567', site: '', mobileOperator: '',
    });
  });
});
