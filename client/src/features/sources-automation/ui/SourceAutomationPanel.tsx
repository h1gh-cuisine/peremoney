"use client";

import { useEffect, useState } from "react";
import { useSourceAutomationStore } from "@/entities/sources";
import styles from "./SourceAutomationPanel.module.scss";

/** "Настройки автоматизации" — конфиг для ежедневной задачи 18:00 (docs-agent.md 2.6.4). */
export function SourceAutomationPanel() {
  const autoCleanupEnabled = useSourceAutomationStore((s) => s.autoCleanupEnabled);
  const setAutoCleanupEnabled = useSourceAutomationStore((s) => s.setAutoCleanupEnabled);
  const minContactsPerLead = useSourceAutomationStore((s) => s.minContactsPerLead);
  const setMinContactsPerLead = useSourceAutomationStore((s) => s.setMinContactsPerLead);
  const autoManageEnabled = useSourceAutomationStore((s) => s.autoManageEnabled);
  const setAutoManageEnabled = useSourceAutomationStore((s) => s.setAutoManageEnabled);
  const minConversion = useSourceAutomationStore((s) => s.minConversion);
  const setMinConversion = useSourceAutomationStore((s) => s.setMinConversion);
  const defaultLimit = useSourceAutomationStore((s) => s.defaultLimit);
  const setDefaultLimit = useSourceAutomationStore((s) => s.setDefaultLimit);
  const maxLimit = useSourceAutomationStore((s) => s.maxLimit);
  const setMaxLimit = useSourceAutomationStore((s) => s.setMaxLimit);
  const dirty = useSourceAutomationStore((s) => s.dirty);
  const saving = useSourceAutomationStore((s) => s.saving);
  const error = useSourceAutomationStore((s) => s.error);
  const save = useSourceAutomationStore((s) => s.save);
  const discard = useSourceAutomationStore((s) => s.discard);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    setConfirming(false);
    const timer = window.setTimeout(() => setConfirming(true), 2000);
    return () => window.clearTimeout(timer);
  }, [dirty, autoCleanupEnabled, minContactsPerLead, autoManageEnabled, minConversion, defaultLimit, maxLimit]);

  const cancelChanges = () => {
    discard();
    setConfirming(false);
  };

  const confirmChanges = async () => {
    if (await save()) setConfirming(false);
  };

  return (
    <div className={styles.card}>
      <h2 className={styles.title}>Настройки автоматизации</h2>

      <div className={styles.row}>
        <div className={styles.rowText}>
          <span className={styles.rowLabel}>Автоматическая чистка</span>
          <span className={styles.rowHint}>Удалять неактивные теги (conversion ниже порога)</span>
        </div>
        <div className={styles.rowControls}>
          <label className={styles.numberField}>
            <span>Мин. контактов на 1 лид:</span>
            <input
              type="number"
              min={0}
              className={styles.numberInput}
              value={minContactsPerLead}
              onChange={(e) => setMinContactsPerLead(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
          <input
            type="checkbox"
            className={styles.switch}
            checked={autoCleanupEnabled}
            onChange={(e) => setAutoCleanupEnabled(e.target.checked)}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.rowText}>
          <span className={styles.rowLabel}>Автоматическое управление</span>
          <span className={styles.rowHint}>Повышать/понижать лимиты по конверсии</span>
        </div>
        <div className={styles.rowControls}>
          <label className={styles.numberField}>
            <span>Мин. конверсия:</span>
            <input
              type="number"
              min={0}
              max={100}
              className={styles.numberInput}
              value={minConversion}
              onChange={(e) =>
                setMinConversion(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
              }
            />
            <span>%</span>
          </label>
          <input
            type="checkbox"
            className={styles.switch}
            checked={autoManageEnabled}
            onChange={(e) => setAutoManageEnabled(e.target.checked)}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.rowText}>
          <span className={styles.rowLabel}>Лимиты тегов у провайдера</span>
          <span className={styles.rowHint}>Коридор лимитов, который отправляется в Leads Factory</span>
        </div>
        <div className={styles.rowControls}>
          <label className={styles.numberField}>
            <span>Мин. лимит:</span>
            <input
              type="number"
              min={1}
              className={styles.numberInput}
              value={defaultLimit}
              onChange={(e) => setDefaultLimit(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
          <label className={styles.numberField}>
            <span>Макс. лимит:</span>
            <input
              type="number"
              min={1}
              className={styles.numberInput}
              value={maxLimit}
              onChange={(e) => setMaxLimit(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
        </div>
      </div>

      {dirty && !confirming && <p className={styles.pendingHint}>Ожидаем завершения изменений…</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {confirming && (
        <div className={styles.confirmOverlay} role="presentation" onMouseDown={cancelChanges}>
          <section className={styles.confirmModal} role="dialog" aria-modal="true" aria-labelledby="automation-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
            <span className={styles.eyebrow}>Настройки автоматизации</span>
            <h2 id="automation-confirm-title">Сохранить изменения?</h2>
            <p>Новые правила будут отправлены на сервер и применятся к ежедневной автоматизации источников.</p>
            <dl className={styles.summary}>
              <div><dt>Автоматическая чистка</dt><dd>{autoCleanupEnabled ? "Включена" : "Выключена"}</dd></div>
              <div><dt>Мин. контактов на 1 лид</dt><dd>{minContactsPerLead}</dd></div>
              <div><dt>Автоматическое управление</dt><dd>{autoManageEnabled ? "Включено" : "Выключено"}</dd></div>
              <div><dt>Мин. конверсия</dt><dd>{minConversion}%</dd></div>
              <div><dt>Мин. лимит (default_limit)</dt><dd>{defaultLimit}</dd></div>
              <div><dt>Макс. лимит (max_limit)</dt><dd>{maxLimit}</dd></div>
            </dl>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.cancelButton} disabled={saving} onClick={cancelChanges}>Закрыть</button>
              <button type="button" className={styles.saveButton} disabled={saving} onClick={() => void confirmChanges()}>{saving ? "Сохраняем…" : "Сохранить"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
