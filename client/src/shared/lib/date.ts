export interface DateRange {
  from: string; // ISO date (YYYY-MM-DD)
  to: string; // ISO date (YYYY-MM-DD)
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Диапазон в N дней, заканчивающийся сегодня (включительно). */
export function lastNDaysRange(days: number): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  return { from: toISODate(from), to: toISODate(to) };
}

export function enumerateDates(range: DateRange): string[] {
  const dates: string[] = [];
  // ISO-даты — календарные значения, а не локальные timestamp.
  // UTC-арифметика исключает сдвиг на день в timezone восточнее UTC.
  const cursor = new Date(range.from + "T00:00:00Z");
  const end = new Date(range.to + "T00:00:00Z");
  while (cursor <= end) {
    dates.push(toISODate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates.length > 0 ? dates : [range.from];
}
