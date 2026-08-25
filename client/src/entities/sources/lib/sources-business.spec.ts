import { parseBulkInput } from '@/features/sources-add/lib/parseBulkInput';
import { filterSources } from './filterSources';
import { operatorTagOptions, parseSourceTag } from './operatorPrefix';
import type { Source } from '../model/types';

const source = (id: string, leads: number, active: boolean): Source => ({ id, leads, active, name: id, operator: '', contacts: 0, conversion: 0, cost: 0, notRelevantShare: 0, sales: 0, sourceType: 'phone' });

describe('источники: бизнес-правила 1.7 и 2.6', () => {
  it('показывает только реальные типы провайдера с подтверждённым оператором', () => {
    expect(operatorTagOptions(['B222', 'B221', 'B223', 'B111', 'B333'])).toEqual([
      { value: 'B222', label: 'Билайн (B222)' },
      { value: 'B223', label: 'Билайн (B223)' },
      { value: 'B111', label: 'Ростелеком (B111)' },
      { value: 'B333', label: 'МТС (B333)' },
    ]);
  });

  it.each([
    ['B111_74951270967_20168', '74951270967', 'Ростелеком'],
    ['B222_site.ru_99', 'site.ru', 'Билайн'],
    ['B333_sub_domain.ru_42', 'sub_domain.ru', 'МТС'],
    ['B444_79990000000_1', '79990000000', 'Мегафон'],
  ])('очищает %s', (raw, name, operator) => expect(parseSourceTag(raw)).toEqual({ name, operator }));

  it('не разрушает тег неизвестного формата', () => {
    expect(parseSourceTag('site.ru')).toEqual({ name: 'site.ru', operator: '' });
  });

  it('фильтрует только активные источники с лидами', () => {
    const values = [source('a', 0, true), source('b', 1, false), source('c', 2, true)];
    expect(filterSources(values, { onlyWithLeads: true, status: 'active' })).toEqual([values[2]]);
  });

  it('разбирает массовый ввод по строкам, запятым и точкам с запятой', () => {
    expect(parseBulkInput('7999\n site.ru,foo.ru;  bar.ru ')).toEqual(['7999', 'site.ru', 'foo.ru', 'bar.ru']);
  });
});
