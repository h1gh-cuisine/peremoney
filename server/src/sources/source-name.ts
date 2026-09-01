const OPERATORS: Readonly<Record<string, string>> = {
  B111: 'Ростелеком', B222: 'Билайн', B223: 'Билайн', B333: 'МТС', B444: 'Мегафон',
};

export function parseSourceName(rawName: string) {
  // В некоторых ответах/старых записях разделители приходят экранированными
  // как `B222\_7966...\_26013`. Убираем обратные слеши только перед `_`,
  // затем оставляем строго содержимое между первым и последним разделителем.
  const normalized = rawName.trim().replace(/\\+_/g, '_');
  const first = normalized.indexOf('_');
  const last = normalized.lastIndexOf('_');
  const prefix = first > 0 ? normalized.slice(0, first) : '';
  return {
    name: first >= 0 && last > first ? normalized.slice(first + 1, last) : normalized,
    operator: OPERATORS[prefix] ?? null,
  };
}
