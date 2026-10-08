import styles from './LoadingScreen.module.css'

const clientName = import.meta.env.VITE_CLIENT_NAME as string | undefined

/**
 * Splash de carga. Usa el logo local del cliente (`/icon-512.png`, propio o
 * compartido) y su nombre; replica el look del splash estático de `index.html`
 * para que la transición sea imperceptible.
 */
export function LoadingScreen() {
  return (
    <div className={styles.screen} role="status" aria-label="Cargando">
      <div className={styles.overlay}>
        <img
          className={styles.logo}
          src="/icon-512.png"
          alt=""
          width={320}
          height={320}
        />
        {clientName && <p className={styles.name}>{clientName}</p>}
        <span className={styles.spinner} aria-hidden="true" />
      </div>
    </div>
  )
}
