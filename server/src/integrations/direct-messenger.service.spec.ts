import { DirectMessengerService } from './direct-messenger.service';

describe('DirectMessengerService', () => {
  afterEach(() => jest.restoreAllMocks());
  const service = () => new DirectMessengerService({} as never, {} as never);

  it('sends Telegram messages through sendMessage', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await service().send('telegram', '123:token', '-10042', 'Новый лид');
    expect(fetchMock.mock.calls[0]![0].toString()).toContain('api.telegram.org/bot123:token/sendMessage');
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({ chat_id: '-10042', text: 'Новый лид' });
  });

  it('sends MAX messages with the token in Authorization', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    await service().send('max', 'max-token', '987', 'Новый лид');
    expect(fetchMock.mock.calls[0]![0].toString()).toBe('https://platform-api2.max.ru/messages?chat_id=987');
    expect(fetchMock.mock.calls[0]![1]?.headers).toEqual(expect.objectContaining({ Authorization: 'max-token' }));
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({ text: 'Новый лид' });
  });

  it('reports provider rejection instead of pretending the delivery succeeded', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    await expect(service().send('max', 'bad-token', '987', 'test')).rejects.toThrow('MAX API ответил 401');
  });
});
