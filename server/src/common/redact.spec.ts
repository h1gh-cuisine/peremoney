import { Prisma } from '@prisma/client';
import { redact } from './redact';

describe('redact', () => {
  it('masks known secret keys at any depth, case-insensitively', () => {
    expect(redact({ password: 'x', nested: { Token: 'y', botToken: 'z' } })).toEqual({
      password: '[REDACTED]', nested: { Token: '[REDACTED]', botToken: '[REDACTED]' },
    });
  });

  it('leaves ordinary business fields untouched', () => {
    expect(redact({ login: 'client', amount: 100 })).toEqual({ login: 'client', amount: 100 });
  });

  it('redacts secret keys inside arrays and returns non-objects as-is', () => {
    expect(redact([{ secret: 'a' }, { name: 'b' }])).toEqual([{ secret: '[REDACTED]' }, { name: 'b' }]);
    expect(redact('plain')).toBe('plain');
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
  });

  it('serializes Prisma.Decimal via toJSON instead of walking its internal fields', () => {
    // Object.entries на Decimal раньше вытаскивало служебные s/e/d и даже
    // `constructor` (own-свойство у decimal.js) — Postgres не мог сохранить это
    // как JSON ("could not serialize [object Function]"), реально ломало запись
    // аудит-лога при создании кабинета (Cabinet.price/moneyBalance — Decimal).
    expect(redact({ price: new Prisma.Decimal(1500) })).toEqual({ price: '1500' });
  });

  it('serializes Date via toJSON (ISO string), not as an empty object', () => {
    expect(redact({ createdAt: new Date('2026-09-02T08:35:48.000Z') }))
      .toEqual({ createdAt: '2026-09-02T08:35:48.000Z' });
  });
});
