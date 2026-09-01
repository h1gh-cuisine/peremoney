import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLogExceptionFilter } from './audit-log-exception.filter';

@Module({
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_FILTER, useClass: AuditLogExceptionFilter },
  ],
  exports: [AuditLogService],
})
export class AuditLogModule {}
