import { TelegramService } from './telegram.service';

describe('TelegramService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends a system alert to every configured payment chat', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const config = { get: (key: string) => ({
      TELEGRAM_BOT_TOKEN: 'system-bot-token',
      TELEGRAM_CHAT_IDS: '-1004437027549,-5539134940',
    } as Record<string, string>)[key] };

    await new TelegramService(config as never).notify('Оплата подтверждена');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)).chat_id))
      .toEqual(['-1004437027549', '-5539134940']);
  });
});
