import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy session invalidation', () => {
  const config = { getOrThrow: () => 'test-secret-at-least-32-characters-long' };

  it('accepts only the current server session version', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'u', login: 'x', role: UserRole.FULL,
      cabinetId: 'cab', isActive: true, sessionVersion: 4 }) } };
    await expect(new JwtStrategy(config as never, prisma as never).validate({ sub: 'u', ver: 4 }))
      .resolves.toEqual({ id: 'u', login: 'x', role: UserRole.FULL, cabinetId: 'cab' });
  });

  it('rejects a JWT issued before logout incremented the version', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({ id: 'u', isActive: true, sessionVersion: 5 }) } };
    await expect(new JwtStrategy(config as never, prisma as never).validate({ sub: 'u', ver: 4 }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });
});
