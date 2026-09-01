const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1000;

function isoDayOf(date: Date) {
  const jsDay = date.getUTCDay();
  return jsDay === 0 ? 7 : jsDay;
}

export function isActiveToday(days: number[], now = new Date()) {
  return days.includes(isoDayOf(new Date(now.getTime() + MOSCOW_OFFSET_MS)));
}

export function isActiveNextDay(days: number[], scheduledFor: Date) {
  return days.includes(isoDayOf(new Date(scheduledFor.getTime() + MOSCOW_OFFSET_MS + 24 * 60 * 60 * 1000)));
}
