import { ForbiddenException } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller';

describe('AuditLogController', () => {
  it('checks the extra secret before listing, and never lists on a bad secret', () => {
    const verifySecret = jest.fn().mockImplementation(() => { throw new ForbiddenException('Неверный код доступа к журналу'); });
    const list = jest.fn();
    const controller = new AuditLogController({ verifySecret, list } as never);

    expect(() => controller.list({}, 'wrong')).toThrow(ForbiddenException);
    expect(list).not.toHaveBeenCalled();
  });

  it('lists once the secret checks out', () => {
    const verifySecret = jest.fn();
    const list = jest.fn().mockReturnValue({ items: [], total: 0, page: 1, pageSize: 50, hasMore: false });
    const controller = new AuditLogController({ verifySecret, list } as never);

    const result = controller.list({ outcome: 'denied' }, 'right');

    expect(verifySecret).toHaveBeenCalledWith('right');
    expect(list).toHaveBeenCalledWith({ outcome: 'denied' });
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 50, hasMore: false });
  });

  it('exposes Leads Factory failures through a separate protected endpoint', () => {
    const verifySecret = jest.fn();
    const listLeadsFactoryErrors = jest.fn().mockReturnValue({ items: [], total: 0 });
    const controller = new AuditLogController({ verifySecret, listLeadsFactoryErrors } as never);

    expect(controller.listLeadsFactoryErrors({ page: 1 }, 'right')).toEqual({ items: [], total: 0 });
    expect(verifySecret).toHaveBeenCalledWith('right');
    expect(listLeadsFactoryErrors).toHaveBeenCalledWith({ page: 1 });
  });
});
