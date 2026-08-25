export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}

export function formatCurrency(value: number): string {
  return `${formatNumber(value)} ₽`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(d);
}

export function formatDateRuLong(iso: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Форматирует сырые цифры номера ("79123456789") в "+7 912 345-67-89". */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const match = digits.match(/^7?(\d{3})(\d{3})(\d{2})(\d{2})$/);
  if (!match) return raw;
  const [, a, b, c, d] = match;
  return `+7 ${a} ${b}-${c}-${d}`;
}
