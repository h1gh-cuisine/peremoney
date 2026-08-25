import { RateLimiter } from './rate-limiter';
describe('RateLimiter', () => {
  it('allows up to the limit and resets after the window', () => {
    let now = 1000; const limiter = new RateLimiter(() => now);
    expect(limiter.consume('ip', 2, 1000)).toBe(true);
    expect(limiter.consume('ip', 2, 1000)).toBe(true);
    expect(limiter.consume('ip', 2, 1000)).toBe(false);
    now = 2001; expect(limiter.consume('ip', 2, 1000)).toBe(true);
  });
});
