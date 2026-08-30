import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  BalanceEntryType, LeadSaleStatus, PaymentStatus, Prisma, ProjectType, ScheduledTask,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { TochkaService } from '../tochka/tochka.service';
import { TochkaApiException, TochkaTransportException } from '../tochka/tochka.service';
import { buildTochkaInvoice, TochkaPayer } from '../tochka/tochka-invoice';
import { buildTochkaClosingAct } from '../tochka/tochka-closing-document';
import { hasAvailableBalance } from './balance-availability';
import { isValidInn } from './inn';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService, private readonly tochka?: TochkaService) {}

  async chargeUsage(cabinetId: string, kind: 'contact' | 'lead', entityId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cabinetId}))`;
        const cabinet = await tx.cabinet.findUniqueOrThrow({ where: { id: cabinetId } });
        const applicable = kind === 'lead'
          ? cabinet.type === ProjectType.VDL
          : cabinet.type === ProjectType.PACKAGE || cabinet.type === ProjectType.NUMBERS;
        if (!applicable) return false;
        if (!hasAvailableBalance(cabinet)) {
          await this.enqueueBalanceReconciliation(tx, cabinetId);
          return false;
        }
        const type = kind === 'lead' ? BalanceEntryType.LEAD_CHARGE : BalanceEntryType.CONTACT_CHARGE;
        await tx.balanceEntry.create({ data: {
          cabinetId, type, externalKey: `${type}:${entityId}`,
          moneyDelta: new Prisma.Decimal(cabinet.price).negated(), unitsDelta: -1,
        } });
        await tx.cabinet.update({ where: { id: cabinetId }, data: {
          moneyBalance: { decrement: cabinet.price }, usedUnits: { increment: 1 },
        } });
        if (Number(cabinet.moneyBalance) - Number(cabinet.price) <= 0 || cabinet.usedUnits + 1 >= cabinet.totalUnits) {
          await this.enqueueBalanceReconciliation(tx, cabinetId);
        }
        return true;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false;
      throw error;
    }
  }

  getPayer(cabinetId: string) {
    return this.prisma.payerProfile.findUnique({ where: { cabinetId } });
  }

  savePayer(cabinetId: string, data: Record<string, unknown>) {
    return this.prisma.payerProfile.upsert({
      where: { cabinetId }, create: { cabinetId, data: data as Prisma.InputJsonValue },
      update: { data: data as Prisma.InputJsonValue },
    });
  }

  listPayments(cabinetId?: string) {
    return this.prisma.payment.findMany({
      // Не скрываем неуспешные попытки: клиенту и менеджеру важно видеть,
      // почему счёт не появился в Точке. Финансовые итоги фильтруются отдельно.
      where: cabinetId ? { cabinetId } : undefined,
      include: { cabinet: { select: { name: true, managerName: true } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createInvoice(cabinetId: string, quantity: number, idempotencyKey: string) {
    const cabinet = await this.prisma.cabinet.findUnique({
      where: { id: cabinetId }, include: { payerProfile: true },
    });
    if (!cabinet) throw new NotFoundException('Кабинет не найден');
    if (!cabinet.payerProfile) throw new BadRequestException('Сначала заполните данные плательщика');
    const unitPrice = new Prisma.Decimal(cabinet.price);
    const amount = unitPrice.mul(quantity);
    const payer = cabinet.payerProfile.data as unknown as TochkaPayer;
    if (!payer.organizationName || !payer.inn) throw new BadRequestException('Укажите название и ИНН плательщика');
    if (!/^\d{10}$|^\d{12}$/.test(payer.inn)) throw new BadRequestException('ИНН плательщика должен содержать 10 или 12 цифр');
    if (!isValidInn(payer.inn)) throw new BadRequestException('ИНН плательщика указан с ошибкой — проверьте контрольную сумму');
    if (payer.inn.length === 10 && !/^\d{9}$/.test(payer.kpp ?? '')) {
      throw new BadRequestException('Для организации укажите КПП из 9 цифр');
    }
    if (!this.tochka) throw new BadRequestException('Интеграция Точки не настроена');
    const requestHash = createHash('sha256').update(JSON.stringify({ cabinetId, quantity, unitPrice: unitPrice.toString(), payer })).digest('hex');
    // Keep the value digits-only for human/accounting use; Tochka's JSON contract
    // requires Invoice.number to be transmitted as a string.
    const suffix = createHash('sha256').update(idempotencyKey).digest().readUInt32BE(0) % 100_000;
    const invoiceNo = `${Math.floor(Date.now() / 1000)}${suffix.toString().padStart(5, '0')}`;
    let payment;
    try {
      payment = await this.prisma.payment.create({ data: {
        cabinetId, invoiceNo, quantity, unitPrice, amount, projectType: cabinet.type,
        legalEntity: payer.organizationName, payerInn: payer.inn,
        invoiceIdempotencyKey: idempotencyKey, invoiceRequestHash: requestHash,
      } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      payment = await this.prisma.payment.findUniqueOrThrow({ where: { invoiceIdempotencyKey: idempotencyKey } });
      if (payment.invoiceRequestHash !== requestHash) throw new ConflictException('Ключ идемпотентности уже использован с другими параметрами');
      if (payment.invoiceCreationStatus === 'SUCCEEDED' && payment.tochkaDocumentId) {
        return { payment, document: { kind: 'tochka-invoice', documentId: payment.tochkaDocumentId }, replayed: true };
      }
      throw new ConflictException(payment.invoiceCreationStatus === 'UNCERTAIN'
        ? 'Статус создания счёта требует ручной сверки с Точкой'
        : 'Создание счёта с этим ключом уже выполняется');
    }
    try {
      const expiry = new Date(); expiry.setUTCDate(expiry.getUTCDate() + 5);
      const contractNumber = payer.contractNumber?.trim();
      const contractDate = payer.contractDate?.trim();
      const basedOn = contractNumber
        ? `Договор № ${contractNumber}${contractDate ? ` от ${contractDate}` : ''}`
        : 'Публичная оферта о заключении лицензионного договора на использование программного обеспечения kupit-klientov.ru';
      const documentId = await this.tochka.createInvoice(buildTochkaInvoice({
        customerCode: this.tochka.customerCode(), accountId: this.tochka.accountId(), invoiceNo,
        quantity, unitPrice: Number(unitPrice), payer, expiryDate: expiry.toISOString().slice(0, 10),
        positionName: 'Информационные услуги', basedOn,
      }));
      const completed = await this.prisma.payment.update({ where: { id: payment.id }, data: {
        tochkaDocumentId: documentId, invoiceCreationStatus: 'SUCCEEDED',
      } });
      return { payment: { ...payment, ...completed }, document: { kind: 'tochka-invoice', documentId } };
    } catch (error) {
      const deterministicRejection = (error instanceof TochkaApiException
        && error.providerStatus >= 400 && error.providerStatus < 500)
        || (error instanceof TochkaTransportException && !error.ambiguous);
      await this.prisma.payment.update({ where: { id: payment.id }, data: {
        invoiceCreationStatus: deterministicRejection ? 'FAILED' : 'UNCERTAIN',
      } });
      throw error;
    }
  }

  async invoicePdf(cabinetId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({ where: { id: paymentId, cabinetId } });
    if (!payment?.tochkaDocumentId) throw new NotFoundException('Счёт Точки не найден');
    if (!this.tochka) throw new BadRequestException('Интеграция Точки не настроена');
    return this.tochka.getInvoicePdf(payment.tochkaDocumentId);
  }

  async setPaymentStatus(
    paymentId: string, status: PaymentStatus, actorId?: string, bankPaymentId?: string,
    extra?: { paidAt?: Date; paymentPurpose?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Serialize transitions for one payment. READ COMMITTED alone allows two
      // concurrent requests to observe PENDING and credit the cabinet twice.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${paymentId}))`;
      const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { cabinet: true } });
      if (!payment) throw new NotFoundException('Платёж не найден');
      if (payment.bankPaymentId && status !== PaymentStatus.PAID) throw new BadRequestException('Банковский платёж нельзя отменить вручную');
      if (payment.status === status) return payment;
      const paid = status === PaymentStatus.PAID;
      if (!paid) {
        const laterPaid = await tx.payment.count({ where: {
          cabinetId: payment.cabinetId, status: PaymentStatus.PAID,
          paidAt: { gt: payment.paidAt ?? new Date(0) }, id: { not: payment.id },
        } });
        if (laterPaid) throw new ConflictException('Сначала отмените более поздний оплаченный платёж');
        if (payment.totalUnitsBefore === null || payment.usedUnitsBefore === null) {
          throw new ConflictException('Для старого платежа нет snapshot баланса; требуется ручная сверка');
        }
      }
      const typeChanged = paid && payment.cabinet.balanceType !== null && payment.cabinet.balanceType !== payment.projectType;
      await tx.cabinet.update({ where: { id: payment.cabinetId }, data: {
        moneyBalance: { increment: paid ? payment.amount : payment.amount.negated() },
        ...(paid ? {
          balanceType: payment.projectType,
          totalUnits: typeChanged ? payment.quantity : { increment: payment.quantity },
          usedUnits: typeChanged ? 0 : undefined,
        } : {
          balanceType: payment.balanceTypeBefore,
          totalUnits: payment.totalUnitsBefore!,
          usedUnits: payment.usedUnitsBefore!,
        }),
      } });
      await tx.balanceEntry.create({ data: {
        cabinetId: payment.cabinetId, paymentId: payment.id,
        type: paid ? BalanceEntryType.PAYMENT : BalanceEntryType.PAYMENT_REVERSAL,
        externalKey: bankPaymentId ?? `${paid ? 'PAYMENT' : 'REVERSAL'}:${payment.id}:${Date.now()}`,
        moneyDelta: paid ? payment.amount : payment.amount.negated(), unitsDelta: paid ? payment.quantity : -payment.quantity,
      } });
      const updated = await tx.payment.update({ where: { id: payment.id }, data: {
        status, paidAt: paid ? (extra?.paidAt ?? new Date()) : null, bankPaymentId: paid ? bankPaymentId : null,
        ...(paid && extra?.paymentPurpose ? { paymentPurpose: extra.paymentPurpose } : {}),
        ...(paid ? {
          balanceTypeBefore: payment.cabinet.balanceType,
          totalUnitsBefore: payment.cabinet.totalUnits,
          usedUnitsBefore: payment.cabinet.usedUnits,
        } : {}),
      } });
      await tx.paymentAudit.create({ data: { paymentId: payment.id, actorId, action: bankPaymentId ? 'BANK_STATUS_CONFIRMED' : 'STATUS_CHANGED',
        before: { status: payment.status } as Prisma.InputJsonValue,
        after: { status: updated.status } as Prisma.InputJsonValue } });
      await this.enqueueBalanceReconciliation(tx, payment.cabinetId);
      return updated;
    });
  }

  private enqueueBalanceReconciliation(tx: Prisma.TransactionClient, cabinetId: string) {
    const now = new Date();
    return tx.scheduledRun.create({ data: {
      cabinetId, task: ScheduledTask.APPLY_SCHEDULE, scheduledFor: now, nextAttemptAt: now,
    } });
  }

  async deletePayment(paymentId: string, actorId?: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Платёж не найден');
    if (payment.bankPaymentId) throw new BadRequestException('Банковский платёж нельзя удалить вручную');
    if (payment.status === PaymentStatus.PAID) await this.setPaymentStatus(paymentId, PaymentStatus.PENDING, actorId);
    await this.prisma.paymentAudit.create({ data: { paymentId, actorId, action: 'DELETED',
      before: { status: payment.status, amount: payment.amount.toString(), quantity: payment.quantity } as Prisma.InputJsonValue } });
    return this.prisma.payment.delete({ where: { id: paymentId } });
  }

  async summary(cabinetId: string) {
    const [cabinet, payments] = await Promise.all([
      this.prisma.cabinet.findUnique({ where: { id: cabinetId }, select: {
        moneyBalance: true, totalUnits: true, usedUnits: true, balanceType: true,
      } }),
      this.prisma.payment.findMany({ where: {
        cabinetId,
        OR: [
          { invoiceIdempotencyKey: null },
          { invoiceCreationStatus: 'SUCCEEDED' },
          { status: PaymentStatus.PAID },
        ],
      }, select: { status: true, amount: true } }),
    ]);
    if (!cabinet) throw new NotFoundException('Кабинет не найден');
    return {
      ltv: payments.filter((p) => p.status === PaymentStatus.PAID).reduce((sum, p) => sum + Number(p.amount), 0),
      expected: payments.filter((p) => p.status === PaymentStatus.PENDING).reduce((sum, p) => sum + Number(p.amount), 0),
      totalPayments: payments.length, ...cabinet,
    };
  }

  async clientDashboard(cabinetId: string, query: AnalyticsQueryDto) {
    const range = this.range(query);
    const [contacts, leads, charges] = await Promise.all([
      this.prisma.contact.findMany({ where: { cabinetId, date: range }, select: { date: true } }),
      this.prisma.lead.findMany({ where: { cabinetId, successDate: range }, select: {
        successDate: true, saleStatus: true, amount: true,
      } }),
      this.prisma.balanceEntry.findMany({ where: {
        cabinetId, createdAt: range, type: { in: [BalanceEntryType.CONTACT_CHARGE, BalanceEntryType.LEAD_CHARGE] },
      }, select: { createdAt: true, moneyDelta: true } }),
    ]);
    const sold = leads.filter((lead) => lead.saleStatus === LeadSaleStatus.BOUGHT);
    const revenue = sold.reduce((sum, lead) => sum + Number(lead.amount), 0);
    const spent = -charges.reduce((sum, entry) => sum + Number(entry.moneyDelta), 0);
    const qualified = leads.length;
    const conversion = qualified ? sold.length / qualified * 100 : 0;
    const cpl = qualified ? spent / qualified : 0;
    return {
      metrics: {
        contacts: contacts.length, qualified, sold: sold.length, conversion, revenue, cpl,
        averageCheck: sold.length ? revenue / sold.length : 0,
        saleCost: conversion ? cpl / (conversion / 100) : 0,
      },
      daily: this.daily(contacts, leads, charges),
    };
  }

  async masterDashboard(query: AnalyticsQueryDto) {
    const range = this.range(query);
    const snapshot = new Date(Date.UTC(range.gte.getUTCFullYear(), range.gte.getUTCMonth(), 7, 23, 59, 59, 999));
    const [cabinets, payments] = await Promise.all([
      this.prisma.cabinet.findMany({ select: { id: true, name: true, managerName: true, isActive: true, createdAt: true } }),
      this.prisma.payment.findMany({ where: { status: PaymentStatus.PAID, paidAt: range } }),
    ]);
    const managerNames = [...new Set(cabinets.map((c) => c.managerName ?? 'Без менеджера'))];
    const managers = managerNames.map((name) => {
      const projects = cabinets.filter((c) => (c.managerName ?? 'Без менеджера') === name);
      const ids = new Set(projects.map((c) => c.id));
      const own = payments.filter((p) => ids.has(p.cabinetId));
      const sum = own.reduce((total, p) => total + Number(p.amount), 0);
      const active = projects.filter((p) => p.isActive && p.createdAt <= snapshot).length;
      return { managerName: name, activeProjects: active, paymentsCount: own.length, paymentsSum: sum,
        retention: active ? own.length / active * 100 : 0, bonus: sum * 0.1 };
    });
    const clients = cabinets.map((cabinet) => ({
      cabinetId: cabinet.id, name: cabinet.name,
      paymentsSum: payments.filter((p) => p.cabinetId === cabinet.id).reduce((sum, p) => sum + Number(p.amount), 0),
    })).filter((c) => c.paymentsSum > 0).sort((a, b) => b.paymentsSum - a.paymentsSum);
    return { managers, clients };
  }

  async closingActPdf(cabinetId: string, paymentIds: string[]) {
    const uniqueIds = [...new Set(paymentIds)];
    if (!uniqueIds.length) throw new BadRequestException('Выберите платежи');
    const [payments, payerProfile] = await Promise.all([
      this.prisma.payment.findMany({ where: { cabinetId, id: { in: uniqueIds } }, orderBy: { createdAt: 'asc' } }),
      this.getPayer(cabinetId),
    ]);
    if (payments.length !== uniqueIds.length) throw new BadRequestException('Часть платежей не найдена');
    if (!payerProfile) throw new BadRequestException('Сначала заполните данные плательщика');
    if (!this.tochka) throw new BadRequestException('Интеграция Точки не настроена');

    const payer = payerProfile.data as unknown as TochkaPayer;
    if (!payer.organizationName || !payer.inn) throw new BadRequestException('Укажите название и ИНН плательщика');
    const contractNumber = payer.contractNumber?.trim();
    const contractDate = payer.contractDate?.trim();
    const basedOn = contractNumber
      ? `Договор № ${contractNumber}${contractDate ? ` от ${contractDate}` : ''}`
      : 'Публичная оферта о заключении лицензионного договора на использование программного обеспечения kupit-klientov.ru';
    const suffix = createHash('sha256').update(uniqueIds.sort().join(':')).digest().readUInt32BE(0) % 100_000;
    const documentNo = `${Math.floor(Date.now() / 1000)}${suffix.toString().padStart(5, '0')}`;
    const documentId = await this.tochka.createClosingDocument(buildTochkaClosingAct({
      customerCode: this.tochka.customerCode(), accountId: this.tochka.accountId(), documentNo, payer, basedOn,
      positions: payments.map((payment) => ({
        positionName: `Информационные услуги по счёту № ${payment.invoiceNo ?? payment.id}`,
        unitCode: 'услуга.', ndsKind: 'without_nds' as const,
        price: Number(payment.unitPrice), quantity: payment.quantity, totalAmount: Number(payment.amount),
      })),
    }));
    return { pdf: await this.tochka.getClosingDocumentPdf(documentId), documentNo };
  }

  private range(query: AnalyticsQueryDto) {
    const now = new Date();
    const gte = query.dateFrom ? new Date(query.dateFrom) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const inclusiveTo = query.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(query.dateTo)
      ? `${query.dateTo}T23:59:59.999Z`
      : query.dateTo;
    const lte = inclusiveTo ? new Date(inclusiveTo) : now;
    if (gte > lte) throw new BadRequestException('dateFrom не может быть позже dateTo');
    return { gte, lte };
  }

  private daily(contacts: Array<{ date: Date }>, leads: Array<{ successDate: Date; saleStatus: LeadSaleStatus }>, charges: Array<{ createdAt: Date; moneyDelta: Prisma.Decimal }>) {
    const map = new Map<string, { date: string; contacts: number; leads: number; sold: number; spent: number }>();
    const row = (date: Date) => { const key = date.toISOString().slice(0, 10); if (!map.has(key)) map.set(key, { date: key, contacts: 0, leads: 0, sold: 0, spent: 0 }); return map.get(key)!; };
    contacts.forEach((item) => { row(item.date).contacts += 1; });
    leads.forEach((item) => { row(item.successDate).leads += 1; if (item.saleStatus === LeadSaleStatus.BOUGHT) row(item.successDate).sold += 1; });
    charges.forEach((item) => { row(item.createdAt).spent -= Number(item.moneyDelta); });
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date)).map((item) => ({
      ...item, cpl: item.leads ? item.spent / item.leads : 0, saleCost: item.sold ? item.spent / item.sold : 0,
    }));
  }
}
