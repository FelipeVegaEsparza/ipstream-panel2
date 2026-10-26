import { useState } from 'react'
import { FaComments, FaXmark } from 'react-icons/fa6'
import { ChatSection } from './ChatSection'
import styles from './ChatWidget.module.css'

export function ChatWidget() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && (
        <div className={styles.panel} role="dialog" aria-modal="true" aria-label="Chat en vivo">
          <div className={styles.header}>
            <span className={styles.title}>
              <FaComments aria-hidden="true" />
              Chat en vivo
            </span>
            <button
              type="button"
              className={styles.close}
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
            >
              <FaXmark aria-hidden="true" />
            </button>
          </div>
          <div className={styles.body}>
            <ChatSection embedded />
          </div>
        </div>
      )}

      <button
        type="button"
        className={styles.fab}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Cerrar chat' : 'Abrir chat en vivo'}
        aria-expanded={open}
      >
        {open ? <FaXmark aria-hidden="true" /> : <FaComments aria-hidden="true" />}
      </button>
    </>
  )
}
