import { NotFoundException, UnauthorizedException } from '@nestjs/common';
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

  it('выдаёт отдельную FULL-сессию выбранного проекта мастеру', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'full-user', login: 'employee', role: UserRole.FULL, cabinetId: 'cab', isActive: true, sessionVersion: 2,
    });
    const jwt = { signAsync: jest.fn().mockResolvedValue('project-token') };
    const service = new AuthService({ user: { findFirst } } as never, jwt as never, {} as never);

    await expect(service.createProjectSession('cab')).resolves.toEqual({
      accessToken: 'project-token',
      user: { id: 'full-user', login: 'employee', role: UserRole.FULL, cabinetId: 'cab' },
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { cabinetId: 'cab', role: UserRole.FULL, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('не создаёт сессию проекта без активного сотрудника', async () => {
    const service = new AuthService({ user: { findFirst: jest.fn().mockResolvedValue(null) } } as never, {} as never, {} as never);
    await expect(service.createProjectSession('cab')).rejects.toBeInstanceOf(NotFoundException);
  });
});
