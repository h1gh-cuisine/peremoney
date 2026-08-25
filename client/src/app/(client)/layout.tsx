import { Sidebar } from "@/widgets/sidebar";
import { AuthGate } from '@/features/auth-gate';
import { CabinetBootstrap } from '@/features/cabinet-bootstrap';
import styles from "./layout.module.scss";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthGate><CabinetBootstrap>{(
    <>
      <Sidebar />
      <div className={styles.content}>
        <main className={styles.main}>{children}</main>
      </div>
    </>
  )}</CabinetBootstrap></AuthGate>;
}
