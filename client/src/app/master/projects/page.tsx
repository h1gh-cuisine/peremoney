"use client";
import { useEffect, useState } from 'react';

import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { EmployeesButton } from "@/features/master-employees";
import { CreateProjectButton } from "@/features/master-create-project";
import { LinkProjectButton } from "@/features/master-link-project";
import { CopyProjectButton } from "@/features/master-copy-project";
import { MasterProjectsTable } from "@/widgets/master-projects-table";
import { useMasterManagersStore } from "@/entities/master-managers";
import { useMasterProjectsStore } from "@/entities/master-projects";
import styles from "./page.module.scss";
import { DateRangePicker } from '@/shared/ui/DateRangePicker';
import { lastNDaysRange, type DateRange } from '@/shared/lib/date';

export default function MasterProjectsPage() {
  const [range, setRange] = useState<DateRange>(() => lastNDaysRange(30));
  const managers = useMasterManagersStore((s) => s.managers);
  const loadManagers = useMasterManagersStore((s) => s.load);
  const projects = useMasterProjectsStore((s) => s.projects);
  const updatePrice = useMasterProjectsStore((s) => s.updatePrice);
  const updateBalance = useMasterProjectsStore((s) => s.updateBalance);
  const updateRenewalStatus = useMasterProjectsStore((s) => s.updateRenewalStatus);
  const updateClientPassword = useMasterProjectsStore((s) => s.updateClientPassword);
  const updateLinkedProjects = useMasterProjectsStore((s) => s.updateLinkedProjects);
  const toggleActive = useMasterProjectsStore((s) => s.toggleActive);
  const toggleHidden = useMasterProjectsStore((s) => s.toggleHidden);
  const removeProject = useMasterProjectsStore((s) => s.removeProject);
  const load = useMasterProjectsStore((s) => s.load);
  const error = useMasterProjectsStore((s) => s.error);
  useEffect(() => { void load(range); }, [load, range]);
  useEffect(() => { void loadManagers(); }, [loadManagers]);

  return (
    <>
      <Topbar title="Проекты" />
      <PageBody>
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}>
          <div className={styles.periodFilter}>
            <span>Аналитика за период</span>
            <DateRangePicker value={range} onChange={setRange} />
          </div>
          <div className={styles.projectActions}>
            <EmployeesButton />
            <LinkProjectButton />
            <CopyProjectButton />
            <CreateProjectButton />
          </div>
        </div>

        <MasterProjectsTable
          projects={projects}
          managers={managers}
          onUpdatePrice={updatePrice}
          onUpdateBalance={updateBalance}
          onUpdateRenewalStatus={updateRenewalStatus}
          onUpdateClientPassword={updateClientPassword}
          onUpdateLinkedProjects={updateLinkedProjects}
          onToggleActive={toggleActive}
          onToggleHidden={toggleHidden}
          onDelete={removeProject}
        />
      </PageBody>
    </>
  );
}
