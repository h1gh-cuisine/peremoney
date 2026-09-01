"use client";
import { useEffect } from 'react';

import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { FinanceSummary } from "@/widgets/finance-summary";
import { PaymentsTable } from "@/widgets/payments-table";
import { GenerateInvoiceButton } from "@/features/invoice-generator";
import { ClosingActButton } from "@/features/closing-act-generator";
import { useFinanceStore, useFinanceMetrics } from "@/entities/finance";
import { useSessionStore } from '@/entities/session';
import { usePayerStore } from '@/entities/payer';
import styles from "./page.module.scss";

export default function FinancePage() {
  const payments = useFinanceStore((s) => s.payments);
  const metrics = useFinanceMetrics(payments);
  const load = useFinanceStore((s) => s.load);
  const loading = useFinanceStore((s) => s.loading);
  const error = useFinanceStore((s) => s.error);
  const cabinetId = useSessionStore((s) => s.user?.cabinetId);
  const loadPayer = usePayerStore((s) => s.load);
  useEffect(() => {
    if (!cabinetId) return;
    void load(cabinetId);
    void loadPayer(cabinetId);
    const refresh = window.setInterval(() => void load(cabinetId), 60_000);
    return () => window.clearInterval(refresh);
  }, [cabinetId, load, loadPayer]);

  return (
    <>
      <Topbar title="Финансы" />
      <PageBody contained>
        {loading && <p>Загрузка финансов…</p>}
        {error && <p role="alert">{error}</p>}
        <FinanceSummary metrics={metrics} />

        <div className={styles.actions}>
          <GenerateInvoiceButton />
          <ClosingActButton />
        </div>

        <PaymentsTable payments={payments} />
      </PageBody>
    </>
  );
}
