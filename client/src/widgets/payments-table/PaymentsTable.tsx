import { formatCurrency, formatShortDate } from "@/shared/lib/format";
import type { Payment } from "@/entities/finance";
import styles from "./PaymentsTable.module.scss";

interface PaymentsTableProps {
  payments: Payment[];
}

/** Список платежей — только на чтение, заполняется мастер-кабинетом (docs-agent.md 1.9). */
export function PaymentsTable({ payments }: PaymentsTableProps) {
  const status = (payment: Payment) => {
    if (payment.status === "paid") return { label: "Оплачено", className: styles.paid };
    if (payment.invoiceCreationStatus === "failed") return { label: "Ошибка создания", className: styles.failed };
    if (payment.invoiceCreationStatus === "uncertain") return { label: "Требует сверки", className: styles.uncertain };
    if (payment.invoiceCreationStatus === "pending") return { label: "Создаётся", className: styles.pending };
    return { label: "Ожидает оплаты", className: styles.pending };
  };
  return (
    <div className={styles.card}>
      <div className={styles.tableCount}>Показано: {payments.length}</div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Штук</th>
              <th>Сумма</th>
              <th>Статус</th>
              <th>Обоснование</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{formatShortDate(p.createdAt)}</td>
                <td>{p.quantity}</td>
                <td>{formatCurrency(p.amount)}</td>
                <td>
                  <span className={`${styles.badge} ${status(p).className}`}>
                    {status(p).label}
                  </span>
                </td>
                <td className={styles.purpose}>{p.paymentPurpose ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {payments.length === 0 && <div className={styles.empty}>Платежей пока нет</div>}
      </div>
    </div>
  );
}
