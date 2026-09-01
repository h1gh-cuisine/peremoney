import { useAuditLogStore } from './useAuditLogStore';
import { fetchAuditLog } from '../api/audit-log-api';
import { ApiError } from '@/shared/api';

jest.mock('../api/audit-log-api', () => ({ fetchAuditLog: jest.fn() }));

const page = (overrides: Partial<{ items: unknown[]; total: number; page: number; pageSize: number; hasMore: boolean }> = {}) => ({
  items: [], total: 0, page: 1, pageSize: 50, hasMore: false, ...overrides,
});

describe('журнал действий: секрет только в памяти на время сессии', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuditLogStore.setState({
      entries: [], total: 0, page: 1, pageSize: 50, hasMore: false, filters: {},
      secret: null, unlocked: false, loading: false, error: null,
    });
  });

  it('unlock с верным кодом сразу подгружает первую страницу и запоминает секрет', async () => {
    (fetchAuditLog as jest.Mock).mockResolvedValue(page({ items: [{ id: 'a' }], total: 1 }));

    const ok = await useAuditLogStore.getState().unlock('right-code');

    expect(ok).toBe(true);
    expect(fetchAuditLog).toHaveBeenCalledWith({ page: 1 }, 'right-code');
    expect(useAuditLogStore.getState()).toMatchObject({ unlocked: true, secret: 'right-code', total: 1 });
  });

  it('unlock с неверным кодом не запоминает секрет и не открывает экран', async () => {
    (fetchAuditLog as jest.Mock).mockRejectedValue(new ApiError(403, 'Неверный код доступа к журналу'));

    const ok = await useAuditLogStore.getState().unlock('wrong-code');

    expect(ok).toBe(false);
    expect(useAuditLogStore.getState()).toMatchObject({ unlocked: false, secret: null });
    expect(useAuditLogStore.getState().error).toBe('Неверный код доступа к журналу');
  });

  it('когда сервер не настроен (503), показывает отдельное сообщение', async () => {
    (fetchAuditLog as jest.Mock).mockRejectedValue(new ApiError(503, 'Доступ к журналу действий не настроен'));

    await useAuditLogStore.getState().unlock('any');

    expect(useAuditLogStore.getState().error).toBe('Журнал действий не настроен на сервере');
  });

  it('load() без разблокировки ничего не запрашивает', async () => {
    await useAuditLogStore.getState().load();
    expect(fetchAuditLog).not.toHaveBeenCalled();
  });

  it('если код доступа отозвали (403 на повторном запросе), сессия блокируется заново', async () => {
    useAuditLogStore.setState({ secret: 'was-valid', unlocked: true });
    (fetchAuditLog as jest.Mock).mockRejectedValue(new ApiError(403, 'Неверный код доступа к журналу'));

    await useAuditLogStore.getState().load();

    expect(useAuditLogStore.getState()).toMatchObject({ unlocked: false, secret: null });
  });

  it('lock() очищает секрет и загруженные записи из памяти', () => {
    useAuditLogStore.setState({ secret: 'x', unlocked: true, entries: [{ id: 'a' } as never], total: 1 });
    useAuditLogStore.getState().lock();
    expect(useAuditLogStore.getState()).toMatchObject({ secret: null, unlocked: false, entries: [], total: 0 });
  });

  it('setFilters сбрасывает страницу на первую', () => {
    useAuditLogStore.setState({ filters: { page: 5, outcome: 'denied' } });
    useAuditLogStore.getState().setFilters({ outcome: 'success' });
    expect(useAuditLogStore.getState().filters).toEqual({ outcome: 'success', page: 1 });
  });

  it('setPage листает страницы, не трогая остальные фильтры', () => {
    useAuditLogStore.setState({ filters: { outcome: 'denied', page: 1 } });
    useAuditLogStore.getState().setPage(3);
    expect(useAuditLogStore.getState().filters).toEqual({ outcome: 'denied', page: 3 });
  });
});
