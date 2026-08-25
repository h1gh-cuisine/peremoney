"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MASTER_NAV_ITEMS } from "./nav-config";
import styles from "./MasterSidebar.module.scss";
import { LogoutButton } from '@/features/logout';
import { BrandLogo } from '@/shared/ui/BrandLogo';

/** Тот же дизайн/стиль, что у клиентского ЛК (docs-agent.md 1.12). */
export function MasterSidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <BrandLogo priority />
      </div>

      <nav className={styles.nav}>
        {MASTER_NAV_ITEMS.map((item) => {
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
        <span className={styles.badge}>Мастер-кабинет</span>
        <LogoutButton className={styles.logoutButton} />
      </div>
    </aside>
  );
}
