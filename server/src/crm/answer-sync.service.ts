import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SyncStatus } from '@prisma/client';
import { LeadsFactoryService } from '../leads-factory/leads-factory.service';
import { ProviderAnswer } from '../leads-factory/leads-factory.types';
import { PrismaService } from '../prisma/prisma.service';
import { parseProviderDate } from './provider-date';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class AnswerSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: LeadsFactoryService,
    private readonly finance: FinanceService,
  ) {}

  async sync(cabinetId: string) {
    const cabinet = await this.prisma.cabinet.findUnique({ where: { id: cabinetId } });
    if (!cabinet) throw new NotFoundException('Кабинет не найден');
    if (!cabinet.providerProjectId) throw new NotFoundException('У кабинета не указан providerProjectId');
    const run = await this.prisma.answerSyncRun.create({ data: { cabinetId } });
    let receivedCount = 0;
    let contactCount = 0;
    let leadCount = 0;
    try {
      let page = 1;
      do {
        const result = await this.provider.getAnswers(cabinet.providerProjectId, {
          page, limit: 200, dateFrom: cabinet.createdAt, dateTo: new Date(),
        });
        receivedCount += result.items.length;
        for (const answer of result.items) {
          if (answer.status === 'repeat') continue;
          const saved = await this.saveAnswer(cabinetId, answer);
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

  private async saveAnswer(cabinetId: string, answer: ProviderAnswer): Promise<boolean> {
    const existingContact = await this.prisma.contact.findUnique({
      where: { cabinetId_providerAnswerId: { cabinetId, providerAnswerId: answer.id } },
      select: { id: true },
    });
    const contact = await this.prisma.contact.upsert({
      where: { cabinetId_providerAnswerId: { cabinetId, providerAnswerId: answer.id } },
      create: {
        cabinetId, providerAnswerId: answer.id, date: parseProviderDate(answer.date),
        status: answer.status, mobileTel: answer.mobile_tel, site: answer.site,
        mobileOperator: answer.mobile_operator,
      },
      update: {
        date: parseProviderDate(answer.date), status: answer.status, mobileTel: answer.mobile_tel,
        site: answer.site, mobileOperator: answer.mobile_operator,
      },
    });
    if (!existingContact) await this.finance.chargeUsage(cabinetId, 'contact', contact.id);
    if (answer.status !== 'success') return false;
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
    if (!existingLead) await this.finance.chargeUsage(cabinetId, 'lead', contact.id);
    return true;
  }
}
