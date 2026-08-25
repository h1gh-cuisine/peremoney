import type { LeadStatus } from "../model/types";

/** "не обработан" — дефолт для всех лидов (docs-agent.md 1.6). */
export const DEFAULT_LEAD_STATUS: LeadStatus = "not_processed";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  not_processed: "не обработан",
  negotiation: "переговоры",
  not_relevant: "не целевой",
  rejected: "отказ",
  purchased: "купил",
};

export const LEAD_STATUS_OPTIONS = (
  Object.keys(LEAD_STATUS_LABELS) as LeadStatus[]
).map((value) => ({ value, label: LEAD_STATUS_LABELS[value] }));
