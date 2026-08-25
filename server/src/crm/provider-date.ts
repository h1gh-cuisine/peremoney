export function parseProviderDate(value: string): Date {
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const normalized = value.replace(' ', 'T') + (hasTimezone ? '' : '+03:00');
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) throw new Error(`Некорректная дата провайдера: ${value}`);
  return date;
}
