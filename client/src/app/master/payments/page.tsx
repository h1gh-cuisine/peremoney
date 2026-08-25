"use client";

import { useEffect, useMemo } from "react";
import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { MasterPaymentsTable } from "@/widgets/master-payments-table";
import { useMasterManagersStore } from "@/entities/master-managers";
import { useMasterPaymentsStore, sortMasterPayments } from "@/entities/master-payments";

export default function MasterPaymentsPage() {
  const managers = useMasterManagersStore((s) => s.managers);
  const hydrateManagers = useMasterManagersStore((s) => s.hydrateFromProjectNames);
  const payments = useMasterPaymentsStore((s) => s.payments);
  const markPaid = useMasterPaymentsStore((s) => s.markPaid);
  const markPending = useMasterPaymentsStore((s) => s.markPending);
  const remove = useMasterPaymentsStore((s) => s.remove);
  const load = useMasterPaymentsStore((s) => s.load);
  const error = useMasterPaymentsStore((s) => s.error);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    hydrateManagers(payments.map((payment) => payment.managerId));
  }, [hydrateManagers, payments]);

  const sorted = useMemo(() => sortMasterPayments(payments), [payments]);

  function handleTogglePaid(id: string) {
    const payment = payments.find((p) => p.id === id);
    if (!payment) return;
    if (payment.status === "paid") void markPending(id);
    else void markPaid(id);
  }

  return (
    <>
      <Topbar title="Платежи" />
      <PageBody>
        {error && <p role="alert">{error}</p>}
        <MasterPaymentsTable
          payments={sorted}
          managers={managers}
          onTogglePaid={handleTogglePaid}
          onDelete={(id) => void remove(id)}
        />
      </PageBody>
    </>
  );
}
