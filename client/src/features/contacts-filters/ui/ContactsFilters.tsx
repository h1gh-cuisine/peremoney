"use client";

import { DateRangePicker } from "@/shared/ui/DateRangePicker";
import { CONTACT_STATUS_OPTIONS, type ContactStatus } from "@/entities/contacts";
import { useContactsFiltersStore } from "../model/useContactsFiltersStore";
import styles from "./ContactsFilters.module.scss";

/** Самодостаточный блок фильтров: сам читает и пишет стор. */
export function ContactsFilters() {
  const range = useContactsFiltersStore((s) => s.range);
  const setRange = useContactsFiltersStore((s) => s.setRange);
  const status = useContactsFiltersStore((s) => s.status);
  const setStatus = useContactsFiltersStore((s) => s.setStatus);

  return (
    <div className={styles.row}>
      <select
        className={styles.statusSelect}
        value={status}
        onChange={(e) => setStatus(e.target.value as ContactStatus | "all")}
      >
        <option value="all">Все статусы</option>
        {CONTACT_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <DateRangePicker value={range} onChange={setRange} />
    </div>
  );
}
