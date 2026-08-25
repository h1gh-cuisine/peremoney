"use client";

import { useAccessStore } from "@/entities/access";
import type { AccessLevel } from "@/entities/access";
import styles from "./RoleSwitcher.module.scss";
import { useSessionStore } from "@/entities/session";

export function RoleSwitcher() {
  const role = useSessionStore((s) => s.user?.role);
  const accessLevel = useAccessStore((s) => s.accessLevel);
  const setAccessLevel = useAccessStore((s) => s.setAccessLevel);

  // Переключатель имитирует ограничения только внутри клиентского кабинета.
  // В мастер-разделе он ни на навигацию, ни на серверные права не влияет.
  if (role !== "FULL") return null;

  return (
    <label className={styles.root}>
      <span className={styles.label}>Просмотр как</span>
      <select
        className={styles.select}
        value={accessLevel}
        onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
      >
        <option value="full">Сотрудник (полный)</option>
        <option value="limited">Клиент (ограниченный)</option>
      </select>
    </label>
  );
}
