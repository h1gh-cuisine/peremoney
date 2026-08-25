"use client";

import { useEffect, useState } from "react";
import {
  operatorTagOptions,
  useSourcesStore,
  type SourceType,
} from "@/entities/sources";
import { parseBulkInput } from "../lib/parseBulkInput";
import styles from "./AddSourceModal.module.scss";
import { useSubmissionLock } from '@/shared/lib/useSubmissionLock';
import { fetchTagTypes } from '@/entities/sources/api/sources-api';
import { useSessionStore } from '@/entities/session';

interface AddSourceModalProps {
  onClose: () => void;
}

export function AddSourceModal({ onClose }: AddSourceModalProps) {
  const [text, setText] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("phone");
  const [selectedTagType, setSelectedTagType] = useState("");
  const addSources = useSourcesStore((s) => s.addSources);
  const { submitting, run } = useSubmissionLock();
  const cabinetId = useSessionStore((s) => s.user?.cabinetId);
  const [tagTypes, setTagTypes] = useState<string[]>([]);
  const [tagTypesError, setTagTypesError] = useState('');
  const operatorOptions = operatorTagOptions(tagTypes);
  useEffect(() => { if (!cabinetId) return; let active = true; fetchTagTypes(cabinetId).then((values) => { if (active) setTagTypes(values); })
    .catch((reason:unknown) => { if(active)setTagTypesError(reason instanceof Error ? reason.message : 'Не удалось загрузить типы тегов'); }); return()=>{active=false}; }, [cabinetId]);

  async function handleSubmit() {
    const lines = parseBulkInput(text);
    if (lines.length === 0) return;

    if (await run(() => addSources(lines, sourceType, selectedTagType || undefined))) onClose();
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

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Оператор и тег для выдачи</span>
          <div className={styles.tagList}>
            {operatorOptions.map((option) => (
              <label key={option.value} className={styles.tagCheckbox}>
                <input
                  type="radio"
                  name="tag-type"
                  checked={selectedTagType === option.value}
                  onChange={() => setSelectedTagType(option.value)}
                />
                {option.label}
              </label>
            ))}
            {tagTypesError && <span role="alert">{tagTypesError}</span>}
            {!tagTypesError && operatorOptions.length === 0 && <span>Доступных операторов нет</span>}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
          <button type="button" className={styles.submitBtn} disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? 'Добавляем…' : 'Добавить'}
          </button>
        </div>
      </div>
    </div>
  );
}
