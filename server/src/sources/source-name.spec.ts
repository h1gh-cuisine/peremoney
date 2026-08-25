import { parseSourceName } from './source-name';

describe('parseSourceName', () => {
  it('removes provider prefix and suffix and maps operator', () => {
    expect(parseSourceName('B111_74951270967_20168')).toEqual({ name: '74951270967', operator: 'Ростелеком' });
    expect(parseSourceName('B223_site.ru_99')).toEqual({ name: 'site.ru', operator: 'Билайн' });
  });

  it('keeps unknown formats without losing data', () => {
    expect(parseSourceName('site.ru')).toEqual({ name: 'site.ru', operator: null });
  });
});
