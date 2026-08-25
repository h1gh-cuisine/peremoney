"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatNumber, formatPercent } from "@/shared/lib/format";
import type { Source } from "@/entities/sources";
import { SourceRowMenu } from "./SourceRowMenu";
import styles from "./SourcesTable.module.scss";

interface SourcesTableProps {
  sources: Source[];
  onToggleActive: (id: string) => void;
}

type SortKey =
  | "id"
  | "name"
  | "operator"
  | "contacts"
  | "leads"
  | "conversion"
  | "cost"
  | "notRelevantShare"
  | "sales"
  | "active";

type SortDirection = "asc" | "desc";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "name", label: "Источник" },
  { key: "operator", label: "Оператор" },
  { key: "contacts", label: "Контактов" },
  { key: "leads", label: "Лидов" },
  { key: "conversion", label: "Конверсия" },
  { key: "cost", label: "Себестоимость" },
  { key: "notRelevantShare", label: "Доля нецелевых" },
  { key: "sales", label: "Продаж" },
  { key: "active", label: "Статус" },
];

/** Сортировка — чисто UI-поведение таблицы, поэтому состояние держим локально в виджете. */
export function SourcesTable({ sources, onToggleActive }: SourcesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("contacts");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  }

  const sorted = useMemo(() => {
    const copy = [...sources];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else if (typeof av === "boolean" && typeof bv === "boolean") {
        cmp = Number(av) - Number(bv);
      } else {
        cmp = String(av).localeCompare(String(bv), "ru");
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [sources, sortKey, sortDirection]);

  return (
    <div className={styles.card}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.key}>
                  <button type="button" className={styles.sortBtn} onClick={() => handleSort(col.key)}>
                    {col.label}
                    {sortKey === col.key && (
                      <span className={styles.sortArrow}>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <tr key={s.id}>
                <td className={styles.mono}>{s.id}</td>
                <td>{s.name}</td>
                <td>{s.operator || "—"}</td>
                <td>{formatNumber(s.contacts)}</td>
                <td>{formatNumber(s.leads)}</td>
                <td>{formatPercent(s.conversion)}</td>
                <td>{formatCurrency(s.cost)}</td>
                <td>{s.notRelevantShare}%</td>
                <td>{formatNumber(s.sales)}</td>
                <td>
                  <span className={`${styles.statusBadge} ${s.active ? styles.active : styles.inactive}`}>
                    {s.active ? "Активен" : "Не активен"}
                  </span>
                </td>
                <td>
                  <SourceRowMenu active={s.active} onToggle={() => onToggleActive(s.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && <div className={styles.empty}>Источников не найдено</div>}
      </div>

      <div className={styles.footer}>Показано: {sorted.length}</div>
    </div>
  );
}
