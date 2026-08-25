"use client";

import { DateRangePicker } from "@/shared/ui/DateRangePicker";
import { useDashboardFilterStore } from "../model/useDashboardFilterStore";
import styles from "./DashboardDateFilter.module.scss";

/** Самодостаточный фильтр периода дашборда: сам читает и пишет стор. */
export function DashboardDateFilter() {
  const range = useDashboardFilterStore((s) => s.range);
  const setRange = useDashboardFilterStore((s) => s.setRange);

  return (
    <div className={styles.row}>
      <DateRangePicker value={range} onChange={setRange} />
    </div>
  );
}
