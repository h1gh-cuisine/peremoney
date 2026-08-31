import { Injectable, NotFoundException } from '@nestjs/common';
import { Cabinet, SyncStatus } from '@prisma/client';
import { LeadsFactoryService } from '../leads-factory/leads-factory.service';
import { ProviderAnswer } from '../leads-factory/leads-factory.types';
import { PrismaService } from '../prisma/prisma.service';
import { parseProviderDate } from './provider-date';
import { FinanceService } from '../finance/finance.service';
import { DirectMessengerService } from '../integrations/direct-messenger.service';

@Injectable()
export class AnswerSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: LeadsFactoryService,
    private readonly finance: FinanceService,
    private readonly messenger?: DirectMessengerService,
  ) {}

  /**
   * Syncs the cabinet's own Leads Factory project plus every project linked via
   * Cabinet.linkedProviderProjectIds ("Связанные проекты", master-кабинет →
   * Проекты) — leads/contacts from all of them land in this one cabinet.
   */
  async sync(cabinetId: string) {
    const cabinet = await this.prisma.cabinet.findUnique({
      where: { id: cabinetId }, include: { providerCreation: { select: { id: true } } },
    });
    if (!cabinet) throw new NotFoundException('Кабинет не найден');
    if (!cabinet.providerProjectId) throw new NotFoundException('У кабинета не указан providerProjectId');
    const projectIds = [...new Set([cabinet.providerProjectId, ...cabinet.linkedProviderProjectIds])];
    const runs = [];
    for (const projectId of projectIds) {
      runs.push(await this.syncProject(cabinetId, projectId, cabinet));
    }
    return runs;
  }

  private async syncProject(
    cabinetId: string, projectId: number,
    cabinet: Cabinet & { providerCreation: { id: string } | null },
  ) {
    const syncBoundary = new Date();
    const hasImportedContacts = await this.prisma.contact.count({ where: { cabinetId, providerProjectId: projectId } }) > 0;
    // providerCreation only ever describes how the cabinet's own (primary) project
    // came to exist; a linked project is always pre-existing at Leads Factory, so it
    // always gets a full historical import the first time it's synced.
    const isPrimaryProject = projectId === cabinet.providerProjectId;
    const historicalImport = !hasImportedContacts && !(isPrimaryProject && cabinet.providerCreation);
    const previousRun = await this.prisma.answerSyncRun.findFirst({
      where: { cabinetId, providerProjectId: projectId, status: SyncStatus.SUCCEEDED },
      orderBy: { startedAt: 'desc' },
      select: { startedAt: true },
    });
    // Перекрываем две минуты: дубликаты безопасны благодаря providerAnswerId,
    // а запоздавшие транзакции провайдера не теряются на границе двух polling-окон.
    const dateUpdatedFrom = previousRun
      ? new Date(previousRun.startedAt.getTime() - 2 * 60 * 1000)
      : undefined;
    const run = await this.prisma.answerSyncRun.create({ data: { cabinetId, providerProjectId: projectId, startedAt: syncBoundary } });
    let receivedCount = 0;
    let contactCount = 0;
    let leadCount = 0;
    try {
      let page = 1;
      do {
        const result = await this.provider.getAnswers(projectId, {
          page,
          limit: 200,
          // Первый запуск импортирует историю — но только когда historicalImport
          // разрешает её (см. выше): для клона/только что созданного в Leads Factory
          // проекта у cabinet.providerCreation стоит запись, поэтому dateFrom режется
          // по cabinet.createdAt так же, как и на последующих запусках, и лиды,
          // случившиеся до клонирования, в новый кабинет не попадают.
          dateFrom: previousRun ? undefined : (historicalImport ? undefined : cabinet.createdAt),
          dateTo: previousRun ? undefined : syncBoundary,
          dateUpdatedFrom,
          dateUpdatedTo: previousRun ? syncBoundary : undefined,
        });
        receivedCount += result.items.length;
        for (const answer of result.items) {
          if (answer.status === 'repeat') continue;
          const saved = await this.saveAnswer(cabinetId, projectId, answer, historicalImport);
          // null = provider sent no date for this answer (Answer.date is nullable per
          // leads-docs.json) — skipped rather than persisted, so it must not inflate
          // contactCount and, more importantly, must not throw and fail the whole run:
          // a single such answer would otherwise permanently stall every later sync,
          // because the incremental window only advances past SUCCEEDED runs.
          if (saved === null) continue;
          contactCount += 1;
          if (saved) leadCount += 1;
        }
        if (page * 200 >= result.total || result.items.length === 0) break;
        page += 1;
      } while (true);
      return await this.prisma.answerSyncRun.update({
        where: { id: run.id },
        data: { status: SyncStatus.SUCCEEDED, receivedCount, contactCount, leadCount, finishedAt: new Date() },
      });
    } catch (error) {
      await this.prisma.answerSyncRun.update({
        where: { id: run.id },
        data: {
          status: SyncStatus.FAILED, receivedCount, contactCount, leadCount,
          error: error instanceof Error ? error.message.slice(0, 2000) : 'Unknown error', finishedAt: new Date(),
        },
      });
      throw error;
    }
  }

  private async saveAnswer(
    cabinetId: string, providerProjectId: number, answer: ProviderAnswer, historicalImport = false,
  ): Promise<boolean | null> {
    // Answer.date is nullable in the real API (leads-docs.json); Contact.date is NOT
    // NULL. Skip such an answer instead of crashing the whole sync run on it.
    if (!answer.date) return null;
    const status = answer.status ?? '';
    const mobileTel = answer.mobile_tel ?? '';
    const key = { cabinetId_providerProjectId_providerAnswerId: { cabinetId, providerProjectId, providerAnswerId: answer.id } };
    const existingContact = await this.prisma.contact.findUnique({ where: key, select: { id: true } });
    const contact = await this.prisma.contact.upsert({
      where: key,
      create: {
        cabinetId, providerProjectId, providerAnswerId: answer.id, date: parseProviderDate(answer.date),
        status, mobileTel, site: answer.site,
        mobileOperator: answer.mobile_operator,
      },
      update: {
        date: parseProviderDate(answer.date), status, mobileTel,
        site: answer.site, mobileOperator: answer.mobile_operator,
      },
    });
    if (!existingContact && !historicalImport) await this.finance.chargeUsage(cabinetId, 'contact', contact.id);
    if (status !== 'success') return false;
    const existingLead = await this.prisma.lead.findUnique({ where: { contactId: contact.id }, select: { id: true } });
    await this.prisma.lead.upsert({
      where: { contactId: contact.id },
      create: {
        cabinetId, contactId: contact.id,
        successDate: parseProviderDate(answer.success_date ?? answer.date), comment: answer.name,
      },
      update: {
        successDate: parseProviderDate(answer.success_date ?? answer.date), comment: answer.name,
      },
    });
    if (!existingLead && !historicalImport) await this.finance.chargeUsage(cabinetId, 'lead', contact.id);
    if (!existingLead && !historicalImport) await this.messenger?.notifyLead(cabinetId, {
      providerAnswerId: answer.id, phone: mobileTel, name: answer.name,
      site: answer.site, date: parseProviderDate(answer.success_date ?? answer.date),
    });
    return true;
  }
}
