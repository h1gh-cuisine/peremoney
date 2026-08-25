import { downloadCsv } from "@/shared/lib/csv";
import { formatPhone } from "@/shared/lib/format";
import { LEAD_STATUS_LABELS, type Lead } from "@/entities/leads";

const HEADER = ["ID лида", "Дата", "Телефон", "Комментарий", "Источник", "Обратная связь", "Статус", "Сумма сделки"];

export function exportLeadsToCsv(leads: Lead[]): void {
  const rows = leads.map((lead) => [
    lead.displayId,
    lead.successDate,
    formatPhone(lead.mobileTel),
    lead.name,
    lead.site,
    lead.feedback,
    LEAD_STATUS_LABELS[lead.status],
    lead.amount != null ? String(lead.amount) : "",
  ]);

  downloadCsv(`leads-${new Date().toISOString().slice(0, 10)}.csv`, HEADER, rows);
}
