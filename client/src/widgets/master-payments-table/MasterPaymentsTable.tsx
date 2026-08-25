import { formatCurrency, formatShortDate } from "@/shared/lib/format";
import type { Manager } from "@/entities/master-managers";
import type { MasterPayment } from "@/entities/master-payments";
import styles from "./MasterPaymentsTable.module.scss";

interface MasterPaymentsTableProps {
  payments: MasterPayment[];
  managers: Manager[];
  onTogglePaid: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Статус переключает менеджер вручную; любой платёж можно удалить (docs-agent.md 1.12.3) */
export function MasterPaymentsTable({ payments, managers, onTogglePaid, onDelete }: MasterPaymentsTableProps) {
  const managerName = (id: string) => managers.find((m) => m.id === id)?.name ?? "—";

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
                  <button
                    type="button"
                    className={`${styles.statusBtn} ${p.status === "paid" ? styles.paid : styles.pending}`}
                    onClick={() => onTogglePaid(p.id)}
                    title="Переключить статус"
                  >
                    {p.status === "paid" ? "Оплачено" : "Ожидает"}
                  </button>
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
    </div>
  );
}
