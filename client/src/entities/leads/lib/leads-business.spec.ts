import { filterLeads } from './filterLeads';
import { DEFAULT_LEAD_STATUS, LEAD_STATUS_OPTIONS } from './status';
import type { Lead } from '../model/types';

const lead = (id: string, phone: string, date: string, status: Lead['status']): Lead => ({
  id, displayId: id === 'LEAD-ABC' ? '101' : '202', mobileTel: phone, successDate: date, status, name: '', site: '', recordings: [], feedback: '', amount: null,
});
const leads = [lead('LEAD-ABC', '79991234567', '2026-08-10', 'not_processed'), lead('LEAD-XYZ', '78880000000', '2026-08-20', 'purchased')];

describe('лиды: бизнес-правила 1.6', () => {
  it('имеет пять статусов и дефолт «не обработан»', () => {
    expect(DEFAULT_LEAD_STATUS).toBe('not_processed');
    expect(LEAD_STATUS_OPTIONS.map((item) => item.label)).toEqual(['не обработан', 'переговоры', 'не целевой', 'отказ', 'купил']);
  });

  it('ищет ID без учёта регистра', () => {
    expect(filterLeads(leads, { range: { from: '2026-08-01', to: '2026-08-31' }, status: 'all', search: 'abc' })).toEqual([leads[0]]);
  });

  it('ищет телефон, игнорируя символы в запросе', () => {
    expect(filterLeads(leads, { range: { from: '2026-08-01', to: '2026-08-31' }, status: 'all', search: '+7 (999) 123' })).toEqual([leads[0]]);
  });

  it('совмещает поиск, период и статус', () => {
    expect(filterLeads(leads, { range: { from: '2026-08-15', to: '2026-08-31' }, status: 'purchased', search: '' })).toEqual([leads[1]]);
  });
});
