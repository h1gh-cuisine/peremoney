import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('system')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  health() {
    return { status: 'ok' as const };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1 AS ok`;
      return { status: 'ready' as const, database: 'up' as const };
    } catch {
      throw new ServiceUnavailableException({ status: 'not_ready', database: 'down' });
    }
  }
}
