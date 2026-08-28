"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccessStore } from "@/entities/access";
import type { HideableSection } from "@/entities/access";
import { CLIENT_NAV_ITEMS } from "./nav-config";
import styles from "./Sidebar.module.scss";
import { LogoutButton } from '@/features/logout';
import { BrandLogo } from '@/shared/ui/BrandLogo';

export function Sidebar() {
  const pathname = usePathname();
  const accessLevel = useAccessStore((s) => s.accessLevel);
  // Подписка именно на sectionVisibility (а не на метод isSectionVisible) обязательна:
  // Zustand триггерит ре-рендер по изменению выбранного значения, а ссылка на метод
  // стабильна между рендерами и не меняется при commitVisibilityDraft().
  const sectionVisibility = useAccessStore((s) => s.sectionVisibility);

  const items = CLIENT_NAV_ITEMS.filter((item) => {
    // "Настройки" убраны из "Управление доступом" — раздел всегда скрыт для клиента (docs-agent.md 1.3)
    if (item.id === "settings") return accessLevel === "full";
    if (item.alwaysVisible || accessLevel === "full") return true;
    return sectionVisibility[item.id as HideableSection];
  });

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <BrandLogo priority />
      </div>

      <nav className={styles.nav}>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
            >
              <span className={styles.navDot} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <span className={styles.accessBadge}>
          {accessLevel === "full" ? "Полный доступ" : "Ограниченный доступ"}
        </span>
        <LogoutButton className={styles.logoutButton} />
      </div>
    </aside>
  );
}
