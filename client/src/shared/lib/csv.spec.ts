import { buildCsv } from './csv';
describe('buildCsv', () => {
  it('uses Excel BOM, semicolon delimiter, CRLF and escapes quotes', () => {
    expect(buildCsv(['Имя','Комментарий'], [['ООО;Тест','Он сказал "да"']]))
      .toBe('\uFEFF"Имя";"Комментарий"\r\n"ООО;Тест";"Он сказал ""да"""');
  });
  it.each(['=2+2', '+cmd', '-10+20', '@SUM(A1:A2)', '  =HYPERLINK("https://evil")'])(
    'neutralizes Excel formula input %s', (value) => {
      expect(buildCsv(['Значение'], [[value]])).toContain(`"'${value.replace(/"/g, '""')}"`);
    },
  );
});
