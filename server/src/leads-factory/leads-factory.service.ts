import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderException } from './provider.exception';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  ProviderAcquisitionFlags, ProviderAnswersPage, ProviderCall, ProviderIntegrationName, ProviderProjectCreated,
  ProviderProjectDetail, ProviderProjectType, ProviderRegion, ProviderScript, ProviderSource, ProviderTag,
  ProviderProjectFinance,
} from './leads-factory.types';

@Injectable()
export class LeadsFactoryService {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(config: ConfigService, @Optional() private readonly auditLog?: AuditLogService) {
    this.baseUrl = config.get('LEADS_FACTORY_BASE_URL', 'https://openapi.leads-factory.ru/v1').replace(/\/$/, '');
    this.token = config.get<string>('LEADS_FACTORY_TOKEN') ?? '';
  }

  getAnswers(projectId: number, params: {
    page: number; limit?: number; dateFrom?: Date; dateTo?: Date;
    dateUpdatedFrom?: Date; dateUpdatedTo?: Date;
  }) {
    return this.request<ProviderAnswersPage>(`/crm/open-api/projects/${projectId}/answers`, {
      page: params.page,
      limit: params.limit ?? 200,
      order: 'asc',
      date_from: params.dateFrom ? this.providerDate(params.dateFrom) : undefined,
      date_to: params.dateTo ? this.providerDate(params.dateTo) : undefined,
      date_updated_from: params.dateUpdatedFrom ? this.providerDate(params.dateUpdatedFrom) : undefined,
      date_updated_to: params.dateUpdatedTo ? this.providerDate(params.dateUpdatedTo) : undefined,
    });
  }

  async getCalls(answerId: number): Promise<ProviderCall[]> {
    const result = await this.request<{ items: ProviderCall[] }>(`/crm/open-api/answers/${answerId}/calls`);
    return result.items;
  }

  async getTags(crmId: number, params: { page: number; startDate: string; endDate: string; sourceType?: string }) {
    const raw = await this.request<unknown>(`/vdl/api/tags/get_by_project_and_date/${crmId}`, {
      page: params.page, limit: 5000, start_date: params.startDate, end_date: params.endDate,
      show_locked: 'false', filter_by_type: params.sourceType,
    });
    return this.normalizePage<ProviderTag>(raw, 'тегов', ['tags'], ['total_count']);
  }

  async getSources(crmId: number, page: number, sourceType?: 'phone' | 'domain') {
    const raw = await this.request<unknown>(`/vdl/api/sources/get_by_project/${crmId}`, {
      page, limit: 5000, source_type: sourceType, hidden: 'only_visible',
    });
    return this.normalizePage<ProviderSource>(raw, 'источников', ['sources'], ['total_count']);
  }

  updateSourceSettings(sourceIds: number[]) {
    return this.request('/vdl/api/sources/update_settings', {}, {
      method: 'POST', body: { source_ids: sourceIds, parse_phone: false, parse_ishod: true },
    });
  }

  // enabledLimit по умолчанию 50 — только страховка для мест, которые ещё не
  // передают лимит явно. Реальные вызовы должны передавать Cabinet.defaultLimit
  // ("лимит, который выставляется новым тегам по умолчанию" — leads-docs.json,
  // ProjectInfoUpdateSchema), чтобы включение тега работало по лимиту именно
  // этого проекта, а не по одному значению на всех.
  updateTag(tagId: number, enabled: boolean, enabledLimit = 50) {
    return this.request(`/vdl/api/tags/update/${tagId}`, {}, {
      method: 'PATCH', body: { norm_work: enabled, limit: enabled ? enabledLimit : 0 },
    });
  }

  // Провайдер отклоняет запрос с "Нельзя обновлять больше 1000 тегов за раз" —
  // замечено на реальном кабинете 30.08.2026. Бьём на чанки и шлём
  // последовательно, чтобы не упереться в этот лимит и не создавать всплеск
  // параллельных запросов к Leads Factory.
  private static readonly MAX_TAG_IDS_PER_UPDATE = 1000;

  async updateTags(tagIds: number[], enabled: boolean, enabledLimit = 50) {
    for (let offset = 0; offset < tagIds.length; offset += LeadsFactoryService.MAX_TAG_IDS_PER_UPDATE) {
      const chunk = tagIds.slice(offset, offset + LeadsFactoryService.MAX_TAG_IDS_PER_UPDATE);
      await this.request('/vdl/api/tags/update', {}, {
        method: 'PATCH', body: { tag_ids: chunk, update_tag_schema: { norm_work: enabled, limit: enabled ? enabledLimit : 0 } },
      });
    }
  }

  addSources(crmId: number, body: Record<string, unknown>) {
    return this.request(`/vdl/api/sources/add_all/${crmId}`, {}, { method: 'PUT', body });
  }

  availableTagTypes() {
    return this.request<unknown>('/vdl/api/tags/available_tags_types');
  }

  // work_client_status зеркалит общий active/operational статус проекта — независимого
  // переключателя у него нет. "Выгрузки" в Настройках — это блок закупки/парсинга
  // (see updateAcquisitionFlags), а не этот флаг.
  updateProjectSchedule(projectId: number, active: boolean, options: { callsEnabled?: boolean } = {}) {
    return this.request(`/crm/open-api/projects/${projectId}`, {}, {
      method: 'PATCH',
      body: {
        status: active ? 'active' : 'pause',
        work_client_status: active ? 'active' : 'stop',
        call_center_status: active && options.callsEnabled !== false ? 'active' : 'pause_daily',
      },
    });
  }

  updateProjectProcesses(projectId: number, processes: { callsEnabled: boolean }) {
    return this.request(`/crm/open-api/projects/${projectId}`, {}, {
      method: 'PATCH',
      body: { call_center_status: processes.callsEnabled ? 'active' : 'pause_daily' },
    });
  }

  updateProjectSettings(projectId: number, settings: {
    isActive: boolean; timezoneOffset: number; callsEnabled: boolean; activeToday: boolean;
  }) {
    const operational = settings.isActive && settings.activeToday;
    return this.request(`/crm/open-api/projects/${projectId}`, {}, {
      method: 'PATCH',
      body: {
        status: operational ? 'active' : 'pause',
        timezone: settings.timezoneOffset,
        work_client_status: operational ? 'active' : 'stop',
        call_center_status: operational && settings.callsEnabled ? 'active' : 'pause_daily',
      },
    });
  }

  // "Выгрузки" в Настройках проекта = блок закупки/парсинга Vdl_ProjectInfoUpdateSchema
  // (parse_domains/parse_phones/... + check_domains_in_v_kazakh), а НЕ work_client_status —
  // это выяснилось только по факту: work_client_status в реальности ни на что видимое
  // в Leads Factory не влиял, хотя так и остался привязан к статусу проекта (см. выше).
  async getAcquisitionFlags(projectId: number): Promise<ProviderAcquisitionFlags> {
    const raw = await this.request<Record<string, unknown>>(`/vdl/api/projects/info/${projectId}`);
    return {
      check_domains_in_v_kazakh: Boolean(raw.check_domains_in_v_kazakh),
      parse_domains: Boolean(raw.parse_domains),
      parse_phones: Boolean(raw.parse_phones),
      parse_ishod: Boolean(raw.parse_ishod),
      parse_ceo: Boolean(raw.parse_ceo),
      parse_google: Boolean(raw.parse_google),
      parse_manual: Boolean(raw.parse_manual),
      parse_maps: Boolean(raw.parse_maps),
    };
  }

  updateAcquisitionFlags(projectId: number, flags: ProviderAcquisitionFlags) {
    return this.request(`/vdl/api/projects/info/${projectId}`, {}, { method: 'PATCH', body: flags });
  }

  updateProjectAutomationLimits(projectId: number, limits: { defaultLimit: number; maxLimit: number }) {
    return this.request(`/vdl/api/projects/info/${projectId}`, {}, {
      method: 'PATCH',
      body: {
        default_limit: limits.defaultLimit,
        max_limit: limits.maxLimit,
        // Автоскрипты сами двигают лимиты тегов — мы задаём коридор, не разрешаем провайдеру менять его сам.
        limit_autochange: false,
      },
    });
  }

  getProjectScript(projectId: number) {
    return this.request<ProviderScript>(`/crm/open-api/projects/${projectId}/script`);
  }

  getProjectTypes() {
    return this.request<{ items: ProviderProjectType[] }>('/crm/open-api/projects/types');
  }

  getProjectFinance(projectId: number, params: { dateFrom?: string; dateTo?: string }) {
    return this.request<ProviderProjectFinance>(`/crm/open-api/projects/${projectId}/finance/get`, {
      date_from: params.dateFrom,
      date_to: params.dateTo,
    });
  }

  getAvailableRegions() {
    return this.request<{ regions: ProviderRegion[] }>('/vdl/api/regions/avaliable_regions');
  }

  createProject(body: { name: string; type: number; regions: number[]; status: 'active' | 'pause'; default_limit: number }) {
    return this.request<ProviderProjectCreated>('/crm/open-api/projects', {}, { method: 'POST', body });
  }

  // Vdl_ProjectInfoUpdateSchema принимает любое подмножество полей — отсутствующие
  // не трогаются (leads-docs.json). Раньше сюда всегда слали полный объект со всеми
  // parse_*-флагами; сузили до того, что реально нужно при создании проекта (см.
  // DEFAULT_PROVIDER_PROJECT_INFO) — держим сигнатуру частичной под этот контракт.
  updateProjectInfo(projectId: number, body: Partial<{
    check_domains_in_v_kazakh: boolean; parse_domains: boolean; parse_phones: boolean;
    parse_ishod: boolean; parse_ceo: boolean; parse_google: boolean; parse_manual: boolean;
    parse_maps: boolean; limit_autochange: boolean; max_limit: number; default_limit: number;
    ishod_phones_count: number; vdl_autonorms: boolean;
  }>) {
    return this.request<string>(`/vdl/api/projects/info/${projectId}`, {}, { method: 'PATCH', body });
  }

  getProject(projectId: number) {
    return this.request<ProviderProjectDetail>(`/crm/open-api/projects/${projectId}`);
  }

  getIntegration(projectId: number, name: ProviderIntegrationName) {
    return this.request<unknown>(`/crm/open-api/projects/${projectId}/integrations/${name}`);
  }

  private async request<T = unknown>(
    path: string,
    query: Record<string, string | number | undefined> = {},
    options: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    if (!this.token) {
      const error = new ProviderException(503, 'LEADS_FACTORY_TOKEN не настроен');
      await this.logError(path, options.method ?? 'GET', query, options.body, error);
      throw error;
    }
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const method = options.method ?? 'GET';
    const safeToRetry = method === 'GET' || method === 'PATCH';
    let response: Response | undefined;
    let lastNetworkError: unknown;
    for (let attempt = 0; attempt < (safeToRetry ? 3 : 1); attempt += 1) {
      try {
        response = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json', Authorization: `Bearer ${this.token}`,
          ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(20_000),
        });
        if (![502, 504].includes(response.status) || !safeToRetry || attempt === 2) break;
      } catch (error) {
        lastNetworkError = error;
        if (!safeToRetry || attempt === 2) break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
    }
    if (!response) {
      const error = new ProviderException(502, `Leads Factory недоступен: ${lastNetworkError instanceof Error ? lastNetworkError.message : 'network error'}`);
      await this.logError(path, method, query, options.body, error);
      throw error;
    }
    const body = await response.json().catch(() => undefined) as unknown;
    if (!response.ok) {
      const messages: Record<number, string> = {
        401: 'Токен Leads Factory недействителен', 403: 'Нет доступа к Leads Factory',
        404: 'Объект Leads Factory не найден', 409: 'Конфликт данных Leads Factory',
        422: 'Leads Factory отклонил параметры запроса', 502: 'Ошибка CRM Leads Factory',
        504: 'CRM Leads Factory временно недоступна',
      };
      const error = new ProviderException(response.status, messages[response.status] ?? 'Ошибка Leads Factory', this.safeErrorBody(body));
      await this.logError(path, method, query, options.body, error);
      throw error;
    }
    return body as T;
  }

  private async logError(
    path: string, method: string, query: Record<string, string | number | undefined>, body: unknown,
    error: ProviderException,
  ) {
    await this.auditLog?.recordLeadsFactoryError({
      method, path, statusCode: error.providerStatus, query, body,
      providerBody: error.providerBody, reason: error.message,
    });
  }

  private providerDate(value: Date) {
    return value.toISOString().replace('T', ' ').slice(0, 19);
  }

  private normalizePage<T>(raw: unknown, entity: string, itemKeys: string[] = [], totalKeys: string[] = []): { items: T[]; total: number } {
    if (Array.isArray(raw)) return { items: raw as T[], total: raw.length };
    if (!raw || typeof raw !== 'object') throw new ProviderException(502, `Leads Factory вернул некорректный список ${entity}`);
    const record = raw as Record<string, unknown>;
    const nested = record.data && typeof record.data === 'object' && !Array.isArray(record.data)
      ? record.data as Record<string, unknown>
      : undefined;
    const items = [record.items, record.results, ...itemKeys.map((key) => record[key]), record.data, nested?.items, nested?.results]
      .find(Array.isArray) as T[] | undefined;
    if (!items) throw new ProviderException(502, `Leads Factory вернул список ${entity} без массива items`);
    const rawTotal = record.total ?? record.count ?? totalKeys.map((key) => record[key]).find((value) => value !== undefined)
      ?? nested?.total ?? nested?.count;
    const total = typeof rawTotal === 'number' && Number.isFinite(rawTotal) ? rawTotal : items.length;
    return { items, total };
  }

  private safeErrorBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const value = structuredClone(body) as { detail?: unknown };
    if (Array.isArray(value.detail)) {
      value.detail = value.detail.map((item) => {
        if (!item || typeof item !== 'object') return item;
        const { input: _secretInput, ...safe } = item as Record<string, unknown>;
        return safe;
      });
    }
    return value;
  }
}
