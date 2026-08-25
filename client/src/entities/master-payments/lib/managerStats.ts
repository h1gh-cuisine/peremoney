import type { Manager } from "@/entities/master-managers";
import type { MasterProject } from "@/entities/master-projects";
import type { MasterPayment } from "../model/types";
import { getPeriodRange, getSnapshotDate, type MasterPeriod } from "./period";

export interface ManagerStat {
  managerId: string;
  managerName: string;
  activeProjectsAtSnapshot: number;
  paymentsCount: number;
  paymentsSum: number;
  retention: number; // %
  bonus: number; // ₽
}

/** docs-agent.md 2.8.1 */
export function computeManagerStats(
  managers: Manager[],
  projects: MasterProject[],
  payments: MasterPayment[],
  period: MasterPeriod,
): ManagerStat[] {
  const range = getPeriodRange(period);
  const snapshot = getSnapshotDate(period);

  return managers.map((manager) => {
    const activeProjectsAtSnapshot = projects.filter(
      (p) => p.managerId === manager.id && p.active && p.createdAt <= snapshot,
    ).length;

    const managerProjectIds = new Set(
      projects.filter((p) => p.managerId === manager.id).map((p) => p.id),
    );
    const periodPayments = payments.filter(
      (pay) =>
        managerProjectIds.has(pay.projectId) &&
        pay.createdAt >= range.from &&
        pay.createdAt <= range.to,
    );

    const paymentsCount = periodPayments.length;
    const paymentsSum = periodPayments.reduce((sum, p) => sum + p.amount, 0);
    const retention = activeProjectsAtSnapshot > 0 ? (paymentsCount / activeProjectsAtSnapshot) * 100 : 0;
    const bonus = paymentsSum * 0.1;

    return {
      managerId: manager.id,
      managerName: manager.name,
      activeProjectsAtSnapshot,
      paymentsCount,
      paymentsSum,
      retention,
      bonus,
    };
  });
}
