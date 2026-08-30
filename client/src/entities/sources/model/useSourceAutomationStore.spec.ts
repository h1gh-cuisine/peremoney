import { useSourceAutomationStore } from './useSourceAutomationStore';
import { fetchAutomation } from '../api/sources-api';

jest.mock('../api/sources-api', () => ({
  fetchAutomation: jest.fn(),
  saveAutomation: jest.fn(),
}));

describe('источники: настройки автоматизации — загрузка сохранённого состояния', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSourceAutomationStore.setState({
      cabinetId: null, error: null, dirty: false, loading: false, saving: false,
      autoCleanupEnabled: false, minContactsPerLead: 2, autoManageEnabled: false, minConversion: 20,
    });
  });

  it('подтягивает реально сохранённые пороги при выборе кабинета, а не оставляет дефолты', async () => {
    (fetchAutomation as jest.Mock).mockResolvedValue({
      autoCleanupEnabled: true, minContactsPerLead: 7, autoManageEnabled: true, minConversion: 35,
    });

    useSourceAutomationStore.getState().setCabinetId('cab-1');
    // setCabinetId запускает load() асинхронно — дожидаемся его отдельно.
    await useSourceAutomationStore.getState().load();

    expect(fetchAutomation).toHaveBeenCalledWith('cab-1');
    expect(useSourceAutomationStore.getState()).toMatchObject({
      autoCleanupEnabled: true, minContactsPerLead: 7, autoManageEnabled: true, minConversion: 35, dirty: false,
    });
  });

  it('не трогает состояние формы, если загрузка настроек упала с ошибкой', async () => {
    (fetchAutomation as jest.Mock).mockRejectedValue(new Error('сеть недоступна'));
    useSourceAutomationStore.setState({ cabinetId: 'cab-1' });

    await useSourceAutomationStore.getState().load();

    expect(useSourceAutomationStore.getState().error).toBe('сеть недоступна');
    expect(useSourceAutomationStore.getState().autoCleanupEnabled).toBe(false);
  });
});
