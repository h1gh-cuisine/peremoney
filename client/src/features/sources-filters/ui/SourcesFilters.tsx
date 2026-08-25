"use client";

import { DateRangePicker } from "@/shared/ui/DateRangePicker";
import type { SourceStatusFilter } from "@/entities/sources";
import { useSourcesFiltersStore } from "../model/useSourcesFiltersStore";
import styles from "./SourcesFilters.module.scss";

export function SourcesFilters() {
  const draftRange = useSourcesFiltersStore((s) => s.draftRange);
  const setDraftRange = useSourcesFiltersStore((s) => s.setDraftRange);
  const draftOnlyWithLeads = useSourcesFiltersStore((s) => s.draftOnlyWithLeads);
  const setDraftOnlyWithLeads = useSourcesFiltersStore((s) => s.setDraftOnlyWithLeads);
  const draftStatus = useSourcesFiltersStore((s) => s.draftStatus);
  const setDraftStatus = useSourcesFiltersStore((s) => s.setDraftStatus);
  const draftSearch = useSourcesFiltersStore((s) => s.draftSearch);
  const setDraftSearch = useSourcesFiltersStore((s) => s.setDraftSearch);
  const applyFilters = useSourcesFiltersStore((s) => s.applyFilters);

  return (
    <div className={styles.row}>
      <div className={styles.controls}>
        <label className={styles.searchField}>
          <span className={styles.searchIcon} aria-hidden="true">⌕</span>
          <input value={draftSearch} onChange={(e) => setDraftSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
            placeholder="Сайт или номер" aria-label="Поиск по источникам" />
        </label>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={draftOnlyWithLeads}
            onChange={(e) => setDraftOnlyWithLeads(e.target.checked)}
          />
          Только источники где есть лиды
        </label>

        <select
          className={styles.statusSelect}
          value={draftStatus}
          onChange={(e) => setDraftStatus(e.target.value as SourceStatusFilter)}
        >
          <option value="all">Все статусы</option>
          <option value="active">Активен</option>
          <option value="inactive">Не активен</option>
        </select>

        <DateRangePicker value={draftRange} onChange={setDraftRange} />
      </div>

      <button type="button" className={styles.applyBtn} onClick={applyFilters}>
        Запустить фильтрацию
      </button>
    </div>
  );
}
