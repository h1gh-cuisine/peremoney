import { formatPhone, formatShortDate } from "@/shared/lib/format";
import { getContactStatusLabel, type Contact } from "@/entities/contacts";
import styles from "./ContactsTable.module.scss";

interface ContactsTableProps {
  contacts: Contact[];
}

export function ContactsTable({ contacts }: ContactsTableProps) {
  return (
    <div className={styles.card}>
      <div className={styles.tableCount}>Показано: {contacts.length}</div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Дата</th>
              <th>Статус</th>
              <th>Номер телефона</th>
              <th>Источник</th>
              <th>Оператор связи</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td>{formatShortDate(c.date)}</td>
                <td>
                  <span className={styles.statusBadge}>{getContactStatusLabel(c.status)}</span>
                </td>
                <td>{formatPhone(c.mobileTel)}</td>
                <td>{c.site}</td>
                <td>{c.mobileOperator}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {contacts.length === 0 && (
          <div className={styles.empty}>Нет контактов за выбранный период</div>
        )}
      </div>

    </div>
  );
}
