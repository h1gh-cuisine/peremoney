import { enumerateDates, type DateRange } from "@/shared/lib/date";
import type { Contact } from "@/entities/contacts";
import type { Lead } from "@/entities/leads";
import type { DailyContactsLeadsPoint, DashboardMetrics } from "../model/types";

function inRange(date: string, range: DateRange): boolean {
  return date >= range.from && date <= range.to;
}

/**
 * Контакты и лиды по дням — считаем из реальных Контактов/Лидов, а не из
 * независимого мока (docs-agent.md 1.4). Ось X — весь выбранный период, даже
 * дни без контактов/лидов (нулевые столбцы).
 */
export function buildContactsLeadsSeries(
  contacts: Contact[],
  leads: Lead[],
  range: DateRange,
): DailyContactsLeadsPoint[] {
  const contactsByDate = new Map<string, number>();
  for (const c of contacts) {
    if (!inRange(c.date, range)) continue;
    contactsByDate.set(c.date, (contactsByDate.get(c.date) ?? 0) + 1);
  }

  const leadsByDate = new Map<string, number>();
  for (const l of leads) {
    if (!inRange(l.successDate, range)) continue;
    leadsByDate.set(l.successDate, (leadsByDate.get(l.successDate) ?? 0) + 1);
  }

  return enumerateDates(range).map((date) => ({
    date,
    contacts: contactsByDate.get(date) ?? 0,
    leads: leadsByDate.get(date) ?? 0,
  }));
}

/**
 * Метрики-карточки, формулы — docs-agent.md 2.4. Считаем из реальных
 * Контактов/Лидов: правка статуса/суммы лида на странице "Лиды" теперь
 * действительно отражается в Продано/Выручке дашборда (раньше это были два
 * независимых мока).
 *
 * `totalSpentBalance` — "весь потраченный баланс" для CPL (2.4) намеренно
 * НЕ фильтруется по периоду (буквально "весь"), в отличие от остальных
 * метрик — это дословное прочтение формулы, а не баг.
 */
export function aggregateDashboardMetrics(
  contacts: Contact[],
  leads: Lead[],
  range: DateRange,
  totalSpentBalance: number,
): DashboardMetrics {
  const contactsInRange = contacts.filter((c) => inRange(c.date, range));
  const leadsInRange = leads.filter((l) => inRange(l.successDate, range));
  const purchased = leadsInRange.filter((l) => l.status === "purchased");

  const contactsReceived = contactsInRange.length;
  const leadsQualified = leadsInRange.length;
  const sold = purchased.length;
  const crToSale = leadsQualified > 0 ? (sold / leadsQualified) * 100 : 0;
  const revenue = purchased.reduce((sum, l) => sum + (l.amount ?? 0), 0);
  const avgCheck = sold > 0 ? revenue / sold : 0;

  const cpl = leadsQualified > 0 ? totalSpentBalance / leadsQualified : 0;
  // CR хранится в процентах (напр. 22.2), поэтому делим на долю (CR / 100),
  // иначе результат занижается в 100 раз относительно реальной стоимости продажи.
  const saleCost = crToSale > 0 ? cpl / (crToSale / 100) : 0;

  return {
    contactsReceived,
    leadsQualified,
    sold,
    crToSale,
    revenue,
    cpl,
    avgCheck,
    saleCost,
  };
}
