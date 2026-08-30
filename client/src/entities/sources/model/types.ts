// docs-agent.md 1.7, 2.6

export type SourceType = "phone" | "domain";
export type SourceStatusFilter = "all" | "active" | "inactive";

export interface Source {
  id: string;
  name: string; // очищенное имя (2.6.1)
  operator: string; // расшифрованный по префиксу (2.6.1), может быть пустым
  contacts: number; // new_answer
  leads: number; // success
  conversion: number; // %
  cost: number; // sebes, ₽
  notRelevantShare: number; // %, расчётное поле (2.6.2)
  sales: number; // расчётное поле (2.6.2)
  active: boolean; // norm_work
  sourceType: SourceType;
}

/**
 * Настройки ежедневной автоматизации тегов в 18:00 (docs-agent.md 2.6.4).
 * Само правило выполняется по расписанию на бэкенде — здесь только конфиг.
 */
export interface SourceAutomationSettings {
  autoCleanupEnabled: boolean; // автоматическая чистка
  minContactsPerLead: number; // "мин. контактов на 1 лид"
  autoManageEnabled: boolean; // автоматическое управление
  minConversion: number; // "мин. конверсия", %
  defaultLimit: number; // "мин лимит" — уходит в Leads Factory как default_limit
  maxLimit: number; // "макс лимит" — уходит в Leads Factory как max_limit
}
