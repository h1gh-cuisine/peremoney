/**
 * Тип проекта: VDL/квалы, ПКТ/пакет, НОМЕРА/контакты (docs-agent.md 1.12.2, 2.7.4).
 * Общий для entities/settings (клиентский ЛК) и entities/master-projects (мастер-кабинет).
 */
export type ProjectType = "quals" | "package" | "numbers";

export const PROJECT_TYPE_OPTIONS: { value: ProjectType; label: string }[] = [
  { value: "quals", label: "VDL (квалы)" },
  { value: "package", label: "ПКТ (пакет)" },
  { value: "numbers", label: "НОМЕРА (контакты)" },
];

export function getProjectTypeLabel(type: ProjectType): string {
  return PROJECT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}
