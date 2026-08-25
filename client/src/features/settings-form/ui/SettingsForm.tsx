"use client";

import { useEffect, useState } from "react";
import {
  useSettingsStore,
  TIMEZONE_OPTIONS,
  CRM_OPTIONS,
  MESSENGER_OPTIONS,
  fetchProviderIntegration,
} from "@/entities/settings";
import { useAccessStore, type HideableSection } from "@/entities/access";
import styles from "./SettingsForm.module.scss";
import { useSubmissionLock } from '@/shared/lib/useSubmissionLock';

const HIDEABLE_SECTIONS: { key: HideableSection; label: string }[] = [
  { key: "contacts", label: "Контакты" },
  { key: "sources", label: "Источники" },
  { key: "script", label: "Скрипт" },
  { key: "finance", label: "Финансы" },
  { key: "settings", label: "Настройки" },
];

const WEEK_DAYS = [
  { value: 1, short: "Пн", label: "Понедельник" }, { value: 2, short: "Вт", label: "Вторник" },
  { value: 3, short: "Ср", label: "Среда" }, { value: 4, short: "Чт", label: "Четверг" },
  { value: 5, short: "Пт", label: "Пятница" }, { value: 6, short: "Сб", label: "Суббота" },
  { value: 7, short: "Вс", label: "Воскресенье" },
];

type IntegrationOption = { value: string; label: string; group: "crm" | "messenger" };
const PROVIDER_INTEGRATIONS = new Set(["telegram", "bitrix", "amocrm", "email"]);

const INTEGRATION_FIELD_LABELS: Record<string, string> = {
  is_active: "Активна", active: "Активна", send_call_link: "Отправлять ссылку на звонок",
  send_deal: "Создавать сделку", domain: "Домен", title: "Название сделки", status_id: "ID статуса",
  source_id: "ID источника", assigned_by_id: "Ответственный", comment: "Комментарий", pipeline_id: "ID воронки",
  responsible_user: "Ответственный пользователь", time_delta: "Смещение времени", tags: "Теги",
  reciever: "Получатель", site: "Сайт", utm_source: "UTM source", utm_campaign: "UTM campaign",
  utm_medium: "UTM medium", utm_term: "UTM term", utm_content: "UTM content", accounts: "Аккаунтов",
};

function formatIntegrationValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Да" : "Нет";
  if (value === null || value === "") return "—";
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) return value.join(", ") || "—";
    return value.map((item, index) => `Аккаунт ${index + 1}: ${formatIntegrationValue(item)}`).join("\n");
  }
  if (typeof value === "object") return Object.entries(value as Record<string, unknown>)
    .map(([key, field]) => `${INTEGRATION_FIELD_LABELS[key] ?? key}: ${formatIntegrationValue(field)}`).join("; ");
  return String(value);
}

export function SettingsForm() {
  const accessLevel = useAccessStore((s) => s.accessLevel);
  const draft = useSettingsStore((s) => s.draft);
  const updateDraft = useSettingsStore((s) => s.updateDraft);
  const saveSettings = useSettingsStore((s) => s.save);
  const loadSettings = useSettingsStore((s) => s.load);
  const projectType = useSettingsStore((s) => s.projectType);
  const cabinetId = useSettingsStore((s) => s.cabinetId);
  const error = useSettingsStore((s) => s.error);

  const draftVisibility = useAccessStore((s) => s.draftSectionVisibility);
  const setDraftVisibility = useAccessStore((s) => s.setDraftSectionVisibility);
  const commitVisibilityDraft = useAccessStore((s) => s.commitVisibilityDraft);

  const [justSaved, setJustSaved] = useState(false);
  const [integration, setIntegration] = useState<IntegrationOption | null>(null);
  const [providerDetails, setProviderDetails] = useState<Record<string, unknown> | null>(null);
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerStatuses, setProviderStatuses] = useState<Record<string, boolean | null | undefined>>({});
  const { submitting, run } = useSubmissionLock();

  // "Обзвон" зафиксирован и недоступен для проектов типа "номера" (docs-agent.md 1.11)
  const callsLocked = projectType === "numbers";

  useEffect(() => { void loadSettings(); }, [loadSettings]);

  useEffect(() => {
    if (!cabinetId) return;
    let active = true;
    for (const name of PROVIDER_INTEGRATIONS) {
      void fetchProviderIntegration(cabinetId, name).then((result) => {
        if (active) setProviderStatuses((current) => ({ ...current, [name]: result.configured }));
      }).catch(() => {
        if (active) setProviderStatuses((current) => ({ ...current, [name]: null }));
      });
    }
    return () => { active = false; };
  }, [cabinetId]);

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
    if (!next.length) return;
    const schedulePreset = next.length === 7 ? "everyday"
      : next.join(",") === "5,6" ? "weekends" : "weekdays";
    updateDraft({ scheduleDays: next, schedulePreset });
  }

  async function openIntegration(option: IntegrationOption) {
    setIntegration(option);
    setProviderDetails(null);
    if (!cabinetId || !PROVIDER_INTEGRATIONS.has(option.value)) return;
    setProviderLoading(true);
    try {
      const result = await fetchProviderIntegration(cabinetId, option.value);
      setProviderDetails(result.details);
      setProviderStatuses((current) => ({ ...current, [option.value]: result.configured }));
    } catch { setProviderDetails(null); }
    finally { setProviderLoading(false); }
  }

  const integrationEnabled = integration ? providerStatuses[integration.value] === true : false;

  function integrationStatus(value: string) {
    if (!PROVIDER_INTEGRATIONS.has(value)) return "Нет во внешнем API";
    const status = providerStatuses[value];
    if (status === undefined) return "Проверяем…";
    if (status === null) return "Не удалось проверить";
    return status ? "Подключено" : "Не подключено";
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
        <p className={styles.cardHint}>Выберите дни работы и процессы, которые должны запускаться автоматически.</p>

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
        <h3 className={styles.cardTitle}>Интеграции</h3>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>CRM</span>
          <div className={styles.integrationGrid}>
            {CRM_OPTIONS.filter((opt) => opt.value).map((opt) => (
              <button key={opt.value} type="button" className={styles.integrationButton}
                onClick={() => void openIntegration({ ...opt, group: "crm" })}>
                <span className={styles.integrationMark}>{opt.label.slice(0, 1)}</span>
                <span><strong>{opt.label}</strong><small>{integrationStatus(opt.value)}</small></span>
                <span className={styles.configure}>Настроить</span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Мессенджеры</span>
          <div className={styles.integrationGrid}>
            {MESSENGER_OPTIONS.map((opt) => (
              <button key={opt.value} type="button" className={styles.integrationButton}
                onClick={() => void openIntegration({ ...opt, group: "messenger" })}>
                <span className={styles.integrationMark}>{opt.label.slice(0, 1)}</span>
                <span><strong>{opt.label}</strong><small>{integrationStatus(opt.value)}</small></span>
                <span className={styles.configure}>Настроить</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {integration && <div className={styles.overlay} role="presentation" onMouseDown={() => setIntegration(null)}>
        <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="integration-title"
          onMouseDown={(event) => event.stopPropagation()}>
          <div className={styles.modalHeader}>
            <div><span className={styles.modalEyebrow}>Интеграция</span><h3 id="integration-title">{integration.label}</h3></div>
            <button type="button" className={styles.closeButton} aria-label="Закрыть" onClick={() => setIntegration(null)}>×</button>
          </div>
          <div className={styles.connectionState}>
            <span className={`${styles.statusDot} ${integrationEnabled ? styles.statusDotActive : ""}`} />
            <span>{integrationStatus(integration.value)}</span>
          </div>
          {!PROVIDER_INTEGRATIONS.has(integration.value) ? (
            <p className={styles.integrationNotice}>
              Leads Factory не предоставляет эту интеграцию во внешнем API. Подключить её из Peremoney сейчас невозможно.
            </p>
          ) : <>
            {providerLoading && <p className={styles.modalHint}>Получаем настройки из Leads Factory…</p>}
            {!providerLoading && providerDetails && Object.keys(providerDetails).length > 0 ?
              <div className={styles.providerDetails}>{Object.entries(providerDetails).map(([key, value]) =>
                <div key={key}><span>{INTEGRATION_FIELD_LABELS[key] ?? key.replaceAll("_", " ")}</span>
                  <strong>{formatIntegrationValue(value)}</strong></div>)}</div>
              : !providerLoading && <p className={styles.integrationNotice}>Настройки интеграции у проекта пока не заполнены.</p>}
            <p className={styles.modalHint}>Токены, webhook и пароли намеренно не передаются в Peremoney.</p>
          </>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.secondaryButton} onClick={() => setIntegration(null)}>Закрыть</button>
            {PROVIDER_INTEGRATIONS.has(integration.value) &&
              <a className={styles.primaryButton} href="https://lk.leads-factory.ru/" target="_blank" rel="noreferrer">
                Открыть Leads Factory
              </a>}
          </div>
        </section>
      </div>}

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
