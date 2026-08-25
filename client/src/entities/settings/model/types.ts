// docs-agent.md 1.11

export type ProjectStatus = "active" | "paused";

/** Тип проекта переехал в shared/lib/projectType — общий с master-projects. */
export type { ProjectType } from "@/shared/lib/projectType";

/** Три шаблона расписания (docs-agent.md 2.3.1) */
export type SchedulePreset = "weekdays" | "weekends" | "everyday";

export interface ProjectSettings {
  status: ProjectStatus;
  timezoneOffset: number; // UTC+N
  uploadsEnabled: boolean;
  callsEnabled: boolean;
  schedulePreset: SchedulePreset;
  scheduleDays: number[];
  crmIntegration: string; // "" = без интеграции
  messengerIntegrations: string[];
}
