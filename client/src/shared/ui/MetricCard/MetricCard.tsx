import styles from "./MetricCard.module.scss";

interface MetricCardProps {
  label: string;
  value: string;
  accent?: "primary" | "secondary" | "alt";
}

export function MetricCard({ label, value, accent = "primary" }: MetricCardProps) {
  return (
    <div className={styles.card}>
      <span className={`${styles.indicator} ${styles[accent]}`} aria-hidden />
      <div className={styles.body}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
      </div>
    </div>
  );
}
