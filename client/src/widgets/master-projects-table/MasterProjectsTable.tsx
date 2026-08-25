"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatNumber } from "@/shared/lib/format";
import { getProjectTypeLabel } from "@/shared/lib/projectType";
import type { Manager } from "@/entities/master-managers";
import type { MasterProject, RenewalStatus } from "@/entities/master-projects";
import { ProjectRowMenu } from "./ProjectRowMenu";
import styles from "./MasterProjectsTable.module.scss";

interface MasterProjectsTableProps {
  projects: MasterProject[];
  managers: Manager[];
  onUpdatePrice: (id: string, price: number) => void;
  onUpdateRenewalStatus: (id: string, status: RenewalStatus) => void;
  onUpdateClientPassword: (id: string, password: string) => void;
  onToggleActive: (id: string) => void;
  onToggleHidden: (id: string) => void;
}

interface PasswordResetCellProps {
  projectId: string;
  projectName: string;
  onConfirm: (id: string, password: string) => void;
}

function PasswordResetCell({ projectId, projectName, onConfirm }: PasswordResetCellProps) {
  const [password, setPassword] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");

  useEffect(() => {
    if (password.length < 8) return;
    const timer = window.setTimeout(() => setPendingPassword(password), 2000);
    return () => window.clearTimeout(timer);
  }, [password]);

  const closeConfirmation = () => setPendingPassword("");
  const confirmChange = () => {
    onConfirm(projectId, pendingPassword);
    setPassword("");
    setPendingPassword("");
  };

  return (
    <>
      <input
        type="password"
        className={styles.passwordInput}
        value={password}
        minLength={8}
        autoComplete="new-password"
        aria-label={`Новый пароль клиента проекта ${projectName}`}
        placeholder="Новый пароль"
        onChange={(event) => {
          setPassword(event.target.value);
          setPendingPassword("");
        }}
      />
      {password.length > 0 && password.length < 8 && (
        <span className={styles.passwordError} role="alert">
          Пароль должен содержать минимум 8 символов
        </span>
      )}
      {pendingPassword && (
        <div className={styles.confirmOverlay} role="presentation" onMouseDown={closeConfirmation}>
          <section
            className={styles.confirmModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`password-confirm-${projectId}`}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id={`password-confirm-${projectId}`}>Изменить пароль клиента?</h2>
            <p>
              Для проекта <strong>{projectName}</strong> будет установлен новый пароль.
              Все активные клиентские сессии завершатся.
            </p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.cancelButton} onClick={closeConfirmation}>Отмена</button>
              <button type="button" className={styles.confirmButton} onClick={confirmChange}>Да, изменить</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function MasterProjectsTable({
  projects,
  managers,
  onUpdatePrice,
  onUpdateRenewalStatus,
  onUpdateClientPassword,
  onToggleActive,
  onToggleHidden,
}: MasterProjectsTableProps) {
  const [showHidden, setShowHidden] = useState(false);

  const visible = useMemo(
    () => (showHidden ? projects : projects.filter((p) => !p.hidden)),
    [projects, showHidden],
  );

  const managerName = (id: string) => managers.find((m) => m.id === id)?.name ?? "—";

  return (
    <div className={styles.card}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.toggleHiddenBtn} onClick={() => setShowHidden((v) => !v)}>
          {showHidden ? "Скрыть спрятанные" : "Показать скрытые"}
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Название</th>
              <th>Менеджер</th>
              <th>Тип</th>
              <th>Контактов</th>
              <th>Лидов</th>
              <th>Продаж</th>
              <th>Сфера</th>
              <th>Цена</th>
              <th>Статус</th>
              <th>LTV</th>
              <th>Платежей</th>
              <th>Средний чек</th>
              <th>Логин</th>
              <th>Пароль</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id} className={p.hidden ? styles.hiddenRow : undefined}>
                <td className={styles.nameCell}>
                  <span className={styles.projectName} title={p.name}>{p.name}</span>
                </td>
                <td>{managerName(p.managerId)}</td>
                <td>{getProjectTypeLabel(p.type)}</td>
                <td>{formatNumber(p.contactsExported)}</td>
                <td>{formatNumber(p.leadsExported)}</td>
                <td>{formatNumber(p.sales)}</td>
                <td>{p.sphere}</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    className={styles.priceInput}
                    value={p.price}
                    onChange={(e) => onUpdatePrice(p.id, Math.max(0, Number(e.target.value) || 0))}
                  />
                </td>
                <td>
                  <select
                    className={styles.statusSelect}
                    value={p.renewalStatus}
                    onChange={(e) => onUpdateRenewalStatus(p.id, e.target.value as RenewalStatus)}
                  >
                    <option value="renewed">Продлился</option>
                    <option value="not_renewed">Не продлился</option>
                  </select>
                </td>
                <td>{formatCurrency(p.ltv)}</td>
                <td>{formatNumber(p.paymentsCount)}</td>
                <td>{formatCurrency(p.avgCheck)}</td>
                <td className={styles.mono}>{p.clientLogin}</td>
                <td>
                  <PasswordResetCell
                    projectId={p.id}
                    projectName={p.name}
                    onConfirm={onUpdateClientPassword}
                  />
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <span className={`${styles.statusBadge} ${p.active ? styles.active : styles.inactive}`}>
                      {p.active ? "Активен" : "Отключён"}
                    </span>
                    <ProjectRowMenu
                      active={p.active}
                      onToggleActive={() => onToggleActive(p.id)}
                      onHide={() => onToggleHidden(p.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && <div className={styles.empty}>Проектов не найдено</div>}
      </div>

      <div className={styles.footer}>Показано: {visible.length}</div>
    </div>
  );
}
