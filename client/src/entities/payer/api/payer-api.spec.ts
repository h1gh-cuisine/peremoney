import { mapPayerFromApi } from './payer-api';

describe('payer API contract', () => {
  it('reads flexible profile data and fills missing form fields', () => {
    expect(mapPayerFromApi({ id: 'profile', data: { organizationName: 'ООО Тест', inn: '123' } })).toEqual({
      organizationName: 'ООО Тест', inn: '123', kpp: '', ogrn: '', legalAddress: '', bankName: '', bik: '',
      checkingAccount: '', correspondentAccount: '', phone: '', email: '',
    });
    expect(mapPayerFromApi(null).organizationName).toBe('');
  });
});
