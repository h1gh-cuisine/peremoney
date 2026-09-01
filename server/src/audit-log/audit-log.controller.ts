import { Controller, Get, Headers, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { AuditLogService } from './audit-log.service';
import { ListAuditLogDto } from './dto/list-audit-log.dto';

@ApiTags('audit-log')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get('leads-factory-errors')
  @Roles(UserRole.MASTER)
  listLeadsFactoryErrors(@Query() query: ListAuditLogDto, @Headers('x-audit-secret') secret?: string) {
    this.auditLog.verifySecret(secret);
    return this.auditLog.listLeadsFactoryErrors(query);
  }

  @Get()
  @Roles(UserRole.MASTER)
  list(@Query() query: ListAuditLogDto, @Headers('x-audit-secret') secret?: string) {
    this.auditLog.verifySecret(secret);
    return this.auditLog.list(query);
  }
}
