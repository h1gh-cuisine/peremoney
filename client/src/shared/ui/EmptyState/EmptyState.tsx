import styles from "./EmptyState.module.scss";

interface EmptyStateProps {
  badge?: string;
  description: string;
}

export function EmptyState({ badge = "В разработке", description }: EmptyStateProps) {
  return (
    <div className={styles.stub}>
      <span className={styles.badge}>{badge}</span>
      <p className={styles.description}>{description}</p>
    </div>
  );
}
