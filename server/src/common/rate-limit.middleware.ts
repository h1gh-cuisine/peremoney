import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimiter } from './rate-limiter';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly limiter = new RateLimiter();
  constructor(private readonly config: ConfigService) {}
  use(req: { path?: string; originalUrl?: string; ip?: string; socket?: { remoteAddress?: string } }, res: { status(code:number): unknown; json(body:unknown): unknown }, next: () => void) {
    const path = req.path ?? req.originalUrl ?? '';
    const kind = path.endsWith('/auth/login') ? 'login' : /\/fanout\/[^/]+\/leads(?:\?|$)/.test(path) ? 'fanout' : null;
    if (!kind) return next();
    const limit = Number(this.config.get(kind === 'login' ? 'LOGIN_RATE_LIMIT' : 'FANOUT_RATE_LIMIT', kind === 'login' ? 10 : 120));
    const windowMs = Number(this.config.get('RATE_LIMIT_WINDOW_MS', 60_000));
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    if (!this.limiter.consume(`${kind}:${ip}`, limit, windowMs)) {
      res.status(429); res.json({ statusCode: 429, message: 'Слишком много запросов' }); return;
    }
    next();
  }
}
