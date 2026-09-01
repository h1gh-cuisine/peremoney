"use client";

import { useEffect, useMemo } from "react";
import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { SourcesFilters, useSourcesFiltersStore } from "@/features/sources-filters";
import { AddSourceButton } from "@/features/sources-add";
import { ExportSourcesButton } from "@/features/sources-export";
import { SourceAutomationPanel } from "@/features/sources-automation";
import { SourcesTable } from "@/widgets/sources-table";
import { useSourceAutomationStore, useSourcesStore, filterSources } from "@/entities/sources";
import { useSessionStore } from '@/entities/session';
import styles from "./page.module.scss";

export default function SourcesPage() {
  const sources = useSourcesStore((s) => s.sources);
  const toggleActive = useSourcesStore((s) => s.toggleActive);
  const setCabinetId = useSourcesStore((s) => s.setCabinetId);
  const loading = useSourcesStore((s) => s.loading);
  const error = useSourcesStore((s) => s.error);
  const cabinetId = useSessionStore((s) => s.user?.cabinetId);
  const setAutomationCabinetId = useSourceAutomationStore((s) => s.setCabinetId);

  useEffect(() => { if (cabinetId) { setCabinetId(cabinetId); setAutomationCabinetId(cabinetId); } }, [cabinetId, setCabinetId, setAutomationCabinetId]);

  const appliedOnlyWithLeads = useSourcesFiltersStore((s) => s.appliedOnlyWithLeads);
  const appliedStatus = useSourcesFiltersStore((s) => s.appliedStatus);
  const appliedSearch = useSourcesFiltersStore((s) => s.appliedSearch);

  const filtered = useMemo(
    () => filterSources(sources, { onlyWithLeads: appliedOnlyWithLeads, status: appliedStatus, search: appliedSearch }),
    [sources, appliedOnlyWithLeads, appliedStatus, appliedSearch],
  );

  return (
    <>
      <Topbar title="Источники" />
      <PageBody contained>
        <SourceAutomationPanel />
        <SourcesFilters />
        {loading && <p>Загрузка источников…</p>}
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}>
          <AddSourceButton />
          <ExportSourcesButton sources={filtered} />
        </div>
        <SourcesTable sources={filtered} onToggleActive={(id) => void toggleActive(id)} />
      </PageBody>
    </>
  );
}
