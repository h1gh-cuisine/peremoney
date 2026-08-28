import { Injectable, NotFoundException, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    const login = this.config.get<string>('MASTER_LOGIN');
    const password = this.config.get<string>('MASTER_PASSWORD');
    if (!login || !password) return;
    await this.prisma.user.upsert({
      where: { login },
      update: {},
      create: { login, passwordHash: await hash(password, 12), role: UserRole.MASTER },
    });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { login: dto.login } });
    if (!user?.isActive || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, ver: user.sessionVersion }),
      user: { id: user.id, login: user.login, role: user.role, cabinetId: user.cabinetId },
    };
  }

  async createProjectSession(cabinetId: string) {
    const user = await this.prisma.user.findFirst({
      where: { cabinetId, role: UserRole.FULL, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!user) throw new NotFoundException('Для проекта не найден активный сотрудник');
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, ver: user.sessionVersion }),
      user: { id: user.id, login: user.login, role: user.role, cabinetId: user.cabinetId },
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  }
}
