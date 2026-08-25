"use client";

import { RoleSwitcher } from "@/features/view-as-role";
import styles from "./Topbar.module.scss";
import { useFinanceStore } from '@/entities/finance';
import { formatNumber } from '@/shared/lib/format';

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const unitBalance = useFinanceStore((state) => state.unitBalance);
  const percentUsed = unitBalance.totalUnits > 0 ? Math.min(100, unitBalance.usedUnits / unitBalance.totalUnits * 100) : 0;
  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{title}</h1>

      <div className={styles.controls}>
        <div className={styles.balance} aria-label={`Баланс ${unitBalance.usedUnits} из ${unitBalance.totalUnits} штук`}>
          <span>Баланс</span><i><b style={{ width: `${percentUsed}%` }} /></i>
          <strong>{formatNumber(unitBalance.usedUnits)} / {formatNumber(unitBalance.totalUnits)} шт.</strong>
        </div>
        <RoleSwitcher />
        <div className={styles.avatar}>SK</div>
      </div>
    </header>
  );
}
