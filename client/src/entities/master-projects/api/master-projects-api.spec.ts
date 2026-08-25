import { apiClient } from '@/shared/api';
import { createMasterProject, mapMasterProject } from './master-projects-api';

jest.mock('@/shared/api', () => ({ apiClient: jest.fn() }));

describe('master projects API contract', () => {
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
});
