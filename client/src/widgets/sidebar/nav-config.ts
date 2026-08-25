import type { NavSectionId } from "@/entities/access";

export interface NavItem {
  id: NavSectionId;
  label: string;
  href: string;
  /** Разделы Лиды и Дашборд нельзя скрыть никогда (docs-agent.md 1.3) */
  alwaysVisible: boolean;
}

export const CLIENT_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Дашборд", href: "/dashboard", alwaysVisible: true },
  { id: "contacts", label: "Контакты", href: "/contacts", alwaysVisible: false },
  { id: "leads", label: "Лиды", href: "/leads", alwaysVisible: true },
  { id: "sources", label: "Источники", href: "/sources", alwaysVisible: false },
  { id: "script", label: "Скрипт", href: "/script", alwaysVisible: false },
  { id: "finance", label: "Финансы", href: "/finance", alwaysVisible: false },
  // Плательщик не входит в список скрываемых разделов (docs-agent.md 1.3) —
  // тумблера для него нет в "Управление доступом", поэтому виден всегда.
  { id: "payer", label: "Плательщик", href: "/payer", alwaysVisible: true },
  { id: "settings", label: "Настройки", href: "/settings", alwaysVisible: false },
];
