"use client";

import { useMemo, useState } from "react";
import { usePayerStore } from "@/entities/payer";
import { useFinanceStore } from "@/entities/finance";
import { createClosingAct } from '@/entities/finance/api/finance-api';
import { useSessionStore } from '@/entities/session';
import { formatCurrency, formatShortDate } from "@/shared/lib/format";
import { toISODate } from "@/shared/lib/date";
import styles from "./ClosingActModal.module.scss";
import { useSubmissionLock } from '@/shared/lib/useSubmissionLock';
import { downloadClosingActPdf } from '@/shared/lib/accountingPdf';

interface ClosingActModalProps {
  onClose: () => void;
}

export function ClosingActModal({ onClose }: ClosingActModalProps) {
  const payer = usePayerStore((s) => s.saved);
  const payments = useFinanceStore((s) => s.payments);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const cabinetId = useSessionStore((s) => s.user?.cabinetId);
  const { submitting, run } = useSubmissionLock();

  const selected = useMemo(
    () => payments.filter((p) => selectedIds.includes(p.id)),
    [payments, selectedIds],
  );

  // Дата начала = дата самого раннего выбранного платежа; окончание = сегодня (docs-agent.md 2.7.2)
  const range = useMemo(() => {
    if (selected.length === 0) return null;
    const earliest = selected.reduce(
      (min, p) => (p.createdAt < min ? p.createdAt : min),
      selected[0].createdAt,
    );
    return { from: earliest, to: toISODate(new Date()) };
  }, [selected]);

  const total = selected.reduce((sum, p) => sum + p.amount, 0);

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleDownload() {
    if (!range || !cabinetId) return;
    await run(() => createClosingAct(cabinetId, selectedIds));
    await downloadClosingActPdf(selected, payer, range.from, range.to);
    onClose();
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Закрывающие документы</h2>

        <div className={styles.list}>
          {payments.map((p) => (
            <label key={p.id} className={styles.row}>
              <input
                type="checkbox"
                checked={selectedIds.includes(p.id)}
                onChange={() => toggle(p.id)}
              />
              <span className={styles.rowDate}>{formatShortDate(p.createdAt)}</span>
              <span className={styles.rowAmount}>{formatCurrency(p.amount)}</span>
              <span className={p.status === "paid" ? styles.paid : styles.pending}>
                {p.status === "paid" ? "Оплачено" : "Ожидает"}
              </span>
            </label>
          ))}
          {payments.length === 0 && <p className={styles.empty}>Платежей пока нет</p>}
        </div>

        {range && (
          <div className={styles.summary}>
            Период: {formatShortDate(range.from)} – {formatShortDate(range.to)} · Итого:{" "}
            {formatCurrency(total)}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Закрыть
          </button>
          <button type="button" className={styles.submitBtn} disabled={!range || submitting} onClick={() => void handleDownload()}>
            {submitting ? 'Формируем…' : 'Скачать PDF'}
          </button>
        </div>
      </div>

    </div>
  );
}
