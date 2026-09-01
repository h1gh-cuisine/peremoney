"use client";

import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { AuditLogView } from "@/widgets/audit-log";

export default function MasterAuditLogPage() {
  return (
    <>
      <Topbar title="Журнал действий" />
      <PageBody>
        <AuditLogView />
      </PageBody>
    </>
  );
}
