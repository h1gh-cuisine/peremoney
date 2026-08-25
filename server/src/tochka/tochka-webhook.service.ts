import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { JsonWebKey } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { BalanceEntryType, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IncomingPayment, matchIncomingPayment } from './tochka-payment';
import { TelegramService } from './telegram.service';
import { TochkaWebhookVerifier } from './tochka-webhook-verifier';

type WebhookPayload = IncomingPayment & {
  webhookType?: string; date?: string; documentNumber?: string;
  SidePayer?: IncomingPayment['SidePayer'] & { name?: string };
};

@Injectable()
export class TochkaWebhookService {
  private verifier?: TochkaWebhookVerifier;
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService, private readonly telegram: TelegramService) {}

  async processJwt(token: string) {
    const verifier = await this.getVerifier();
    return this.processVerified(verifier.verify(token) as unknown as WebhookPayload);
  }

  async processVerified(event: WebhookPayload) {
    if (event.webhookType !== 'incomingPayment' || !event.paymentId) throw new BadRequestException('Неподдерживаемый webhook Точки');
    const raw = JSON.stringify(event);
    const internal = raw.includes('tb-funds-') || raw.includes('tb-fonds') || raw.includes('Перевод собственных средств');
    const result = await this.prisma.$transaction(async (tx) => {
      const duplicate = await tx.tochkaWebhookEvent.findUnique({ where: { externalId: event.paymentId } });
      if (duplicate) return { status: 'duplicate', payment: null };
      if (internal) {
        await tx.tochkaWebhookEvent.create({ data: { externalId: event.paymentId, webhookType: event.webhookType!, payload: event as unknown as Prisma.InputJsonValue, status: 'IGNORED_INTERNAL' } });
        return { status: 'ignored', payment: null };
      }
      const payer = event.SidePayer;
      const candidates = payer?.inn && payer.amount ? await tx.payment.findMany({ where: {
        status: PaymentStatus.PENDING, payerInn: payer.inn, amount: new Prisma.Decimal(payer.amount),
      } }) : [];
      const payment = candidates.find((candidate) => matchIncomingPayment(event, {
        invoiceNo: candidate.invoiceNo, payerInn: candidate.payerInn ?? '', amount: String(candidate.amount),
      }));
      if (!payment) {
        await tx.tochkaWebhookEvent.create({ data: { externalId: event.paymentId, webhookType: event.webhookType!, payload: event as unknown as Prisma.InputJsonValue, status: 'UNMATCHED' } });
        return { status: 'unmatched', payment: null };
      }
      const cabinet = await tx.cabinet.findUniqueOrThrow({ where: { id: payment.cabinetId } });
      const typeChanged = cabinet.balanceType !== null && cabinet.balanceType !== payment.projectType;
      await tx.cabinet.update({ where: { id: payment.cabinetId }, data: {
        moneyBalance: { increment: payment.amount }, balanceType: payment.projectType,
        totalUnits: typeChanged ? payment.quantity : { increment: payment.quantity },
        usedUnits: typeChanged ? 0 : undefined,
      } });
      await tx.balanceEntry.create({ data: { cabinetId: payment.cabinetId, paymentId: payment.id,
        type: BalanceEntryType.PAYMENT, externalKey: `TOCHKA:${event.paymentId}`,
        moneyDelta: payment.amount, unitsDelta: payment.quantity } });
      const updated = await tx.payment.update({ where: { id: payment.id }, data: {
        status: PaymentStatus.PAID, paidAt: event.date ? new Date(event.date) : new Date(), bankPaymentId: event.paymentId,
      } });
      await tx.tochkaWebhookEvent.create({ data: { externalId: event.paymentId, webhookType: event.webhookType!, payload: event as unknown as Prisma.InputJsonValue, status: 'MATCHED', paymentId: payment.id } });
      return { status: 'matched', payment: updated };
    });
    const payer = event.SidePayer;
    if (result.status === 'matched') await this.safeNotify(`💸 Поступил платеж: ${payer?.amount ?? ''} ₽\n${payer?.name ?? ''}\nИНН: ${payer?.inn ?? ''}\n${event.purpose ?? ''}`);
    if (result.status === 'unmatched') await this.safeNotify(`⚠️ Не удалось сопоставить платеж Точки ${event.paymentId}: ${payer?.amount ?? ''} ₽, ИНН ${payer?.inn ?? ''}`);
    return { ok: true, status: result.status };
  }

  private async safeNotify(message: string) {
    try { await this.telegram.notify(message); } catch { /* payment is already committed */ }
  }

  private async getVerifier() {
    if (this.verifier) return this.verifier;
    const pem = this.config.get<string>('TOCHKA_WEBHOOK_PUBLIC_KEY');
    if (pem) return (this.verifier = new TochkaWebhookVerifier(pem.replace(/\\n/g, '\n')));
    const url = this.config.get<string>('TOCHKA_WEBHOOK_PUBLIC_KEY_URL') ?? 'https://enter.tochka.com/doc/openapi/static/keys/public';
    let response: Response;
    try { response = await fetch(url, { signal: AbortSignal.timeout(10_000) }); }
    catch { throw new ServiceUnavailableException('Не удалось получить публичный ключ Точки'); }
    if (!response.ok) throw new ServiceUnavailableException('Не удалось получить публичный ключ Точки');
    return (this.verifier = new TochkaWebhookVerifier(await response.json() as JsonWebKey));
  }
}
