import { MetricCard } from "@/shared/ui/MetricCard";
import { formatCurrency, formatNumber } from "@/shared/lib/format";
import styles from "./FinanceSummary.module.scss";

interface FinanceSummaryProps {
  metrics: { ltv: number; expected: number; totalPayments: number };
}

export function FinanceSummary({ metrics }: FinanceSummaryProps) {
  return (
    <div className={styles.grid}>
      <MetricCard label="LTV" value={formatCurrency(metrics.ltv)} accent="primary" />
      <MetricCard label="Ожидается" value={formatCurrency(metrics.expected)} accent="secondary" />
      <MetricCard label="Всего оплат" value={formatNumber(metrics.totalPayments)} accent="alt" />

    </div>
  );
}
