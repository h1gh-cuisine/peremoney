import { toISODate, type DateRange } from "@/shared/lib/date";

/** Если период не указан — с 1 июня 2026 (docs-agent.md 1.7). */
export function defaultSourcesRange(): DateRange {
  return { from: "2026-06-01", to: toISODate(new Date()) };
}
