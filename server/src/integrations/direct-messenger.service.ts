import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDecipheriv, createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface LeadNotification {
  providerAnswerId?: number | null;
  phone?: string | null;
  name?: string | null;
  site?: string | null;
  date: Date;
}

@Injectable()
export class DirectMessengerService {
  private readonly logger = new Logger(DirectMessengerService.name);
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async notifyLead(cabinetId: string, lead: LeadNotification) {
    const integrations = await this.prisma.directIntegration.findMany({ where: { cabinetId, enabled: true } });
    if (!integrations.length) return;
    const cabinet = await this.prisma.cabinet.findUnique({ where: { id: cabinetId }, select: { name: true } });
    const text = [
      `🟣 Новый лид${cabinet?.name ? ` • ${cabinet.name}` : ''}`,
      lead.providerAnswerId ? `ID: ${lead.providerAnswerId}` : null,
      lead.phone ? `Телефон: ${lead.phone}` : null,
      lead.name ? `Комментарий: ${lead.name}` : null,
      lead.site ? `Источник: ${lead.site}` : null,
      `Дата: ${lead.date.toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
    ].filter(Boolean).join('\n');
    await Promise.allSettled(integrations.map(async (integration) => {
      try { await this.send(integration.channel, this.decryptToken(integration.botTokenEncrypted), integration.chatId, text); }
      catch (error) { this.logger.error(`Не удалось отправить лид ${cabinetId} в ${integration.channel}: ${error instanceof Error ? error.message : 'ошибка'}`); }
    }));
  }

  async send(channel: string, token: string, chatId: string, text: string) {
    const url = channel === 'telegram'
      ? `https://api.telegram.org/bot${token}/sendMessage`
      : channel === 'max'
        ? `https://platform-api2.max.ru/messages?chat_id=${encodeURIComponent(chatId)}`
        : null;
    if (!url) throw new Error('Неподдерживаемый мессенджер');
    const response = await fetch(url, {
      method: 'POST', signal: AbortSignal.timeout(10_000),
      headers: { 'content-type': 'application/json', ...(channel === 'max' ? { Authorization: token } : {}) },
      body: JSON.stringify(channel === 'telegram' ? { chat_id: chatId, text } : { text }),
    });
    if (!response.ok) throw new Error(`${channel.toUpperCase()} API ответил ${response.status}`);
  }

  decryptToken(value: string) {
    const [ivValue, tagValue, encryptedValue] = value.split('.');
    if (!ivValue || !tagValue || !encryptedValue) throw new Error('Некорректный шифротекст интеграции');
    const key = createHash('sha256').update(this.config.get<string>('INTEGRATION_ENCRYPTION_KEY')
      ?? this.config.get<string>('JWT_SECRET') ?? '').digest();
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
  }
}
