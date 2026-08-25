"use client";

import { useRef, useState } from "react";
import { usePayerStore } from "@/entities/payer";
import { useFinanceStore, type Payment } from "@/entities/finance";
import { formatCurrency } from "@/shared/lib/format";
import { useSessionStore } from '@/entities/session';
import { downloadInvoicePdf } from '@/shared/lib/accountingPdf';
import styles from "./InvoiceModal.module.scss";
import { useSubmissionLock } from '@/shared/lib/useSubmissionLock';

interface InvoiceModalProps {
  onClose: () => void;
}

export function InvoiceModal({ onClose }: InvoiceModalProps) {
  const payer = usePayerStore((s) => s.saved);
  const createPendingInvoice = useFinanceStore((s) => s.createPendingInvoice);
  const cabinetId = useSessionStore((s) => s.user?.cabinetId);
  const [quantity, setQuantity] = useState(1);
  const [generated, setGenerated] = useState<Payment | null>(null);
  const { submitting, run } = useSubmissionLock();
  const idempotencyKey = useRef(crypto.randomUUID());

  const unitPrice = generated ? generated.amount / generated.quantity : null;
  const total = generated?.amount ?? null;
  async function handleDownload() {
    // 2.7.1 п.4: автоматически создаёт запись "ожидает оплаты" в мастер-кабинете
    const payment = await run(() => createPendingInvoice(quantity, idempotencyKey.current));
    if (payment && cabinetId) {
      setGenerated(payment);
      await downloadInvoicePdf(payment, payer);
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Сформировать счёт</h2>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Плательщик</span>
          <p className={styles.payerPreview}>
            {payer.organizationName || "Реквизиты не заполнены — заполните раздел «Плательщик»"}
          </p>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Количество штук</span>
          <input
            type="number"
            min={1}
            className={styles.input}
            value={quantity}
            onChange={(e) => { setQuantity(Math.max(1, Number(e.target.value) || 1)); idempotencyKey.current = crypto.randomUUID(); }}
          />
        </label>

        <div className={styles.totalRow}>
          <span>Цена за штуку</span>
          <span>{unitPrice === null ? "Рассчитает сервер" : formatCurrency(unitPrice)}</span>
        </div>
        <div className={styles.totalRow}>
          <strong>Итого</strong>
          <strong>{total === null ? "—" : formatCurrency(total)}</strong>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
          <button type="button" className={styles.submitBtn} disabled={submitting} onClick={() => void handleDownload()}>
            {submitting ? 'Формируем…' : 'Скачать PDF'}
          </button>
        </div>
      </div>

    </div>
  );
}
