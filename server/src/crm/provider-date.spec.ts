import { parseProviderDate } from './provider-date';

describe('parseProviderDate', () => {
  it('interprets provider dates without offset as Moscow time', () => {
    expect(parseProviderDate('2026-08-16 12:30:00').toISOString()).toBe('2026-08-16T09:30:00.000Z');
  });

  it('preserves an explicit timezone', () => {
    expect(parseProviderDate('2026-08-16T12:30:00Z').toISOString()).toBe('2026-08-16T12:30:00.000Z');
  });
});
