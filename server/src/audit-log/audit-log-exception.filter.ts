import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { AuditLogService } from './audit-log.service';

/**
 * Ловит исключения, возникшие в guard'ах (401/403 до того, как отработает
 * AuditLogInterceptor) и в обработчиках (ConflictException и т.п.), пишет
 * попытку в журнал и делегирует форматирование ответа стандартному
 * BaseExceptionFilter — поведение ответа не меняется.
 */
@Catch()
export class AuditLogExceptionFilter extends BaseExceptionFilter {
  constructor(private readonly auditLog: AuditLogService) {
    super();
  }

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() === 'http') {
      const req = host.switchToHttp().getRequest();
      const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      const reason = exception instanceof HttpException ? exception.message : 'Internal server error';
      void this.auditLog.record(req, status, { reason });
    }
    super.catch(exception, host);
  }
}
