"use client";

import { useState } from "react";
import type { MasterProject } from "@/entities/master-projects";
import { useSubmissionLock } from "@/shared/lib/useSubmissionLock";
import { projectDisplayName } from "./MasterProjectsTable";
import styles from "./LinkedProjectsModal.module.scss";

interface LinkedProjectsModalProps {
  project: MasterProject;
  onSave: (id: string, linkedProviderProjectIds: number[]) => Promise<void>;
  onClose: () => void;
}

/**
 * "Связанные проекты" — внешние project_id, чьи лиды/контакты
 * дублируются в этот кабинет наравне с его собственным (docs-agent.md 2.2/2.8.4).
 */
export function LinkedProjectsModal({ project, onSave, onClose }: LinkedProjectsModalProps) {
  const [ids, setIds] = useState<number[]>(project.linkedProviderProjectIds);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const { submitting, run } = useSubmissionLock();

  function addId() {
    const value = Number(draft);
    if (!Number.isInteger(value) || value < 1) {
      setError("Укажите числовой ID проекта");
      return;
    }
    if (value === project.providerProjectId) {
      setError("Это и есть собственный проект кабинета — указывать его не нужно");
      return;
    }
    if (ids.includes(value)) {
      setError("Этот проект уже добавлен");
      return;
    }
    setIds((current) => [...current, value]);
    setDraft("");
    setError("");
  }

  function removeId(value: number) {
    setIds((current) => current.filter((id) => id !== value));
  }

  async function handleSave() {
    await run(() => onSave(project.id, ids));
    onClose();
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Связанные проекты</h2>
        <p className={styles.hint}>
          Проект «{projectDisplayName(project.name)}» дополнительно получит лиды и контакты из
          перечисленных проектов — они будут приходить сюда же, наравне с собственными.
        </p>

        <div className={styles.chipList}>
          {ids.length === 0 && <span className={styles.empty}>Связанных проектов пока нет</span>}
          {ids.map((id) => (
            <span key={id} className={styles.chip}>
              {id}
              <button type="button" className={styles.chipRemove} aria-label={`Убрать проект ${id}`} onClick={() => removeId(id)}>
                ×
              </button>
            </span>
          ))}
        </div>

        <div className={styles.addRow}>
          <input
            type="number"
            min={1}
            className={styles.input}
            value={draft}
            placeholder="ID проекта"
            onChange={(e) => { setDraft(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addId(); } }}
          />
          <button type="button" className={styles.addBtn} onClick={addId}>Добавить</button>
        </div>
        {error && <span className={styles.error} role="alert">{error}</span>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Закрыть</button>
          <button type="button" className={styles.submitBtn} disabled={submitting} onClick={() => void handleSave()}>
            {submitting ? "Сохраняем…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
