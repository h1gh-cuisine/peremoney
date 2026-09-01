"use client";

import { useEffect, useState } from "react";
import {
  useSettingsStore,
  TIMEZONE_OPTIONS,
} from "@/entities/settings";
import { useAccessStore, type HideableSection } from "@/entities/access";
import styles from "./SettingsForm.module.scss";
import { useSubmissionLock } from '@/shared/lib/useSubmissionLock';

const HIDEABLE_SECTIONS: { key: HideableSection; label: string }[] = [
  { key: "contacts", label: "Контакты" },
  { key: "sources", label: "Источники" },
  { key: "script", label: "Скрипт" },
  { key: "finance", label: "Финансы" },
];

const WEEK_DAYS = [
  { value: 1, short: "Пн", label: "Понедельник" }, { value: 2, short: "Вт", label: "Вторник" },
  { value: 3, short: "Ср", label: "Среда" }, { value: 4, short: "Чт", label: "Четверг" },
  { value: 5, short: "Пт", label: "Пятница" }, { value: 6, short: "Сб", label: "Суббота" },
  { value: 7, short: "Вс", label: "Воскресенье" },
];

export function SettingsForm() {
  const accessLevel = useAccessStore((s) => s.accessLevel);
  const draft = useSettingsStore((s) => s.draft);
  const updateDraft = useSettingsStore((s) => s.updateDraft);
  const saveSettings = useSettingsStore((s) => s.save);
  const loadSettings = useSettingsStore((s) => s.load);
  const projectType = useSettingsStore((s) => s.projectType);
  const error = useSettingsStore((s) => s.error);

  const draftVisibility = useAccessStore((s) => s.draftSectionVisibility);
  const setDraftVisibility = useAccessStore((s) => s.setDraftSectionVisibility);
  const commitVisibilityDraft = useAccessStore((s) => s.commitVisibilityDraft);

  const [justSaved, setJustSaved] = useState(false);
  const { submitting, run } = useSubmissionLock();

  // "Обзвон" зафиксирован и недоступен для проектов типа "номера" (docs-agent.md 1.11)
  const callsLocked = projectType === "numbers";

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  if (accessLevel === "limited") {
    return (
      <div className={styles.root}>
        <div className={styles.header}>
          <h2 className={styles.title}>Настройки проекта</h2>
        </div>
        {error && <p role="alert">{error}</p>}
        <section className={styles.card}>
          <h3 className={styles.cardTitle}>Только чтение</h3>
          <p className={styles.cardHint}>
            Настройки доступны только для просмотра. Изменять параметры проекта может только пользователь с полным доступом.
          </p>
        </section>
      </div>
    );
  }

  function toggleDay(value: number) {
    const next = draft.scheduleDays.includes(value)
      ? draft.scheduleDays.filter((day) => day !== value)
      : [...draft.scheduleDays, value].sort((a, b) => a - b);
    const schedulePreset = next.length === 7 ? "everyday"
      : next.join(",") === "5,6" ? "weekends" : "weekdays";
    updateDraft({ scheduleDays: next, schedulePreset });
  }

  async function handleSave() {
    if (await run(() => saveSettings(draftVisibility))) {
      commitVisibilityDraft();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2 className={styles.title}>Настройки проекта</h2>
        <div className={styles.headerActions}>
          {justSaved && <span className={styles.savedHint}>Сохранено</span>}
          <button type="button" className={styles.saveBtn} disabled={submitting} onClick={() => void handleSave()}>
            {submitting ? 'Сохраняем…' : 'Сохранить настройки'}
          </button>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Общие</h3>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Статус проекта</span>
          <div className={styles.toggleGroup}>
            <button
              type="button"
              className={`${styles.toggleOption} ${draft.status === "active" ? styles.toggleOptionActive : ""}`}
              onClick={() => updateDraft({ status: "active" })}
            >
              Активен
            </button>
            <button
              type="button"
              className={`${styles.toggleOption} ${draft.status === "paused" ? styles.toggleOptionActive : ""}`}
              onClick={() => updateDraft({ status: "paused" })}
            >
              Пауза
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Часовой пояс</span>
          <select
            className={styles.select}
            value={draft.timezoneOffset}
            onChange={(e) => updateDraft({ timezoneOffset: Number(e.target.value) })}
          >
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Расписание</h3>
        <p className={styles.cardHint}>Выберите дни работы и процессы, которые должны запускаться автоматически. Если снять все дни, проект будет ежедневно оставаться на паузе.</p>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Дни работы</span>
          <div className={styles.weekGrid} role="group" aria-label="Дни работы">
            {WEEK_DAYS.map((day) => {
              const selected = draft.scheduleDays.includes(day.value);
              return <button key={day.value} type="button" aria-pressed={selected} title={day.label}
                className={`${styles.dayButton} ${selected ? styles.dayButtonActive : ""}`}
                onClick={() => toggleDay(day.value)}>
                <span>{day.short}</span><small>{selected ? "Работаем" : "Выходной"}</small>
              </button>;
            })}
          </div>
        </div>

        <label className={styles.switchRow}>
          <div className={styles.switchText}>
            <span className={styles.switchLabel}>Выгрузки</span>
            <span className={styles.switchHint}>Автоматическая выгрузка контактов из источников</span>
          </div>
          <input
            type="checkbox"
            className={styles.switchInput}
            checked={draft.uploadsEnabled}
            onChange={(e) => updateDraft({ uploadsEnabled: e.target.checked })}
          />
        </label>

        <label className={`${styles.switchRow} ${callsLocked ? styles.switchRowDisabled : ""}`}>
          <div className={styles.switchText}>
            <span className={styles.switchLabel}>Обзвон</span>
            <span className={styles.switchHint}>
              {callsLocked
                ? 'Проект типа "номера" — статус зафиксирован, переключатель недоступен'
                : "Автоматический обзвон квалифицированных лидов"}
            </span>
          </div>
          <input
            type="checkbox"
            className={styles.switchInput}
            checked={draft.callsEnabled}
            disabled={callsLocked}
            onChange={(e) => updateDraft({ callsEnabled: e.target.checked })}
          />
        </label>
      </section>

      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Управление доступом</h3>
        <p className={styles.cardHint}>
          Включено — раздел виден клиенту с ограниченным доступом. Лиды и Дашборд скрыть нельзя.
        </p>
        <div className={styles.checkboxGroup}>
          {HIDEABLE_SECTIONS.map((s) => (
            <label key={s.key} className={styles.checkboxItem}>
              <input
                type="checkbox"
                checked={draftVisibility[s.key]}
                onChange={(e) => setDraftVisibility(s.key, e.target.checked)}
              />
              {s.label}
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
