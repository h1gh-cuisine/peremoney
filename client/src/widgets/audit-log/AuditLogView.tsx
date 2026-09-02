"use client";

import { Fragment, useEffect, useState } from "react";
import { useAuditLogStore, type AuditOutcome } from "@/entities/audit-log";
import { formatDateTimeRu } from "@/shared/lib/format";
import styles from "./AuditLogView.module.scss";

const OUTCOME_LABEL: Record<AuditOutcome, string> = {
  success: "Успех",
  denied: "Отказ доступа",
  error: "Ошибка",
};

function OutcomeBadge({ outcome }: { outcome: AuditOutcome }) {
  return <span className={`${styles.badge} ${styles[outcome]}`}>{OUTCOME_LABEL[outcome]}</span>;
}

function AuditLogGate() {
  const unlock = useAuditLogStore((s) => s.unlock);
  const loading = useAuditLogStore((s) => s.loading);
  const error = useAuditLogStore((s) => s.error);
  const [secret, setSecret] = useState("");

  return (
    <div className={styles.gate}>
      <div className={styles.gateCard}>
        <h2>Журнал действий</h2>
        <p className={styles.gateHint}>
          Доступ к журналу защищён дополнительным кодом (отдельным от пароля MASTER), заданным на сервере.
        </p>
        <label className={styles.field}>
          <span>Код доступа</span>
          <input
            type="password"
            className={styles.input}
            value={secret}
            autoFocus
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && secret.trim()) void unlock(secret.trim()); }}
          />
        </label>
        {error && <p role="alert" className={styles.gateError}>{error}</p>}
        <button
          type="button"
          className={styles.unlockBtn}
          disabled={loading || !secret.trim()}
          onClick={() => void unlock(secret.trim())}
        >
          {loading ? "Проверяем…" : "Открыть"}
        </button>
      </div>
    </div>
  );
}

function PayloadPreview({ label, value }: { label: string; value: unknown }) {
  if (value == null) return null;
  return (
    <div className={styles.detailBlock}>
      <span className={styles.detailLabel}>{label}</span>
      <pre className={styles.detailPre}>{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

export function AuditLogView() {
  const unlocked = useAuditLogStore((s) => s.unlocked);
  const loading = useAuditLogStore((s) => s.loading);
  const error = useAuditLogStore((s) => s.error);
  const entries = useAuditLogStore((s) => s.entries);
  const total = useAuditLogStore((s) => s.total);
  const page = useAuditLogStore((s) => s.page);
  const pageSize = useAuditLogStore((s) => s.pageSize);
  const hasMore = useAuditLogStore((s) => s.hasMore);
  const filters = useAuditLogStore((s) => s.filters);
  const setFilters = useAuditLogStore((s) => s.setFilters);
  const setPage = useAuditLogStore((s) => s.setPage);
  const load = useAuditLogStore((s) => s.load);
  const lock = useAuditLogStore((s) => s.lock);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { if (unlocked) void load(); }, [unlocked, filters, load]);

  if (!unlocked) return <AuditLogGate />;

  return (
    <div className={styles.card}>
      <div className={styles.toolbar}>
        <span className={styles.count}>Всего записей: {total}</span>
        <select
          className={styles.select}
          value={filters.outcome ?? ""}
          onChange={(e) => setFilters({ outcome: (e.target.value || undefined) as AuditOutcome | undefined })}
        >
          <option value="">Все результаты</option>
          <option value="success">Успех</option>
          <option value="denied">Отказ доступа</option>
          <option value="error">Ошибка</option>
        </select>
        <input
          type="search"
          className={styles.search}
          placeholder="Поиск по действию (например, /cabinets)"
          defaultValue={filters.action ?? ""}
          onChange={(e) => setFilters({ action: e.target.value || undefined })}
        />
        <button type="button" className={styles.lockBtn} onClick={lock}>Закрыть журнал</button>
      </div>

      {error && <p role="alert" className={styles.error}>{error}</p>}

      <div className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.headerTable}`}>
          <thead>
            <tr>
              <th>Когда</th>
              <th>Кто</th>
              <th>Проект</th>
              <th>Действие</th>
              <th>Статус</th>
              <th>Результат</th>
              <th>IP</th>
            </tr>
          </thead>
        </table>
        <div className={styles.tableBody}>
          <table className={styles.table}>
            <tbody>
            {entries.map((entry) => (
              <Fragment key={entry.id}>
                <tr
                  className={styles.row}
                  onClick={() => setExpandedId((id) => (id === entry.id ? null : entry.id))}
                >
                  <td className={styles.mono}>{formatDateTimeRu(entry.createdAt)}</td>
                  <td>{entry.actorLogin ?? "—"}</td>
                  <td>{entry.cabinetName ?? "—"}</td>
                  <td className={styles.mono} title={entry.action}>{entry.action}</td>
                  <td className={styles.mono}>{entry.statusCode}</td>
                  <td><OutcomeBadge outcome={entry.outcome} /></td>
                  <td className={styles.mono}>{entry.ip ?? "—"}</td>
                </tr>
                {expandedId === entry.id && (
                  <tr className={styles.detailsRow}>
                    <td colSpan={7}>
                      {entry.reason && <p className={styles.reason}>{entry.reason}</p>}
                      <PayloadPreview label="Запрос" value={entry.payload} />
                      <PayloadPreview label="Ответ" value={entry.result} />
                      {entry.userAgent && <p className={styles.userAgent}>{entry.userAgent}</p>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            </tbody>
          </table>
          {!loading && entries.length === 0 && <div className={styles.empty}>Записей не найдено</div>}
        </div>
      </div>

      <div className={styles.pagination}>
        <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Назад</button>
        <span>Страница {page}{Math.ceil(total / pageSize) ? ` из ${Math.ceil(total / pageSize)}` : ""}</span>
        <button type="button" disabled={!hasMore} onClick={() => setPage(page + 1)}>Вперёд</button>
      </div>
    </div>
  );
}
