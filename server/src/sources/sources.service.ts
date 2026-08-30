import { Injectable, NotFoundException } from '@nestjs/common';
import { LeadSaleStatus, Prisma } from '@prisma/client';
import { LeadsFactoryService } from '../leads-factory/leads-factory.service';
import { ProviderTag } from '../leads-factory/leads-factory.types';
import { PrismaService } from '../prisma/prisma.service';
import { AddSourcesDto } from './dto/add-sources.dto';
import { ListSourcesDto } from './dto/list-sources.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { parseSourceName } from './source-name';
import { DomainSourceJobsService } from './domain-source-jobs.service';

@Injectable()
export class SourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: LeadsFactoryService,
    private readonly domainJobs: DomainSourceJobsService,
  ) {}

  async sync(cabinetId: string, query: ListSourcesDto) {
    const cabinet = await this.cabinet(cabinetId);
    const startDate = query.dateFrom ?? '2026-06-01';
    const endDate = query.dateTo ?? new Date().toISOString().slice(0, 10);
    let page = 1;
    let count = 0;
    do {
      const result = await this.provider.getTags(cabinet.providerProjectId!, { page, startDate, endDate });
      for (const tag of result.items) {
        await this.upsertTag(cabinetId, tag);
        count += 1;
      }
      if (page * 5000 >= result.total || result.items.length === 0) break;
      page += 1;
    } while (true);
    return { count, startDate, endDate };
  }

  async list(cabinetId: string, query: ListSourcesDto) {
    const where = {
        cabinetId,
        ...(query.withLeadsOnly === 'true' ? { success: { gte: 1 } } : {}),
        ...(query.status ? { normWork: query.status === 'active' } : {}),
      };
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 200;
    const [tags, total] = await Promise.all([this.prisma.sourceTag.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize, take: pageSize,
    }), this.prisma.sourceTag.count({ where })]);
    const leads = await this.prisma.lead.findMany({
      where: { cabinetId }, select: { saleStatus: true, contact: { select: { site: true } } },
    });
    const leadsBySite = new Map<string, typeof leads>();
    for (const lead of leads) {
      if (!lead.contact.site) continue;
      // Contact.site stores the raw provider tag string (e.g. `B111_<phone>_<projectId>`),
      // the same shape as SourceTag.rawName below — both sides must be parsed the same
      // way or the join never matches and sales/notTargetShare stay stuck at 0.
      const key = parseSourceName(lead.contact.site).name;
      const items = leadsBySite.get(key) ?? [];
      items.push(lead); leadsBySite.set(key, items);
    }
    const items = tags.map((tag) => {
      // Нормализуем исходное имя и при чтении: так старые записи, сохранённые до
      // появления парсера, также отображаются как `example.com`, а не как
      // `B1291_example.com_32092309`.
      const parsed = parseSourceName(tag.rawName || tag.name);
      const matching = leadsBySite.get(parsed.name) ?? [];
      const notTarget = matching.filter((lead) => lead.saleStatus === LeadSaleStatus.NOT_TARGET).length;
      return {
        ...tag,
        name: parsed.name,
        operator: parsed.operator ?? tag.operator,
        // Public source ID is the internal Leads Factory tag ID. The local UUID
        // remains an implementation detail and must not leak into the project UI.
        id: String(tag.providerTagId),
        sales: matching.filter((lead) => lead.saleStatus === LeadSaleStatus.BOUGHT).length,
        notTargetShare: matching.length === 0 ? 0 : Math.round((notTarget / matching.length) * 1000) / 10,
      };
    });
    return { items, total, page, pageSize, hasMore: page * pageSize < total };
  }

  async toggle(cabinetId: string, tagId: string, enabled: boolean) {
    const providerTagId = Number(tagId);
    if (!Number.isSafeInteger(providerTagId) || providerTagId <= 0) throw new NotFoundException('Источник не найден');
    const tag = await this.prisma.sourceTag.findFirst({ where: { providerTagId, cabinetId } });
    if (!tag) throw new NotFoundException('Источник не найден');
    await this.provider.updateTag(tag.providerTagId, enabled);
    return this.prisma.sourceTag.update({ where: { id: tag.id }, data: { normWork: enabled, limit: enabled ? 50 : 0 } });
  }

  async add(cabinetId: string, dto: AddSourcesDto) {
    const cabinet = await this.cabinet(cabinetId);
    const result = await this.provider.addSources(cabinet.providerProjectId!, {
      source: dto.sources, source_type: dto.sourceType, active_duplicate_source: dto.activeDuplicateSource ?? false,
      label: dto.tagType ?? null, subsource: null, source_from: 'web', label_color: null, geo_ids: [],
    });
    const job = dto.sourceType === 'domain' ? await this.domainJobs.enqueue(cabinetId) : null;
    return { result, domainProcessingJob: job };
  }

  availableTypes() { return this.provider.availableTagTypes(); }

  async getAutomation(cabinetId: string) {
    const cabinet = await this.prisma.cabinet.findUnique({ where: { id: cabinetId }, select: {
      autoCleanupEnabled: true, autoManagementEnabled: true, minContactsPerLead: true, minConversion: true,
    } });
    if (!cabinet) throw new NotFoundException('Кабинет не найден');
    return {
      autoCleanupEnabled: cabinet.autoCleanupEnabled, minContactsPerLead: cabinet.minContactsPerLead,
      autoManageEnabled: cabinet.autoManagementEnabled, minConversion: Number(cabinet.minConversion),
    };
  }

  async updateAutomation(cabinetId: string, dto: UpdateAutomationDto) {
    return this.prisma.cabinet.update({
      where: { id: cabinetId },
      data: {
        autoCleanupEnabled: dto.autoCleanupEnabled, autoManagementEnabled: dto.autoManagementEnabled,
        minContactsPerLead: dto.minContactsPerLead,
        minConversion: dto.minConversion === undefined ? undefined : new Prisma.Decimal(dto.minConversion),
      },
    });
  }

  async automate(cabinetId: string) {
    // Автоочистка и автоуправление анализируют весь накопленный период с
    // 01.04.2026 по сегодня, независимо от выбранного пользователем периода в
    // разделе источников. docs-agent.md 2.6.4 буквально говорит "фильтрация за
    // 28 дней" — это устаревшая формулировка ТЗ; продуктовое решение (уточнено
    // с заказчиком) — считать с апреля 2026 года, не скользящим окном.
    const end = new Date();
    const start = new Date('2026-04-01T00:00:00.000Z');
    await this.sync(cabinetId, {
      dateFrom: start.toISOString().slice(0, 10),
      dateTo: end.toISOString().slice(0, 10),
    });
    const cabinet = await this.cabinet(cabinetId);
    const tags = await this.prisma.sourceTag.findMany({ where: { cabinetId } });
    const minConversion = Number(cabinet.minConversion);
    const disable = cabinet.autoCleanupEnabled ? tags.filter((t) => t.newAnswer >= cabinet.minContactsPerLead && Number(t.conversion) < minConversion) : [];
    const enable = cabinet.autoManagementEnabled ? tags.filter((t) => Number(t.conversion) >= minConversion) : [];
    if (disable.length) await this.provider.updateTags(disable.map((t) => t.providerTagId), false);
    if (enable.length) await this.provider.updateTags(enable.map((t) => t.providerTagId), true);
    await this.prisma.$transaction([
      this.prisma.sourceTag.updateMany({ where: { id: { in: disable.map((t) => t.id) } }, data: { normWork: false, limit: 0 } }),
      this.prisma.sourceTag.updateMany({ where: { id: { in: enable.map((t) => t.id) } }, data: { normWork: true, limit: 50 } }),
    ]);
    return { disabled: disable.length, enabled: enable.length,
      analysisFrom: start.toISOString().slice(0, 10), analysisTo: end.toISOString().slice(0, 10) };
  }

  private async cabinet(id: string) {
    const cabinet = await this.prisma.cabinet.findUnique({ where: { id } });
    if (!cabinet) throw new NotFoundException('Кабинет не найден');
    if (!cabinet.providerProjectId) throw new NotFoundException('У кабинета не указан providerProjectId');
    return cabinet;
  }

  private upsertTag(cabinetId: string, tag: ProviderTag) {
    const rawName = tag.name ?? tag.tag ?? tag.tag_name ?? String(tag.id);
    const parsed = parseSourceName(rawName);
    const data = {
      rawName, name: parsed.name, operator: parsed.operator, sourceType: tag.source_type ?? tag.type,
      newAnswer: tag.new_answer ?? 0, success: tag.success ?? 0,
      conversion: new Prisma.Decimal(tag.conversion ?? 0), sebes: new Prisma.Decimal(tag.sebes ?? 0),
      normWork: tag.norm_work ?? false, limit: tag.limit ?? 0, syncedAt: new Date(),
    };
    return this.prisma.sourceTag.upsert({
      where: { cabinetId_providerTagId: { cabinetId, providerTagId: tag.id } },
      create: { cabinetId, providerTagId: tag.id, ...data }, update: data,
    });
  }
}
