import styles from './ErrorScreen.module.css'

interface ErrorScreenProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorScreen({
  title = 'Cliente no encontrado',
  message = 'No pudimos identificar la radio o canal de TV solicitado. Verifica la dirección e inténtalo de nuevo.',
  onRetry
}: ErrorScreenProps) {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <span className={styles.icon} aria-hidden="true">
          !
        </span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
        {onRetry && (
          <button type="button" className={styles.retry} onClick={onRetry}>
            Reintentar
          </button>
        )}
      </div>
    </div>
  )
}
