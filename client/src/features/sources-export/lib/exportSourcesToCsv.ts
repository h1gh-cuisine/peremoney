import { downloadCsv } from "@/shared/lib/csv";
import type { Source } from "@/entities/sources";

const HEADER = [
  "ID",
  "Источник",
  "Оператор",
  "Контактов",
  "Лидов",
  "Конверсия",
  "Себестоимость",
  "Доля нецелевых",
  "Продаж",
  "Статус",
];

export function exportSourcesToCsv(sources: Source[]): void {
  const rows = sources.map((s) => [
    s.id,
    s.name,
    s.operator,
    String(s.contacts),
    String(s.leads),
    `${s.conversion.toFixed(1)}%`,
    String(s.cost),
    `${s.notRelevantShare}%`,
    String(s.sales),
    s.active ? "Активен" : "Не активен",
  ]);

  downloadCsv(`sources-${new Date().toISOString().slice(0, 10)}.csv`, HEADER, rows);
}
