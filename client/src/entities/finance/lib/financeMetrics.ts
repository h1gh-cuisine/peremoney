import type { Payment } from "../model/types";

/** LTV = сумма фактически поступивших платежей (docs-agent.md 1.9) */
export function computeLtv(payments: Payment[]): number {
  return payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
}

/** Ожидается = сумма выставленных, но ещё не оплаченных счетов (docs-agent.md 1.9) */
export function computeExpected(payments: Payment[]): number {
  return payments.filter((p) => p.status === "pending" && (p.invoiceCreationStatus ?? "succeeded") === "succeeded")
    .reduce((sum, p) => sum + p.amount, 0);
}

/** "Всего оплат" = количество платежей в списке (замена "Просрочки", docs-agent.md 1.9) */
export function computeTotalPayments(payments: Payment[]): number {
  return payments.filter((p) => p.status === "paid" || (p.invoiceCreationStatus ?? "succeeded") === "succeeded").length;
}
