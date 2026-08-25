const OPERATORS: Readonly<Record<string, string>> = {
  B111: 'Ростелеком', B222: 'Билайн', B223: 'Билайн', B333: 'МТС', B444: 'Мегафон',
};

export function parseSourceName(rawName: string) {
  const first = rawName.indexOf('_');
  const last = rawName.lastIndexOf('_');
  const prefix = first > 0 ? rawName.slice(0, first) : '';
  return {
    name: first >= 0 && last > first ? rawName.slice(first + 1, last) : rawName,
    operator: OPERATORS[prefix] ?? null,
  };
}
