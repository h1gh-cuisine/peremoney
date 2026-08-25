"use client";

import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { DashboardDateFilter, useDashboardFilterStore } from "@/features/dashboard-date-filter";
import { DashboardMetricsGrid } from "@/widgets/dashboard-metrics-grid";
import { DashboardCharts } from "@/widgets/dashboard-charts";
import { useDashboardData } from "@/entities/dashboard-metrics";

export default function DashboardPage() {
  const range = useDashboardFilterStore((s) => s.range);
  const { metrics, contactsLeadsSeries } = useDashboardData(range);

  return (
    <>
      <Topbar title="Дашборд" />
      <PageBody>
        <DashboardDateFilter />
        <DashboardMetricsGrid metrics={metrics} />
        <DashboardCharts contactsLeads={contactsLeadsSeries} />
      </PageBody>
    </>
  );
}
