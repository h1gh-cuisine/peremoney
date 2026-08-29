"use client";

import { useState } from "react";
import { useSourcesStore, type SourceType } from "@/entities/sources";
import { parseBulkInput } from "../lib/parseBulkInput";
import styles from "./AddSourceModal.module.scss";
import { useSubmissionLock } from '@/shared/lib/useSubmissionLock';

interface AddSourceModalProps {
  onClose: () => void;
}

export function AddSourceModal({ onClose }: AddSourceModalProps) {
  const [text, setText] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("phone");
  const addSources = useSourcesStore((s) => s.addSources);
  const { submitting, run } = useSubmissionLock();

  async function handleSubmit() {
    const lines = parseBulkInput(text);
    if (lines.length === 0) return;

    if (await run(() => addSources(lines, sourceType))) onClose();
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Добавить источник</h2>

        <textarea
          className={styles.textarea}
          placeholder="Вставьте номера или сайты, каждый с новой строки"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
        />

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Тип источника</span>
          <select
            className={styles.select}
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as SourceType)}
          >
            <option value="phone">Номер</option>
            <option value="domain">Сайт</option>
          </select>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Закрыть
          </button>
          <button type="button" className={styles.submitBtn} disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? 'Добавляем…' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  );
}
