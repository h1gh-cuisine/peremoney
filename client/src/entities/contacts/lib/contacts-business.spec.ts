import { filterContacts } from './filterContacts';
import { CONTACT_STATUS_OPTIONS, getContactStatusLabel } from './status';
import type { Contact } from '../model/types';

const contacts: Contact[] = [
  { id: '1', date: '2026-08-01', status: 'new', mobileTel: '1', site: 'a', mobileOperator: '' },
  { id: '2', date: '2026-08-15', status: 'success', mobileTel: '2', site: 'b', mobileOperator: '' },
  { id: '3', date: '2026-09-01', status: 'recall', mobileTel: '3', site: 'c', mobileOperator: '' },
];

describe('контакты: бизнес-правила 1.5 и 2.5', () => {
  it.each([
    ['new', 'НОВЫЙ'], ['noAnswerFinal', 'НЕДОЗВОН'], ['recall', 'ПЕРЕЗВОНИТЬ'],
    ['notRelevant', 'НЕ КВАЛ'], ['success', 'КВАЛ'],
  ])('показывает статус %s как %s', (status, label) => {
    expect(getContactStatusLabel(status)).toBe(label);
  });

  it('скрывает любой неразрешённый статус', () => {
    expect(getContactStatusLabel('repeat')).toBe('');
    expect(getContactStatusLabel('noAnswer3')).toBe('');
    expect(CONTACT_STATUS_OPTIONS).toHaveLength(5);
  });

  it('фильтрует период включительно и статус локально', () => {
    expect(filterContacts(contacts, { range: { from: '2026-08-01', to: '2026-08-15' }, status: 'success' }))
      .toEqual([contacts[1]]);
  });
});
