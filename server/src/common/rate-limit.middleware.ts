import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimiter } from './rate-limiter';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly limiter = new RateLimiter();
  constructor(private readonly config: ConfigService) {}
  use(req: { method?: string; path?: string; originalUrl?: string; ip?: string; socket?: { remoteAddress?: string } }, res: { status(code:number): unknown; json(body:unknown): unknown }, next: () => void) {
    const path = req.path ?? req.originalUrl ?? '';
    const kind = path.endsWith('/auth/login') ? 'login'
      : /\/fanout\/[^/]+\/leads(?:\?|$)/.test(path) ? 'fanout'
      : req.method === 'DELETE' && /\/cabinets\/[^/?]+(?:\?|$)/.test(path) ? 'project-delete'
        : null;
    if (!kind) return next();
    const limitKey = kind === 'login' ? 'LOGIN_RATE_LIMIT' : kind === 'fanout' ? 'FANOUT_RATE_LIMIT' : 'PROJECT_DELETE_RATE_LIMIT';
    const defaultLimit = kind === 'login' ? 10 : kind === 'fanout' ? 120 : 5;
    const limit = Number(this.config.get(limitKey, defaultLimit));
    const windowMs = Number(this.config.get(kind === 'project-delete' ? 'PROJECT_DELETE_RATE_LIMIT_WINDOW_MS' : 'RATE_LIMIT_WINDOW_MS', 60_000));
    const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    if (!this.limiter.consume(`${kind}:${ip}`, limit, windowMs)) {
      res.status(429); res.json({ statusCode: 429, message: 'Слишком много запросов' }); return;
    }
    next();
  }
}
