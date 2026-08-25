import type { DateRange } from "@/shared/lib/date";
import type { Contact, ContactStatus } from "../model/types";

export interface ContactsFilter {
  range: DateRange;
  status: ContactStatus | "all";
}

/** Фильтрация чисто фронтовая, без доп. запросов к API (docs-agent.md 1.5). */
export function filterContacts(contacts: Contact[], filter: ContactsFilter): Contact[] {
  return contacts.filter((c) => {
    if (c.date < filter.range.from || c.date > filter.range.to) return false;
    if (filter.status !== "all" && c.status !== filter.status) return false;
    return true;
  });
}
