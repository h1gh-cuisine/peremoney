import { MasterSidebar } from "@/widgets/master-sidebar";
import { AuthGate } from '@/features/auth-gate';
import styles from "./layout.module.scss";

export default function MasterLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthGate master>{(
    <>
      <MasterSidebar />
      <div className={styles.content}>
        <main className={styles.main}>{children}</main>
      </div>
    </>
  )}</AuthGate>;
}
