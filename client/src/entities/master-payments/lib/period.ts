import { toISODate, type DateRange } from "@/shared/lib/date";

/** Фильтр дашборда мастер-кабинета: конкретный месяц или "весь год" (docs-agent.md 1.12.1) */
export type MasterPeriod = { kind: "month"; year: number; month: number } | { kind: "year" };

export function getPeriodRange(period: MasterPeriod): DateRange {
  const today = new Date();
  if (period.kind === "year") {
    const from = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    return { from: toISODate(from), to: toISODate(today) };
  }
  const from = new Date(period.year, period.month, 1);
  const to = new Date(period.year, period.month + 1, 0);
  return { from: toISODate(from), to: toISODate(to) };
}

/** Снапшот "на начало месяца" — до 7-го числа включительно (docs-agent.md 2.8.1) */
export function getSnapshotDate(period: MasterPeriod): string {
  const today = new Date();
  if (period.kind === "year") {
    return toISODate(new Date(today.getFullYear(), today.getMonth() - 11, 7));
  }
  return toISODate(new Date(period.year, period.month, 7));
}

export function getLastMonthOptions(count = 12): { year: number; month: number; label: string }[] {
  const today = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(d),
    };
  });
}
