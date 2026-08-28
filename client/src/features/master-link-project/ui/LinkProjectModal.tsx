"use client";

import { useState } from "react";
import { useMasterManagersStore } from "@/entities/master-managers";
import { useMasterProjectsStore } from "@/entities/master-projects";
import styles from "./LinkProjectModal.module.scss";
import { useSubmissionLock } from '@/shared/lib/useSubmissionLock';

interface LinkProjectModalProps {
  onClose: () => void;
}

/** Подключает к Peremoney уже существующий проект Leads Factory по его внутреннему ID. */
export function LinkProjectModal({ onClose }: LinkProjectModalProps) {
  const managers = useMasterManagersStore((s) => s.managers);
  const linkProject = useMasterProjectsStore((s) => s.linkProject);

  const [providerProjectId, setProviderProjectId] = useState("");
  const [managerId, setManagerId] = useState(managers[0]?.id ?? "");
  const [price, setPrice] = useState(1500);
  const [error, setError] = useState("");
  const { submitting, run } = useSubmissionLock();

  async function handleSubmit() {
    const projectId = Number(providerProjectId);
    if (!Number.isInteger(projectId) || projectId < 1) {
      setError("Укажите числовой ID проекта Leads Factory");
      return;
    }
    const result = await run(() => linkProject({ providerProjectId: projectId, price, managerId }));
    if (result) onClose();
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Подключить проект Leads Factory</h2>
        <p className={styles.hint}>
          Укажите внутренний ID уже существующего проекта. Название, тип и сфера будут получены из Leads Factory.
        </p>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>ID проекта Leads Factory</span>
          <input
            type="number"
            min={1}
            className={styles.input}
            value={providerProjectId}
            onChange={(e) => {
              setProviderProjectId(e.target.value);
              setError("");
            }}
            placeholder="Например, 22931"
          />
          {error && <span className={styles.error}>{error}</span>}
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
          <button type="button" className={styles.submitBtn} disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? 'Подключаем…' : 'Подключить'}
          </button>
        </div>
      </div>
    </div>
  );
}
