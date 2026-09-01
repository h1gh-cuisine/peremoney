import { ForbiddenException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { resolveRequestId } from '../common/request-context';
import { redact } from '../common/redact';
import { AuthUser } from '../common/auth-user';
import { ListAuditLogDto } from './dto/list-audit-log.dto';

type Outcome = 'success' | 'denied' | 'error';

interface AuditRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
  user?: AuthUser;
  ip?: string;
  socket?: { remoteAddress?: string };
  headers?: Record<string, string | string[] | undefined>;
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger('AuditLog');
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  shouldLog(method: string, statusCode: number) {
    return MUTATING_METHODS.has(method) || statusCode === 401 || statusCode === 403;
  }

  async record(req: AuditRequest, statusCode: number, options: { result?: unknown; reason?: string } = {}) {
    try {
      const method = req.method ?? 'GET';
      if (!this.shouldLog(method, statusCode)) return;
      const path = String(req.originalUrl ?? req.url ?? '').split('?')[0] ?? '';
      // Собственный listing аудита не логируем как мутацию, но отказ по секрету
      // (403) на нём самом попадает в лог — это тоже "попытка доступа".
      const outcome: Outcome = statusCode === 401 || statusCode === 403 ? 'denied' : statusCode >= 400 ? 'error' : 'success';
      const user = req.user;
      const userAgentHeader = req.headers?.['user-agent'];
      await this.prisma.auditLog.create({ data: {
        actorId: user?.id ?? null,
        actorLogin: user?.login ?? this.extractAttemptedLogin(req.body) ?? null,
        actorRole: user?.role ?? null,
        cabinetId: this.extractCabinetId(req, user),
        action: `${method} ${path}`,
        method,
        path,
        statusCode,
        outcome,
        payload: redact({ params: req.params, query: req.query, body: req.body }) as object,
        result: outcome === 'success' && options.result !== undefined ? (redact(options.result) as object) : undefined,
        reason: options.reason ?? null,
        ip: req.ip ?? req.socket?.remoteAddress ?? null,
        userAgent: Array.isArray(userAgentHeader) ? userAgentHeader[0] ?? null : userAgentHeader ?? null,
        requestId: resolveRequestId(req.headers?.['x-request-id']),
      } });
    } catch (error) {
      this.logger.error(`Failed to write audit log entry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async recordLeadsFactoryError(event: {
    method: string; path: string; statusCode: number;
    query?: Record<string, unknown>; body?: unknown; providerBody?: unknown; reason: string;
  }) {
    try {
      await this.prisma.auditLog.create({ data: {
        action: `LEADS_FACTORY_ERROR ${event.method} ${event.path}`,
        method: event.method,
        path: event.path,
        statusCode: event.statusCode,
        outcome: 'error',
        payload: redact({ query: event.query, body: event.body }) as object,
        result: event.providerBody === undefined ? undefined : redact(event.providerBody) as object,
        reason: event.reason,
      } });
    } catch (error) {
      this.logger.error(`Failed to write Leads Factory error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractAttemptedLogin(body: unknown): string | null {
    if (body && typeof body === 'object' && 'login' in body && typeof (body as { login: unknown }).login === 'string') {
      return (body as { login: string }).login;
    }
    return null;
  }

  private extractCabinetId(req: AuditRequest, user?: AuthUser): string | null {
    const fromParams = req.params?.cabinetId ?? req.params?.id;
    if (typeof fromParams === 'string' && /^[0-9a-f-]{36}$/i.test(fromParams)) return fromParams;
    const fromBody = req.body && typeof req.body === 'object' ? (req.body as { cabinetId?: unknown }).cabinetId : undefined;
    if (typeof fromBody === 'string' && /^[0-9a-f-]{36}$/i.test(fromBody)) return fromBody;
    return user?.cabinetId ?? null;
  }

  verifySecret(provided: string | undefined) {
    const configured = this.config.get<string>('AUDIT_LOG_SECRET');
    if (!configured) throw new ServiceUnavailableException('Доступ к журналу действий не настроен');
    if (!provided) throw new ForbiddenException('Нужен дополнительный код доступа');
    const actualHash = createHash('sha256').update(provided, 'utf8').digest();
    const expectedHash = createHash('sha256').update(configured, 'utf8').digest();
    if (actualHash.length !== expectedHash.length || !timingSafeEqual(actualHash, expectedHash)) {
      throw new ForbiddenException('Неверный код доступа к журналу');
    }
  }

  async list(query: ListAuditLogDto) {
    return this.listWhere(query);
  }

  async listLeadsFactoryErrors(query: ListAuditLogDto) {
    return this.listWhere(query, { action: { startsWith: 'LEADS_FACTORY_ERROR ' } });
  }

  private async listWhere(query: ListAuditLogDto, requiredWhere: Record<string, unknown> = {}) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where = {
      actorId: query.actorId,
      cabinetId: query.cabinetId,
      outcome: query.outcome,
      action: query.action ? { contains: query.action, mode: 'insensitive' as const } : undefined,
      createdAt: query.dateFrom || query.dateTo ? {
        gte: query.dateFrom ? new Date(`${query.dateFrom}T00:00:00.000Z`) : undefined,
        lte: query.dateTo ? new Date(`${query.dateTo}T23:59:59.999Z`) : undefined,
      } : undefined,
      ...requiredWhere,
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
        include: { actor: { select: { login: true, role: true } }, cabinet: { select: { name: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, pageSize, hasMore: page * pageSize < total };
  }
}
