import { formatCurrency } from "@/shared/lib/format";
import type { ClientStat } from "@/entities/master-payments";
import styles from "./ClientStatsList.module.scss";

interface ClientStatsListProps {
  stats: ClientStat[];
}

/** Ранжированный список проектов по сумме платежей за период (docs-agent.md 1.12.1, 2.8.2) */
export function ClientStatsList({ stats }: ClientStatsListProps) {
  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Статистика по клиентам</h2>
      <div className={styles.list}>
        {stats.map((s, i) => (
          <div key={s.projectId} className={styles.row}>
            <span className={styles.rank}>{i + 1}</span>
            <span className={styles.name}>{s.projectName}</span>
            <span className={styles.amount}>{formatCurrency(s.totalAmount)}</span>
          </div>
        ))}
        {stats.length === 0 && <p className={styles.empty}>Платежей за период нет</p>}
      </div>
    </div>
  );
}
