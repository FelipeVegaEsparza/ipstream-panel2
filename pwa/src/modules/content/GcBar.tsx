import type { CSSProperties } from 'react'
import { asArray } from '@/core/adapters'
import type { GcBarMessage } from '@/core/types'
import styles from './GcBar.module.css'

interface GcBarProps {
  messages?: GcBarMessage[] | null
  className?: string
}

export function GcBar({ messages, className }: GcBarProps) {
  const texts = asArray(messages)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((message) => message.text?.trim() ?? '')
    .filter((text) => text.length > 0)

  if (texts.length === 0) return null

  const totalChars = texts.join(' ').length
  const duration = Math.min(60, Math.max(16, Math.round(totalChars * 0.3)))

  const sequence = (hidden: boolean) => (
    <span className={styles.sequence} aria-hidden={hidden || undefined}>
      {texts.map((text, index) => (
        <span className={styles.text} key={`${text}-${index}`}>
          {text}
          <span className={styles.dot} aria-hidden="true">
            •
          </span>
        </span>
      ))}
    </span>
  )

  return (
    <div
      className={`${styles.bar}${className ? ` ${className}` : ''}`}
      role="region"
      aria-label="Mensajes"
    >
      <div
        className={styles.track}
        style={{ animationDuration: `${duration}s` } as CSSProperties}
      >
        {sequence(false)}
        {sequence(true)}
      </div>
    </div>
  )
}
