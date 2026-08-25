import type { DateRange } from "@/shared/lib/date";
import type { Lead, LeadStatus } from "../model/types";

export interface LeadsFilter {
  range: DateRange;
  status: LeadStatus | "all";
  search: string;
}

/** Поиск по номеру телефона или ID лида + фильтр по дате и статусу (docs-agent.md 1.6). */
export function filterLeads(leads: Lead[], filter: LeadsFilter): Lead[] {
  const query = filter.search.trim().toLowerCase();

  return leads.filter((lead) => {
    if (lead.successDate < filter.range.from || lead.successDate > filter.range.to) return false;
    if (filter.status !== "all" && lead.status !== filter.status) return false;
    if (query) {
      const digits = query.replace(/\D/g, "");
      const matchesPhone = digits.length > 0 && lead.mobileTel.includes(digits);
      const matchesId = lead.displayId.includes(query) || lead.id.toLowerCase().includes(query);
      if (!matchesPhone && !matchesId) return false;
    }
    return true;
  });
}
