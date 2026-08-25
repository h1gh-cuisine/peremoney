import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { AuthService } from './auth.service';

describe('аутентификация: бизнес-правила 2.1', () => {
  it('выдаёт JWT и безопасный профиль для верного пароля', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue({
      id: 'u', login: 'client', passwordHash: await hash('secret', 4), role: UserRole.LIMITED, cabinetId: 'cab', isActive: true, sessionVersion: 3,
    }) } };
    const jwt = { signAsync: jest.fn().mockResolvedValue('token') };
    const service = new AuthService(prisma as never, jwt as never, {} as never);
    const result = await service.login({ login: 'client', password: 'secret' });
    expect(result).toEqual({ accessToken: 'token', user: { id: 'u', login: 'client', role: UserRole.LIMITED, cabinetId: 'cab' } });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u', ver: 3 });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it.each([
    ['неверный пароль', { id: 'u', passwordHash: 'bad-hash', isActive: true }],
    ['неактивный пользователь', { id: 'u', passwordHash: '', isActive: false }],
    ['неизвестный логин', null],
  ])('не входит: %s', async (_, record) => {
    const service = new AuthService({ user: { findUnique: jest.fn().mockResolvedValue(record) } } as never, {} as never, {} as never);
    await expect(service.login({ login: 'x', password: 'x' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('invalidates every previously issued JWT on logout', async () => {
    const update = jest.fn().mockResolvedValue({});
    await new AuthService({ user: { update } } as never, {} as never, {} as never).logout('u');
    expect(update).toHaveBeenCalledWith({ where: { id: 'u' }, data: { sessionVersion: { increment: 1 } } });
  });
});
