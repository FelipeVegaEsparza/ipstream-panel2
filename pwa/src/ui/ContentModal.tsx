import { useEffect, useRef, type ReactNode } from 'react'
import styles from './ContentModal.module.css'

interface ContentModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

/**
 * Shell de modal reutilizable: overlay fijo, cierre por botón/Escape/fondo,
 * bloqueo del scroll del body y devolución del foco al disparador.
 */
export function ContentModal({ open, onClose, title, children }: ContentModalProps) {
  const trigger = useRef<Element | null>(null)

  useEffect(() => {
    if (!open) return
    trigger.current = document.activeElement

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      if (trigger.current instanceof HTMLElement) trigger.current.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
