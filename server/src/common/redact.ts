const SECRET_KEY_PATTERN = /password|token|secret|jwt|authorization|apikey|clientsecret|bearer|cookie/i;

/** Рекурсивно маскирует поля с именами вроде password/token/secret перед логированием (см. scheduler.service.ts). */
export function redact(value: unknown, depth = 0): unknown {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (typeof value === 'object') {
    // Экземпляры вроде Prisma.Decimal (и Date) несут служебные own-свойства
    // (у decimal.js это даже `constructor`) — Object.entries по ним вместо
    // бизнес-полей ломает JSON.stringify ("could not serialize [object Function]",
    // замечено на audit-log для Cabinet.price/moneyBalance). Отдаём их через
    // toJSON(), как это сделал бы сам JSON.stringify, а не рекурсией по внутренностям.
    const toJSON = (value as { toJSON?: unknown }).toJSON;
    if (typeof toJSON === 'function') return toJSON.call(value);
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SECRET_KEY_PATTERN.test(key) ? '[REDACTED]' : redact(val, depth + 1);
    }
    return result;
  }
  return value;
}
