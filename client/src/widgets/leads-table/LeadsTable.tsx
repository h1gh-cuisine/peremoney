import { useEffect, useRef, useState } from "react";
import { formatPhone, formatShortDate } from "@/shared/lib/format";
import { sourceDisplayName } from "@/shared/lib/sourceDisplayName";
import { useDebouncedCallback } from "@/shared/lib/useDebouncedCallback";
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
              <LeadRow
                key={lead.id}
                lead={lead}
                onFeedbackChange={onFeedbackChange}
                onStatusChange={onStatusChange}
                onAmountChange={onAmountChange}
                onRecordingsLoad={onRecordingsLoad}
              />
            ))}
          </tbody>
        </table>

        {leads.length === 0 && <div className={styles.empty}>Лидов не найдено</div>}
      </div>

    </div>
  );
}

// Каждое изменение фидбека/суммы раньше сразу летело в стор (перерисовывая всю
// таблицу) и в PATCH на каждое нажатие клавиши — в Safari на маке это ощущалось
// как дёргающийся инпут (курсор/фокус прыгает на каждый ре-рендер). Держим
// значение в локальном стейте строки и пробрасываем наверх с debounce + flush
// по blur, чтобы не потерять правки, если пользователь быстро уходит с поля.
function LeadRow({ lead, onFeedbackChange, onStatusChange, onAmountChange, onRecordingsLoad }: {
  lead: Lead;
  onFeedbackChange: (id: string, feedback: string) => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onAmountChange: (id: string, amount: number | null) => void;
  onRecordingsLoad?: (id: string) => void;
}) {
  const [feedback, setFeedback] = useState(lead.feedback);
  const [amount, setAmount] = useState(lead.amount);
  const feedbackFocused = useRef(false);
  const amountFocused = useRef(false);

  useEffect(() => { if (!feedbackFocused.current) setFeedback(lead.feedback); }, [lead.feedback]);
  useEffect(() => { if (!amountFocused.current) setAmount(lead.amount); }, [lead.amount]);

  const feedbackUpdate = useDebouncedCallback((value: string) => onFeedbackChange(lead.id, value), 500);
  const amountUpdate = useDebouncedCallback((value: number | null) => onAmountChange(lead.id, value), 500);

  return (
    <tr>
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
          value={feedback}
          placeholder="Комментарий…"
          onFocus={() => { feedbackFocused.current = true; }}
          onBlur={() => { feedbackFocused.current = false; feedbackUpdate.flush(feedback); }}
          onChange={(e) => { setFeedback(e.target.value); feedbackUpdate.debounced(e.target.value); }}
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
          value={amount ?? ""}
          placeholder="0"
          min={0}
          onFocus={() => { amountFocused.current = true; }}
          onBlur={() => { amountFocused.current = false; amountUpdate.flush(amount); }}
          onChange={(e) => {
            const next = e.target.value === "" ? null : Number(e.target.value);
            setAmount(next);
            amountUpdate.debounced(next);
          }}
        />
      </td>
    </tr>
  );
}
