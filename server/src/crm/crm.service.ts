import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LeadsFactoryService } from '../leads-factory/leads-factory.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListContactsDto } from './dto/list-contacts.dto';
import { ListLeadsDto } from './dto/list-leads.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { contactStatusLabel } from './contact-status';

@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService, private readonly provider: LeadsFactoryService) {}

  async listContacts(cabinetId: string, query: ListContactsDto) {
    const contacts = await this.prisma.contact.findMany({
      where: {
        cabinetId,
        status: query.status,
        date: this.dateFilter(query.dateFrom, query.dateTo),
      },
      orderBy: { date: 'desc' },
    });
    return contacts.map((contact) => ({ ...contact, displayStatus: contactStatusLabel(contact.status) }));
  }

  listLeads(cabinetId: string, query: ListLeadsDto) {
    const numericSearch = query.search && /^\d+$/.test(query.search) ? Number(query.search) : undefined;
    const searchNumber = numericSearch !== undefined && Number.isSafeInteger(numericSearch)
      && numericSearch >= -2_147_483_648 && numericSearch <= 2_147_483_647 ? numericSearch : undefined;
    return this.prisma.lead.findMany({
      where: {
        cabinetId,
        saleStatus: query.status,
        successDate: this.dateFilter(query.dateFrom, query.dateTo),
        ...(query.search ? {
          OR: [
            { contact: { mobileTel: { contains: query.search } } },
            ...(searchNumber !== undefined ? [{ contact: { providerAnswerId: searchNumber } }] : []),
          ],
        } : {}),
      },
      include: { contact: { select: { providerAnswerId: true, mobileTel: true, site: true } } },
      orderBy: { successDate: 'desc' },
    });
  }

  async updateLead(cabinetId: string, id: string, dto: UpdateLeadDto) {
    const lead = await this.prisma.lead.findFirst({ where: { id, cabinetId }, select: { id: true } });
    if (!lead) throw new NotFoundException('Лид не найден');
    return this.prisma.lead.update({
      where: { id },
      data: {
        feedback: dto.feedback,
        saleStatus: dto.saleStatus,
        amount: dto.amount === undefined ? undefined : new Prisma.Decimal(dto.amount),
      },
    });
  }

  async calls(cabinetId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, cabinetId }, select: { contact: { select: { providerAnswerId: true } } },
    });
    if (!lead) throw new NotFoundException('Лид не найден');
    if (lead.contact.providerAnswerId === null) throw new NotFoundException('Для fan-out лида нет записи provider-звонка');
    return this.provider.getCalls(lead.contact.providerAnswerId);
  }

  private dateFilter(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    const inclusiveTo = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? `${to}T23:59:59.999Z` : to;
    return { gte: from ? new Date(from) : undefined, lte: inclusiveTo ? new Date(inclusiveTo) : undefined };
  }
}
