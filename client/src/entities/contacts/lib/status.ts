import type { ContactStatus } from "../model/types";

/** Единственные статусы, которые показываем клиенту (docs-agent.md 2.5). */
export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  new: "НОВЫЙ",
  noAnswerFinal: "НЕДОЗВОН",
  recall: "ПЕРЕЗВОНИТЬ",
  notRelevant: "НЕ КВАЛ",
  success: "КВАЛ",
};

export const CONTACT_STATUS_OPTIONS = (
  Object.keys(CONTACT_STATUS_LABELS) as ContactStatus[]
).map((value) => ({ value, label: CONTACT_STATUS_LABELS[value] }));

/**
 * Провайдер отдаёт больше статусов, чем показываем. Всё, что не входит в 5
 * разрешённых, отображаем пустым местом, а не сырым значением (docs-agent.md 2.5).
 */
export function getContactStatusLabel(status: string): string {
  return CONTACT_STATUS_LABELS[status as ContactStatus] ?? "";
}
