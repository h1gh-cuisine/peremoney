import { RateLimitMiddleware } from './rate-limit.middleware';
describe('RateLimitMiddleware', () => {
  it('returns 429 on repeated login but ignores ordinary routes', () => {
    const middleware = new RateLimitMiddleware({ get: (key:string, fallback:number) => key === 'LOGIN_RATE_LIMIT' ? 1 : fallback } as never);
    const response = () => ({ status: jest.fn(), json: jest.fn() }); const next = jest.fn();
    middleware.use({ path:'/api/auth/login', ip:'1' }, response(), next);
    const limited=response(); middleware.use({ path:'/api/auth/login', ip:'1' }, limited, next);
    expect(limited.status).toHaveBeenCalledWith(429);
    middleware.use({ path:'/api/health', ip:'1' }, response(), next); expect(next).toHaveBeenCalledTimes(2);
  });
});
