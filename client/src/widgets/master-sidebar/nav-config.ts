export interface MasterNavItem {
  id: "dashboard" | "projects" | "payments";
  label: string;
  href: string;
}

export const MASTER_NAV_ITEMS: MasterNavItem[] = [
  { id: "dashboard", label: "Дашборд", href: "/master/dashboard" },
  { id: "projects", label: "Проекты", href: "/master/projects" },
  { id: "payments", label: "Платежи", href: "/master/payments" },
];
