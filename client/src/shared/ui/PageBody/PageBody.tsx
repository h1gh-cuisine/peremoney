import type { ReactNode } from "react";
import styles from "./PageBody.module.scss";

export function PageBody({ children }: { children: ReactNode }) {
  return <div className={styles.body}>{children}</div>;
}
