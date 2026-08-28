import type { ProjectType } from "@/shared/lib/projectType";

// docs-agent.md 1.12.2, 2.1, 2.8.3

/** "Продлился"/"Не продлился", ручной ввод сотрудника (docs-agent.md 1.12.2) */
export type RenewalStatus = "renewed" | "not_renewed";

export interface MasterProject {
  id: string;
  name: string;
  managerId: string;
  type: ProjectType;
  region: string;
  sphere: string;
  contactsExported: number;
  leadsExported: number;
  sales: number;
  price: number; // ручной ввод
  renewalStatus: RenewalStatus; // ручной ввод
  ltv: number;
  paymentsCount: number;
  avgCheck: number;
  clientLogin: string; // неизменяемый
  clientPassword: string; // изменяемый
  employeeLogin: string; // общий на всех сотрудников кабинета
  employeePassword: string;
  active: boolean; // "Управлять" → Отключить/Включить
  hidden: boolean; // "Управлять" → Скрыть строку
  createdAt: string; // ISO date
}

export interface CreateProjectInput {
  clientName: string;
  type: ProjectType;
  region: string;
  regionId: number;
  regionIds?: number[];
  sphere: string;
  managerId: string;
  managerName: string;
  price: number;
  employeeLogin: string;
  clientLogin: string;
  idempotencyKey: string;
}
