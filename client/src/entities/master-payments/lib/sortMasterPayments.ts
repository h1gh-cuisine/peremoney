import type { MasterPayment } from "../model/types";

/** Платежи "ожидает" всегда сверху, внутри группы — новые выше (docs-agent.md 1.12.3) */
export function sortMasterPayments(payments: MasterPayment[]): MasterPayment[] {
  return [...payments].sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
  });
}
