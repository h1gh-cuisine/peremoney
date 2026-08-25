import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { assertCabinetAccess, assertVisibleSection } from './cabinet-access';
import { RolesGuard } from './roles.guard';

describe('доступ: бизнес-правила 1.3 и 2.1', () => {
  const user = (role: UserRole, cabinetId: string | null = 'cab') => ({ id: 'u', login: 'u', role, cabinetId });

  it('мастер имеет доступ к любому кабинету и записи', () => {
    expect(() => assertCabinetAccess(user(UserRole.MASTER, null), 'other', true)).not.toThrow();
  });
  it('full не имеет доступа к чужому кабинету', () => {
    expect(() => assertCabinetAccess(user(UserRole.FULL), 'other')).toThrow(ForbiddenException);
  });
  it('limited может читать свой кабинет, но не писать', () => {
    expect(() => assertCabinetAccess(user(UserRole.LIMITED), 'cab')).not.toThrow();
    expect(() => assertCabinetAccess(user(UserRole.LIMITED), 'cab', true)).toThrow(ForbiddenException);
  });
  it('limited не читает скрытый раздел через API', async () => {
    const prisma = { cabinet: { findUnique: jest.fn().mockResolvedValue({
      contactsVisible: false, sourcesVisible: true, financeVisible: true,
    }) } };
    await expect(assertVisibleSection(prisma as never, user(UserRole.LIMITED), 'cab', 'contacts'))
      .rejects.toThrow(ForbiddenException);
    await expect(assertVisibleSection(prisma as never, user(UserRole.LIMITED), 'cab', 'sources'))
      .resolves.toBeUndefined();
  });
  it('RolesGuard отклоняет роль вне allow-list', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([UserRole.MASTER]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = {
      getHandler: jest.fn(), getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: user(UserRole.FULL) }) }),
    };
    expect(guard.canActivate(context as never)).toBe(false);
  });
});
