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
});
