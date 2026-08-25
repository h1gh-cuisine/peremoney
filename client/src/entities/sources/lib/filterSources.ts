import type { Source, SourceStatusFilter } from "../model/types";

export interface SourcesFilter {
  onlyWithLeads: boolean;
  status: SourceStatusFilter;
  search?: string;
}

/** Фильтрация после применённого периода — сам период уже "зашит" в список (docs-agent.md 1.7). */
export function filterSources(sources: Source[], filter: SourcesFilter): Source[] {
  return sources.filter((s) => {
    const query = filter.search?.trim().toLocaleLowerCase('ru-RU');
    if (query && !`${s.name} ${s.operator}`.toLocaleLowerCase('ru-RU').includes(query)) return false;
    if (filter.onlyWithLeads && s.leads < 1) return false;
    if (filter.status === "active" && !s.active) return false;
    if (filter.status === "inactive" && s.active) return false;
    return true;
  });
}
