/**
 * Внешняя система хранит теги источников как `B333_79652238826_26013` (иногда
 * с экранированными разделителями `B222\_79661569662\_26013`) — служебный
 * префикс-код и суффикс-ID отбрасываем, оставляя только номер/домен.
 */
export function sourceDisplayName(rawName: string) {
  const normalized = rawName.trim().replace(/\\+_/g, '_');
  const first = normalized.indexOf('_');
  const last = normalized.lastIndexOf('_');
  return first >= 0 && last > first ? normalized.slice(first + 1, last) : normalized;
}
