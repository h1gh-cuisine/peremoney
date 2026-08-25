"use client";

import { DateRangePicker } from "@/shared/ui/DateRangePicker";
import { LEAD_STATUS_OPTIONS, type LeadStatus } from "@/entities/leads";
import { useLeadsFiltersStore } from "../model/useLeadsFiltersStore";
import styles from "./LeadsFilters.module.scss";

export function LeadsFilters() {
  const range = useLeadsFiltersStore((s) => s.range);
  const setRange = useLeadsFiltersStore((s) => s.setRange);
  const status = useLeadsFiltersStore((s) => s.status);
  const setStatus = useLeadsFiltersStore((s) => s.setStatus);
  const search = useLeadsFiltersStore((s) => s.search);
  const setSearch = useLeadsFiltersStore((s) => s.setSearch);

  return (
    <div className={styles.row}>
      <input
        type="text"
        className={styles.search}
        placeholder="Поиск по телефону или ID лида"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className={styles.controls}>
        <select
          className={styles.statusSelect}
          value={status}
          onChange={(e) => setStatus(e.target.value as LeadStatus | "all")}
        >
          <option value="all">Все статусы</option>
          {LEAD_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <DateRangePicker value={range} onChange={setRange} />
      </div>
    </div>
  );
}
