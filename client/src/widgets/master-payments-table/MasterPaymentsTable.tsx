import { useState } from "react";
import { formatCurrency, formatShortDate } from "@/shared/lib/format";
import type { Manager } from "@/entities/master-managers";
import type { MasterPayment, MasterPaymentStatus } from "@/entities/master-payments";
import styles from "./MasterPaymentsTable.module.scss";

interface MasterPaymentsTableProps {
  payments: MasterPayment[];
  managers: Manager[];
  onStatusChange: (id: string, status: MasterPaymentStatus) => Promise<void> | void;
  onDelete: (id: string) => void;
}

/** Статус переключает менеджер вручную; любой платёж можно удалить (docs-agent.md 1.12.3) */
export function MasterPaymentsTable({ payments, managers, onStatusChange, onDelete }: MasterPaymentsTableProps) {
  const [pendingChange, setPendingChange] = useState<{ payment: MasterPayment; status: MasterPaymentStatus } | null>(null);
  const managerName = (id: string) => managers.find((m) => m.id === id)?.name ?? "—";
  const statusLabel = (payment: MasterPayment) => {
    if (payment.status === "paid") return "Оплачено";
    if (payment.invoiceCreationStatus === "failed") return "Ошибка создания";
    if (payment.invoiceCreationStatus === "uncertain") return "Требует сверки";
    if (payment.invoiceCreationStatus === "pending") return "Создаётся";
    return "Ожидает";
  };
  const creationStatus = (payment: MasterPayment) => payment.invoiceCreationStatus ?? "succeeded";

  const confirmStatusChange = async () => {
    if (!pendingChange) return;
    try {
      await onStatusChange(pendingChange.payment.id, pendingChange.status);
      setPendingChange(null);
    } catch {
      // Ошибка остаётся на странице, а окно не закрывается до успешного ответа.
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Проект</th>
              <th>Юр. лицо</th>
              <th>Менеджер</th>
              <th>Сумма</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{formatShortDate(p.createdAt)}</td>
                <td>{p.projectName}</td>
                <td>{p.legalEntity}</td>
                <td>{managerName(p.managerId)}</td>
                <td>{formatCurrency(p.amount)}</td>
                <td>
                  {p.status === "pending" && creationStatus(p) !== "succeeded" ? (
                    <span>{statusLabel(p)}</span>
                  ) : (
                  <span className={`${styles.statusControl} ${p.status === "paid" ? styles.paid : styles.pending}`}>
                    <select
                      className={styles.statusSelect}
                      value={p.status}
                      aria-label={`Статус платежа ${p.projectName}`}
                      onChange={(event) => {
                        const status = event.target.value as MasterPaymentStatus;
                        if (status !== p.status) setPendingChange({ payment: p, status });
                      }}
                    >
                      <option value="pending">Ожидает</option>
                      <option value="paid">Оплачено</option>
                    </select>
                    <span className={styles.chevron} aria-hidden="true">⌄</span>
                  </span>
                  )}
                </td>
                <td>
                  <button type="button" className={styles.deleteBtn} onClick={() => onDelete(p.id)}>
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {payments.length === 0 && <div className={styles.empty}>Платежей нет</div>}
      </div>
      {pendingChange && (
        <div className={styles.confirmOverlay} role="presentation" onMouseDown={() => setPendingChange(null)}>
          <section
            className={styles.confirmModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-status-confirm-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="payment-status-confirm-title">Изменить статус платежа?</h2>
            <p>
              Платёж проекта <strong>{pendingChange.payment.projectName}</strong> на сумму{" "}
              <strong>{formatCurrency(pendingChange.payment.amount)}</strong> будет отмечен как{" "}
              <strong>{pendingChange.status === "paid" ? "«Оплачено»" : "«Ожидает»"}</strong>.
            </p>
            <p className={styles.confirmHint}>
              После изменения строка может переместиться в другую группу таблицы.
            </p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.cancelButton} onClick={() => setPendingChange(null)}>Отмена</button>
              <button type="button" className={styles.confirmButton} onClick={() => void confirmStatusChange()}>Да, изменить</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
