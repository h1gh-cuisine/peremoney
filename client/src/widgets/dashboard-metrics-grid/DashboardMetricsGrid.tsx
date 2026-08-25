import { MetricCard } from "@/shared/ui/MetricCard";
import { formatCurrency, formatNumber, formatPercent } from "@/shared/lib/format";
import type { DashboardMetrics } from "@/entities/dashboard-metrics";
import styles from "./DashboardMetricsGrid.module.scss";

interface DashboardMetricsGridProps {
  metrics: DashboardMetrics;
}

export function DashboardMetricsGrid({ metrics }: DashboardMetricsGridProps) {
  return (
    <div className={styles.grid}>
      <MetricCard label="Получено контактов" value={formatNumber(metrics.contactsReceived)} accent="secondary" />
      <MetricCard label="Квалифицировано лидов" value={formatNumber(metrics.leadsQualified)} accent="primary" />
      <MetricCard label="Продано" value={formatNumber(metrics.sold)} accent="alt" />
      <MetricCard label="CR в продажу" value={formatPercent(metrics.crToSale)} accent="secondary" />
      <MetricCard label="Выручка" value={formatCurrency(metrics.revenue)} accent="alt" />
      <MetricCard label="CPL" value={formatCurrency(metrics.cpl)} accent="primary" />
      <MetricCard label="Средний чек" value={formatCurrency(metrics.avgCheck)} accent="secondary" />
      <MetricCard label="Стоимость продажи" value={formatCurrency(metrics.saleCost)} accent="primary" />
    </div>
  );
}
