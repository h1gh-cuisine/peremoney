"use client";

import { useRef, useState } from "react";
import { usePayerStore } from "@/entities/payer";
import { useFinanceStore, type Payment } from "@/entities/finance";
import { downloadInvoice } from '@/entities/finance/api/finance-api';
import { formatCurrency } from "@/shared/lib/format";
import { useSessionStore } from '@/entities/session';
import styles from "./InvoiceModal.module.scss";
import { useSubmissionLock } from '@/shared/lib/useSubmissionLock';

interface InvoiceModalProps {
  onClose: () => void;
}

export function InvoiceModal({ onClose }: InvoiceModalProps) {
  const payer = usePayerStore((s) => s.saved);
  const createPendingInvoice = useFinanceStore((s) => s.createPendingInvoice);
  const error = useFinanceStore((s) => s.error);
  const cabinetId = useSessionStore((s) => s.user?.cabinetId);
  const [quantity, setQuantity] = useState(1);
  const [generated, setGenerated] = useState<Payment | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const { submitting, run } = useSubmissionLock();
  const idempotencyKey = useRef(crypto.randomUUID());
  const payerInn = payer.inn.trim();
  const payerReady = Boolean(payer.organizationName.trim())
    && (/^\d{12}$/.test(payerInn) || (/^\d{10}$/.test(payerInn) && /^\d{9}$/.test(payer.kpp.trim())));

  const unitPrice = generated ? generated.amount / generated.quantity : null;
  const total = generated?.amount ?? null;
  async function handleDownload() {
    // 2.7.1 п.4: автоматически создаёт запись "ожидает оплаты" в мастер-кабинете
    const payment = await run(() => createPendingInvoice(quantity, idempotencyKey.current));
    if (!payment) {
      const message = useFinanceStore.getState().error ?? '';
      setUncertain(message.includes('ручной сверки') || message.includes('не определён'));
      return;
    }
    if (payment && cabinetId) {
      setGenerated(payment);
      const blob = await downloadInvoice(cabinetId, payment.id);
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a');
        link.href = url; link.download = `Счет-${payment.invoiceNo ?? payment.id}.pdf`;
        document.body.append(link); link.click(); link.remove();
      } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
      onClose();
    }
  }

  function allowNewAttempt() {
    const confirmed = window.confirm('Убедитесь в кабинете Точки, что предыдущий счёт не создан. Новая попытка может создать дубль. Продолжить?');
    if (!confirmed) return;
    idempotencyKey.current = crypto.randomUUID();
    setUncertain(false);
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
          {!payerReady && (
            <p className={styles.error} role="alert">
              Для счёта заполните название и ИНН плательщика, а для организации — также КПП.
            </p>
          )}
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

        {error && <p className={styles.error} role="alert">{error}</p>}
        {uncertain && <div className={styles.uncertainBox}>
          <p>Перед новой попыткой проверьте в Точке, что счёт с указанной суммой не появился.</p>
          <button type="button" onClick={allowNewAttempt}>Счёта в Точке нет — разрешить новую попытку</button>
        </div>}
        <div className={styles.totalRow}>
          <strong>Итого</strong>
          <strong>{total === null ? "—" : formatCurrency(total)}</strong>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
          <button type="button" className={styles.submitBtn} disabled={submitting || uncertain || !payerReady} onClick={() => void handleDownload()}>
            {submitting ? 'Формируем…' : 'Скачать PDF'}
          </button>
        </div>
      </div>

    </div>
  );
}
