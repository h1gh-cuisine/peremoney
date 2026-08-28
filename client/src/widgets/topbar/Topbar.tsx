"use client";

import { useEffect } from 'react';
import styles from "./Topbar.module.scss";
import { useFinanceStore } from '@/entities/finance';
import { formatNumber } from '@/shared/lib/format';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSessionStore } from '@/entities/session';
import { useAccessStore } from '@/entities/access';

interface TopbarProps {
  title: string;
}

/** Бейдж показывает только последний сегмент составного названия проекта, например
 * из "Москва/Peremoney ЛКП VDL/Медицина/Имплантсити" — "Имплантсити". */
function projectBadgeLabel(cabinetName: string) {
  const segments = cabinetName.split('/').map((part) => part.trim()).filter(Boolean);
  return segments[segments.length - 1] ?? 'Peremoney';
}

export function Topbar({ title }: TopbarProps) {
  const unitBalance = useFinanceStore((state) => state.unitBalance);
  const resetFinance = useFinanceStore((state) => state.reset);
  const pathname = usePathname();
  const isMaster = pathname.startsWith('/master');
  const masterSession = useSessionStore((state) => state.masterSession);
  const clientSession = useSessionStore((state) => state.clientSession);
  const cabinetName = useAccessStore((state) => state.cabinetName);
  const percentUsed = unitBalance.totalUnits > 0 ? Math.min(100, unitBalance.usedUnits / unitBalance.totalUnits * 100) : 0;
  useEffect(() => {
    if (isMaster) resetFinance();
  }, [isMaster, resetFinance]);
  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{title}</h1>

      <div className={styles.controls}>
        {masterSession && (
          <nav className={styles.cabinetSwitch} aria-label="Переключение кабинетов">
            <Link className={isMaster ? styles.cabinetSwitchActive : ''} href="/master/dashboard">
              Мастер-кабинет
            </Link>
            <Link
              className={!isMaster ? styles.cabinetSwitchActive : ''}
              href={clientSession ? '/dashboard' : '/login?next=/dashboard'}
            >
              Кабинет проекта
            </Link>
          </nav>
        )}
        {!isMaster && (
          <div className={styles.balance} aria-label={`Баланс ${unitBalance.usedUnits} из ${unitBalance.totalUnits} штук`}>
            <span>Баланс</span><i><b style={{ width: `${percentUsed}%` }} /></i>
            <strong>{formatNumber(unitBalance.usedUnits)} / {formatNumber(unitBalance.totalUnits)} шт.</strong>
          </div>
        )}
        {!isMaster && cabinetName && (
          <div className={styles.avatar} title={cabinetName}>{projectBadgeLabel(cabinetName)}</div>
        )}
      </div>
    </header>
  );
}
