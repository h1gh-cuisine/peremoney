import { formatPhone, formatShortDate } from "@/shared/lib/format";
import { sourceDisplayName } from "@/shared/lib/sourceDisplayName";
import { LEAD_STATUS_OPTIONS, type Lead, type LeadStatus } from "@/entities/leads";
import { RecordingsButton } from "./RecordingsButton";
import styles from "./LeadsTable.module.scss";

interface LeadsTableProps {
  leads: Lead[];
  onFeedbackChange: (id: string, feedback: string) => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onAmountChange: (id: string, amount: number | null) => void;
  onRecordingsLoad?: (id: string) => void;
}

export function LeadsTable({
  leads,
  onFeedbackChange,
  onStatusChange,
  onAmountChange,
  onRecordingsLoad,
}: LeadsTableProps) {
  return (
    <div className={styles.card}>
      <div className={styles.tableCount}>Показано: {leads.length}</div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID лида</th>
              <th>Дата</th>
              <th>Телефон</th>
              <th>Комментарий</th>
              <th>Источник</th>
              <th>Запись</th>
              <th>Обратная связь</th>
              <th>Статус</th>
              <th>Сумма сделки</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <td className={styles.mono}>{lead.displayId}</td>
                <td>{formatShortDate(lead.successDate)}</td>
                <td>{formatPhone(lead.mobileTel)}</td>
                <td className={styles.comment}>{lead.name}</td>
                <td title={lead.site}>{sourceDisplayName(lead.site)}</td>
                <td>
                  <RecordingsButton recordings={lead.recordings} onLoad={() => onRecordingsLoad?.(lead.id)} />
                </td>
                <td>
                  <input
                    type="text"
                    className={styles.feedbackInput}
                    value={lead.feedback}
                    placeholder="Комментарий…"
                    onChange={(e) => onFeedbackChange(lead.id, e.target.value)}
                  />
                </td>
                <td>
                  <select
                    className={styles.statusSelect}
                    data-status={lead.status}
                    value={lead.status}
                    onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
                  >
                    {LEAD_STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    className={styles.amountInput}
                    value={lead.amount ?? ""}
                    placeholder="0"
                    min={0}
                    onChange={(e) =>
                      onAmountChange(lead.id, e.target.value === "" ? null : Number(e.target.value))
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {leads.length === 0 && <div className={styles.empty}>Лидов не найдено</div>}
      </div>

    </div>
  );
}
