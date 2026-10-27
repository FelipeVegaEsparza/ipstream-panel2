import { useCallback, useEffect, useRef, useState } from 'react'
import { FaComments, FaXmark } from 'react-icons/fa6'
import { ChatSection } from './ChatSection'
import styles from './ChatWidget.module.css'

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const openRef = useRef(false)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const openChat = useCallback(() => {
    openRef.current = true
    setUnread(0)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    openRef.current = false
    setOpen(false)
  }, [])

  const handleNewMessages = useCallback((count: number) => {
    if (openRef.current) return
    setUnread((current) => current + count)
  }, [])

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
        onClick={openChat}
        aria-label={
          unread > 0
            ? `Chat en vivo, ${unread} ${unread === 1 ? 'mensaje nuevo' : 'mensajes nuevos'}`
            : 'Chat en vivo'
        }
        aria-expanded={open}
        aria-controls="chat-en-vivo-dialog"
      >
        <FaComments aria-hidden="true" />
        <span className={styles.launcherLabel}>Chat en vivo</span>
        {unread > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <div className={open ? styles.backdrop : styles.hidden} onClick={close}>
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
            <ChatSection embedded onNewMessages={handleNewMessages} />
          </div>
        </div>
      </div>
    </>
  )
}
