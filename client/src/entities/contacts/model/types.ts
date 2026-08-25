// docs-agent.md 1.5, 2.5 — значения статусов совпадают со справочником провайдера,
// чтобы в будущем подставить реальный API без переименований.
export type ContactStatus = "new" | "noAnswerFinal" | "recall" | "notRelevant" | "success";

export interface Contact {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  status: ContactStatus;
  mobileTel: string; // сырые цифры, напр. "79123456789"
  site: string;
  mobileOperator: string;
}
