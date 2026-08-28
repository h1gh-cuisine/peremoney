import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { FanoutDeliveryStatus, Prisma } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';
import { FinanceService } from '../finance/finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { IncomingLeadDto } from './dto/incoming-lead.dto';
import { DirectMessengerService } from '../integrations/direct-messenger.service';

@Injectable()
export class FanoutService {
  constructor(private readonly prisma: PrismaService, private readonly finance: FinanceService, private readonly messenger?: DirectMessengerService) {}

  async createSource(name: string) {
    const token = randomBytes(32).toString('base64url');
    const source = await this.prisma.fanoutSource.create({ data: {
      name, publicId: randomUUID(), tokenHash: await hash(token, 12),
    }, select: { id: true, publicId: true, name: true, isActive: true, createdAt: true } });
    return { source, token };
  }

  listSources() {
    return this.prisma.fanoutSource.findMany({
      include: { destinations: { include: { cabinet: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setDestinations(sourceId: string, cabinetIds: string[]) {
    const uniqueIds = [...new Set(cabinetIds)];
    return this.prisma.$transaction(async (tx) => {
      await tx.fanoutSource.update({ where: { id: sourceId }, data: {} });
      const count = await tx.cabinet.count({ where: { id: { in: uniqueIds } } });
      if (count !== uniqueIds.length) throw new NotFoundException('Один или несколько кабинетов не найдены');
      await tx.fanoutDestination.deleteMany({ where: { sourceId } });
      await tx.fanoutDestination.createMany({
        data: uniqueIds.map((cabinetId) => ({ sourceId, cabinetId })), skipDuplicates: true,
      });
      return tx.fanoutSource.update({ where: { id: sourceId }, data: {}, include: { destinations: true } });
    });
  }

  listDeliveries(sourceId: string) {
    return this.prisma.fanoutDelivery.findMany({
      where: { incomingLead: { sourceId } }, include: {
        incomingLead: true, cabinet: { select: { id: true, name: true } },
      }, orderBy: { createdAt: 'desc' }, take: 200,
    });
  }

  async ingest(publicId: string, token: string | undefined, dto: IncomingLeadDto) {
    const source = await this.prisma.fanoutSource.findUnique({
      where: { publicId }, include: { destinations: true },
    });
    if (!source || !source.isActive) throw new NotFoundException('Источник fan-out не найден');
    if (!token || !(await this.tokenMatches(token, source.tokenHash))) throw new ForbiddenException('Неверный fan-out токен');

    const existing = await this.prisma.incomingLead.findUnique({
      where: { sourceId_externalId: { sourceId: source.id, externalId: dto.externalId } }, include: { deliveries: true },
    });
    if (existing) {
      await this.deliverPending(existing.id);
      return { duplicate: true, incomingLeadId: existing.id, deliveries: existing.deliveries };
    }

    let incoming;
    try {
      incoming = await this.prisma.incomingLead.create({ data: {
        sourceId: source.id, externalId: dto.externalId, date: new Date(dto.date), mobileTel: dto.mobileTel,
        name: dto.name, site: dto.site, mobileOperator: dto.mobileOperator,
        payload: dto.payload as Prisma.InputJsonValue | undefined,
        deliveries: { create: source.destinations.map((destination) => ({ cabinetId: destination.cabinetId })) },
      } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      incoming = await this.prisma.incomingLead.findUniqueOrThrow({
        where: { sourceId_externalId: { sourceId: source.id, externalId: dto.externalId } },
      });
    }
    await this.deliverPending(incoming.id);
    const deliveries = await this.prisma.fanoutDelivery.findMany({ where: { incomingLeadId: incoming.id } });
    return { duplicate: false, incomingLeadId: incoming.id, deliveries };
  }

  async deliverPending(incomingLeadId: string) {
    const deliveries = await this.prisma.fanoutDelivery.findMany({
      where: { incomingLeadId, status: { not: FanoutDeliveryStatus.COMPLETED } }, include: { incomingLead: true },
    });
    for (const delivery of deliveries) {
      try {
        const created = await this.prisma.$transaction(async (tx) => {
          // One delivery can be picked by several HTTP requests. Lock by its UUID
          // before re-reading it so only one transaction creates contact/lead.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${delivery.id}))`;
          const current = await tx.fanoutDelivery.update({
            where: { id: delivery.id },
            data: { attempts: { increment: 1 }, status: FanoutDeliveryStatus.PENDING },
            include: { incomingLead: true },
          });
          if (current.contactId) {
            const lead = await tx.lead.findUniqueOrThrow({ where: { contactId: current.contactId } });
            return { contactId: current.contactId, leadId: lead.id, isNew: false };
          }
          const contact = await tx.contact.create({ data: {
            cabinetId: current.cabinetId, providerAnswerId: null, date: current.incomingLead.date,
            status: 'success', mobileTel: current.incomingLead.mobileTel, site: current.incomingLead.site,
            mobileOperator: current.incomingLead.mobileOperator,
          } });
          const lead = await tx.lead.create({ data: {
            cabinetId: current.cabinetId, contactId: contact.id,
            successDate: current.incomingLead.date, comment: current.incomingLead.name,
          } });
          await tx.fanoutDelivery.update({ where: { id: delivery.id }, data: { contactId: contact.id } });
          return { contactId: contact.id, leadId: lead.id, isNew: true };
        });
        if (created.isNew) {
          await this.finance.chargeUsage(delivery.cabinetId, 'contact', created.contactId);
          await this.finance.chargeUsage(delivery.cabinetId, 'lead', created.leadId);
          await this.messenger?.notifyLead(delivery.cabinetId, {
            phone: delivery.incomingLead.mobileTel, name: delivery.incomingLead.name,
            site: delivery.incomingLead.site, date: delivery.incomingLead.date,
          });
        }
        await this.prisma.fanoutDelivery.update({ where: { id: delivery.id }, data: {
          status: FanoutDeliveryStatus.COMPLETED, lastError: null, finishedAt: new Date(),
        } });
      } catch (error) {
        await this.prisma.fanoutDelivery.update({ where: { id: delivery.id }, data: {
          status: FanoutDeliveryStatus.FAILED,
          lastError: error instanceof Error ? error.message.slice(0, 2000) : 'Unknown error', finishedAt: new Date(),
        } });
      }
    }
  }

  tokenMatches(token: string, tokenHash: string) { return compare(token, tokenHash); }
}
