import { apiClient } from '@/shared/api';
import { createMasterManager, deleteMasterManager, fetchMasterManagers } from './master-managers-api';

jest.mock('@/shared/api', () => ({ apiClient: jest.fn() }));

describe('master managers API contract', () => {
  it('loads and persists employees through protected master endpoints', async () => {
    const get = jest.fn().mockResolvedValue([]);
    const post = jest.fn().mockResolvedValue({ id: 'Анна', name: 'Анна' });
    const remove = jest.fn().mockResolvedValue({ deleted: true });
    (apiClient as jest.Mock).mockReturnValue({ get, post, delete: remove });

    await fetchMasterManagers();
    await createMasterManager('Анна');
    await deleteMasterManager('Анна Иванова');

    expect(get).toHaveBeenCalledWith('/master/managers');
    expect(post).toHaveBeenCalledWith('/master/managers', { name: 'Анна' });
    expect(remove).toHaveBeenCalledWith('/master/managers/%D0%90%D0%BD%D0%BD%D0%B0%20%D0%98%D0%B2%D0%B0%D0%BD%D0%BE%D0%B2%D0%B0');
  });
});
