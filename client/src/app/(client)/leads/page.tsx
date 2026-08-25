"use client";

import { useEffect, useMemo } from "react";
import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { LeadsFilters, useLeadsFiltersStore } from "@/features/leads-filters";
import { ExportLeadsButton } from "@/features/leads-export";
import { LeadsTable } from "@/widgets/leads-table";
import { useLeadsStore, filterLeads } from "@/entities/leads";
import { useSessionStore } from '@/entities/session';
import styles from "./page.module.scss";

export default function LeadsPage() {
  const leads = useLeadsStore((s) => s.leads);
  const loading = useLeadsStore((s) => s.loading);
  const error = useLeadsStore((s) => s.error);
  const load = useLeadsStore((s) => s.load);
  const loadRecordings = useLeadsStore((s) => s.loadRecordings);
  const updateFeedback = useLeadsStore((s) => s.updateFeedback);
  const updateStatus = useLeadsStore((s) => s.updateStatus);
  const updateAmount = useLeadsStore((s) => s.updateAmount);
  const cabinetId = useSessionStore((s) => s.user?.cabinetId);

  useEffect(() => { if (cabinetId) void load(cabinetId); }, [cabinetId, load]);

  const range = useLeadsFiltersStore((s) => s.range);
  const status = useLeadsFiltersStore((s) => s.status);
  const search = useLeadsFiltersStore((s) => s.search);

  const filtered = useMemo(
    () => filterLeads(leads, { range, status, search }),
    [leads, range, status, search],
  );

  return (
    <>
      <Topbar title="Лиды" />
      <PageBody>
        <LeadsFilters />
        {loading && <p>Загрузка лидов…</p>}
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}>
          <ExportLeadsButton leads={filtered} />
        </div>
        <LeadsTable
          leads={filtered}
          onFeedbackChange={(id, value) => { if (cabinetId) void updateFeedback(cabinetId, id, value); }}
          onStatusChange={(id, value) => { if (cabinetId) void updateStatus(cabinetId, id, value); }}
          onAmountChange={(id, value) => { if (cabinetId) void updateAmount(cabinetId, id, value); }}
          onRecordingsLoad={(id) => { if (cabinetId) void loadRecordings(cabinetId, id); }}
        />
      </PageBody>
    </>
  );
}
