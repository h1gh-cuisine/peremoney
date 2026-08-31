import { BadGatewayException, ConflictException, ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { BalanceEntryType, Cabinet, Prisma, ProjectType, ScheduledTask, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { createCipheriv, createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../common/auth-user';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCabinetDto } from './dto/create-cabinet.dto';
import { UpdateVisibilityDto } from './dto/update-visibility.dto';
import { generatePassword } from './password';
import { LeadsFactoryService } from '../leads-factory/leads-factory.service';
import { ProviderException } from '../leads-factory/provider.exception';
import { ProviderIntegrationName } from '../leads-factory/leads-factory.types';
import { DirectMessengerService } from '../integrations/direct-messenger.service';
import { AnswerSyncService } from '../crm/answer-sync.service';
import { SourcesService } from '../sources/sources.service';
import { hasAvailableBalance } from '../finance/balance-availability';

const cabinetSelect = {
  id: true, name: true, providerProjectId: true, linkedProviderProjectIds: true, type: true, price: true,
  managerName: true, sphere: true, moneyBalance: true, totalUnits: true, usedUnits: true, balanceType: true,
  isActive: true, renewalStatus: true, hidden: true, timezoneOffset: true, uploadsEnabled: true, callsEnabled: true,
  crmIntegration: true, messengerIntegrations: true, contactsVisible: true, sourcesVisible: true,
  scriptVisible: true, financeVisible: true, settingsVisible: true,
  schedulePreset: true, scheduleDays: true, operatorScript: true, operatorScriptName: true,
  operatorScriptLevel: true, scriptSyncedAt: true,
  createdAt: true, updatedAt: true,
} satisfies Prisma.CabinetSelect;
type CabinetView = Prisma.CabinetGetPayload<{ select: typeof cabinetSelect }>;

const DEFAULT_PROVIDER_PROJECT_INFO = {
  check_domains_in_v_kazakh: false,
  parse_domains: false,
  parse_phones: false,
  parse_ishod: true,
  parse_ceo: false,
  parse_google: false,
  parse_manual: false,
  parse_maps: false,
  limit_autochange: false,
  max_limit: 100,
  default_limit: 5,
  ishod_phones_count: 1,
  vdl_autonorms: true,
} as const;

@Injectable()
export class CabinetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: LeadsFactoryService,
    private readonly config: ConfigService,
    private readonly directMessenger?: DirectMessengerService,
    private readonly answers?: AnswerSyncService,
    private readonly sources?: SourcesService,
  ) {}

  async listManagers() {
    const managers = await this.prisma.masterManager.findMany({ orderBy: { createdAt: 'asc' } });
    return managers.map(({ name }) => ({ id: name, name }));
  }

  async createManager(rawName: string) {
    const name = rawName.trim().replace(/\s+/g, ' ');
    if (!name) throw new ConflictException('Имя сотрудника не может быть пустым');
    try {
      await this.prisma.masterManager.create({ data: { name } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Сотрудник с таким именем уже существует');
      }
      throw error;
    }
    return { id: name, name };
  }

  async removeManager(rawName: string) {
    const name = rawName.trim();
    const assigned = await this.prisma.cabinet.count({ where: { managerName: name } });
    if (assigned > 0) throw new ConflictException('Нельзя удалить сотрудника, пока за ним закреплены проекты');
    const result = await this.prisma.masterManager.deleteMany({ where: { name } });
    if (!result.count) throw new NotFoundException('Сотрудник не найден');
    return { deleted: true };
  }

  async remove(id: string, secretCode: string) {
    const configuredSecret = this.config.get<string>('PROJECT_DELETE_SECRET');
    if (!configuredSecret) throw new ServiceUnavailableException('Удаление проектов не настроено');
    const actualHash = createHash('sha256').update(secretCode, 'utf8').digest();
    const expectedHash = createHash('sha256').update(configuredSecret, 'utf8').digest();
    if (!timingSafeEqual(actualHash, expectedHash)) throw new ForbiddenException('Неверный секретный код');
    const cabinet = await this.prisma.cabinet.findUnique({ where: { id }, select: { id: true } });
    if (!cabinet) throw new NotFoundException('Проект не найден');
    await this.prisma.cabinet.delete({ where: { id } });
    return { deleted: true };
  }

  async list(query: { dateFrom?: string; dateTo?: string } = {}) {
    const range = query.dateFrom || query.dateTo ? {
      gte: query.dateFrom ? new Date(`${query.dateFrom}T00:00:00.000Z`) : undefined,
      lte: query.dateTo ? new Date(`${query.dateTo}T23:59:59.999Z`) : undefined,
    } : undefined;
    const cabinets = await this.prisma.cabinet.findMany({ select: { ...cabinetSelect,
      users: { select: { login: true, role: true } }, _count: { select: {
        contacts: range ? { where: { date: range } } : true,
        leads: range ? { where: { successDate: range } } : true,
      } },
      payments: { where: { status: 'PAID', ...(range ? { paidAt: range } : {}) }, select: { amount: true } },
      leads: { where: { saleStatus: { in: ['BOUGHT', 'NOT_TARGET'] }, ...(range ? { successDate: range } : {}) }, select: { saleStatus: true } },
    }, orderBy: { createdAt: 'desc' } });
    const providerFinances = await Promise.all(cabinets.map(async (cabinet) => {
      if (!cabinet.providerProjectId) return null;
      try {
        return await this.provider.getProjectFinance(cabinet.providerProjectId, {
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
        });
      } catch {
        // Не подменяем недоступные данные нулём: UI покажет прочерк.
        return null;
      }
    }));
    return cabinets.map(({ users, payments, leads, _count, ...cabinet }, index) => {
      const ltv = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const finance = providerFinances[index];
      const expenses = finance ? Number(finance.totals.trati ?? 0) : null;
      const providerLeads = finance ? Number(finance.totals.success_count ?? 0) : null;
      const notTargetLeads = leads.filter((lead) => lead.saleStatus === 'NOT_TARGET').length;
      const targetLeads = providerLeads === null ? null : Math.max(0, providerLeads - notTargetLeads);
      return { ...cabinet, contactsExported: _count.contacts, leadsExported: _count.leads,
        sales: leads.filter((lead) => lead.saleStatus === 'BOUGHT').length,
        expenses,
        leadCost: expenses === null || !providerLeads ? null : expenses / providerLeads,
        targetLeadCost: expenses === null || !targetLeads ? null : expenses / targetLeads,
        ltv, paymentsCount: payments.length, avgCheck: payments.length ? ltv / payments.length : 0,
        clientLogin: users.find((user) => user.role === UserRole.LIMITED)?.login ?? '',
        employeeLogin: users.find((user) => user.role === UserRole.FULL)?.login ?? '' };
    });
  }

  async create(dto: CreateCabinetDto) {
    if (dto.providerProjectId) return this.createLocal(dto, dto.providerProjectId);
    const providerRegionIds = dto.regionIds?.length ? [...new Set(dto.regionIds)] : dto.regionId ? [dto.regionId] : [];
    if (!dto.region || !providerRegionIds.length || !dto.idempotencyKey) {
      throw new ConflictException('region, regionIds и idempotencyKey обязательны для создания проекта Leads Factory');
    }
    const requestHash = createHash('sha256').update(JSON.stringify({
      name: dto.name, type: dto.type, region: dto.region, regionId: dto.regionId,
      regionIds: dto.regionIds?.length ? providerRegionIds : undefined,
      sphere: dto.sphere, managerName: dto.managerName,
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
        const created = await this.provider.createProject({
          name: providerName, type: typeId, regions: providerRegionIds, status: 'pause', default_limit: 5,
        });
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
      // POST only creates the provider project. Apply the required VDL defaults with
      // an independently retryable PATCH before exposing the local cabinet as ready.
      await this.provider.updateProjectInfo(providerProjectId, DEFAULT_PROVIDER_PROJECT_INFO);
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

  async linkProviderProject(dto: import('./dto/link-provider-project.dto').LinkProviderProjectDto) {
    const existing = await this.prisma.cabinet.findFirst({
      where: { providerProjectId: dto.providerProjectId }, select: { id: true, name: true },
    });
    if (existing) throw new ConflictException(`Проект Leads Factory уже связан с кабинетом «${existing.name}»`);

    // GET validates both existence and access before any local records are made.
    const providerProject = await this.provider.getProject(dto.providerProjectId);
    if (providerProject.id !== dto.providerProjectId) throw new BadGatewayException('Leads Factory вернул другой ID проекта');
    const type = providerProject.numbers ? ProjectType.NUMBERS : providerProject.vdl ? ProjectType.VDL : ProjectType.PACKAGE;
    const suffix = `${dto.providerProjectId}-${Date.now().toString(36)}`;
    const employeeLogin = `staff-${suffix}`;
    const projectName = providerProject.name?.trim() || `Leads Factory #${dto.providerProjectId}`;
    const clientLogin = this.clientLoginFromProjectName(projectName);
    const employeePassword = generatePassword();
    const clientPassword = generatePassword();
    let cabinet;
    try {
      cabinet = await this.prisma.$transaction(async (tx) => {
        const created = await tx.cabinet.create({ data: {
          name: projectName,
          type, price: new Prisma.Decimal(dto.price), managerName: dto.managerName,
          sphere: providerProject.sphere, providerProjectId: dto.providerProjectId,
          isActive: providerProject.status === 'active', timezoneOffset: providerProject.timezone ?? 3,
        }, select: cabinetSelect });
        await tx.user.createMany({ data: [
          { login: employeeLogin, passwordHash: await hash(employeePassword, 12), role: UserRole.FULL, cabinetId: created.id },
          { login: clientLogin, passwordHash: await hash(clientPassword, 12), role: UserRole.LIMITED, cabinetId: created.id },
        ] });
        return created;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Логин клиента «${clientLogin}» уже занят другим проектом`);
      }
      throw error;
    }
    const [answersSync, sourcesSync] = await Promise.allSettled([
      this.answers?.sync(cabinet.id),
      this.sources?.sync(cabinet.id, {}),
    ]);
    return { cabinet, credentials: {
      employee: { login: employeeLogin, password: employeePassword },
      client: { login: clientLogin, password: clientPassword },
    }, initialSync: {
      answers: answersSync.status === 'fulfilled' ? 'COMPLETED' : 'FAILED',
      sources: sourcesSync.status === 'fulfilled' ? 'COMPLETED' : 'FAILED',
    } };
  }

  async directIntegration(id: string, channel: string) {
    this.assertDirectChannel(channel);
    const value = await this.prisma.directIntegration.findUnique({ where: { cabinetId_channel: { cabinetId: id, channel } } });
    return value ? { channel, configured: true, enabled: value.enabled, chatId: value.chatId, hasToken: true }
      : { channel, configured: false, enabled: false, chatId: '', hasToken: false };
  }

  async updateDirectIntegration(id: string, channel: string, dto: { botToken?: string; chatId: string; enabled: boolean }) {
    this.assertDirectChannel(channel);
    const existing = await this.prisma.directIntegration.findUnique({ where: { cabinetId_channel: { cabinetId: id, channel } } });
    if (!existing && !dto.botToken) throw new ConflictException('Bot token обязателен при первом подключении');
    const plainToken = dto.botToken ?? (existing && this.directMessenger?.decryptToken(existing.botTokenEncrypted));
    if (dto.enabled && plainToken && this.directMessenger) {
      await this.directMessenger.send(channel, plainToken, dto.chatId.trim(), '✅ Peremoney: интеграция подключена');
    }
    const botTokenEncrypted = dto.botToken ? this.encryptSecret(dto.botToken) : existing!.botTokenEncrypted;
    await this.prisma.directIntegration.upsert({
      where: { cabinetId_channel: { cabinetId: id, channel } },
      create: { cabinetId: id, channel, botTokenEncrypted, chatId: dto.chatId.trim(), enabled: dto.enabled },
      update: { botTokenEncrypted, chatId: dto.chatId.trim(), enabled: dto.enabled },
    });
    return { channel, configured: true, enabled: dto.enabled, chatId: dto.chatId.trim(), hasToken: true };
  }

  private assertDirectChannel(channel: string) {
    if (!['telegram', 'max'].includes(channel)) throw new NotFoundException('Интеграция не поддерживается');
  }

  private encryptSecret(value: string) {
    const key = createHash('sha256').update(this.config.get<string>('INTEGRATION_ENCRYPTION_KEY')
      ?? this.config.get<string>('JWT_SECRET') ?? '').digest();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  async providerRegions() {
    const result = await this.provider.getAvailableRegions();
    return result.regions
      .filter((region) => Number.isInteger(region.region_id) && region.region_name.trim())
      .map((region) => ({ id: region.region_id, name: region.region_name.trim() }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }

  async providerIntegration(id: string, name: string) {
    if (!['telegram', 'bitrix', 'amocrm', 'email'].includes(name)) throw new NotFoundException('Интеграция не поддерживается');
    const cabinet = await this.prisma.cabinet.findUnique({ where: { id }, select: {
      providerProjectId: true, moneyBalance: true, price: true, totalUnits: true, usedUnits: true,
    } });
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
          isActive: false,
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
    // Новый кабинет всегда стартует с нулевым балансом (docs-agent.md): проект не должен
    // работать у провайдера, пока не поступила первая оплата.
    await this.syncProviderActivity(cabinet, providerProjectId);
    return {
      cabinet,
      credentials,
    };
  }

  private async syncProviderActivity(cabinet: {
    id: string; isActive: boolean; timezoneOffset: number; uploadsEnabled: boolean; callsEnabled: boolean;
    scheduleDays: number[]; moneyBalance: Prisma.Decimal; price: Prisma.Decimal; totalUnits: number; usedUnits: number;
  }, providerProjectId: number) {
    try {
      await this.provider.updateProjectSettings(providerProjectId, {
        isActive: cabinet.isActive && hasAvailableBalance(cabinet), timezoneOffset: cabinet.timezoneOffset,
        uploadsEnabled: cabinet.uploadsEnabled, callsEnabled: cabinet.callsEnabled,
        activeToday: this.isActiveToday(cabinet.scheduleDays),
      });
    } catch (error) {
      const now = new Date();
      await this.prisma.scheduledRun.create({ data: { cabinetId: cabinet.id, task: 'APPLY_SCHEDULE', scheduledFor: now,
        nextAttemptAt: now, lastError: error instanceof Error ? error.message.slice(0, 2000) : 'Provider sync failed' } });
    }
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

  private clientLoginFromProjectName(name: string) {
    const parts = name.split('/').map((part) => part.normalize('NFKC').trim()).filter(Boolean);
    return (parts.at(-1) ?? name.normalize('NFKC').trim()).replace(/\s+/g, ' ');
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
    const sectionVisibility = this.sectionVisibility(cabinet as Cabinet);
    if (user.role !== UserRole.LIMITED) return { ...cabinet, visibleSections, sectionVisibility };
    const visible = new Set(visibleSections);
    return { id: cabinet.id, name: cabinet.name, type: cabinet.type, providerProjectId: cabinet.providerProjectId,
      visibleSections, sectionVisibility,
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
    const cabinet = await this.prisma.cabinet.findUnique({ where: { id }, select: {
      providerProjectId: true, moneyBalance: true, price: true, totalUnits: true, usedUnits: true,
      isActive: true, timezoneOffset: true, uploadsEnabled: true, callsEnabled: true, scheduleDays: true,
    } });
    if (!cabinet) throw new NotFoundException('Кабинет не найден');
    const balanceAvailable = hasAvailableBalance(cabinet);
    // Insufficient balance keeps the project paused no matter what the form requested, but
    // must not block the rest of the form (uploads/calls/schedule/integrations) from saving —
    // a broke project still needs to be reachable to turn its uploads/calls off.
    const effectiveIsActive = dto.isActive && balanceAvailable;
    const balanceWarning = dto.isActive && !balanceAvailable
      ? 'Проект остаётся на паузе: недостаточно средств или оплаченных единиц'
      : undefined;
    const updated = await this.prisma.cabinet.update({ where: { id }, data: {
      isActive: effectiveIsActive, timezoneOffset: dto.timezoneOffset, uploadsEnabled: dto.uploadsEnabled,
      callsEnabled: dto.callsEnabled, schedulePreset: dto.schedulePreset, scheduleDays: dto.scheduleDays,
      crmIntegration: dto.crmIntegration,
      messengerIntegrations: dto.messengerIntegrations, contactsVisible: dto.contacts,
      sourcesVisible: dto.sources, scriptVisible: dto.script, financeVisible: dto.finance,
      settingsVisible: dto.settings,
    }, select: cabinetSelect });
    if (!cabinet.providerProjectId) {
      return { ...updated, providerSync: { status: 'SKIPPED' }, ...(balanceWarning ? { balanceWarning } : {}) };
    }
    const scheduleChanged = cabinet.scheduleDays.length !== dto.scheduleDays.length
      || cabinet.scheduleDays.some((day, index) => day !== dto.scheduleDays[index]);
    const generalChanged = cabinet.isActive !== effectiveIsActive
      || cabinet.timezoneOffset !== dto.timezoneOffset || scheduleChanged;
    const uploadsChanged = cabinet.uploadsEnabled !== dto.uploadsEnabled;
    const callsChanged = cabinet.callsEnabled !== dto.callsEnabled;
    const operationalNow = effectiveIsActive && this.isActiveToday(dto.scheduleDays);
    try {
      if (!operationalNow || generalChanged) {
        await this.provider.updateProjectSettings(cabinet.providerProjectId, {
          isActive: effectiveIsActive, timezoneOffset: dto.timezoneOffset,
          uploadsEnabled: dto.uploadsEnabled, callsEnabled: dto.callsEnabled,
          activeToday: this.isActiveToday(dto.scheduleDays),
        });
      } else if (uploadsChanged || callsChanged) {
        await this.provider.updateProjectProcesses(cabinet.providerProjectId, {
          uploadsEnabled: uploadsChanged ? dto.uploadsEnabled : undefined,
          callsEnabled: callsChanged ? dto.callsEnabled : undefined,
        });
      }
      return { ...updated, providerSync: { status: 'SYNCED' }, ...(balanceWarning ? { balanceWarning } : {}) };
    } catch (error) {
      const now = new Date();
      await this.prisma.scheduledRun.create({ data: { cabinetId: id, task: 'APPLY_SCHEDULE', scheduledFor: now,
        nextAttemptAt: now, lastError: error instanceof Error ? error.message.slice(0, 2000) : 'Provider sync failed' } });
      return { ...updated, providerSync: { status: 'PENDING', message: 'Статус будет повторно передан провайдеру' }, ...(balanceWarning ? { balanceWarning } : {}) };
    }
  }

  private isActiveToday(days: number[], now = new Date()) {
    const moscow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const day = moscow.getUTCDay();
    return days.includes(day === 0 ? 7 : day);
  }

  async updateMasterProject(id: string, dto: import('./dto/update-master-project.dto').UpdateMasterProjectDto) {
    const passwordHash = dto.clientPassword ? await hash(dto.clientPassword, 12) : undefined;
    const linkedProviderProjectIds = dto.linkedProviderProjectIds === undefined
      ? undefined : [...new Set(dto.linkedProviderProjectIds)];
    const operations: Prisma.PrismaPromise<unknown>[] = [this.prisma.cabinet.update({ where: { id }, data: {
      price: dto.price === undefined ? undefined : new Prisma.Decimal(dto.price), renewalStatus: dto.renewalStatus,
      isActive: dto.isActive, hidden: dto.hidden, linkedProviderProjectIds,
    }, select: cabinetSelect })];
    if (passwordHash) operations.push(this.prisma.user.updateMany({
      where: { cabinetId: id, role: UserRole.LIMITED },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }));
    const [updated] = await this.prisma.$transaction(operations);
    if (dto.isActive !== undefined) {
      const cabinet = updated as CabinetView;
      if (cabinet.providerProjectId) await this.syncProviderActivity(cabinet, cabinet.providerProjectId);
    }
    return updated;
  }

  async updateMasterBalance(id: string, nextValue: number, actorId: string) {
    const nextBalance = new Prisma.Decimal(nextValue);
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const cabinet = await tx.cabinet.findUnique({ where: { id }, select: {
        id: true, providerProjectId: true, moneyBalance: true, price: true, totalUnits: true, usedUnits: true,
      } });
      if (!cabinet) throw new NotFoundException('Кабинет не найден');
      const moneyDelta = nextBalance.minus(cabinet.moneyBalance);
      const remainingUnits = cabinet.price.gt(0) ? Math.floor(nextBalance.div(cabinet.price).toNumber()) : 0;
      const nextTotalUnits = cabinet.usedUnits + remainingUnits;
      const unitsDelta = nextTotalUnits - cabinet.totalUnits;
      if (!moneyDelta.isZero() || unitsDelta !== 0) {
        await tx.balanceEntry.create({ data: {
          cabinetId: id, type: BalanceEntryType.MANUAL_ADJUSTMENT,
          externalKey: `manual:${actorId}:${randomUUID()}`,
          moneyDelta, unitsDelta,
        } });
      }
      const updated = await tx.cabinet.update({ where: { id }, data: {
        moneyBalance: nextBalance, totalUnits: nextTotalUnits,
      }, select: cabinetSelect });
      if (cabinet.providerProjectId) {
        const now = new Date();
        await tx.scheduledRun.create({ data: {
          cabinetId: id, task: ScheduledTask.APPLY_SCHEDULE, scheduledFor: now, nextAttemptAt: now,
        } });
      }
      return updated;
    });
    return result;
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
      // "Настройки" убраны из "Управление доступом" — раздел всегда скрыт для LIMITED, флаг cabinet.settingsVisible игнорируется
    ];
  }

  private sectionVisibility(cabinet: Cabinet) {
    return {
      contacts: cabinet.contactsVisible,
      sources: cabinet.sourcesVisible,
      script: cabinet.scriptVisible,
      finance: cabinet.financeVisible,
      settings: false,
    };
  }
}
