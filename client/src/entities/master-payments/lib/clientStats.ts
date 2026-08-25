import type { MasterProject } from "@/entities/master-projects";
import type { MasterPayment } from "../model/types";
import { getPeriodRange, type MasterPeriod } from "./period";

export interface ClientStat {
  projectId: string;
  projectName: string;
  totalAmount: number;
}

/** docs-agent.md 2.8.2 */
export function computeClientStats(
  projects: MasterProject[],
  payments: MasterPayment[],
  period: MasterPeriod,
): ClientStat[] {
  const range = getPeriodRange(period);
  const periodPayments = payments.filter(
    (p) => p.createdAt >= range.from && p.createdAt <= range.to,
  );

  const totals = new Map<string, number>();
  for (const payment of periodPayments) {
    totals.set(payment.projectId, (totals.get(payment.projectId) ?? 0) + payment.amount);
  }

  return Array.from(totals.entries())
    .map(([projectId, totalAmount]) => ({
      projectId,
      projectName: projects.find((p) => p.id === projectId)?.name ?? projectId,
      totalAmount,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}
