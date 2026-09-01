const SECRET_KEY_PATTERN = /password|token|secret|jwt|authorization|apikey|clientsecret|bearer|cookie/i;

/** Рекурсивно маскирует поля с именами вроде password/token/secret перед логированием (см. scheduler.service.ts). */
export function redact(value: unknown, depth = 0): unknown {
  if (value == null || depth > 6) return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SECRET_KEY_PATTERN.test(key) ? '[REDACTED]' : redact(val, depth + 1);
    }
    return result;
  }
  return value;
}
