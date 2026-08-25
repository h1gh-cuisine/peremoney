import { computeClientStats } from './clientStats';
import { computeManagerStats } from './managerStats';
import { sortMasterPayments } from './sortMasterPayments';
import { composeProjectName } from '@/entities/master-projects/lib/projectNaming';
import type { MasterPayment } from '../model/types';

const payments: MasterPayment[] = [
  { id: '1', projectId: 'p1', projectName: 'P1', legalEntity: '', amount: 100, managerId: 'm1', status: 'paid', createdAt: '2026-08-05' },
  { id: '2', projectId: 'p1', projectName: 'P1', legalEntity: '', amount: 300, managerId: 'm1', status: 'pending', createdAt: '2026-08-20' },
  { id: '3', projectId: 'p2', projectName: 'P2', legalEntity: '', amount: 200, managerId: 'm1', status: 'paid', createdAt: '2026-08-10' },
];
const projects = [
  { id: 'p1', name: 'P1', managerId: 'm1', active: true, createdAt: '2026-01-01' },
  { id: 'p2', name: 'P2', managerId: 'm1', active: true, createdAt: '2026-08-08' },
] as never[];

describe('мастер-кабинет: бизнес-правила 1.12 и 2.8', () => {
  it('держит ожидающие платежи сверху, новые выше внутри группы', () => {
    expect(sortMasterPayments(payments).map((p) => p.id)).toEqual(['2', '3', '1']);
  });

  it('считает retention и бонус 10% за месяц', () => {
    const [result] = computeManagerStats([{ id: 'm1', name: 'Иван' }], projects, payments, { kind: 'month', year: 2026, month: 7 });
    expect(result).toMatchObject({ activeProjectsAtSnapshot: 1, paymentsCount: 3, paymentsSum: 600, retention: 300, bonus: 60 });
  });

  it('ранжирует клиентов по сумме платежей', () => {
    expect(computeClientStats(projects, payments, { kind: 'month', year: 2026, month: 7 }).map((p) => [p.projectId, p.totalAmount]))
      .toEqual([['p1', 400], ['p2', 200]]);
  });

  it('формирует имя проекта по шаблону ТЗ', () => {
    expect(composeProjectName({ region: 'Москва', type: 'quals', sphere: 'Коррекция зрения', clientName: 'Имплантсити', managerId: 'm1', price: 100 }))
      .toBe('Москва/Peremoney ЛКП VDL (квалы)/Коррекция зрения/Имплантсити');
  });
});
