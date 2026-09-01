import { parseSourceName } from './source-name';

describe('parseSourceName', () => {
  it('removes provider prefix and suffix and maps operator', () => {
    expect(parseSourceName('B111_74951270967_20168')).toEqual({ name: '74951270967', operator: 'Ростелеком' });
    expect(parseSourceName('B223_site.ru_99')).toEqual({ name: 'site.ru', operator: 'Билайн' });
    expect(parseSourceName('B1291_example.com_32092309')).toEqual({ name: 'example.com', operator: null });
    expect(parseSourceName('B320_79658824885_093209')).toEqual({ name: '79658824885', operator: null });
    expect(parseSourceName('B320_example.com_093209')).toEqual({ name: 'example.com', operator: null });
    expect(parseSourceName('B222\\_79661569662\\_26013')).toEqual({ name: '79661569662', operator: 'Билайн' });
  });

  it('keeps unknown formats without losing data', () => {
    expect(parseSourceName('site.ru')).toEqual({ name: 'site.ru', operator: null });
  });
});
