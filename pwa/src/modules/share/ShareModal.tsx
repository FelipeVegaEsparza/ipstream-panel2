import { useEffect, useRef, useState } from 'react'
import {
  FaFacebookF,
  FaLink,
  FaShareNodes,
  FaTelegram,
  FaWhatsapp,
  FaXTwitter
} from 'react-icons/fa6'
import styles from './ShareModal.module.css'

interface ShareOption {
  key: string
  label: string
  icon: React.ComponentType<{ size?: number }>
  href: string
}

function buildShareOptions(title: string, url: string): ShareOption[] {
  return [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: FaWhatsapp,
      href: `https://wa.me/?text=${encodeURIComponent(`${title}: ${url}`)}`
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: FaFacebookF,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    },
    {
      key: 'x',
      label: 'X',
      icon: FaXTwitter,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
    },
    {
      key: 'telegram',
      label: 'Telegram',
      icon: FaTelegram,
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
    }
  ]
}

interface ShareModalProps {
  open: boolean
  onClose: () => void
  title: string
  url: string
}

export function ShareModal({ open, onClose, title, url }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const options = buildShareOptions(title, url)

  useEffect(() => {
    if (!open) return
    setCopied(false)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (copyTimer.current) {
        clearTimeout(copyTimer.current)
        copyTimer.current = null
      }
    }
  }, [open, onClose])

  if (!open) return null

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.card} onClick={(event) => event.stopPropagation()}>
        <div className={styles.headIcon}>
          <FaShareNodes size={20} />
        </div>
        <h3 className={styles.title}>Compartir</h3>
        <p className={styles.subtitle}>
          Comparte {title || 'esta radio'} con tus amigos
        </p>

        <div className={styles.grid}>
          {options.map((option) => (
            <a
              key={option.key}
              className={`${styles.brand} ${styles[`brand_${option.key}`]}`}
              href={option.href}
              target="_blank"
              rel="noreferrer"
              aria-label={option.label}
              title={option.label}
            >
              <option.icon size={24} />
            </a>
          ))}
        </div>

        <button
          type="button"
          className={`${styles.copy} ${copied ? styles.copied : ''}`}
          onClick={() => void copyLink()}
        >
          <FaLink size={16} />
          <span>{copied ? '¡Enlace copiado!' : 'Copiar enlace'}</span>
        </button>
      </div>
    </div>
  )
}
