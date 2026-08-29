"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type LoginResponse, sessionFromLogin, useSessionStore } from "@/entities/session";
import { apiClient } from "@/shared/api/client";
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
  onUpdateBalance: (id: string, moneyBalance: number) => Promise<void>;
  onUpdateRenewalStatus: (id: string, status: RenewalStatus) => void;
  onUpdateClientPassword: (id: string, password: string) => Promise<void> | void;
  onToggleActive: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

interface PasswordResetCellProps {
  projectId: string;
  projectName: string;
  onConfirm: (id: string, password: string) => Promise<void> | void;
}

type SortKey = "name" | "manager" | "type" | "contacts" | "leads" | "sales" | "sphere" | "price" | "moneyBalance"
  | "expenses" | "leadCost" | "targetLeadCost" | "renewalStatus" | "ltv" | "paymentsCount" | "avgCheck" | "clientLogin" | "active";
type SortDirection = "asc" | "desc";

const collator = new Intl.Collator("ru", { numeric: true, sensitivity: "base" });

export function projectDisplayName(name: string) {
  return name.split("/").map((part) => part.trim()).filter(Boolean).at(-1) ?? name;
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
  const confirmChange = async () => {
    try {
      await onConfirm(projectId, pendingPassword);
      setPassword("");
      setPendingPassword("");
    } catch {
      // Оставляем подтверждение открытым, пока сервер не сохранит пароль.
    }
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
              <button type="button" className={styles.cancelButton} onClick={closeConfirmation}>Закрыть</button>
              <button type="button" className={styles.confirmButton} onClick={() => void confirmChange()}>Да, изменить</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function BalanceCell({ project, onSave }: { project: MasterProject; onSave: (id: string, value: number) => Promise<void> }) {
  const [value, setValue] = useState(String(project.moneyBalance));
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(String(project.moneyBalance)), [project.moneyBalance]);
  const parsed = Number(value);
  const valid = Number.isFinite(parsed) && parsed >= 0 && parsed <= 99_999_999_999.99;
  const changed = valid && parsed !== project.moneyBalance;

  async function save() {
    if (!changed || saving) return;
    if (!window.confirm(`Установить баланс проекта «${projectDisplayName(project.name)}» равным ${formatCurrency(parsed)}?`)) return;
    setSaving(true);
    try { await onSave(project.id, parsed); }
    catch { setValue(String(project.moneyBalance)); }
    finally { setSaving(false); }
  }

  return <div className={styles.balanceControl}>
    <input type="number" min={0} step="0.01" className={styles.balanceInput} value={value}
      aria-label={`Баланс проекта ${projectDisplayName(project.name)}`}
      onChange={(event) => setValue(event.target.value)} />
    <button type="button" className={styles.balanceSave} disabled={!changed || saving} onClick={() => void save()}>
      {saving ? "…" : "Сохранить"}
    </button>
  </div>;
}

export function MasterProjectsTable({
  projects,
  managers,
  onUpdatePrice,
  onUpdateBalance,
  onUpdateRenewalStatus,
  onUpdateClientPassword,
  onToggleActive,
  onToggleHidden,
  onDelete,
}: MasterProjectsTableProps) {
  const [showHidden, setShowHidden] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: "name", direction: "asc" });
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openError, setOpenError] = useState("");
  const router = useRouter();
  const setSession = useSessionStore((state) => state.setSession);

  const managerNames = useMemo(
    () => new Map(managers.map((manager) => [manager.id, manager.name])),
    [managers],
  );

  const managerName = (id: string) => managerNames.get(id) ?? "—";

  const visible = useMemo(
    () => (showHidden ? projects : projects.filter((p) => !p.hidden)),
    [projects, showHidden],
  );

  const sortedProjects = useMemo(() => {
    const value = (project: MasterProject): string | number | boolean | null => {
      switch (sort.key) {
        case "manager": return managerNames.get(project.managerId) ?? "";
        case "type": return getProjectTypeLabel(project.type);
        case "contacts": return project.contactsExported;
        case "leads": return project.leadsExported;
        case "renewalStatus": return project.renewalStatus === "renewed" ? "Продлился" : "Не продлился";
        default: return project[sort.key];
      }
    };
    const direction = sort.direction === "asc" ? 1 : -1;
    return visible.map((project, index) => ({ project, index })).sort((a, b) => {
      const left = value(a.project);
      const right = value(b.project);
      if (left === null && right === null) return a.index - b.index;
      if (left === null) return 1;
      if (right === null) return -1;
      const comparison = typeof left === "number" && typeof right === "number"
        ? left - right
        : collator.compare(String(left), String(right));
      return comparison === 0 ? a.index - b.index : comparison * direction;
    }).map(({ project }) => project);
  }, [managerNames, sort, visible]);

  const changeSort = (key: SortKey) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
  }));

  const sortHeader = (label: string, key: SortKey) => {
    const active = sort.key === key;
    return (
      <th aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
        <button type="button" className={`${styles.sortButton} ${active ? styles.sortActive : ""}`} onClick={() => changeSort(key)}>
          <span>{label}</span>
          <span className={styles.sortIcon} aria-hidden="true">{active ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}</span>
        </button>
      </th>
    );
  };

  const openProject = async (project: MasterProject) => {
    setOpeningId(project.id);
    setOpenError("");
    try {
      const response = await apiClient().post<LoginResponse>(`/auth/project-session/${project.id}`);
      setSession(sessionFromLogin(response));
      router.push("/dashboard");
    } catch (error) {
      setOpenError(error instanceof Error ? error.message : "Не удалось перейти в проект");
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.toolbar}>
        <span className={styles.tableCount}>Показано: {visible.length}</span>
        {openError && <span className={styles.openError} role="alert">{openError}</span>}
        <button type="button" className={styles.toggleHiddenBtn} onClick={() => setShowHidden((v) => !v)}>
          {showHidden ? "Скрыть спрятанные" : "Показать скрытые"}
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {sortHeader("Название", "name")}
              {sortHeader("Менеджер", "manager")}
              {sortHeader("Тип", "type")}
              {sortHeader("Контактов", "contacts")}
              {sortHeader("Лидов", "leads")}
              {sortHeader("Продаж", "sales")}
              {sortHeader("Траты", "expenses")}
              {sortHeader("Себес лида", "leadCost")}
              {sortHeader("Себес целевого лида", "targetLeadCost")}
              {sortHeader("Сфера", "sphere")}
              {sortHeader("Цена", "price")}
              {sortHeader("Баланс", "moneyBalance")}
              {sortHeader("Статус", "renewalStatus")}
              {sortHeader("LTV", "ltv")}
              {sortHeader("Платежей", "paymentsCount")}
              {sortHeader("Средний чек", "avgCheck")}
              {sortHeader("Логин клиента", "clientLogin")}
              <th>Пароль</th>
              {sortHeader("Доступ", "active")}
              <th>Проект</th>
            </tr>
          </thead>
          <tbody>
            {sortedProjects.map((p) => (
              <tr key={p.id} className={p.hidden ? styles.hiddenRow : undefined}>
                <td className={styles.nameCell}>
                  <span className={styles.projectName} title={p.name}>{projectDisplayName(p.name)}</span>
                </td>
                <td>{managerName(p.managerId)}</td>
                <td>{getProjectTypeLabel(p.type)}</td>
                <td>{formatNumber(p.contactsExported)}</td>
                <td>{formatNumber(p.leadsExported)}</td>
                <td>{formatNumber(p.sales)}</td>
                <td>{p.expenses === null ? "—" : formatCurrency(p.expenses)}</td>
                <td>{p.leadCost === null ? "—" : formatCurrency(p.leadCost)}</td>
                <td>{p.targetLeadCost === null ? "—" : formatCurrency(p.targetLeadCost)}</td>
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
                <td><BalanceCell project={p} onSave={onUpdateBalance} /></td>
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
                <td className={styles.mono}>{p.clientLogin || "—"}</td>
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
                      onDelete={async () => {
                        const name = projectDisplayName(p.name);
                        if (!window.confirm(`Удалить проект «${name}» из Peremoney? Все локальные данные проекта будут удалены без возможности восстановления.`)) return;
                        await onDelete(p.id);
                      }}
                    />
                  </div>
                </td>
                <td>
                  <button
                    type="button"
                    className={styles.openProjectButton}
                    disabled={openingId !== null}
                    onClick={() => void openProject(p)}
                  >
                    {openingId === p.id ? "Переходим…" : "Перейти →"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visible.length === 0 && <div className={styles.empty}>Проектов не найдено</div>}
      </div>

    </div>
  );
}
