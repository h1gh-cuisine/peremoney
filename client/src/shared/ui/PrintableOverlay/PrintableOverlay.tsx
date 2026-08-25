import type { ReactNode } from "react";
import styles from "./PrintableOverlay.module.scss";

/**
 * Реальная генерация PDF из Google Docs-шаблона (docs-agent.md 2.7.1/2.7.2)
 * требует бэкенда с доступом к Google API — этого пока нет. Как временная
 * замена: печатаем через нативный диалог браузера (Сохранить как PDF),
 * скрывая всё, кроме этого блока, через @media print.
 */
export function PrintableOverlay({ children }: { children: ReactNode }) {
  // "print-portal" — обычный (не CSS-module) класс: правила для @media print
  // живут в globals.scss, т.к. css-loader запрещает "чисто глобальные" селекторы
  // (напр. "body *") внутри CSS-модулей.
  return <div className={`${styles.printable} print-portal`}>{children}</div>;
}
