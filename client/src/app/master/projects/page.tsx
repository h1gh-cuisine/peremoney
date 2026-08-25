"use client";
import { useEffect } from 'react';

import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { EmployeesButton } from "@/features/master-employees";
import { CreateProjectButton } from "@/features/master-create-project";
import { LinkProjectButton } from "@/features/master-link-project";
import { MasterProjectsTable } from "@/widgets/master-projects-table";
import { useMasterManagersStore } from "@/entities/master-managers";
import { useMasterProjectsStore } from "@/entities/master-projects";
import styles from "./page.module.scss";

export default function MasterProjectsPage() {
  const managers = useMasterManagersStore((s) => s.managers);
  const hydrateManagers = useMasterManagersStore((s) => s.hydrateFromProjectNames);
  const projects = useMasterProjectsStore((s) => s.projects);
  const updatePrice = useMasterProjectsStore((s) => s.updatePrice);
  const updateRenewalStatus = useMasterProjectsStore((s) => s.updateRenewalStatus);
  const updateClientPassword = useMasterProjectsStore((s) => s.updateClientPassword);
  const toggleActive = useMasterProjectsStore((s) => s.toggleActive);
  const toggleHidden = useMasterProjectsStore((s) => s.toggleHidden);
  const load = useMasterProjectsStore((s) => s.load);
  const error = useMasterProjectsStore((s) => s.error);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    hydrateManagers(projects.map((project) => project.managerId));
  }, [hydrateManagers, projects]);

  return (
    <>
      <Topbar title="Проекты" />
      <PageBody>
        {error && <p role="alert">{error}</p>}
        <div className={styles.actions}>
          <EmployeesButton />
          <LinkProjectButton />
          <CreateProjectButton />
        </div>

        <MasterProjectsTable
          projects={projects}
          managers={managers}
          onUpdatePrice={updatePrice}
          onUpdateRenewalStatus={updateRenewalStatus}
          onUpdateClientPassword={updateClientPassword}
          onToggleActive={toggleActive}
          onToggleHidden={toggleHidden}
        />
      </PageBody>
    </>
  );
}
