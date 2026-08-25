"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { MasterDashboardFilter, useMasterDashboardFilterStore } from "@/features/master-dashboard-filter";
import { ManagerStatsTable } from "@/widgets/master-dashboard-manager-stats";
import { ClientStatsList } from "@/widgets/master-dashboard-client-stats";
import type { ManagerStat, ClientStat } from "@/entities/master-payments";
import { fetchMasterDashboard } from '@/entities/master-payments/api/master-finance-api';
import styles from "./page.module.scss";

export default function MasterDashboardPage() {
  const period = useMasterDashboardFilterStore((s) => s.period);
  const [managerStats, setManagerStats] = useState<ManagerStat[]>([]);
  const [clientStats, setClientStats] = useState<ClientStat[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; fetchMasterDashboard(period).then((value) => { if (active) { setManagerStats(value.managers); setClientStats(value.clients); setError(''); } })
    .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить аналитику'); });
    return () => { active = false; }; }, [period]);

  return (
    <>
      <Topbar title="Дашборд" />
      <PageBody>
        <div className={styles.filterRow}>
          <MasterDashboardFilter />
        </div>
        {error && <p role="alert">{error}</p>}
        <ManagerStatsTable stats={managerStats} />
        <ClientStatsList stats={clientStats} />
      </PageBody>
    </>
  );
}
