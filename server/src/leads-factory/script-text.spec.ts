import { providerScriptToText } from './script-text';

describe('providerScriptToText', () => {
  it('выделяет читаемый текст из HTML Leads Factory', () => {
    expect(providerScriptToText('<style>p{color:red}</style><h1>Схема</h1><p>Привет&nbsp;&mdash; мир</p><ul><li>Шаг 1</li><li>Шаг 2</li></ul>'))
      .toBe('Схема\nПривет — мир\n\u2022 Шаг 1\n\u2022 Шаг 2');
  });

  it('не переносит в текст картинки, CSS и JavaScript', () => {
    expect(providerScriptToText('<script>alert(1)</script><img src="x"><p>Текст</p>')).toBe('Текст');
    expect(providerScriptToText(null)).toBeNull();
  });
});
