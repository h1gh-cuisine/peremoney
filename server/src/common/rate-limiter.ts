export class RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly now: () => number = Date.now) {}
  consume(key: string, limit: number, windowMs: number) {
    const now = this.now(); const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) { this.buckets.set(key, { count: 1, resetAt: now + windowMs }); return true; }
    if (current.count >= limit) return false;
    current.count += 1; return true;
  }
}
