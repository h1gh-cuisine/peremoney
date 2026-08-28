import { apiClient } from '@/shared/api';
import { createMasterProject, fetchMasterProjects, fetchProviderRegions, mapMasterProject } from './master-projects-api';

jest.mock('@/shared/api', () => ({ apiClient: jest.fn() }));

describe('master projects API contract', () => {
  it('requests project analytics for the selected period', async () => {
    const get = jest.fn().mockResolvedValue([]);
    (apiClient as jest.Mock).mockReturnValue({ get });

    await fetchMasterProjects({ from: '2026-08-01', to: '2026-08-25' });

    expect(get).toHaveBeenCalledWith('/cabinets?dateFrom=2026-08-01&dateTo=2026-08-25');
  });

  it('loads regions with provider IDs used for project creation', async () => {
    const get = jest.fn().mockResolvedValue([{ id: 77, name: 'Москва' }]);
    (apiClient as jest.Mock).mockReturnValue({ get });
    await expect(fetchProviderRegions()).resolves.toEqual([{ id: 77, name: 'Москва' }]);
    expect(get).toHaveBeenCalledWith('/cabinets/provider/regions');
  });

  it('maps cabinet aggregates and never expects stored plaintext passwords', () => {
    expect(mapMasterProject({ id: 'c', name: 'Москва/Клиент', managerName: null, type: 'VDL', sphere: null,
      price: '250.00', renewalStatus: 'RENEWED', isActive: true, hidden: false, createdAt: '2026-08-20T00:00:00Z',
      contactsExported: 10, leadsExported: 3, sales: 1, ltv: 1000, paymentsCount: 2, avgCheck: 500,
      clientLogin: 'client', employeeLogin: 'staff' })).toEqual(expect.objectContaining({
        id: 'c', managerId: 'Без менеджера', type: 'quals', price: 250, renewalStatus: 'renewed',
        clientLogin: 'client', clientPassword: '', employeeLogin: 'staff', employeePassword: '',
        contactsExported: 10, leadsExported: 3, sales: 1, ltv: 1000,
      }));
  });

  it('sends the manager display name and caller-owned idempotency key', async () => {
    const post = jest.fn().mockResolvedValue({
      cabinet: { id: 'c', name: 'Москва/Peremoney ЛКП VDL/Медицина/Клиент', managerName: 'Анна', type: 'VDL', sphere: 'Медицина',
        price: 100, renewalStatus: 'NOT_RENEWED', isActive: true, hidden: false, createdAt: '2026-08-22T00:00:00Z' },
      credentials: { employee: { login: 'staff', password: 'employee-pass' }, client: { login: 'client', password: 'client-pass' } },
    });
    (apiClient as jest.Mock).mockReturnValue({ post });
    await createMasterProject({ clientName: 'Клиент', type: 'quals', region: 'Москва', regionId: 77, sphere: 'Медицина',
      managerId: 'MGR-1', managerName: 'Анна', price: 100, employeeLogin: 'staff', clientLogin: 'client', idempotencyKey: 'stable-key' });
    expect(post.mock.calls[0][1]).toEqual(expect.objectContaining({ managerName: 'Анна', region: 'Москва', regionId: 77, idempotencyKey: 'stable-key' }));
    expect(post.mock.calls[0][1].managerName).not.toBe('MGR-1');
  });

  it('sends all selected provider region IDs for a nationwide project', async () => {
    const post = jest.fn().mockResolvedValue({
      cabinet: { id: 'c', name: 'Вся Россия/Проект', managerName: 'Анна', type: 'VDL', sphere: 'Медицина',
        price: 100, renewalStatus: 'NOT_RENEWED', isActive: true, hidden: false, createdAt: '2026-08-22T00:00:00Z' },
      credentials: { employee: { login: 'staff', password: 'employee-pass' }, client: { login: 'client', password: 'client-pass' } },
    });
    (apiClient as jest.Mock).mockReturnValue({ post });

    await createMasterProject({ clientName: 'Клиент', type: 'quals', region: 'Вся Россия', regionId: 1, regionIds: [1, 2, 3],
      sphere: 'Медицина', managerId: 'MGR-1', managerName: 'Анна', price: 100, employeeLogin: 'staff', clientLogin: 'client',
      idempotencyKey: 'stable-key' });

    expect(post.mock.calls[0][1]).toEqual(expect.objectContaining({ region: 'Вся Россия', regionId: 1, regionIds: [1, 2, 3] }));
  });
});
