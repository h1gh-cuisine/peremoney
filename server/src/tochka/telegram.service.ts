import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  constructor(private readonly config: ConfigService) {}

  async notify(text: string): Promise<void> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatIds = (this.config.get<string>('TELEGRAM_CHAT_IDS') ?? '').split(',').map((id) => id.trim()).filter(Boolean);
    if (!token || !chatIds.length) return;
    await Promise.allSettled(chatIds.map((chatId) => fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(10_000),
    })));
  }
}
