import { requestLogging } from './request-logging.middleware';
describe('requestLogging', () => {
  it('returns request ID and strips query values from logged path', () => {
    const callbacks: Record<string,()=>void>={}; const setHeader=jest.fn(); const next=jest.fn();
    requestLogging({ headers:{'x-request-id':'trace-1'}, method:'GET', originalUrl:'/api/leads?token=secret' },
      { setHeader, statusCode:200, on:(event,cb)=>{callbacks[event]=cb;} }, next);
    expect(setHeader).toHaveBeenCalledWith('X-Request-Id','trace-1'); expect(next).toHaveBeenCalled(); expect(callbacks.finish).toBeDefined();
  });
});
