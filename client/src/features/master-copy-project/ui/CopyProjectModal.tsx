"use client";

import { useMemo, useState } from "react";
import { useMasterProjectsStore } from "@/entities/master-projects";
import { projectDisplayName } from "@/shared/lib/projectDisplayName";
import { useSubmissionLock } from "@/shared/lib/useSubmissionLock";
import styles from "./CopyProjectModal.module.scss";

interface CopyProjectModalProps {
  onClose: () => void;
}

/**
 * "Копировать проект" — новый кабинет с тем же providerProjectId, что у выбранного
 * source: с момента копирования лиды приходят синхронно в оба кабинета, а история
 * до этого момента в новый кабинет не попадает (AnswerSyncService, CabinetsService.clone).
 */
export function CopyProjectModal({ onClose }: CopyProjectModalProps) {
  const projects = useMasterProjectsStore((s) => s.projects);
  const copyProject = useMasterProjectsStore((s) => s.copyProject);

  const [query, setQuery] = useState("");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const { submitting, run } = useSubmissionLock();

  const source = projects.find((p) => p.id === sourceId) ?? null;
  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];
    return projects.filter((p) => projectDisplayName(p.name).toLowerCase().includes(trimmed)).slice(0, 20);
  }, [projects, query]);

  function selectSource(id: string) {
    setSourceId(id);
    setQuery("");
    setError("");
  }

  async function handleSubmit() {
    if (!sourceId) { setError("Выберите проект, который нужно скопировать"); return; }
    const trimmedName = name.trim();
    if (!trimmedName) { setError("Укажите название нового проекта"); return; }
    if (source && trimmedName === source.name) { setError("Название должно отличаться от исходного"); return; }
    const result = await run(() => copyProject(sourceId, trimmedName));
    if (result) onClose();
    else setError(useMasterProjectsStore.getState().error ?? "Не удалось скопировать проект");
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Копировать проект</h2>
        <p className={styles.hint}>
          Новый кабинет получит тот же проект Leads Factory: с этого момента лиды будут приходить
          в оба кабинета синхронно. История до копирования в новый кабинет не переносится.
        </p>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Какой проект копировать</span>
          {source ? (
            <div className={styles.selectedChip}>
              <span>{projectDisplayName(source.name)}</span>
              <button
                type="button"
                className={styles.selectedChipClear}
                aria-label="Выбрать другой проект"
                onClick={() => { setSourceId(null); setError(""); }}
              >
                ×
              </button>
            </div>
          ) : (
            <input
              type="text"
              className={styles.input}
              value={query}
              placeholder="Начните вводить название проекта…"
              onChange={(e) => { setQuery(e.target.value); setError(""); }}
            />
          )}
          {!source && query.trim() && (
            <div className={styles.dropdown} role="listbox">
              {matches.length === 0 && <div className={styles.dropdownEmpty}>Ничего не найдено</div>}
              {matches.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  className={styles.dropdownItem}
                  onClick={() => selectSource(p.id)}
                >
                  {projectDisplayName(p.name)}
                </button>
              ))}
            </div>
          )}
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Название нового проекта</span>
          <input
            type="text"
            className={styles.input}
            value={name}
            placeholder="Например, Иванов ВДЛ"
            onChange={(e) => { setName(e.target.value); setError(""); }}
          />
        </label>

        {error && <span className={styles.error} role="alert">{error}</span>}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Закрыть
          </button>
          <button type="button" className={styles.submitBtn} disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? "Копируем…" : "Скопировать"}
          </button>
        </div>
      </div>
    </div>
  );
}
