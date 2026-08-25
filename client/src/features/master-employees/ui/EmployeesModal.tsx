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
  const [name, setName] = useState("");

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    addManager(trimmed);
    setName("");
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Сотрудники</h2>

        <div className={styles.list}>
          {managers.map((m) => (
            <div key={m.id} className={styles.row}>
              <span>{m.name}</span>
              <button type="button" className={styles.removeBtn} onClick={() => removeManager(m.id)}>
                Удалить
              </button>
            </div>
          ))}
          {managers.length === 0 && <p className={styles.empty}>Сотрудников пока нет</p>}
        </div>

        <div className={styles.addRow}>
          <input
            type="text"
            className={styles.input}
            placeholder="Имя сотрудника"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button type="button" className={styles.addBtn} onClick={handleAdd}>
            Добавить
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
