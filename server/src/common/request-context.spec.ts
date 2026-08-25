import { resolveRequestId } from './request-context';
describe('request context', () => {
  it('keeps a valid incoming ID and replaces unsafe values', () => {
    expect(resolveRequestId('trace-123')).toBe('trace-123');
    expect(resolveRequestId('bad value\n')).toMatch(/^[0-9a-f-]{36}$/);
  });
});
