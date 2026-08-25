"use client";

import { getLastMonthOptions } from "@/entities/master-payments";
import { useMasterDashboardFilterStore } from "../model/useMasterDashboardFilterStore";
import styles from "./MasterDashboardFilter.module.scss";

const MONTH_OPTIONS = getLastMonthOptions(12);

/** Фильтр по календарным месяцам + "весь год" (docs-agent.md 1.12.1) */
export function MasterDashboardFilter() {
  const period = useMasterDashboardFilterStore((s) => s.period);
  const setPeriod = useMasterDashboardFilterStore((s) => s.setPeriod);

  return (
    <div className={styles.row}>
      <select
        className={styles.select}
        value={period.kind === "month" ? `${period.year}-${period.month}` : ""}
        onChange={(e) => {
          const [year, month] = e.target.value.split("-").map(Number);
          setPeriod({ kind: "month", year, month });
        }}
      >
        {MONTH_OPTIONS.map((opt) => (
          <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
            {opt.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        className={`${styles.yearBtn} ${period.kind === "year" ? styles.yearBtnActive : ""}`}
        onClick={() => setPeriod({ kind: "year" })}
      >
        Весь год
      </button>
    </div>
  );
}
