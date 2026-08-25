"use client";

import { useState } from "react";
import { PROJECT_TYPE_OPTIONS, type ProjectType } from "@/shared/lib/projectType";
import { useMasterManagersStore } from "@/entities/master-managers";
import { useMasterProjectsStore } from "@/entities/master-projects";
import styles from "./LinkProjectModal.module.scss";
import { useSubmissionLock } from '@/shared/lib/useSubmissionLock';

interface LinkProjectModalProps {
  onClose: () => void;
}

/** Та же форма, что "Создать проект", но без API-запроса — копия кабинета (docs-agent.md 2.8.4) */
export function LinkProjectModal({ onClose }: LinkProjectModalProps) {
  const projects = useMasterProjectsStore((s) => s.projects);
  const managers = useMasterManagersStore((s) => s.managers);
  const cloneProject = useMasterProjectsStore((s) => s.cloneProject);

  const [sourceId, setSourceId] = useState(projects[0]?.id ?? "");
  const source = projects.find((p) => p.id === sourceId);

  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("quals");
  const [managerId, setManagerId] = useState(managers[0]?.id ?? "");
  const [price, setPrice] = useState(1500);
  const [error, setError] = useState("");
  const { submitting, run } = useSubmissionLock();

  async function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Название обязательно");
      return;
    }
    if (source && trimmed === source.name) {
      setError("Название должно отличаться от исходного проекта");
      return;
    }
    const result = await run(() => cloneProject(sourceId, { name: trimmed, type, price, managerId }));
    if (result) onClose();
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Связать с другим</h2>
        <p className={styles.hint}>
          Копия существующего кабинета — без запроса на создание проекта у провайдера.
        </p>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Исходный проект</span>
          <select className={styles.select} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Новое название</span>
          <input
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
          />
          {error && <span className={styles.error}>{error}</span>}
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Тип</span>
          <select className={styles.select} value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
            {PROJECT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Менеджер</span>
          <select className={styles.select} value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Цена</span>
          <input
            type="number"
            min={1}
            className={styles.input}
            value={price}
            onChange={(e) => setPrice(Math.max(1, Number(e.target.value) || 0))}
          />
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Отмена
          </button>
          <button type="button" className={styles.submitBtn} disabled={!source || submitting} onClick={() => void handleSubmit()}>
            {submitting ? 'Создаём…' : 'Связать'}
          </button>
        </div>
      </div>
    </div>
  );
}
