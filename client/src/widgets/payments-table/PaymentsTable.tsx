import { formatCurrency, formatShortDate } from "@/shared/lib/format";
import type { Payment } from "@/entities/finance";
import styles from "./PaymentsTable.module.scss";

interface PaymentsTableProps {
  payments: Payment[];
}

/** Список платежей — только на чтение, заполняется мастер-кабинетом (docs-agent.md 1.9). */
export function PaymentsTable({ payments }: PaymentsTableProps) {
  return (
    <div className={styles.card}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Штук</th>
              <th>Сумма</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{formatShortDate(p.createdAt)}</td>
                <td>{p.quantity}</td>
                <td>{formatCurrency(p.amount)}</td>
                <td>
                  <span className={`${styles.badge} ${p.status === "paid" ? styles.paid : styles.pending}`}>
                    {p.status === "paid" ? "Оплачено" : "Ожидает"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {payments.length === 0 && <div className={styles.empty}>Платежей пока нет</div>}
      </div>
    </div>
  );
}
