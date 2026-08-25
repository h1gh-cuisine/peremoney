"use client";

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
    </div>
  );
}
