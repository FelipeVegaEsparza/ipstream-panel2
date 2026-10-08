import styles from './EmptyState.module.css'

interface EmptyStateProps {
  message?: string
}

export function EmptyState({ message = 'Sin contenido disponible' }: EmptyStateProps) {
  return <p className={styles.empty}>{message}</p>
}
