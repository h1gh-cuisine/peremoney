"use client";

import { useState } from "react";
import { usePayerStore, type PayerDetails } from "@/entities/payer";
import styles from "./PayerForm.module.scss";
import { useSubmissionLock } from '@/shared/lib/useSubmissionLock';
import { isValidInn } from '@/shared/lib/inn';

function innErrorMessage(value: string): string | null {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return 'ИНН должен содержать только цифры';
  if (value.length !== 10 && value.length !== 12) return 'ИНН должен содержать 10 или 12 цифр';
  return isValidInn(value) ? null : 'Неверная контрольная сумма ИНН — проверьте цифры';
}

const FIELDS: { key: keyof PayerDetails; label: string; placeholder: string }[] = [
  { key: "organizationName", label: "Название организации", placeholder: "ООО «Название»" },
  { key: "inn", label: "ИНН", placeholder: "7701234567" },
  { key: "kpp", label: "КПП", placeholder: "770101001 (для организации)" },
  { key: "ogrn", label: "ОГРН", placeholder: "1027700132195" },
  { key: "legalAddress", label: "Юридический адрес", placeholder: "г. Москва, ул. Примерная, д. 1" },
  { key: "bankName", label: "Банк", placeholder: "ПАО Сбербанк" },
  { key: "bik", label: "БИК", placeholder: "044525225" },
  { key: "checkingAccount", label: "Расчётный счёт", placeholder: "40702810400000000001" },
  { key: "correspondentAccount", label: "Корреспондентский счёт", placeholder: "30101810400000000225" },
  { key: "phone", label: "Телефон", placeholder: "+7 (999) 123-45-67" },
  { key: "email", label: "Электронная почта", placeholder: "info@example.com" },
  { key: "contractNumber", label: "Номер договора", placeholder: "451" },
  { key: "contractDate", label: "Дата договора", placeholder: "2026-08-21" },
  { key: "signerName", label: "Подписант заказчика", placeholder: "Иванов И. И." },
];

export function PayerForm() {
  const draft = usePayerStore((s) => s.draft);
  const updateDraft = usePayerStore((s) => s.updateDraft);
  const save = usePayerStore((s) => s.save);
  const [justSaved, setJustSaved] = useState(false);
  const [innTouched, setInnTouched] = useState(false);
  const { submitting, run } = useSubmissionLock();
  const innError = innTouched ? innErrorMessage(draft.inn ?? '') : null;

  async function handleSave() {
    if (await run(save)) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Данные юридического лица</h2>
        <div className={styles.headerActions}>
          {justSaved && <span className={styles.savedHint}>Сохранено</span>}
          <button type="button" className={styles.saveBtn} disabled={submitting} onClick={() => void handleSave()}>
            {submitting ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {FIELDS.map((field) => (
          <label key={field.key} className={styles.field}>
            <span className={styles.fieldLabel}>{field.label}</span>
            <input
              type="text"
              className={`${styles.input} ${field.key === 'inn' && innError ? styles.inputInvalid : ''}`}
              placeholder={field.placeholder}
              value={draft[field.key] ?? ''}
              aria-invalid={field.key === 'inn' && !!innError}
              onChange={(e) => updateDraft({ [field.key]: e.target.value })}
              onBlur={field.key === 'inn' ? () => setInnTouched(true) : undefined}
            />
            {field.key === 'inn' && innError && <span className={styles.fieldError}>{innError}</span>}
          </label>
        ))}
      </div>
    </div>
  );
}
