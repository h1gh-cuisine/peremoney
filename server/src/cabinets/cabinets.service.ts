import { BadGatewayException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Cabinet, Prisma, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { createHash } from 'node:crypto';
import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCabinetDto } from './dto/create-cabinet.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import { generatePassword } from './password';
import { LeadsFactoryService } from '../leads-factory/leads-factory.service';
import { ProviderException } from '../leads-factory/provider.exception';
import { ProviderIntegrationName } from '../leads-factory/leads-factory.types';

const cabinetSelect = {
  id: true, name: true, providerProjectId: true, type: true, price: true,
  managerName: true, sphere: true, moneyBalance: true, totalUnits: true, usedUnits: true, balanceType: true,
  isActive: true, renewalStatus: true, hidden: true, timezoneOffset: true, uploadsEnabled: true, callsEnabled: true,
  crmIntegration: true, messengerIntegrations: true, contactsVisible: true, sourcesVisible: true,
  scriptVisible: true, financeVisible: true, settingsVisible: true,
  schedulePreset: true, scheduleDays: true, operatorScript: true, operatorScriptName: true,
  operatorScriptLevel: true, scriptSyncedAt: true,
  createdAt: true, updatedAt: true,
} satisfies Prisma.CabinetSelect;

@Injectable()
export class CabinetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: LeadsFactoryService,
    private readonly config: ConfigService,
  ) {}

  async list() {
    const cabinets = await this.prisma.cabinet.findMany({ select: { ...cabinetSelect,
      users: { select: { login: true, role: true } }, _count: { select: { contacts: true, leads: true } },
      payments: { where: { status: 'PAID' }, select: { amount: true } },
      leads: { where: { saleStatus: 'BOUGHT' }, select: { id: true } },
    }, orderBy: { createdAt: 'desc' } });
    return cabinets.map(({ users, payments, leads, _count, ...cabinet }) => {
      const ltv = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      return { ...cabinet, contactsExported: _count.contacts, leadsExported: _count.leads, sales: leads.length,
        ltv, paymentsCount: payments.length, avgCheck: payments.length ? ltv / payments.length : 0,
        clientLogin: users.find((user) => user.role === UserRole.LIMITED)?.login ?? '',
        employeeLogin: users.find((user) => user.role === UserRole.FULL)?.login ?? '' };
    });
  }

  async create(dto: CreateCabinetDto) {
    if (dto.providerProjectId) return this.createLocal(dto, dto.providerProjectId);
    if (!dto.region || !dto.regionId || !dto.idempotencyKey) {
      throw new ConflictException('region, regionId и idempotencyKey обязательны для создания проекта Leads Factory');
    }
    const requestHash = createHash('sha256').update(JSON.stringify({
      name: dto.name, type: dto.type, region: dto.region, regionId: dto.regionId, sphere: dto.sphere, managerName: dto.managerName,
      price: dto.price, employeeLogin: dto.employeeLogin, clientLogin: dto.clientLogin,
    })).digest('hex');
    let operation;
    let ownsOperation = false;
    try {
      operation = await this.prisma.providerProjectCreation.create({
        data: { idempotencyKey: dto.idempotencyKey, requestHash },
      });
      ownsOperation = true;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      operation = await this.prisma.providerProjectCreation.findUniqueOrThrow({ where: { idempotencyKey: dto.idempotencyKey } });
    }
    if (operation.requestHash !== requestHash) throw new ConflictException('Ключ идемпотентности уже использован с другими данными');
    if (operation.status === 'SUCCEEDED' && operation.cabinetId) {
      const cabinet = await this.prisma.cabinet.findUniqueOrThrow({ where: { id: operation.cabinetId }, select: cabinetSelect });
      return { cabinet, credentials: this.credentials(dto, dto.idempotencyKey), replayed: true };
    }
    if (operation.status === 'UNCERTAIN') {
      throw new ConflictException('Результат создания в Leads Factory не определён; требуется сверка по имени перед повтором');
    }
    if (!ownsOperation && ['EXTERNAL_CREATED', 'FAILED'].includes(operation.status)) {
      const claimed = await this.prisma.providerProjectCreation.updateMany({
        where: { id: operation.id, status: operation.status }, data: { status: 'PENDING', error: null },
      });
      ownsOperation = claimed.count === 1;
    }
    if (!ownsOperation) {
      throw new ConflictException('Создание проекта уже выполняется или завершилось ошибкой; повторный внешний POST заблокирован');
    }
    const providerName = `${dto.region}/Peremoney ЛКП ${this.typeLabel(dto.type)}/${dto.sphere ?? ''}/${dto.name}`;
    let providerProjectId = operation.providerProjectId;
    if (!providerProjectId) {
      let externalPostStarted = false;
      try {
        const types = await this.provider.getProjectTypes();
        const typeId = this.matchProviderType(dto.type, types.items);
        externalPostStarted = true;
        const created = await this.provider.createProject({ name: providerName, type: typeId, regions: [dto.regionId], status: 'active' });
        providerProjectId = created.id;
        await this.prisma.providerProjectCreation.update({
          where: { id: operation.id }, data: { status: 'EXTERNAL_CREATED', providerProjectId },
        });
      } catch (error) {
        const uncertain = externalPostStarted && error instanceof ProviderException && [502, 504].includes(error.providerStatus);
        await this.prisma.providerProjectCreation.update({
          where: { id: operation.id },
          data: { status: uncertain ? 'UNCERTAIN' : 'FAILED', error: error instanceof Error ? error.message.slice(0, 2000) : 'Unknown error' },
        });
        throw error;
      }
    }
    try {
      const result = await this.createLocal({ ...dto, name: providerName }, providerProjectId, operation.id, dto.idempotencyKey);
      return result;
    } catch (error) {
      await this.prisma.providerProjectCreation.update({
        where: { id: operation.id }, data: { status: 'EXTERNAL_CREATED', error: error instanceof Error ? error.message.slice(0, 2000) : 'Local error' },
      });
      throw error;
    }
  }

  providerProjectTypes() { return this.provider.getProjectTypes(); }

  async providerIntegration(id: string, name: string) {
    if (!['telegram', 'bitrix', 'amocrm', 'email'].includes(name)) throw new NotFoundException('Интеграция не поддерживается');
    const cabinet = await this.prisma.cabinet.findUnique({ where: { id }, select: { providerProjectId: true } });
    if (!cabinet?.providerProjectId) throw new NotFoundException('У кабинета не указан providerProjectId');
    const raw = await this.provider.getIntegration(cabinet.providerProjectId, name as ProviderIntegrationName);
    return this.safeIntegrationSummary(raw);
  }

  private async createLocal(dto: CreateCabinetDto, providerProjectId: number, operationId?: string, credentialSeed?: string) {
    const credentials = this.credentials(dto, credentialSeed);
    const employeePassword = credentials.employee.password;
    const clientPassword = credentials.client.password;
    const cabinet = await this.prisma.$transaction(async (tx) => {
      const created = await tx.cabinet.create({
        data: {
          name: dto.name,
          type: dto.type,
          price: new Prisma.Decimal(dto.price),
          providerProjectId,
          managerName: dto.managerName,
          sphere: dto.sphere,
        },
        select: cabinetSelect,
      });
      await tx.user.createMany({ data: [
        { login: dto.employeeLogin, passwordHash: await hash(employeePassword, 12), role: UserRole.FULL, cabinetId: created.id },
        { login: dto.clientLogin, passwordHash: await hash(clientPassword, 12), role: UserRole.LIMITED, cabinetId: created.id },
      ] });
      if (operationId) {
        await tx.providerProjectCreation.update({
          where: { id: operationId }, data: { status: 'SUCCEEDED', cabinetId: created.id, error: null },
        });
      }
      return created;
    });
    return {
      cabinet,
      credentials,
    };
  }

  private credentials(dto: Pick<CreateCabinetDto, 'employeeLogin' | 'clientLogin'>, seed?: string) {
    if (!seed) return {
      employee: { login: dto.employeeLogin, password: generatePassword() },
      client: { login: dto.clientLogin, password: generatePassword() },
    };
    const secret = this.config.get<string>('CREDENTIAL_DERIVATION_SECRET') ?? this.config.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) throw new Error('CREDENTIAL_DERIVATION_SECRET или JWT_SECRET должен быть не короче 32 символов');
    const password = (role: string) => `A!${createHmac('sha256', secret).update(`${seed}:${role}`).digest('base64url').slice(0, 24)}9a`;
    return {
      employee: { login: dto.employeeLogin, password: password('employee') },
      client: { login: dto.clientLogin, password: password('client') },
    };
  }

  private typeLabel(type: import('@prisma/client').ProjectType) {
    return type === 'VDL' ? 'VDL' : type === 'PACKAGE' ? 'ПКТ' : 'НОМЕРА';
  }

  private matchProviderType(type: import('@prisma/client').ProjectType, items: Array<{ id: number; name: string }>) {
    const aliases = type === 'VDL' ? ['vdl', 'квал'] : type === 'PACKAGE' ? ['пкт', 'пакет'] : ['номер', 'контакт'];
    const match = items.find((item) => aliases.some((alias) => item.name.toLocaleLowerCase('ru').includes(alias)));
    if (!match) throw new BadGatewayException(`Leads Factory не вернул тип для ${this.typeLabel(type)}`);
    return match.id;
  }

  private safeIntegrationSummary(raw: unknown) {
    const allowed = new Set([
      'id', 'name', 'type', 'status', 'active', 'is_active', 'enabled', 'connected', 'configured',
      'domain', 'send_call_link', 'send_deal', 'title', 'status_id', 'source_id', 'assigned_by_id',
      'comment', 'utm_source', 'utm_campaign', 'utm_medium', 'utm_term', 'utm_content', 'page',
      'pipeline_id', 'responsible_user', 'time_delta', 'tags', 'reciever', 'site',
    ]);
    const sanitize = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).filter(([key, field]) => allowed.has(key)
        && (['string', 'number', 'boolean'].includes(typeof field) || field === null
          || (Array.isArray(field) && field.every((item) => typeof item === 'string')))))
      : {};
    if (Array.isArray(raw)) {
      const items = raw.map(sanitize);
      return {
        configured: items.some((item) => item.is_active === true || item.active === true || item.enabled === true),
        details: { accounts: items.length, items },
      };
    }
    const details = sanitize(raw);
    const signals = Object.entries(details).filter(([key]) => ['active', 'is_active', 'enabled', 'connected', 'configured'].includes(key));
    const configured = signals.length ? signals.some(([, value]) => value === true) : Object.keys(details).length > 0;
    return { configured, details };
  }

  async getForUser(user: AuthUser, requestedId?: string) {
    const cabinetId = user.role === UserRole.MASTER ? requestedId : user.cabinetId;
    if (!cabinetId) throw new NotFoundException('Кабинет не найден');
    if (user.role !== UserRole.MASTER && requestedId && requestedId !== user.cabinetId) {
      throw new ForbiddenException();
    }
    const cabinet = await this.prisma.cabinet.findUnique({ where: { id: cabinetId }, select: cabinetSelect });
    if (!cabinet) throw new NotFoundException('Кабинет не найден');
    const visibleSections = this.visibleSections(user.role, cabinet as Cabinet);
    if (user.role !== UserRole.LIMITED) return { ...cabinet, visibleSections };
    const visible = new Set(visibleSections);
    return { id: cabinet.id, name: cabinet.name, type: cabinet.type, providerProjectId: cabinet.providerProjectId, visibleSections,
      ...(visible.has('script') ? { operatorScript: cabinet.operatorScript, operatorScriptName: cabinet.operatorScriptName,
        operatorScriptLevel: cabinet.operatorScriptLevel, scriptSyncedAt: cabinet.scriptSyncedAt } : {}),
      ...(visible.has('finance') ? { moneyBalance: cabinet.moneyBalance, price: cabinet.price, totalUnits: cabinet.totalUnits,
        usedUnits: cabinet.usedUnits, balanceType: cabinet.balanceType } : {}),
      ...(visible.has('settings') ? { isActive: cabinet.isActive, timezoneOffset: cabinet.timezoneOffset,
        uploadsEnabled: cabinet.uploadsEnabled, callsEnabled: cabinet.callsEnabled, crmIntegration: cabinet.crmIntegration,
        messengerIntegrations: cabinet.messengerIntegrations, schedulePreset: cabinet.schedulePreset,
        scheduleDays: cabinet.scheduleDays } : {}) };
  }

  async updateVisibility(id: string, dto: UpdateVisibilityDto) {
    return this.prisma.cabinet.update({
      where: { id },
      data: {
        contactsVisible: dto.contacts,
        sourcesVisible: dto.sources,
        scriptVisible: dto.script,
        financeVisible: dto.finance,
        settingsVisible: dto.settings,
      },
      select: cabinetSelect,
    });
  }

  updateSchedule(id: string, schedulePreset: import('@prisma/client').SchedulePreset) {
    return this.prisma.cabinet.update({ where: { id }, data: { schedulePreset }, select: cabinetSelect });
  }

  async updateSettings(id: string, dto: import('./dto/update-settings.dto').UpdateSettingsDto) {
    const cabinet = await this.prisma.cabinet.findUnique({ where: { id }, select: { providerProjectId: true } });
    if (!cabinet) throw new NotFoundException('Кабинет не найден');
    const updated = await this.prisma.cabinet.update({ where: { id }, data: {
      isActive: dto.isActive, timezoneOffset: dto.timezoneOffset, uploadsEnabled: dto.uploadsEnabled,
      callsEnabled: dto.callsEnabled, schedulePreset: dto.schedulePreset, scheduleDays: dto.scheduleDays,
      crmIntegration: dto.crmIntegration,
      messengerIntegrations: dto.messengerIntegrations, contactsVisible: dto.contacts,
      sourcesVisible: dto.sources, scriptVisible: dto.script, financeVisible: dto.finance,
      settingsVisible: dto.settings,
    }, select: cabinetSelect });
    if (!cabinet.providerProjectId) return { ...updated, providerSync: { status: 'SKIPPED' } };
    try {
      await this.provider.updateProjectSchedule(cabinet.providerProjectId, dto.isActive);
      return { ...updated, providerSync: { status: 'SYNCED' } };
    } catch (error) {
      const now = new Date();
      await this.prisma.scheduledRun.create({ data: { cabinetId: id, task: 'APPLY_SCHEDULE', scheduledFor: now,
        nextAttemptAt: now, lastError: error instanceof Error ? error.message.slice(0, 2000) : 'Provider sync failed' } });
      return { ...updated, providerSync: { status: 'PENDING', message: 'Статус будет повторно передан провайдеру' } };
    }
  }

  async updateMasterProject(id: string, dto: import('./dto/update-master-project.dto').UpdateMasterProjectDto) {
    const passwordHash = dto.clientPassword ? await hash(dto.clientPassword, 12) : undefined;
    const operations: Prisma.PrismaPromise<unknown>[] = [this.prisma.cabinet.update({ where: { id }, data: {
      price: dto.price === undefined ? undefined : new Prisma.Decimal(dto.price), renewalStatus: dto.renewalStatus,
      isActive: dto.isActive, hidden: dto.hidden,
    }, select: cabinetSelect })];
    if (passwordHash) operations.push(this.prisma.user.updateMany({
      where: { cabinetId: id, role: UserRole.LIMITED },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }));
    const [updated] = await this.prisma.$transaction(operations);
    return updated;
  }

  async clone(id: string, dto: import('./dto/clone-cabinet.dto').CloneCabinetDto) {
    const source = await this.prisma.cabinet.findUnique({ where: { id } });
    if (!source) throw new NotFoundException('Исходный кабинет не найден');
    if (dto.name === source.name) throw new ForbiddenException('Название должно отличаться');
    const employeePassword = generatePassword(); const clientPassword = generatePassword();
    const suffix = Date.now().toString(36);
    const cabinet = await this.prisma.$transaction(async (tx) => {
      const created = await tx.cabinet.create({ data: { name: dto.name, type: dto.type,
        price: new Prisma.Decimal(dto.price), managerName: dto.managerName, sphere: source.sphere,
        providerProjectId: source.providerProjectId }, select: cabinetSelect });
      await tx.user.createMany({ data: [
        { login: `staff-${suffix}`, passwordHash: await hash(employeePassword, 12), role: UserRole.FULL, cabinetId: created.id },
        { login: `client-${suffix}`, passwordHash: await hash(clientPassword, 12), role: UserRole.LIMITED, cabinetId: created.id },
      ] }); return created;
    });
    return { cabinet, credentials: { employee: { login: `staff-${suffix}`, password: employeePassword }, client: { login: `client-${suffix}`, password: clientPassword } } };
  }

  updateBilling(id: string, dto: import('./dto/update-billing.dto').UpdateBillingDto) {
    return this.prisma.cabinet.update({
      where: { id },
      data: {
        type: dto.type, price: dto.price === undefined ? undefined : new Prisma.Decimal(dto.price),
        managerName: dto.managerName, sphere: dto.sphere,
      },
      select: cabinetSelect,
    });
  }

  private visibleSections(role: UserRole, cabinet: Cabinet) {
    const always = ['dashboard', 'leads', 'payer'];
    if (role !== UserRole.LIMITED) return [...always, 'contacts', 'sources', 'script', 'finance', 'settings'];
    return [
      ...always,
      ...(cabinet.contactsVisible ? ['contacts'] : []),
      ...(cabinet.sourcesVisible ? ['sources'] : []),
      ...(cabinet.scriptVisible ? ['script'] : []),
      ...(cabinet.financeVisible ? ['finance'] : []),
      ...(cabinet.settingsVisible ? ['settings'] : []),
    ];
  }
}
