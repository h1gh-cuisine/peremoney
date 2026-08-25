import { contactStatusLabel } from './contact-status';

describe('contactStatusLabel', () => {
  it.each([
    ['new', 'НОВЫЙ'], ['noAnswerFinal', 'НЕДОЗВОН'], ['recall', 'ПЕРЕЗВОНИТЬ'],
    ['notRelevant', 'НЕ КВАЛ'], ['success', 'КВАЛ'], ['experiment', ''],
  ])('maps %s to %s', (status, label) => expect(contactStatusLabel(status)).toBe(label));
});
