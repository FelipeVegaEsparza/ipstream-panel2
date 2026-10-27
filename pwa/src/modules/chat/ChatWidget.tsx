import { useCallback, useEffect, useRef, useState } from 'react'
import { FaComments, FaXmark } from 'react-icons/fa6'
import { ChatSection } from './ChatSection'
import styles from './ChatWidget.module.css'

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    const launcher = launcherRef.current
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      launcher?.focus()
    }
  }, [open, close])

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className={styles.launcher}
        onClick={() => setOpen(true)}
        aria-label="Chat en vivo"
        aria-expanded={open}
        aria-controls="chat-en-vivo-dialog"
      >
        <FaComments aria-hidden="true" />
        <span className={styles.launcherLabel}>Chat en vivo</span>
      </button>

      {open && (
        <div className={styles.backdrop} onClick={close}>
          <div
            id="chat-en-vivo-dialog"
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-label="Chat en vivo"
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.header}>
              <span className={styles.title}>
                <FaComments aria-hidden="true" />
                Chat en vivo
              </span>
              <button
                type="button"
                className={styles.close}
                onClick={close}
                aria-label="Cerrar chat"
              >
                <FaXmark aria-hidden="true" />
              </button>
            </div>
            <div className={styles.body}>
              <ChatSection embedded />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
