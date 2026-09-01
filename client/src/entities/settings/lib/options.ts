import type { SchedulePreset } from "../model/types";

export const TIMEZONE_OPTIONS = [
  { value: 2, label: "Калининград (UTC+2)" },
  { value: 3, label: "Москва (UTC+3)" },
  { value: 4, label: "Самара (UTC+4)" },
  { value: 5, label: "Екатеринбург (UTC+5)" },
  { value: 6, label: "Омск (UTC+6)" },
  { value: 7, label: "Красноярск (UTC+7)" },
  { value: 8, label: "Иркутск (UTC+8)" },
  { value: 9, label: "Якутск (UTC+9)" },
  { value: 10, label: "Владивосток (UTC+10)" },
  { value: 11, label: "Магадан (UTC+11)" },
  { value: 12, label: "Камчатка (UTC+12)" },
];

/** Три шаблона расписания — фиксированные комбинации статусов (docs-agent.md 2.3.1) */
export const SCHEDULE_PRESET_OPTIONS: { value: SchedulePreset; label: string }[] = [
  { value: "weekdays", label: "Только будни" },
  { value: "weekends", label: "Только выходные" },
  { value: "everyday", label: "Каждый день" },
];

/** CRM-интеграции с известной схемой в провайдере (docs-agent.md 3.1) */
export const CRM_OPTIONS = [{ value: "", label: "Без интеграции" }];

/** Обе интеграции подключаются напрямую через Peremoney. */
export const MESSENGER_OPTIONS = [
  { value: "telegram", label: "Telegram" },
  { value: "max", label: "MAX" },
];
