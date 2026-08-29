import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { JsonWebKey } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly telegram: TelegramService,
    private readonly finance: FinanceService,
  ) {}

  async processJwt(token: string) {
    const verifier = await this.getVerifier();
    return this.processVerified(verifier.verify(token) as unknown as WebhookPayload);
  }

  async processVerified(event: WebhookPayload) {
    if (event.webhookType !== 'incomingPayment' || !event.paymentId) throw new BadRequestException('Неподдерживаемый webhook Точки');
    const existing = await this.prisma.tochkaWebhookEvent.findUnique({ where: { externalId: event.paymentId } });
    if (existing) return { ok: true, status: 'duplicate' };

    const raw = JSON.stringify(event);
    const internal = raw.includes('tb-funds-') || raw.includes('tb-fonds') || raw.includes('Перевод собственных средств');
    if (internal) {
      await this.recordEvent(event, 'IGNORED_INTERNAL');
      return { ok: true, status: 'ignored' };
    }

    const payer = event.SidePayer;
    const candidates = payer?.inn && payer.amount ? await this.prisma.payment.findMany({ where: {
      status: PaymentStatus.PENDING, payerInn: payer.inn, amount: new Prisma.Decimal(payer.amount),
    } }) : [];
    const matched = candidates.find((candidate) => matchIncomingPayment(event, {
      invoiceNo: candidate.invoiceNo, payerInn: candidate.payerInn ?? '', amount: String(candidate.amount),
    }));
    if (!matched) {
      await this.recordEvent(event, 'UNMATCHED');
      await this.safeNotify(`⚠️ Не удалось сопоставить платеж Точки ${event.paymentId}: ${payer?.amount ?? ''} ₽, ИНН ${payer?.inn ?? ''}`);
      return { ok: true, status: 'unmatched' };
    }

    // Same guarded path as the invoice poller (advisory lock + idempotent status
    // check inside FinanceService.setPaymentStatus) so a webhook that races a poll
    // tick for the same payment cannot credit the cabinet twice.
    const updated = await this.finance.setPaymentStatus(matched.id, PaymentStatus.PAID, undefined, event.paymentId, {
      paidAt: event.date ? new Date(event.date) : undefined,
      paymentPurpose: event.purpose,
    });
    await this.recordEvent(event, 'MATCHED', updated.id);
    await this.safeNotify(`💸 Поступил платеж: ${payer?.amount ?? ''} ₽\n${payer?.name ?? ''}\nИНН: ${payer?.inn ?? ''}\n${event.purpose ?? ''}`);
    return { ok: true, status: 'matched' };
  }

  private async recordEvent(event: WebhookPayload, status: string, paymentId?: string) {
    try {
      await this.prisma.tochkaWebhookEvent.create({ data: {
        externalId: event.paymentId, webhookType: event.webhookType!, payload: event as unknown as Prisma.InputJsonValue, status, paymentId,
      } });
    } catch (error) {
      // Another concurrent delivery of the exact same bank event already recorded it.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
    }
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
