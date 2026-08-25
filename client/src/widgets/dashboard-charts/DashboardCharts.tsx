import {
  ContactsLeadsChart,
  type DailyContactsLeadsPoint,
} from "@/entities/dashboard-metrics";
import styles from "./DashboardCharts.module.scss";

interface DashboardChartsProps {
  contactsLeads: DailyContactsLeadsPoint[];
}

export function DashboardCharts({ contactsLeads }: DashboardChartsProps) {
  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <h2 className={styles.title}>Контакты и лиды по дням</h2>
        <ContactsLeadsChart data={contactsLeads} />
      </section>
    </div>
  );
}
