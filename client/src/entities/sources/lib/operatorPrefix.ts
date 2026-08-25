/** Маппинг префикса тега на оператора связи (docs-agent.md 2.6.1). */
export const OPERATOR_PREFIX_MAP: Record<string, string> = {
  B111: "Ростелеком",
  B222: "Билайн",
  B223: "Билайн",
  B333: "МТС",
  B444: "Мегафон",
};

export interface OperatorTagOption {
  value: string;
  label: string;
}

/** Оставляет только пришедшие от провайдера коды с подтверждённым оператором. */
export function operatorTagOptions(tagTypes: string[]): OperatorTagOption[] {
  return tagTypes.flatMap((value) => {
    const operator = OPERATOR_PREFIX_MAP[value];
    return operator ? [{ value, label: `${operator} (${value})` }] : [];
  });
}

/**
 * Провайдер отдаёт тег вида "B111_74951270967_20168". Убираем префикс оператора
 * (до первого "_") и суффикс ID источника (после последнего "_") — остаётся
 * только номер/домен (docs-agent.md 2.6.1).
 */
export function parseSourceTag(rawTag: string): { name: string; operator: string } {
  const parts = rawTag.split("_");
  if (parts.length < 3) return { name: rawTag, operator: "" };

  const [prefix, ...rest] = parts;
  const name = rest.slice(0, -1).join("_");
  return { name, operator: OPERATOR_PREFIX_MAP[prefix] ?? "" };
}
