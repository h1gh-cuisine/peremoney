"use client";

import { useEffect, useMemo } from "react";
import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { MasterPaymentsTable } from "@/widgets/master-payments-table";
import { useMasterManagersStore } from "@/entities/master-managers";
import { useMasterPaymentsStore, sortMasterPayments, type MasterPaymentStatus } from "@/entities/master-payments";

export default function MasterPaymentsPage() {
  const managers = useMasterManagersStore((s) => s.managers);
  const loadManagers = useMasterManagersStore((s) => s.load);
  const payments = useMasterPaymentsStore((s) => s.payments);
  const markPaid = useMasterPaymentsStore((s) => s.markPaid);
  const markPending = useMasterPaymentsStore((s) => s.markPending);
  const remove = useMasterPaymentsStore((s) => s.remove);
  const load = useMasterPaymentsStore((s) => s.load);
  const error = useMasterPaymentsStore((s) => s.error);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadManagers(); }, [loadManagers]);

  const sorted = useMemo(() => sortMasterPayments(payments), [payments]);

  async function handleStatusChange(id: string, status: MasterPaymentStatus) {
    if (status === "paid") await markPaid(id);
    else await markPending(id);
  }

  return (
    <>
      <Topbar title="Платежи" />
      <PageBody>
        {error && <p role="alert">{error}</p>}
        <MasterPaymentsTable
          payments={sorted}
          managers={managers}
          onStatusChange={handleStatusChange}
          onDelete={(id) => void remove(id)}
        />
      </PageBody>
    </>
  );
}
