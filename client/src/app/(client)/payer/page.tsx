"use client";

import { useEffect } from 'react';
import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { PayerForm } from "@/features/payer-form";
import { usePayerStore } from '@/entities/payer';
import { useSessionStore } from '@/entities/session';

export default function PayerPage() {
  const cabinetId = useSessionStore((s) => s.user?.cabinetId);
  const load = usePayerStore((s) => s.load);
  const loading = usePayerStore((s) => s.loading);
  const error = usePayerStore((s) => s.error);
  useEffect(() => { if (cabinetId) void load(cabinetId); }, [cabinetId, load]);
  return (
    <>
      <Topbar title="Плательщик" />
      <PageBody>
        {loading && <p>Загрузка реквизитов…</p>}
        {error && <p role="alert">{error}</p>}
        <PayerForm />
      </PageBody>
    </>
  );
}
