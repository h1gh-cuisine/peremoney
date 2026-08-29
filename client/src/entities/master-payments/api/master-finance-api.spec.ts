import { mapMasterDashboard, mapMasterPayment } from './master-finance-api';

describe('master finance API contract', () => {
  it('maps payment with cabinet metadata and Decimal', () => {
    expect(mapMasterPayment({ id: 'p', cabinetId: 'c', legalEntity: null, amount: '500.25', status: 'PAID', createdAt: '2026-08-20T10:00:00Z', cabinet: { name: 'Клиент', managerName: null } }))
      .toEqual({ id: 'p', projectId: 'c', projectName: 'Клиент', legalEntity: '', amount: 500.25, managerId: 'Без менеджера', status: 'paid', invoiceCreationStatus: 'succeeded', createdAt: '2026-08-20' });
  });
  it('maps server-calculated manager/client analytics to widget models', () => {
    expect(mapMasterDashboard({ managers: [{ managerName: 'Анна', activeProjects: 2, paymentsCount: 3, paymentsSum: 1000, retention: 150, bonus: 100 }], clients: [{ cabinetId: 'c', name: 'РФ/Peremoney ЛКП VDL/Медицина/Клиент', paymentsSum: 1000 }] }))
      .toEqual({ managers: [{ managerId: 'Анна', managerName: 'Анна', activeProjectsAtSnapshot: 2, paymentsCount: 3, paymentsSum: 1000, retention: 150, bonus: 100 }], clients: [{ projectId: 'c', projectName: 'Клиент', totalAmount: 1000 }] });
  });
});
