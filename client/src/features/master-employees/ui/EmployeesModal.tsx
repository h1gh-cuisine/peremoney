"use client";

import { useState } from "react";
import { useMasterManagersStore } from "@/entities/master-managers";
import styles from "./EmployeesModal.module.scss";

interface EmployeesModalProps {
  onClose: () => void;
}

export function EmployeesModal({ onClose }: EmployeesModalProps) {
  const managers = useMasterManagersStore((s) => s.managers);
  const addManager = useMasterManagersStore((s) => s.addManager);
  const removeManager = useMasterManagersStore((s) => s.removeManager);
  const error = useMasterManagersStore((s) => s.error);
  const loading = useMasterManagersStore((s) => s.loading);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await addManager(trimmed);
      setName("");
      onClose();
    } catch {
      // Сообщение уже сохранено в store и показано ниже.
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    try { await removeManager(id); onClose(); } catch { /* Ошибка показана в модалке. */ }
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Сотрудники</h2>

        <div className={styles.list}>
          {managers.map((m) => (
            <div key={m.id} className={styles.row}>
              <span>{m.name}</span>
              <button type="button" className={styles.removeBtn} onClick={() => void handleRemove(m.id)} disabled={saving}>
                Удалить
              </button>
            </div>
          ))}
          {managers.length === 0 && <p className={styles.empty}>Сотрудников пока нет</p>}
        </div>

        {error && <p role="alert" className={styles.error}>{error}</p>}

        <div className={styles.addRow}>
          <input
            type="text"
            className={styles.input}
            placeholder="Имя сотрудника"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
            disabled={saving || loading}
          />
          <button type="button" className={styles.addBtn} onClick={() => void handleAdd()} disabled={saving || loading || !name.trim()}>
            {saving ? 'Сохраняем…' : 'Добавить'}
          </button>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
