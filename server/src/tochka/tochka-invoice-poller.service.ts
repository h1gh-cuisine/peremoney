import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentStatus } from '@prisma/client';
import { FinanceService } from '../finance/finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { TochkaService } from './tochka.service';
import { TelegramService } from './telegram.service';

@Injectable()
export class TochkaInvoicePollerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(TochkaInvoicePollerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tochka: TochkaService,
    private readonly finance: FinanceService,
    private readonly config: ConfigService,
    private readonly telegram: TelegramService,
  ) {}

  onApplicationBootstrap() {
    if (!this.config.get<string>('TOCHKA_JWT')) {
      this.logger.warn('Polling счетов Точки отключён: TOCHKA_JWT не настроен');
      return;
    }
    if (this.config.get<string>('TOCHKA_INVOICE_POLL_ENABLED') === 'false') {
      this.logger.log('Polling счетов Точки отключён настройкой TOCHKA_INVOICE_POLL_ENABLED=false');
      return;
    }
    const configured = Number(this.config.get('TOCHKA_INVOICE_POLL_MS') ?? 60_000);
    const interval = Number.isFinite(configured) && configured >= 10_000 ? configured : 60_000;
    this.logger.log(`Polling счетов Точки запущен с интервалом ${interval} мс`);
    this.timer = setInterval(() => void this.runOnce(), interval);
    this.timer.unref();
    void this.runOnce();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce() {
    if (this.running) return;
    this.running = true;
    try {
      const pending = await this.prisma.payment.findMany({
        where: { status: PaymentStatus.PENDING, invoiceCreationStatus: 'SUCCEEDED', tochkaDocumentId: { not: null } },
        select: { id: true, tochkaDocumentId: true }, orderBy: { createdAt: 'asc' }, take: 100,
      });
      this.logger.debug(`Polling счетов Точки: найдено ожидающих счетов ${pending.length}`);
      for (const payment of pending) {
        try {
          const status = await this.tochka.getInvoicePaymentStatus(payment.tochkaDocumentId!);
          if (status === 'payment_paid') {
            await this.finance.setPaymentStatus(payment.id, PaymentStatus.PAID, undefined, `TOCHKA_INVOICE:${payment.tochkaDocumentId}`);
          }
        } catch (error) {
          this.logger.warn(`Не удалось обновить статус счёта ${payment.id}: ${error instanceof Error ? error.message : 'ошибка'}`);
        }
      }
      const unnotified = await this.prisma.payment.findMany({
        where: {
          status: PaymentStatus.PAID, telegramNotifiedAt: null,
          bankPaymentId: { startsWith: 'TOCHKA_INVOICE:' },
        },
        select: {
          id: true, invoiceNo: true, legalEntity: true, payerInn: true, amount: true, quantity: true,
          cabinet: { select: { name: true } },
        },
        orderBy: { paidAt: 'asc' }, take: 100,
      });
      for (const payment of unnotified) {
        const delivered = await this.safeNotify([
          '💸 Оплата счёта подтверждена Точкой',
          `Проект: ${payment.cabinet.name}`,
          `Плательщик: ${payment.legalEntity || 'не указан'}`,
          `ИНН: ${payment.payerInn || 'не указан'}`,
          `Сумма: ${payment.amount.toString()} ₽`,
          `Количество: ${payment.quantity}`,
          `Счёт: ${payment.invoiceNo}`,
        ].join('\n'));
        if (delivered) await this.prisma.payment.updateMany({
          where: { id: payment.id, telegramNotifiedAt: null }, data: { telegramNotifiedAt: new Date() },
        });
      }
    } finally {
      this.running = false;
    }
  }

  private async safeNotify(message: string) {
    try {
      await this.telegram.notify(message);
      return true;
    } catch (error) {
      this.logger.warn(`Не удалось отправить Telegram-уведомление об оплате: ${error instanceof Error ? error.message : 'ошибка'}`);
      return false;
    }
  }
}
