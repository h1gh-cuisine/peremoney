import { formatCurrency, formatNumber, formatPercent } from "@/shared/lib/format";
import type { ManagerStat } from "@/entities/master-payments";
import styles from "./ManagerStatsTable.module.scss";

interface ManagerStatsTableProps {
  stats: ManagerStat[];
}

/** docs-agent.md 1.12.1, 2.8.1 */
export function ManagerStatsTable({ stats }: ManagerStatsTableProps) {
  return (
    <div className={styles.card}>
      <div className={styles.heading}>
        <h2 className={styles.title}>Статистика по менеджерам</h2>
        <span className={styles.tableCount}>Показано: {stats.length}</span>
      </div>
      <div className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.headerTable}`}>
          <thead>
            <tr>
              <th>Менеджер</th>
              <th>Активных проектов</th>
              <th>Платежей</th>
              <th>Сумма</th>
              <th>Retention</th>
              <th>Бонус</th>
            </tr>
          </thead>
        </table>
        <div className={styles.tableBody}>
          <table className={styles.table}>
            <tbody>
            {stats.map((s) => (
              <tr key={s.managerId}>
                <td>{s.managerName}</td>
                <td>{formatNumber(s.activeProjectsAtSnapshot)}</td>
                <td>{formatNumber(s.paymentsCount)}</td>
                <td>{formatCurrency(s.paymentsSum)}</td>
                <td>{formatPercent(s.retention)}</td>
                <td>{formatCurrency(s.bonus)}</td>
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
