import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CrmController } from './crm.controller';

describe('CrmController RBAC', () => {
  const limited = { id: 'limited', login: 'limited', role: UserRole.LIMITED, cabinetId: 'cab' };

  it('LIMITED can list own leads but cannot update them', () => {
    const crm = { listLeads: jest.fn().mockReturnValue([]), updateLead: jest.fn() };
    const controller = new CrmController(crm as never, {} as never, {} as never);

    expect(() => controller.leads(limited, 'cab', {} as never)).not.toThrow();
    expect(() => controller.updateLead(limited, 'cab', 'lead', {} as never)).toThrow(ForbiddenException);
    expect(crm.updateLead).not.toHaveBeenCalled();
  });
});
