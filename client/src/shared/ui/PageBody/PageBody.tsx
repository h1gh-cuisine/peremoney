import type { ReactNode } from "react";
import styles from "./PageBody.module.scss";

export function PageBody({ children, contained = false }: { children: ReactNode; contained?: boolean }) {
  return <div className={`${styles.body} ${contained ? styles.contained : ""}`}>{children}</div>;
}
