import { formatDateRuLong } from "@/shared/lib/format";
import type { ScriptData } from "@/entities/script";
import styles from "./ScriptViewer.module.scss";

interface ScriptViewerProps {
  data: ScriptData;
}

/**
 * Никто не может редактировать скрипт внутри ЛК (docs-agent.md 1.8) — намеренно
 * нет кнопок "Редактировать"/"Сгенерировать AI"/"Отменить"/"История" и блоков
 * статистики/истории версий, которые есть в референсе.
 */
export function ScriptViewer({ data }: ScriptViewerProps) {
  // `"null"` учитываем для уже синхронизированных записей, созданных старой
  // версией backend. После следующей синхронизации там будет настоящий null.
  const script = data.script.trim();
  const hasScript = script !== "" && script.toLowerCase() !== "null";

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{data.name || "Скрипт оператора"}</h2>
        <div className={styles.meta}>
          <span className={styles.readonlyBadge}>Только чтение</span>
          {data.updatedAt && <span className={styles.updatedAt}>Обновлено: {formatDateRuLong(data.updatedAt)}</span>}
        </div>
      </div>

      {hasScript ? (
        <article className={styles.content}>{script}</article>
      ) : (
        <div className={styles.emptyState}>
          <strong>Скрипт для проекта не настроен</strong>
          <span>После добавления скрипта в Leads Factory он появится здесь автоматически.</span>
        </div>
      )}
    </div>
  );
}
